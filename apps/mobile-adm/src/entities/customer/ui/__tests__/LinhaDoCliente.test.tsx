// Feature `76` · T21 — a linha da lista de clientes (`MAC-03`, `MAC-09`, `MAC-31`, `MAC-32`).
//
// Os textos esperados vêm ESCRITOS POR EXTENSO. O tempo é medido contra o `lido_em` do SERVIDOR, e o
// relógio do aparelho é posto noutro ano para provar isso.
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  COM_CONTA,
  CONVIDADA,
  EMAIL_LONGO,
  NOME_EM_BRANCO,
  NUNCA_PAGOU,
  SEM_NOME,
  cliente,
} from '@/test/clientes'
import type { LinhaDeCliente } from '../../model/linha'
import LinhaDoCliente from '../LinhaDoCliente'

const LIDO_EM = '2026-10-23T14:30:00.123456+00:00'

const tokens = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

const Onde = () => {
  const l = useLocation()
  return <output data-testid="onde">{JSON.stringify({ caminho: l.pathname, estado: l.state })}</output>
}

const desenhar = (c: LinhaDeCliente, lidoEm = LIDO_EM) =>
  render(
    <MemoryRouter initialEntries={['/clientes']}>
      <Routes>
        <Route path="/clientes" element={<LinhaDoCliente cliente={c} lidoEm={lidoEm} />} />
        <Route path="/clientes/:id" element={<Onde />} />
      </Routes>
    </MemoryRouter>,
  )

const alvo = () => screen.getByTestId('linha-do-cliente')
const parte = (nome: string) => alvo().querySelector(`[data-parte="${nome}"]`)

afterEach(() => vi.useRealTimers())

