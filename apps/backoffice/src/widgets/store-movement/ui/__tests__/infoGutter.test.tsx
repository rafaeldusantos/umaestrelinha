// Feature 71 — achado da prova de ponta a ponta em navegador (`prova-navegador.md`): em 390 × 844 o
// balão do ⓘ de Visitas únicas abria com a borda direita EM 390, encostado na borda da tela. O Radix
// só desloca o conteúdo até encostar, a menos que receba `collisionPadding`. jsdom não mede layout,
// então a régua aqui é a DECLARAÇÃO (o prop entregue ao Radix e o teto de largura, por token exato);
// a medida é do navegador. Molde de `features/product-form/ui/__tests__/stripEPopover.test.tsx` (D4).

import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ props: [] as Record<string, unknown>[], rpc: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { rpc: h.rpc } }))
vi.mock('@estrelinha/ui/popover', () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverContent: ({ children, ...props }: { children: ReactNode } & Record<string, unknown>) => {
    h.props.push(props)
    return <div data-testid="balao">{children}</div>
  },
}))

import StoreMovement from '../StoreMovement'
import { VISIT_INFO_TEXT } from '../../model/labels'

const tem = (cls: string, token: string) =>
  new RegExp(`(?:^|\\s)${token.replace(/[.*+?^${}()|[\]\\:]/g, '\\$&')}(?![-\\w])`).test(cls)

const periodo = { visitas: 2, vendas: 0, faturamento: 0, ticket: null }

describe('o balão do ⓘ respeita o gutter de 16px no celular', () => {
  it('passa `collisionPadding={16}` ao Radix e limita a largura a 100vw − 32px', async () => {
    h.props = []
    h.rpc.mockResolvedValue({
      data: {
        hoje: '2026-10-22', ontem: '2026-10-21', inicio_semana: '2026-10-19',
        expira_em: '2026-10-23T03:00:00+00:00', lido_em: '2026-10-22T08:45:00+00:00',
        production_host: 'localhost', contagem_desde: '2026-10-22T08:41:00+00:00',
        contagem_desde_dia: '2026-10-22', ultima_visita: '2026-10-22T08:41:00+00:00',
        ultima_visita_dia: '2026-10-22', teto_dia: null,
        periodos: { hoje: periodo, ontem: periodo, semana: periodo },
      },
      error: null,
    })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<StoreMovement />, {
      wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    })
    // Com o Popover dublado como sempre aberto, o balão aparece já com o dado.
    const baloes = await screen.findAllByTestId('balao')
    expect(baloes[0].textContent).toBe(VISIT_INFO_TEXT)
    const doInfo = h.props.filter(p => p.align === 'start')
    expect(doInfo.length).toBeGreaterThan(0) // âncora: o ⓘ foi renderizado ao menos uma vez
    for (const p of doInfo) {
      expect(p.collisionPadding).toBe(16)
      expect(tem(String(p.className), 'w-[min(18rem,calc(100vw-32px))]')).toBe(true)
    }
  })

  it('SENSOR: a régua é de token exato — um teto parecido não passa por ele', () => {
    expect(tem('w-[min(18rem,calc(100vw-16px))]', 'w-[min(18rem,calc(100vw-32px))]')).toBe(false)
    expect(tem('sm:w-[min(18rem,calc(100vw-32px))]', 'w-[min(18rem,calc(100vw-32px))]')).toBe(false)
    expect(tem('text-sm w-[min(18rem,calc(100vw-32px))]', 'w-[min(18rem,calc(100vw-32px))]')).toBe(true)
  })
})
