import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import OrderSituationBadge from '../OrderSituationBadge'

// Feature 59 — o selo da situação.
//
// SIT-11: o rótulo vem de `orderSituation` (core); o selo só apresenta.
// SIT-12: "A caminho · chega até 8 out" com previsão; "Entregue em 12 ago" pelo histórico.
// SIT-13: as cores da "Régua dos selos" do Paper, em tokens; nenhuma cor padrão do Tailwind.

/** Classes do elemento, como tokens — a régua é de token EXATO (`min-h-11` contém `h-11`). */
const tokens = (el: Element) => el.className.split(/\s+/).filter(Boolean)

const selo = () => screen.getByText((_, el) => el?.hasAttribute('data-situation') ?? false)
const ponto = () => screen.getByTestId('situation-dot')

describe('OrderSituationBadge — um caso por tom (SIT-13)', () => {
  it('AGUARDANDO: ouro escuro sobre ouro claro, ponto em `accent`', () => {
    render(<OrderSituationBadge order={{ status: 'pending', payment_status: 'pending' }} />)

    expect(selo()).toHaveTextContent('Aguardando pagamento')
    expect(selo().getAttribute('data-tone')).toBe('wait')
    expect(tokens(selo())).toEqual(
      expect.arrayContaining(['bg-estrelinha-wait-soft', 'text-estrelinha-wait']),
    )
    expect(tokens(ponto())).toContain('bg-estrelinha-accent')
  })

  it('ALERTA: rosa-terra sobre rosa claro — "PIX expirado"', () => {
    render(<OrderSituationBadge order={{ status: 'pending', payment_status: 'expired' }} />)

    expect(selo()).toHaveTextContent('PIX expirado')
    expect(selo().getAttribute('data-tone')).toBe('alert')
    expect(tokens(selo())).toEqual(
      expect.arrayContaining(['bg-estrelinha-alert-soft', 'text-estrelinha-alert']),
    )
    expect(tokens(ponto())).toContain('bg-[#A6534F]')
  })

  it('ENTREGUE: musgo sobre musgo claro', () => {
    render(<OrderSituationBadge order={{ status: 'delivered', payment_status: 'approved' }} />)

    expect(selo()).toHaveTextContent('Entregue')
    expect(selo().getAttribute('data-tone')).toBe('done')
    expect(tokens(selo())).toEqual(
      expect.arrayContaining(['bg-estrelinha-done-soft', 'text-estrelinha-done']),
    )
    expect(tokens(ponto())).toContain('bg-[#5E7A5A]')
  })

  it('EM ANDAMENTO: `primary-strong` sobre `serenity`, ponto `primary` — "Em produção"', () => {
    // O caso que abriu a feature: pago, `status` ainda `pending`, sem material. A conta antiga
    // escrevia "Pendente" aqui.
    render(<OrderSituationBadge order={{ status: 'pending', payment_status: 'approved' }} />)

    expect(selo()).toHaveTextContent('Em produção')
    expect(selo()).not.toHaveTextContent('Pendente')
    expect(selo().getAttribute('data-tone')).toBe('progress')
    expect(tokens(selo())).toEqual(
      expect.arrayContaining(['bg-estrelinha-serenity', 'text-estrelinha-primary-strong']),
    )
    expect(tokens(ponto())).toContain('bg-estrelinha-primary')
  })

  it('ENCERRADO: `ink` sobre `ground-deep`, ponto `ink-soft` — "Cancelado"', () => {
    render(<OrderSituationBadge order={{ status: 'cancelled', payment_status: 'approved' }} />)

    expect(selo()).toHaveTextContent('Cancelado')
    expect(selo().getAttribute('data-tone')).toBe('neutral')
    expect(tokens(selo())).toEqual(
      expect.arrayContaining(['bg-estrelinha-ground-deep', 'text-estrelinha-ink']),
    )
    expect(tokens(ponto())).toContain('bg-estrelinha-ink-soft')
  })

  it('cada tom tem um par PRÓPRIO — dois tons nunca saem com a mesma pílula', () => {
    const pedidos = [
      { status: 'pending', payment_status: 'pending' },
      { status: 'pending', payment_status: 'expired' },
      { status: 'delivered', payment_status: 'approved' },
      { status: 'pending', payment_status: 'approved' },
      { status: 'cancelled', payment_status: 'pending' },
    ]
    const pilulas = pedidos.map((order) => {
      const { container, unmount } = render(<OrderSituationBadge order={order} />)
      const el = container.querySelector('[data-situation]') as HTMLElement
      const par = tokens(el)
        .filter((c) => /^(bg|text)-estrelinha-/.test(c))
        .sort()
        .join(' ')
      unmount()
      return par
    })

    expect(new Set(pilulas).size).toBe(5)
  })

  it('a pílula é forma de RÓTULO — `rounded-pill`, 12px, peso 500, ponto de 6px', () => {
    render(<OrderSituationBadge order={{ status: 'shipped', payment_status: 'approved' }} />)

    expect(tokens(selo())).toEqual(
      expect.arrayContaining(['rounded-pill', 'text-xs', 'font-medium', 'px-2.5', 'py-[3px]']),
    )
    expect(tokens(ponto())).toEqual(expect.arrayContaining(['h-1.5', 'w-1.5', 'rounded-full']))
    // O ponto é ornamento: o leitor de tela lê o rótulo, não o círculo.
    expect(ponto().getAttribute('aria-hidden')).toBe('true')
  })

  it('nenhuma cor padrão do Tailwind em nenhum dos nove rótulos', () => {
    const pedidos = [
      { status: 'cancelled', payment_status: 'approved' },
      { status: 'delivered', payment_status: 'approved' },
      { status: 'shipped', payment_status: 'approved' },
      { status: 'pending', payment_status: 'refunded' },
      { status: 'pending', payment_status: 'approved', material_status: 'aguardando_material' },
      { status: 'paid', payment_status: 'approved' },
      { status: 'pending', payment_status: 'expired' },
      { status: 'pending', payment_status: 'rejected' },
      { status: 'pending', payment_status: 'pending' },
    ]
    const proibido = /\b(bg|text|border)-(yellow|blue|purple|green|red)-\d/

    const chaves = pedidos.map((order) => {
      const { container, unmount } = render(<OrderSituationBadge order={order} />)
      expect(container.innerHTML).not.toMatch(proibido)
      const chave = container.querySelector('[data-situation]')?.getAttribute('data-situation')
      unmount()
      return chave
    })

    // Âncora: as nove regras foram de fato percorridas, não nove vezes a mesma.
    expect(new Set(chaves).size).toBe(9)
  })
})

