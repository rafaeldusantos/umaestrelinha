// Feature `74` · T17 — a linha do pedido (`MAP-16`..`MAP-19`, `MAP-42`, `MAP-43`).
//
// Os textos esperados vêm ESCRITOS POR EXTENSO (a frase de `rowSummary`, o rótulo da idade, o número
// com `#`): derivá-los das funções de `core` provaria só que a linha chama alguma coisa. O tempo é
// medido contra o `lido_em` do SERVIDOR, e o relógio do aparelho é posto noutro ano para provar isso.
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AGUARDANDO_MATERIAL, SEM_RASTREIO, UM_DE_CADA_ESTADO, linha } from '@/test/pedidos'
import type { LinhaDaLista } from '../../model/linha'
import LinhaDoPedido from '../LinhaDoPedido'

/** 23/10/2026 14:30 UTC — dez dias e pouco depois de 2026-10-13. */
const LIDO_EM = '2026-10-23T14:30:00.123456+00:00'

const tokens = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

const Onde = () => {
  const l = useLocation()
  return <output data-testid="onde">{JSON.stringify({ caminho: l.pathname, estado: l.state })}</output>
}

const desenhar = (l: LinhaDaLista, lidoEm = LIDO_EM) =>
  render(
    <MemoryRouter initialEntries={['/pedidos']}>
      <Routes>
        <Route path="/pedidos" element={<LinhaDoPedido linha={l} lidoEm={lidoEm} />} />
        <Route path="/pedidos/:id" element={<Onde />} />
      </Routes>
    </MemoryRouter>,
  )

const alvo = () => screen.getByTestId('linha-do-pedido')
const parte = (nome: string) => alvo().querySelector(`[data-parte="${nome}"]`)

afterEach(() => vi.useRealTimers())

describe('o que a linha mostra (MAP-16)', () => {
  it('número, selo do ateliê, nome, "Nª compra · há N" e o total com centavos', () => {
    desenhar(linha({ purchase_ordinal: 3, created_at: '2026-10-21T14:00:00.000001+00:00' }))
    expect(parte('numero')?.textContent).toBe('#0244')
    const selo = alvo().querySelector('[data-situation]')
    expect(selo?.getAttribute('data-situation')).toBe('in_production')
    expect(selo?.textContent).toBe('Em produção')
    expect(parte('cliente')?.textContent).toBe('Marina Duarte')
    expect(parte('compra')?.textContent).toBe('3ª compra · há 2 dias')
    expect(parte('total')?.textContent).toMatch(/^R\$\s389,90$/)
  })

  it('sem nome, o e-mail no lugar (edge case)', () => {
    desenhar(linha({ customer_name: null }))
    expect(parte('cliente')?.textContent).toBe('marina@exemplo.invalid')
    expect(alvo()).toHaveAccessibleName('Pedido #0244, marina@exemplo.invalid')
  })

  it('sem ordinal válida, só o tempo', () => {
    desenhar(linha({ purchase_ordinal: 0, created_at: '2026-10-23T14:00:00.000001+00:00' }))
    expect(parte('compra')?.textContent).toBe('há 30 min')
  })

  it('o tempo é contra o `lido_em` do servidor: o aparelho noutro ano não muda o texto', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2031-03-01T00:00:00Z'))
    desenhar(linha({ purchase_ordinal: 1, created_at: '2026-10-21T14:00:00.000001+00:00' }))
    expect(parte('compra')?.textContent).toBe('1ª compra · há 2 dias')
  })
})

