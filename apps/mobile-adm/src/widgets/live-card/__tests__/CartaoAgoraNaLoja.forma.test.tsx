// A forma do cartão "Agora na loja" com a fonte grande. jsdom devolve 0 para toda medida de layout: a
// régua é de token exato (a coluna de texto com piso em rem que empurra o gráfico para baixo, nunca
// largura zero), e a medida a 200 % fica para o navegador.
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { presenca } from '@/test/presenca'
import CartaoAgoraNaLoja from '../ui/CartaoAgoraNaLoja'

const temClasse = (el: Element, token: string) => el.className.split(/\s+/).includes(token)
const montar = () =>
  render(
    <MemoryRouter>
      <CartaoAgoraNaLoja leitura={{ dado: presenca(), falhou: false, tentarDeNovo: () => {} }} periodo="hoje" />
    </MemoryRouter>,
  )

describe('o cartão com a fonte grande', () => {
  it('a linha do cartão embrulha: o gráfico desce em vez de espremer o texto', () => {
    montar()
    expect(temClasse(screen.getByTestId('cartao-agora-na-loja'), 'flex-wrap')).toBe(true)
  })

  it('a coluna de texto cresce, encolhe até um piso em rem e nunca fica com largura zero', () => {
    montar()
    const texto = screen.getByTestId('texto-agora-na-loja')
    for (const t of ['flex-1', 'min-w-[min(100%,8rem)]']) expect(temClasse(texto, t)).toBe(true)
    expect(temClasse(texto, 'min-w-0')).toBe(false)
  })

  it('o gráfico e a seta descem JUNTOS, à direita — e a cauda CEDE em vez de passar da borda', () => {
    montar()
    const cauda = screen.getByTestId('cauda-agora-na-loja')
    for (const t of ['ml-auto', 'min-w-0', 'max-w-full', 'flex']) expect(temClasse(cauda, t)).toBe(true)
    expect(temClasse(cauda, 'shrink-0')).toBe(false)
    expect(within(cauda).getByTestId('mini-grafico')).toBeInTheDocument()
    expect(cauda.querySelector('svg')).not.toBeNull()
    expect(cauda.parentElement).toBe(screen.getByTestId('cartao-agora-na-loja'))
  })

  it('o gráfico encolhe até caber (96 px no máximo), com as barras em fração da largura', () => {
    montar()
    const grafico = screen.getByTestId('mini-grafico')
    for (const t of ['w-24', 'min-w-0', 'max-w-full']) expect(temClasse(grafico, t)).toBe(true)
    expect(temClasse(grafico, 'shrink-0')).toBe(false)
    const barras = Array.from(grafico.children)
    expect(barras).toHaveLength(15)
    expect(barras.every((b) => temClasse(b, 'flex-1') && temClasse(b, 'min-w-0'))).toBe(true)
  })

  it('o esqueleto do gráfico também cede', () => {
    render(
      <MemoryRouter>
        <CartaoAgoraNaLoja leitura={{ dado: undefined, falhou: false, tentarDeNovo: () => {} }} periodo="hoje" />
      </MemoryRouter>,
    )
    const cauda = screen.getByTestId('cauda-agora-na-loja')
    const traco = cauda.querySelector('.animate-pulse')!
    for (const t of ['w-24', 'min-w-0', 'max-w-full']) expect(temClasse(traco, t)).toBe(true)
    expect(temClasse(traco, 'shrink-0')).toBe(false)
  })

  it('o número e "pessoas" a 8 px, embrulhando; o funil quebra palavra longa', () => {
    montar()
    const linhaDoNumero = screen.getByTestId('numero-agora-na-loja').parentElement!
    for (const t of ['flex-wrap', 'gap-x-2']) expect(temClasse(linhaDoNumero, t)).toBe(true)
    expect(temClasse(linhaDoNumero, 'gap-x-1.5')).toBe(false)
    const funil = screen.getByTestId('funil-agora-na-loja')
    expect(temClasse(funil, '[overflow-wrap:anywhere]')).toBe(true)
  })
})
