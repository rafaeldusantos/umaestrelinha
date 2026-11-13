import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { nasceInvisivel } from '@/test/nasceInvisivel'
import { semComentarios } from '@/test/sourceScan'

/**
 * **A faixa de avisos não nasce invisível.** Ela fica no topo de toda página da loja, e a arte de um
 * aviso de imagem pode ser o maior elemento da primeira dobra no celular: o Chrome não conta como
 * pintado o que está em opacidade zero. A entrada de cada aviso é um deslocamento, nunca um esmaecer.
 *
 * A régua é a do Banner principal (`@/test/nasceInvisivel`), com as mesmas grafias: objeto,
 * `style`, classe utilitária (com valor arbitrário), as animações de entrada que compilam para
 * opacidade zero e `invisible`.
 *
 * ÂNCORAS: os arquivos do widget foram lidos (o caminho errado varreria zero e passaria), a arte e o
 * link estão entre eles, o `StoreLayout` que a monta foi lido, e o quadro-chave da entrada está no
 * `App.css`.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const WIDGET = resolve(HERE, '../..')
const LAYOUT = resolve(HERE, '../../../store-layout/ui/StoreLayout.tsx')
const APP_CSS = resolve(HERE, '../../../../app/App.css')

const arquivos = (dir: string): string[] =>
  readdirSync(dir).flatMap(nome => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return nome === '__tests__' ? [] : arquivos(caminho)
    return /\.tsx?$/.test(nome) ? [caminho] : []
  })

const fontes = arquivos(WIDGET).map(caminho => ({
  caminho,
  fonte: semComentarios(readFileSync(caminho, 'utf8')),
}))

/** O quadro-chave da entrada da faixa, recortado do `App.css` — ou `''`, que derruba a âncora. */
const quadroDaEntrada = (css: string): string => {
  const inicio = css.indexOf('@keyframes estrelinha-faixa-entra')
  if (inicio === -1) return ''
  const fim = css.indexOf('\n}', inicio)
  return fim === -1 ? '' : css.slice(inicio, fim + 2)
}

describe('a faixa de avisos não nasce em opacidade zero', () => {
  it('âncora: os arquivos do widget foram lidos, com a arte e o link', () => {
    expect(fontes.length).toBeGreaterThanOrEqual(4)
    const tudo = fontes.map(f => f.fonte).join('\n')
    expect(tudo).toContain('<picture')
    expect(tudo).toContain('<img')
    expect(tudo).toContain('<Link')
  })

  it('nada no widget nasce em opacidade zero', () => {
    expect(fontes.filter(f => nasceInvisivel(f.fonte)).map(f => f.caminho)).toEqual([])
  })

  it('nada no StoreLayout, que a monta, nasce em opacidade zero', () => {
    const layout = readFileSync(LAYOUT, 'utf8')
    expect(layout).toContain('<AnnouncementBar />')
    expect(nasceInvisivel(layout)).toBe(false)
  })

  it('a entrada de cada aviso é um deslocamento, sem opacidade', () => {
    const quadro = quadroDaEntrada(readFileSync(APP_CSS, 'utf8'))
    expect(quadro).toContain('translateY(6px)')
    expect(quadro).not.toMatch(/opacity/)
  })

  it('SENSOR: um `opacity-0` posto na faixa é acusado', () => {
    const faixa = fontes.find(f => f.caminho.endsWith('AnnouncementBar.tsx'))!
    const mutado = faixa.fonte.replace('bg-estrelinha-accent', 'bg-estrelinha-accent opacity-0')
    expect(mutado).not.toBe(faixa.fonte)
    expect(nasceInvisivel(mutado)).toBe(true)
  })

  it('SENSOR: a entrada trocada por `animate-fade-in` é acusada', () => {
    const faixa = fontes.find(f => f.caminho.endsWith('AnnouncementBar.tsx'))!
    const mutado = faixa.fonte.replace('animate-[estrelinha-faixa-entra_300ms_ease-out]', 'animate-fade-in')
    expect(mutado).not.toBe(faixa.fonte)
    expect(nasceInvisivel(mutado)).toBe(true)
  })
})
