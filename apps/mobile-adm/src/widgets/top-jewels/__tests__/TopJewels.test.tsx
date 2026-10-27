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
    const r = resumo({ joias: [...resumo().joias, { chave: 'p5', nome: 'Quinta', pecas: 1, imagens: null, foto_do_pedido: null }] })
    render(<TopJewels leitura={comDado(r)} />)
    expect(linhas()).toHaveLength(4)
    expect(screen.queryByText('Quinta')).toBeNull()
  })

  it('menos de 4 no mês: só os que existem', () => {
    render(<TopJewels leitura={comDado(resumo({ joias: [{ chave: 'p1', nome: 'Só uma', pecas: 2, imagens: null, foto_do_pedido: null }] }))} />)
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

// 2026-10-26 — a foto de cada joia, pela MESMA regra do detalhe do pedido (`itemPhoto`, de `core`):
// o snapshot do pedido, senão a capa do catálogo (`primaryImage(imagens)`), senão a estrela.
describe('TopJewels — a foto', () => {
  const fotoDa = (i: number) => linhas()[i].querySelector('img')?.getAttribute('src') ?? null
  const joia = (extra: object) => ({ chave: 'p1', nome: 'Pingente', pecas: 2, imagens: null, foto_do_pedido: null, ...extra })

  it('o snapshot vence a capa; sem snapshot, a primeira imagem do catálogo; sem nenhuma, a estrela', () => {
    render(
      <TopJewels
        leitura={comDado(
          resumo({
            joias: [
              joia({ chave: 'a', foto_do_pedido: 'https://x/pedido.webp', imagens: [{ url: 'https://x/capa-a.webp' }] }),
              joia({ chave: 'b', imagens: [{ url: 'https://x/capa-b.webp' }, { url: 'https://x/outra.webp' }] }),
              joia({ chave: 'c' }),
            ],
          }),
        )}
      />,
    )
    expect(fotoDa(0)).toBe('https://x/pedido.webp')
    expect(fotoDa(1)).toBe('https://x/capa-b.webp')
    expect(fotoDa(2)).toBeNull()
    expect(linhas()[2].querySelector('svg')).not.toBeNull()
  })

  it('a moldura tem 40 px, como a da estrela de antes', () => {
    render(<TopJewels leitura={comDado(resumo({ joias: [joia({ foto_do_pedido: 'https://x/a.webp' })] }))} />)
    expect(screen.getByTestId('foto-da-peca')).toHaveStyle({ width: '40px', height: '40px' })
  })
})
