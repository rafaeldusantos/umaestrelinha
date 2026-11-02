// "Joias sendo vistas agora" com a fonte grande: a forma da linha (jsdom não mede layout — a medida a
// 200 % em 390, 360 e 320 fica para o navegador). Régua por token exato, como a de `RecentOrders`.
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { presenca } from '@/test/presenca'
import JoiasSendoVistas from '../ui/JoiasSendoVistas'

const tokens = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

const NOME_LONGO = 'Joia Afetiva Árvore da Vida Flores com Leite Materno e Cabelo'

const montar = () => {
  render(
    <JoiasSendoVistas
      leitura={{
        dado: presenca({ joias: [{ id: 'j1', nome: NOME_LONGO, pessoas: 1, imagens: [] }], guia: 3 }),
        falhou: false,
        tentarDeNovo: vi.fn(),
      }}
    />,
  )
  return screen.getAllByTestId('linha-vista')
}

/** As partes de uma linha: o que vem antes do texto (foto ou ícone), a coluna do texto, o nome e a contagem. */
const partes = (li: HTMLElement, nome: string, contagem: string) => {
  const [marca, texto] = Array.from(li.children)
  return { marca, texto, nome: within(li).getByText(nome), contagem: within(li).getByText(contagem) }
}

describe('JoiasSendoVistas — a linha com a fonte grande', () => {
  const casos = (): [string, ReturnType<typeof partes>][] => {
    const [guia, joia] = montar()
    return [
      ['a joia', partes(joia, NOME_LONGO, '1 pessoa')],
      ['o Guia de envio', partes(guia, 'Guia de envio do material', '3 pessoas')],
    ]
  }

  it('a linha tem DOIS filhos: a foto (ou o ícone) fixa e a coluna do texto, que cede (`min-w-0 flex-1`)', () => {
    for (const [, p] of casos()) {
      expect(tokens(p.marca)).toContain('shrink-0')
      expect(tokens(p.texto)).toEqual(expect.arrayContaining(['min-w-0', 'flex-1']))
      expect(p.texto.contains(p.nome)).toBe(true)
      expect(p.texto.contains(p.contagem)).toBe(true)
    }
  })

  it('a coluna do texto embrulha: a contagem desce para baixo do nome quando não cabe ao lado', () => {
    for (const [, p] of casos()) {
      expect(tokens(p.texto)).toEqual(expect.arrayContaining(['flex', 'flex-wrap', 'gap-x-3']))
    }
  })

  it('o nome tem PISO em rem (cresce com a fonte), ocupa o que sobra e quebra palavra longa', () => {
    for (const [, p] of casos()) {
      const t = tokens(p.nome)
      expect(t).toEqual(expect.arrayContaining(['min-w-[min(100%,6rem)]', 'flex-1', 'break-words']))
      // Sem piso o nome encolhe até virar tira antes de a contagem descer.
      expect(t).not.toContain('min-w-0')
      expect(t).not.toContain('truncate')
    }
  })

  it('a contagem fica à direita, inteira, e nunca é o que espreme o nome (`ml-auto`, sem `shrink-0`)', () => {
    for (const [, p] of casos()) {
      const t = tokens(p.contagem)
      expect(t).toEqual(expect.arrayContaining(['ml-auto', 'whitespace-nowrap']))
      expect(t).not.toContain('shrink-0')
    }
  })

  it('a 100 % a ordem é a do protótipo: foto · nome · contagem', () => {
    const [, joia] = montar()
    expect(joia.textContent).toBe(`${NOME_LONGO}1 pessoa`)
    expect(joia.firstElementChild?.getAttribute('data-testid')).toBe('foto-da-peca')
  })
})
