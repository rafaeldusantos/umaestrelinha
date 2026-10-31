// `MON-05` — a escolha da variação mostra o estoque e não oferece o que não se vende (feature 89, T11).

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import VariantPicker from '../VariantPicker'
import { textoDoEstoque } from '../../lib/estoque'
import type { VariacaoDaPeca } from '../../api/useProductVariants'

const v = (over: Partial<VariacaoDaPeca>): VariacaoDaPeca => ({
  id: 'v',
  rotulo: 'P',
  preco: 100,
  estoque: 2,
  disponivel: true,
  grava: false,
  imagem: null,
  valores: {},
  peso: null,
  ...over,
})

const LINHAS = [
  v({ id: 'a', rotulo: 'P · Prata', preco: 199, estoque: 3 }),
  v({ id: 'b', rotulo: 'G · Ouro', preco: 249, estoque: 0, disponivel: false }),
  v({ id: 'c', rotulo: 'M · Prata', preco: null }),
]

describe('VariantPicker (MON-05)', () => {
  it('mostra rótulo, preço e estoque de cada linha', () => {
    render(<VariantPicker rotulo="Variação de Colar" variacoes={LINHAS} politica="track" escolhida={null} onEscolher={() => {}} />)
    const opcoes = screen.getAllByRole('radio')
    expect(opcoes).toHaveLength(3)
    expect(opcoes[0]).toHaveTextContent('P · Prata')
    expect(opcoes[0]).toHaveTextContent('3 em estoque')
    expect(opcoes[0]).toHaveTextContent('R$ 199,00')
    expect(opcoes[1]).toHaveTextContent('Sem estoque')
    expect(opcoes[2]).toHaveTextContent('Sem preço cadastrado')
  })

  it('a linha sem estoque e a sem preço ficam desabilitadas; a escolhida é anunciada', () => {
    const onEscolher = vi.fn()
    render(<VariantPicker rotulo="Variação de Colar" variacoes={LINHAS} politica="track" escolhida="a" onEscolher={onEscolher} />)
    const [a, b, c] = screen.getAllByRole('radio')
    expect(a).toHaveAttribute('aria-checked', 'true')
    expect(b).toBeDisabled()
    expect(c).toBeDisabled()
    fireEvent.click(b)
    expect(onEscolher).not.toHaveBeenCalled()
    fireEvent.click(a)
    expect(onEscolher).toHaveBeenCalledWith(LINHAS[0])
  })

  it('o grupo tem nome acessível e cada linha é alvo de 44px (token exato)', () => {
    render(<VariantPicker rotulo="Variação de Colar" variacoes={LINHAS} politica="track" escolhida={null} onEscolher={() => {}} />)
    expect(screen.getByRole('radiogroup', { name: 'Variação de Colar' })).toBeInTheDocument()
    for (const opcao of screen.getAllByRole('radio')) {
      expect(opcao.className.split(/\s+/)).toContain('min-h-11')
    }
  })

  it('o texto do estoque segue a política da peça', () => {
    expect(textoDoEstoque({ estoque: 1, disponivel: true }, 'track')).toBe('1 em estoque')
    expect(textoDoEstoque({ estoque: 0, disponivel: true }, 'none')).toBe('Estoque livre')
    expect(textoDoEstoque({ estoque: 0, disponivel: true }, 'backorder')).toBe('Estoque livre')
  })

  it('sem variação ativa, diz isso em vez de uma lista vazia', () => {
    render(<VariantPicker rotulo="Variação" variacoes={[]} politica="track" escolhida={null} onEscolher={() => {}} />)
    expect(screen.getByTestId('sem-variacao-ativa')).toHaveTextContent('Nenhuma variação ativa desta peça.')
  })

  // Achado na prova em navegador da T27: a peça real tem 108 variações, e a lista seguia aberta
  // depois da escolha — a linha da proposta media 6.732px em 1440. Com mais de
  // `VARIACOES_SEMPRE_ABERTAS` linhas, a escolha recolhe a lista para a escolhida e um "Trocar".
  describe('lista longa recolhe depois da escolha', () => {
    const MUITAS = Array.from({ length: 12 }, (_, i) => v({ id: `m${i}`, rotulo: `Aro ${i + 9}`, preco: 100 + i }))

    it('sem escolha, mostra todas', () => {
      render(<VariantPicker rotulo="Variação de Anel" variacoes={MUITAS} politica="none" escolhida={null} onEscolher={() => {}} />)
      expect(screen.getAllByRole('radio')).toHaveLength(12)
    })

    it('com escolha, mostra só a escolhida, marcada, e o botão de trocar abre as outras', () => {
      render(<VariantPicker rotulo="Variação de Anel" variacoes={MUITAS} politica="none" escolhida="m3" onEscolher={() => {}} />)
      const [unica, ...resto] = screen.getAllByRole('radio')
      expect(resto).toHaveLength(0)
      expect(unica).toHaveTextContent('Aro 12')
      expect(unica).toHaveAttribute('aria-checked', 'true')
      const trocar = screen.getByRole('button', { name: 'Trocar variação (12 opções)' })
      expect(trocar.className.split(/\s+/)).toContain('min-h-11')
      fireEvent.click(trocar)
      expect(screen.getAllByRole('radio')).toHaveLength(12)
    })

    it('escolher outra na lista aberta volta a recolher', () => {
      const onEscolher = vi.fn()
      const { rerender } = render(
        <VariantPicker rotulo="Variação de Anel" variacoes={MUITAS} politica="none" escolhida="m3" onEscolher={onEscolher} />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Trocar variação (12 opções)' }))
      fireEvent.click(screen.getAllByRole('radio')[5])
      expect(onEscolher).toHaveBeenCalledWith(MUITAS[5])
      rerender(<VariantPicker rotulo="Variação de Anel" variacoes={MUITAS} politica="none" escolhida="m5" onEscolher={onEscolher} />)
      expect(screen.getAllByRole('radio')).toHaveLength(1)
      expect(screen.getByRole('radio')).toHaveTextContent('Aro 14')
    })

    it('a escolhida que não está mais na lista não recolhe (a lista fica aberta)', () => {
      render(<VariantPicker rotulo="Variação de Anel" variacoes={MUITAS} politica="none" escolhida="sumiu" onEscolher={() => {}} />)
      expect(screen.getAllByRole('radio')).toHaveLength(12)
    })
  })

  // Conserto do QA da 89 (BUG-20261031-variacoes-da-peca-sao-cem-paradas-de-tab): o grupo é UMA
  // parada de Tab, e as setas andam entre as opções habilitadas.
  describe('teclado: uma parada de Tab e setas', () => {
    const GRADE = [
      v({ id: 'g0', rotulo: 'Aro 9', preco: 100 }),
      v({ id: 'g1', rotulo: 'Aro 10', preco: 100, estoque: 0, disponivel: false }),
      v({ id: 'g2', rotulo: 'Aro 11', preco: 100 }),
      v({ id: 'g3', rotulo: 'Aro 12', preco: 100 }),
    ]
    const paradas = () => screen.getAllByRole('radio').filter((r) => r.tabIndex === 0)

    it('sem escolha, só a primeira habilitada entra na ordem do Tab', () => {
      render(<VariantPicker rotulo="Variação de Anel" variacoes={GRADE} politica="track" escolhida={null} onEscolher={() => {}} />)
      expect(paradas()).toHaveLength(1)
      expect(paradas()[0]).toHaveTextContent('Aro 9')
      for (const outra of screen.getAllByRole('radio').slice(1)) expect(outra.tabIndex).toBe(-1)
    })

    it('com escolha, a parada é a escolhida', () => {
      render(<VariantPicker rotulo="Variação de Anel" variacoes={GRADE} politica="track" escolhida="g2" onEscolher={() => {}} />)
      expect(paradas()).toHaveLength(1)
      expect(paradas()[0]).toHaveTextContent('Aro 11')
    })

    it('a primeira desabilitada não é a parada', () => {
      const comPrimeiraFora = [v({ id: 'x', rotulo: 'Aro 8', preco: null }), ...GRADE]
      render(<VariantPicker rotulo="Variação de Anel" variacoes={comPrimeiraFora} politica="track" escolhida={null} onEscolher={() => {}} />)
      expect(paradas()).toHaveLength(1)
      expect(paradas()[0]).toHaveTextContent('Aro 9')
    })

    it('seta para baixo e para a direita andam pulando a desabilitada; para cima volta; dá a volta no fim', () => {
      const onEscolher = vi.fn()
      render(<VariantPicker rotulo="Variação de Anel" variacoes={GRADE} politica="track" escolhida={null} onEscolher={onEscolher} />)
      const [g0, , g2, g3] = screen.getAllByRole('radio')
      g0.focus()
      fireEvent.keyDown(g0, { key: 'ArrowDown' })
      expect(document.activeElement).toBe(g2)
      expect(g2.tabIndex).toBe(0)
      expect(g0.tabIndex).toBe(-1)
      fireEvent.keyDown(g2, { key: 'ArrowRight' })
      expect(document.activeElement).toBe(g3)
      fireEvent.keyDown(g3, { key: 'ArrowDown' })
      expect(document.activeElement).toBe(g0)
      fireEvent.keyDown(g0, { key: 'ArrowUp' })
      expect(document.activeElement).toBe(g3)
      fireEvent.keyDown(g3, { key: 'ArrowLeft' })
      expect(document.activeElement).toBe(g2)
      fireEvent.keyDown(g2, { key: 'Home' })
      expect(document.activeElement).toBe(g0)
      fireEvent.keyDown(g0, { key: 'End' })
      expect(document.activeElement).toBe(g3)
      // Andar não escolhe: escolher recolhe a lista longa, e recolher a cada seta tiraria a lista
      // de baixo do dedo. Escolhe-se com Enter/Espaço, que o botão já entrega como clique.
      expect(onEscolher).not.toHaveBeenCalled()
    })
  })
})