describe('OrderSituationBadge — o rótulo vem do dono (SIT-11) e a data também (SIT-12)', () => {
  it('"A caminho" com previsão acrescenta " · chega até {d MMM}"', () => {
    render(
      <OrderSituationBadge
        order={{ status: 'shipped', payment_status: 'approved', delivery_estimate_max: '2026-10-08' }}
      />,
    )

    expect(selo()).toHaveTextContent('A caminho · chega até 8 out')
  })

  it('"A caminho" sem previsão fica só no rótulo — nada de data inventada', () => {
    render(<OrderSituationBadge order={{ status: 'shipped', payment_status: 'approved' }} />)

    expect(selo().textContent).toBe('A caminho')
  })

  it('"Entregue" com o registro da entrega acrescenta " em {d MMM}", pelo PRIMEIRO registro', () => {
    render(
      <OrderSituationBadge
        order={{ status: 'delivered', payment_status: 'approved' }}
        events={[
          { status: 'delivered', at: '2026-08-14T15:00:00Z' },
          { status: 'delivered', at: '2026-08-12T15:00:00Z' },
        ]}
      />,
    )

    expect(selo().textContent).toBe('Entregue em 12 ago')
  })

  it('valor fora do vocabulário cai em "Aguardando pagamento", sem lançar (SIT-10)', () => {
    render(<OrderSituationBadge order={{ status: 'confirmed', payment_status: 'approved' }} />)

    expect(selo().textContent).toBe('Aguardando pagamento')
  })
})