describe('a frase do que segura o pedido (MAP-17)', () => {
  it('esperando o envelope: a frase, o ponto de ACENTO e a idade pelo rótulo do bloco', () => {
    // 10/10 09:00 → 23/10 14:30: 13 dias, o terceiro degrau ("parado há").
    desenhar(AGUARDANDO_MATERIAL)
    expect(parte('frase')?.textContent).toBe('Esperando o envelope da cliente · parado há 13 dias')
    expect(tokens(parte('frase')?.querySelector('[data-ponto]') ?? null)).toContain('bg-estrelinha-accent')
    expect(parte('idade')?.textContent).toBe(' · parado há 13 dias')
  })

  it('a idade é contra o `lido_em`, não o relógio do aparelho', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2031-03-01T00:00:00Z'))
    desenhar(linha({ material_status: 'aguardando_material', created_at: '2026-10-21T09:00:00.000001+00:00' }))
    expect(parte('idade')?.textContent).toBe(' · há 2 dias')
  })

  it('material a caminho: acento, SEM idade (a idade é só do envelope que não saiu)', () => {
    desenhar(linha({ material_status: 'material_enviado', created_at: '2026-10-10T09:00:00.000001+00:00' }))
    expect(parte('frase')?.textContent).toBe('Material a caminho')
    expect(tokens(parte('frase')?.querySelector('[data-ponto]') ?? null)).toContain('bg-estrelinha-accent')
    expect(parte('idade')).toBeNull()
  })

  it('enviado sem rastreio: ponto de ALERTA, sem idade', () => {
    desenhar(SEM_RASTREIO)
    expect(parte('frase')?.textContent).toBe('Sem código — a cliente não foi avisada')
    expect(tokens(parte('frase')?.querySelector('[data-ponto]') ?? null)).toContain('bg-estrelinha-alert')
    expect(parte('idade')).toBeNull()
  })

  it('pago a separar: ponto PRIMÁRIO', () => {
    desenhar(linha())
    expect(parte('frase')?.textContent).toBe('Pago, a separar')
    const ponto = tokens(parte('frase')?.querySelector('[data-ponto]') ?? null)
    expect(ponto).toContain('bg-estrelinha-primary')
    expect(ponto).not.toContain('bg-estrelinha-accent')
    expect(ponto).not.toContain('bg-estrelinha-alert')
  })

  it.each([
    ['entregue', UM_DE_CADA_ESTADO[4]],
    ['cancelado', UM_DE_CADA_ESTADO[5]],
  ])('%s: nenhuma frase (edge case)', (_nome, l) => {
    desenhar(l)
    expect(parte('frase')).toBeNull()
  })
})

describe('nenhum botão nem texto de ação (MAP-18)', () => {
  it.each(UM_DE_CADA_ESTADO.concat([AGUARDANDO_MATERIAL, SEM_RASTREIO]).map((l) => [l.order_number, l]))(
    'pedido %s: nenhum botão, nenhum rótulo de ação',
    (_n, l) => {
      desenhar(l)
      expect(screen.queryAllByRole('button')).toHaveLength(0)
      for (const acao of ['Recebi o material', 'Salvar rastreio', 'Iniciar separação', 'Marcar como enviado', 'Anotar rastreio']) {
        expect(alvo().textContent).not.toContain(acao)
      }
    },
  )
})

describe('a linha inteira é o alvo (MAP-19, MAP-42)', () => {
  it('um link só, com o nome acessível do número e da cliente, e 44 px no mínimo', () => {
    desenhar(linha())
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAccessibleName('Pedido #0244, Marina Duarte')
    expect(tokens(links[0])).toContain('min-h-11')
  })

  it('tocar abre `/pedidos/<id>` com `state: { doApp: true }` (E7)', () => {
    desenhar(linha())
    fireEvent.click(alvo())
    expect(JSON.parse(screen.getByTestId('onde').textContent ?? '')).toEqual({
      caminho: '/pedidos/00000000-0000-4000-8000-000000000244',
      estado: { doApp: true },
    })
  })
})

describe('número e total quebram em vez de estourar (MAP-43)', () => {
  it.each(['numero', 'total'])('%s: quebra em qualquer ponto, sem `whitespace-nowrap` nem `truncate`', (nome) => {
    desenhar(linha())
    const t = tokens(parte(nome))
    expect(t).toContain('[overflow-wrap:anywhere]')
    expect(t).not.toContain('whitespace-nowrap')
    expect(t).not.toContain('truncate')
  })

  it('a linha embrulha, o nome tem piso em rem e o total cede (sem `shrink-0`)', () => {
    desenhar(linha())
    expect(tokens(alvo())).toContain('flex-wrap')
    expect(tokens(parte('esquerda'))).toContain('min-w-[min(100%,8rem)]')
    const total = tokens(parte('total'))
    expect(total).toEqual(expect.arrayContaining(['ml-auto', 'min-w-0', 'max-w-full']))
    expect(total).not.toContain('shrink-0')
    expect(tokens(parte('cliente'))).not.toContain('truncate')
  })
})
