// Feature `73` · T16 · `MAI-13` — as joias mais pedidas no mês.
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { resumo } from '@/test/resumo'
import { FALHA_DE_LEITURA, TENTAR_DE_NOVO } from '@/shared/ui/leitura'
import TopJewels, { SEM_VENDA_NO_MES } from '../ui/TopJewels'

const comDado = (r = resumo()) => ({ dado: r, falhou: false, tentarDeNovo: vi.fn() })
const linhas = () => screen.getAllByRole('listitem')

describe('TopJewels — com dado', () => {
  it('até 4 produtos na ordem do banco, cada um com "N peças" e o singular "1 peça"', () => {
    render(<TopJewels leitura={comDado()} />)
    expect(linhas().map((l) => l.textContent)).toEqual([
      'Pingente gota com leite materno9 peças',
      'Anel solitário com cinzas6 peças',
      'Colar coração com mecha de cabelo5 peças',
      'Brincos com pelos de pet1 peça',
    ])
  })

  it('nunca mais de 4, mesmo que cheguem 5', () => {
    const r = resumo({ joias: [...resumo().joias, { chave: 'p5', nome: 'Quinta', pecas: 1 }] })
    render(<TopJewels leitura={comDado(r)} />)
    expect(linhas()).toHaveLength(4)
    expect(screen.queryByText('Quinta')).toBeNull()
  })

  it('menos de 4 no mês: só os que existem', () => {
    render(<TopJewels leitura={comDado(resumo({ joias: [{ chave: 'p1', nome: 'Só uma', pecas: 2 }] }))} />)
    expect(linhas().map((l) => l.textContent)).toEqual(['Só uma2 peças'])
  })

  it('sem venda no mês: explica, sem lista', () => {
    render(<TopJewels leitura={comDado(resumo({ joias: [] }))} />)
    expect(screen.getByText(SEM_VENDA_NO_MES)).toBeInTheDocument()
    expect(SEM_VENDA_NO_MES).toBe('Ainda não houve venda neste mês.')
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })
})

describe('TopJewels — sem dado', () => {
  it('carregando: `aria-busy`, sem lista e sem a frase de "sem venda"', () => {
    render(<TopJewels leitura={{ dado: undefined, falhou: false, tentarDeNovo: vi.fn() }} />)
    expect(screen.getByRole('region', { name: 'Joias mais pedidas no mês' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(screen.queryByText(SEM_VENDA_NO_MES)).toBeNull()
  })

  it('falhou sem dado: a frase de falha, nunca a de "sem venda"', () => {
    const tentarDeNovo = vi.fn()
    render(<TopJewels leitura={{ dado: undefined, falhou: true, tentarDeNovo }} />)
    expect(screen.getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    // Fecho r3 (G3/Q1): a falha não se anuncia "ocupada" — `aria-busy` é só do esqueleto (MAI-30).
    expect(screen.getByRole('region', { name: 'Joias mais pedidas no mês' })).not.toHaveAttribute('aria-busy')
    expect(screen.queryByText(SEM_VENDA_NO_MES)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: TENTAR_DE_NOVO }))
    expect(tentarDeNovo).toHaveBeenCalledTimes(1)
  })
})
