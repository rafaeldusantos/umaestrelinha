// Feature `83` · T09 — `LAV-04`: o cartão "Visitas hoje", nos três estados. A navegação e o período
// entre as duas telas são provados pelo `<App />` real em `pages/__tests__/inicioAoVivo.test.tsx`.
process.env.TZ = 'UTC'

import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { StoreMovement } from '@estrelinha/core/stats'
import { FALHA_DE_LEITURA, type Leitura } from '@/shared/ui/leitura'
import { movimento } from '@/test/movimento'
import CartaoVisitasHoje from '../ui/CartaoVisitasHoje'

const Destino = () => {
  const { pathname, state } = useLocation()
  return <p data-testid="destino">{`${pathname} ${JSON.stringify(state)}`}</p>
}

const montar = (leitura: Leitura<StoreMovement>) =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<CartaoVisitasHoje leitura={leitura} periodo="ontem" />} />
        <Route path="/ao-vivo" element={<Destino />} />
      </Routes>
    </MemoryRouter>,
  )

const cartao = () => screen.getByTestId('cartao-visitas-hoje')
const temClasse = (el: Element, token: string) => el.className.split(/\s+/).includes(token)
const comHoje = (visitas: number) => movimento({ periodos: { ...movimento().periodos, hoje: { visitas, vendas: 3, faturamento: 1, ticket: 1 } } })

describe('com dado', () => {
  it('eyebrow, número, linha de apoio e o nome acessível exato', () => {
    montar({ dado: movimento(), falhou: false, tentarDeNovo: vi.fn() })
    expect(cartao().tagName).toBe('BUTTON')
    expect(cartao()).toHaveAccessibleName('Visitas hoje, 41. Abrir loja ao vivo')
    expect(cartao()).toHaveTextContent(/^Visitas hoje41Hoje, ontem e a semana, por horário$/)
    const numero = screen.getByTestId('numero-visitas-hoje')
    expect(numero.textContent).toBe('41')
    for (const t of ['font-display', 'text-[30px]', 'font-bold', 'text-estrelinha-primary']) expect(temClasse(numero, t)).toBe(true)
    expect(cartao().hasAttribute('aria-busy')).toBe(false)
  })

  it('largura inteira e alvo de 44 px; sem ponto dourado, sem "pessoa", sem sacola, sem "Ao vivo em breve"', () => {
    montar({ dado: movimento(), falhou: false, tentarDeNovo: vi.fn() })
    expect(temClasse(cartao(), 'w-full')).toBe(true)
    expect(temClasse(cartao(), 'min-h-11')).toBe(true)
    expect(cartao().querySelectorAll('.bg-estrelinha-accent')).toHaveLength(0)
    expect(cartao().textContent).not.toMatch(/pessoa|sacola|checkout|ao vivo em breve/i)
  })

  it('o número em pt-BR (1.240), e o zero aparece — o cartão nunca some', () => {
    const { unmount } = montar({ dado: comHoje(1240), falhou: false, tentarDeNovo: vi.fn() })
    expect(screen.getByTestId('numero-visitas-hoje').textContent).toBe('1.240')
    expect(cartao()).toHaveAccessibleName('Visitas hoje, 1.240. Abrir loja ao vivo')
    unmount()
    montar({ dado: comHoje(0), falhou: false, tentarDeNovo: vi.fn() })
    expect(screen.getByTestId('numero-visitas-hoje').textContent).toBe('0')
  })

  it('o toque abre `/ao-vivo` com `{ doApp: true, periodo }`', () => {
    montar({ dado: movimento(), falhou: false, tentarDeNovo: vi.fn() })
    fireEvent.click(cartao())
    expect(screen.getByTestId('destino').textContent).toBe('/ao-vivo {"doApp":true,"periodo":"ontem"}')
  })
})

describe('carregando', () => {
  it('o traço no lugar do número, `aria-busy`, o nome de carregando — e o toque continua abrindo', () => {
    montar({ dado: undefined, falhou: false, tentarDeNovo: vi.fn() })
    expect(cartao()).toHaveAccessibleName('Visitas hoje, carregando. Abrir loja ao vivo')
    expect(cartao().getAttribute('aria-busy')).toBe('true')
    expect(cartao().querySelectorAll('.animate-pulse')).toHaveLength(1)
    expect(cartao().textContent).not.toMatch(/\d/)
    expect(cartao().textContent).not.toContain(FALHA_DE_LEITURA)
    fireEvent.click(cartao())
    expect(screen.getByTestId('destino').textContent).toBe('/ao-vivo {"doApp":true,"periodo":"ontem"}')
  })
})

describe('em falha', () => {
  it('"Não consegui carregar." no lugar do número, o nome de falha, e o toque RELÊ sem navegar', () => {
    const tentarDeNovo = vi.fn()
    montar({ dado: undefined, falhou: true, tentarDeNovo })
    expect(cartao()).toHaveAccessibleName('Visitas hoje: não consegui carregar. Tentar de novo')
    expect(cartao()).toHaveTextContent(FALHA_DE_LEITURA)
    expect(cartao().textContent).not.toMatch(/\d/)
    expect(cartao().hasAttribute('aria-busy')).toBe(false)
    expect(cartao().querySelectorAll('.animate-pulse')).toHaveLength(0)
    fireEvent.click(cartao())
    expect(tentarDeNovo).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('destino')).toBeNull()
  })
})