describe('o que a linha mostra (MAC-03)', () => {
  it('inicial, nome, subtítulo "N compras · última há X" e o total em reais inteiros', () => {
    desenhar(cliente({ orders_paid: 3, total_spent: 1250.4, last_order_at: '2026-10-21T14:00:00.000001+00:00' }))
    expect(parte('inicial')?.textContent).toBe('M')
    expect(parte('nome')?.textContent).toBe('Marina Duarte')
    expect(parte('subtitulo')?.textContent).toBe('3 compras · última há 2 dias')
    expect(parte('total')?.textContent).toMatch(/^R\$\s1\.250$/)
  })

  it('uma compra fica no singular', () => {
    desenhar(CONVIDADA)
    expect(parte('subtitulo')?.textContent).toMatch(/^1 compra · última /)
  })

  it('quem nunca pagou: "Sem compra paga ainda"', () => {
    desenhar(NUNCA_PAGOU)
    expect(parte('subtitulo')?.textContent).toBe('Sem compra paga ainda')
  })

  it('o tempo é contra o `lido_em` do servidor: o aparelho noutro ano não muda o texto', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2031-03-01T00:00:00Z'))
    desenhar(cliente({ orders_paid: 1, last_order_at: '2026-10-21T14:00:00.000001+00:00' }))
    expect(parte('subtitulo')?.textContent).toBe('1 compra · última há 2 dias')
  })

  it('sem nome (ausente, vazio ou só espaços), o e-mail e a inicial dele', () => {
    desenhar(SEM_NOME)
    expect(parte('nome')?.textContent).toBe('sem.nome@exemplo.invalid')
    expect(parte('inicial')?.textContent).toBe('S')
    expect(alvo()).toHaveAccessibleName(/^sem\.nome@exemplo\.invalid, /)
  })

  it('nome só de espaços vale como sem nome', () => {
    desenhar(NOME_EM_BRANCO)
    expect(parte('nome')?.textContent).toBe('em.branco@exemplo.invalid')
    expect(parte('inicial')?.textContent).toBe('E')
  })

  it('a inicial é decorativa (aria-hidden)', () => {
    desenhar(COM_CONTA)
    expect(parte('inicial')?.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('o selo "Em aberto" lê orders_open (MAC-03, MAC-09)', () => {
  it('orders_open ≥ 1 ⇒ o selo, no tom "em andamento" e nunca no de alerta', () => {
    desenhar(cliente({ orders_open: 1 }))
    const selo = alvo().querySelector('[data-selo="em-aberto"]')
    expect(selo?.textContent).toBe('Em aberto')
    expect(selo?.getAttribute('data-tone')).toBe('progress')
    const classes = tokens(selo)
    expect(classes).not.toContain('bg-estrelinha-alert-soft')
    expect(classes).not.toContain('text-estrelinha-alert')
  })

  it('vários em aberto continuam sendo UM selo', () => {
    desenhar(cliente({ orders_open: 4 }))
    expect(alvo().querySelectorAll('[data-selo="em-aberto"]')).toHaveLength(1)
  })

  it('orders_open = 0 ⇒ nenhum selo', () => {
    desenhar(cliente({ orders_open: 0 }))
    expect(alvo().querySelector('[data-selo]')).toBeNull()
    expect(screen.queryByText('Em aberto')).toBeNull()
  })
})

describe('a linha é o alvo e navega com `doApp` (MAC-31)', () => {
  it('é UM link para a ficha, com 44 px de piso (token exato)', () => {
    desenhar(COM_CONTA)
    expect(alvo().tagName).toBe('A')
    expect(alvo().getAttribute('href')).toBe(`/clientes/${COM_CONTA.id}`)
    expect(tokens(alvo())).toContain('min-h-11')
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('o toque leva à ficha com `state.doApp`', () => {
    desenhar(COM_CONTA)
    fireEvent.click(alvo())
    expect(JSON.parse(screen.getByTestId('onde').textContent ?? '')).toEqual({
      caminho: `/clientes/${COM_CONTA.id}`,
      estado: { doApp: true },
    })
  })
})

describe('nada é cortado nem se sobrepõe (MAC-32)', () => {
  it('o e-mail de 60+ caracteres quebra: `[overflow-wrap:anywhere]` no nome', () => {
    desenhar(EMAIL_LONGO)
    expect(EMAIL_LONGO.email.length).toBeGreaterThan(60)
    expect(parte('nome')?.textContent).toBe(EMAIL_LONGO.email)
    expect(tokens(parte('nome'))).toContain('[overflow-wrap:anywhere]')
  })

  it.each(['nome', 'subtitulo', 'total'])('"%s" não tem truncate, whitespace-nowrap nem shrink-0', (nome) => {
    desenhar(cliente({ orders_open: 1 }))
    const classes = tokens(parte(nome))
    for (const proibida of ['truncate', 'whitespace-nowrap', 'shrink-0']) expect(classes).not.toContain(proibida)
  })

  it('o selo não corta o rótulo: a pílula sem truncate nem whitespace-nowrap', () => {
    desenhar(cliente({ orders_open: 1 }))
    const classes = tokens(alvo().querySelector('[data-selo="em-aberto"]'))
    for (const proibida of ['truncate', 'whitespace-nowrap', 'shrink-0']) expect(classes).not.toContain(proibida)
  })

  it('o total e o texto podem descer para a linha de baixo: o contêiner embrulha', () => {
    desenhar(COM_CONTA)
    expect(tokens(parte('esquerda')?.parentElement ?? null)).toContain('flex-wrap')
    expect(tokens(parte('total'))).toContain('max-w-full')
  })
})

describe('o nome acessível da linha diz tudo o que a linha mostra (BUG-20261024-linha-do-cliente-so-diz-o-nome)', () => {
  const nomeAcessivel = () => (alvo().getAttribute('aria-label') ?? '').replace(/[\u00a0\u202f]/g, ' ')

  it('nome, compras, última compra, total e "em aberto", em vírgulas — sem o ponto médio', () => {
    desenhar(cliente({ orders_paid: 3, total_spent: 1250.4, orders_open: 1, last_order_at: '2026-10-21T14:00:00.000001+00:00' }))
    expect(nomeAcessivel()).toBe('Marina Duarte, 3 compras, última há 2 dias, R$ 1.250, em aberto')
    expect(screen.getByRole('link', { name: /^Marina Duarte, 3 compras/ })).toBe(alvo())
  })

  it('sem pedido em aberto, a frase não cita aberto', () => {
    desenhar(cliente({ orders_paid: 1, total_spent: 90, orders_open: 0, last_order_at: '2026-10-21T14:00:00.000001+00:00' }))
    expect(nomeAcessivel()).toBe('Marina Duarte, 1 compra, última há 2 dias, R$ 90')
  })

  it('quem nunca pagou: "Sem compra paga ainda", com o total de zero', () => {
    desenhar(NUNCA_PAGOU)
    expect(nomeAcessivel()).toMatch(/, Sem compra paga ainda, R\$ 0$/)
  })
})

describe('com a fonte a 200 % o nome não parte uma palavra (BUG-20261024-linha-do-cliente-quebra-palavra-e-pilula-a-200)', () => {
  // A inicial é grande a 200 %: o texto, ao lado dela, ficava com ~155 px e `anywhere` partia
  // "Albuquerque". O bloco de texto tem um piso em `rem` que, sem espaço ao lado da inicial, o faz descer
  // para a linha de baixo, com a largura inteira da linha. jsdom não mede layout: a régua é a forma.
  it('a linha embrulha (a inicial pode ficar sozinha na primeira linha)', () => {
    desenhar(cliente({ orders_open: 1 }))
    expect(tokens(alvo())).toContain('flex-wrap')
  })

  it('o bloco de texto tem piso de 12rem limitado à linha, e a inicial não encolhe', () => {
    desenhar(cliente({ orders_open: 1 }))
    const texto = parte('esquerda')?.parentElement ?? null
    expect(tokens(texto)).toContain('min-w-[min(100%,12rem)]')
    expect(tokens(texto)).not.toContain('min-w-0')
    expect(tokens(alvo().firstElementChild)).toContain('shrink-0')
  })
})
