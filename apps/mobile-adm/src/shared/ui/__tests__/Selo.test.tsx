// Feature `74` · T16 — o selo compartilhado (`MAP-16`, `MAP-25`, `MAP-43`).
//
// O tom e o rótulo são de `core`; o selo só desenha. As réguas: cada tom tem a SUA pílula e o SEU
// ponto (escritos por extenso — derivá-los de `PILULA_DO_TOM` provaria só que o mapa é igual a si
// mesmo), o rótulo nunca é cortado, e o mapa tom → classe mora num arquivo só.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SituationTone } from '@estrelinha/core/orders'

import Selo from '../Selo'

const tokens = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

const POR_TOM: [SituationTone, string[], string][] = [
  ['wait', ['bg-estrelinha-wait-soft', 'text-estrelinha-wait'], 'bg-estrelinha-accent'],
  ['alert', ['bg-estrelinha-alert-soft', 'text-estrelinha-alert'], 'bg-estrelinha-alert'],
  ['done', ['bg-estrelinha-done-soft', 'text-estrelinha-done'], 'bg-estrelinha-done'],
  ['progress', ['bg-estrelinha-serenity', 'text-estrelinha-primary-strong'], 'bg-estrelinha-primary'],
  ['neutral', ['bg-estrelinha-ground-deep', 'text-estrelinha-ink'], 'bg-estrelinha-ink-soft'],
]

describe('o selo desenha o tom que recebe (MAP-16, MAP-25)', () => {
  it.each(POR_TOM)('tom %s: a pílula e o ponto do tom', (tom, pilula, ponto) => {
    const { container } = render(<Selo tom={tom}>Pago</Selo>)
    const selo = container.firstElementChild
    expect(selo?.getAttribute('data-tone')).toBe(tom)
    expect(tokens(selo)).toEqual(expect.arrayContaining(pilula))
    const bolinha = selo?.firstElementChild ?? null
    expect(bolinha?.getAttribute('aria-hidden')).toBe('true')
    expect(tokens(bolinha)).toContain(ponto)
    expect(selo?.lastElementChild?.textContent).toBe('Pago')
  })

  it('os atributos de dado chegam à pílula (quem mede o selo os lê)', () => {
    const { container } = render(
      <Selo tom="done" dados={{ 'data-pagamento': 'approved' }}>
        Pago
      </Selo>,
    )
    expect(container.firstElementChild?.getAttribute('data-pagamento')).toBe('approved')
  })
})

describe('o rótulo nunca é cortado (MAP-43)', () => {
  it('sem `truncate` nem `whitespace-nowrap`, com teto na linha e o rótulo podendo quebrar', () => {
    const { container } = render(<Selo tom="wait">Aguardando pagamento</Selo>)
    const selo = container.firstElementChild
    expect(tokens(selo)).toContain('max-w-full')
    expect(tokens(selo)).not.toContain('whitespace-nowrap')
    expect(tokens(selo)).not.toContain('truncate')
    const rotulo = selo?.lastElementChild ?? null
    expect(tokens(rotulo)).toContain('min-w-0')
    expect(tokens(rotulo)).not.toContain('truncate')
    expect(tokens(rotulo)).not.toContain('whitespace-nowrap')
  })
})

describe('o mapa tom → classe mora num arquivo só', () => {
  const RAIZ = join(__dirname, '..', '..', '..')
  const DONO = 'shared/ui/Selo.tsx'
  // As classes de pílula que só um mapa de tom escreveria. `bg-estrelinha-alert-soft` fica de fora:
  // o aviso de erro dos formulários (`campo.ts`) usa o mesmo fundo, e não é selo.
  const CLASSES_DE_PILULA = ['bg-estrelinha-wait-soft', 'bg-estrelinha-done-soft', 'bg-estrelinha-serenity']

  const arquivos = (dir: string): string[] =>
    readdirSync(dir).flatMap((nome) => {
      const caminho = join(dir, nome)
      if (statSync(caminho).isDirectory()) return nome === '__tests__' || nome === 'test' ? [] : arquivos(caminho)
      return /\.tsx?$/.test(nome) ? [caminho] : []
    })

  const varridos = arquivos(RAIZ).map((c) => ({ rel: relative(RAIZ, c).split('\\').join('/'), fonte: readFileSync(c, 'utf8') }))

  it('âncora: a varredura lê o app e acha as classes no dono', () => {
    expect(varridos.length).toBeGreaterThanOrEqual(50)
    const dono = varridos.find((a) => a.rel === DONO)
    for (const c of CLASSES_DE_PILULA) expect(dono?.fonte).toContain(c)
  })

  it('nenhum outro arquivo de produção escreve uma classe de pílula de tom', () => {
    const fora = varridos.filter((a) => a.rel !== DONO && CLASSES_DE_PILULA.some((c) => a.fonte.includes(c)))
    expect(fora.map((a) => a.rel)).toEqual([])
  })
})
