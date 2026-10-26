// Feature 72, T21 — o ícone da aba (`MAF-27`) e a splash ESTÁTICA do `index.html` (`MAF-28`).
//
// A splash do React só existe depois do JavaScript; antes, a primeira pintura era branca (5,2 s em
// Slow 3G). O plugin `splashEstatica` põe no `#root` do HTML o MESMO lockup, lido no build do
// arquivo que a `Splash` importa — nunca uma segunda cópia —, e o `createRoot` o substitui ao montar.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, render, screen } from '@testing-library/react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { ESTRELINHA_COLORS } from '@estrelinha/ui/tokens/estrelinha'
import { Splash } from '@/features/splash'
import lockupImportadoPelaSplash from '@/features/splash/assets/uma-estrelinha-lockup-negativo.svg?raw'
import { injetarSplash, LOCKUP_DA_SPLASH, NOME_DA_SPLASH, ROTULO_DA_SPLASH, splashEstaticaHtml } from '../../../splashEstatica'

const APP = resolve(__dirname, '../../..')
const lido = (p: string) => readFileSync(resolve(APP, p), 'utf8')
const semComentario = (t: string) => t.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')

const indexHtml = lido('index.html')
const lockup = readFileSync(LOCKUP_DA_SPLASH, 'utf8')
const gerado = injetarSplash(indexHtml, lockup)

/** O conteúdo de `#root` no HTML gerado — até o script do app. */
const raiz = (html: string): string | null => {
  const abre = html.indexOf('<div id="root">')
  const script = html.indexOf('<script type="module"')
  return abre === -1 || script === -1 ? null : html.slice(abre, script)
}

describe('o ícone da aba (MAF-27)', () => {
  const link = /<link\s+rel="icon"\s+type="image\/png"\s+sizes="192x192"\s+href="([^"]+)"\s*\/>/.exec(indexHtml)

  it('o `index.html` declara o ícone', () => {
    expect(link).not.toBeNull()
  })

  it('o arquivo declarado existe em `public/` e é um PNG de 192 px — é o que responde 200', () => {
    const buf = readFileSync(resolve(APP, 'public', link![1].replace(/^\//, '')))
    expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect(buf.readUInt32BE(16)).toBe(192)
    expect(buf.readUInt32BE(20)).toBe(192)
  })
})

describe('a splash estática no `#root` (MAF-28)', () => {
  it('âncora — o lockup foi lido do disco e é o mesmo que a `Splash` do React importa', () => {
    expect(lockup.length).toBeGreaterThan(5000)
    expect(lockup).toBe(lockupImportadoPelaSplash)
  })

  it('o HTML gerado contém o lockup IDÊNTICO ao do asset, dentro de `#root`', () => {
    const r = raiz(gerado)
    expect(r).not.toBeNull()
    expect(r!.startsWith('<div id="root"><div id="splash-estatica"')).toBe(true)
    expect(r!).toContain(lockup)
  })

  it('o fundo é `primary-strong`, a barra é `accent` e o rótulo é `on-primary`, do dono da paleta', () => {
    const r = raiz(gerado)!
    expect(r).toContain(`background-color:${ESTRELINHA_COLORS['primary-strong']}`)
    expect(r).toContain(`background-color:${ESTRELINHA_COLORS.accent}`)
    expect(r).toContain(`color:${ESTRELINHA_COLORS['on-primary']}`)
  })

  it('o rótulo e o nome acessível são os da `Splash` do React', () => {
    render(<Splash />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', NOME_DA_SPLASH)
    expect(screen.getByText(ROTULO_DA_SPLASH)).toBeInTheDocument()
    expect(raiz(gerado)!).toContain(`aria-label="${NOME_DA_SPLASH}"`)
    expect(raiz(gerado)!).toContain(`>${ROTULO_DA_SPLASH}</p>`)
  })

  it('o primeiro quadro é o da animação do React (8 px abaixo, barra em 8%), e o final com movimento reduzido', () => {
    const r = raiz(gerado)!
    expect(r).toContain('.splash-estatica-lockup{transform:translateY(8px)}')
    expect(r).toContain('.splash-estatica-progresso{transform:scaleX(0.08)}')
    expect(r).toMatch(/@media \(prefers-reduced-motion: reduce\)\{[^}]*\{transform:none\}\}/)
  })

  it('nenhuma cor digitada no plugin: as cores vêm de `ESTRELINHA_COLORS`', () => {
    const fonte = semComentario(lido('splashEstatica.ts'))
    expect(fonte).toMatch(/ESTRELINHA_COLORS/)
    expect(fonte).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('o `vite.config.ts` liga o plugin', () => {
    expect(semComentario(lido('vite.config.ts'))).toMatch(/plugins:\s*\[[^\]]*splashEstatica\(\)/)
  })

  it('o React substitui a splash estática ao montar', () => {
    const el = document.createElement('div')
    el.innerHTML = splashEstaticaHtml(lockup)
    document.body.appendChild(el)
    expect(el.querySelector('#splash-estatica')).not.toBeNull()
    act(() => createRoot(el).render(<Splash />))
    expect(el.querySelector('#splash-estatica')).toBeNull()
    expect(el.querySelector('[data-testid="splash-lockup"]')).not.toBeNull()
    el.remove()
  })

  it('SENSOR — um lockup com um byte trocado NÃO casa', () => {
    const alterado = lockup.replace('stroke-width="6.02"', 'stroke-width="6.03"')
    expect(alterado).not.toBe(lockup)
    expect(raiz(gerado)!).not.toContain(alterado)
  })

  it('SENSOR — sem a raiz vazia, o build lança em vez de sair sem splash', () => {
    expect(() => injetarSplash(indexHtml.replace('<div id="root"></div>', '<div id="app"></div>'), lockup)).toThrow()
  })

  it('SENSOR — uma cor digitada seria acusada pela régua', () => {
    expect('background-color:#283A4A').toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
