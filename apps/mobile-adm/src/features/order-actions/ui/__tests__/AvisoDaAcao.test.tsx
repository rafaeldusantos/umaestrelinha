// Feature `75` · T21 — a confirmação de uma ação (`MAA-31` posição, `MAA-33` quebra, `MAA-34`,
// `MAA-35`, Q6, Q7/TQ9). O host é UM, no layout; o texto vem pronto de `core` (`actionConfirmation`).
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ALTURA_DA_BARRA, AVISO_ACIMA_DA_BARRA, AVISO_ACIMA_DO_RODAPE, AVISO_NO_FIM } from '@/shared/ui/alturas'

import { esquecerAcoes } from '../../model/esquecerAcoes'
import { mostrarAviso } from '../../model/avisos'
import { registrarRodape } from '../../model/rodape'
import AvisoDaAcao, { PRAZO_DO_AVISO_MS } from '../AvisoDaAcao'

const tokens = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
const host = () => screen.getByTestId('aviso-da-acao')
const semAviso = () => expect(screen.queryByTestId('aviso-da-acao')).toBeNull()
const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

beforeEach(() => {
  esquecerAcoes()
  vi.useFakeTimers({ shouldAdvanceTime: false })
})
afterEach(() => {
  vi.useRealTimers()
  act(() => esquecerAcoes())
})

describe('a confirmação (MAA-35, Q7)', () => {
  it('é região viva `role="status"` — e sem aviso não há região nenhuma (o puxar tem a dele)', () => {
    render(<AvisoDaAcao />)
    semAviso()
    act(() => mostrarAviso({ titulo: 'Rastreio salvo.', frase: 'O código ficou no pedido.' }))
    expect(screen.getByRole('status')).toBe(host())
    expect(host()).toHaveAttribute('aria-live', 'polite')
    expect(host()).toHaveAttribute('aria-atomic', 'true')
  })

  it('desenha o título e a frase prontos, sem roubar o foco', () => {
    render(
      <>
        <button type="button">antes</button>
        <AvisoDaAcao />
      </>,
    )
    const botao = screen.getByRole('button', { name: 'antes' })
    botao.focus()
    act(() => mostrarAviso({ titulo: 'Material registrado.', frase: 'O pedido #0251 foi para a bancada.' }))
    expect(host()).toHaveTextContent('Material registrado.')
    expect(host()).toHaveTextContent('O pedido #0251 foi para a bancada.')
    expect(document.activeElement).toBe(botao)
  })

  it('some sozinha em 5 s (TQ9) — e não antes', async () => {
    expect(PRAZO_DO_AVISO_MS).toBe(5000)
    render(<AvisoDaAcao />)
    act(() => mostrarAviso({ titulo: 'Rastreio salvo.', frase: 'O código ficou no pedido.' }))
    await andar(4900)
    expect(host()).toHaveTextContent('Rastreio salvo.')
    await andar(100)
    semAviso()
  })

  it('uma nova SUBSTITUI a anterior e REINICIA o prazo — inclusive com a mesma frase', async () => {
    render(<AvisoDaAcao />)
    act(() => mostrarAviso({ titulo: 'Material registrado.', frase: 'O pedido #0251 foi para a bancada.' }))
    await andar(3000)
    act(() => mostrarAviso({ titulo: 'Rastreio salvo.', frase: 'O código ficou no pedido.' }))
    expect(host()).not.toHaveTextContent('Material registrado.')
    // O prazo da primeira terminaria em 5 s; a nova continua aos 4,9 s DELA.
    await andar(4900)
    expect(host()).toHaveTextContent('Rastreio salvo.')
    await andar(100)
    semAviso()

    act(() => mostrarAviso({ titulo: 'Rastreio salvo.', frase: 'O código ficou no pedido.' }))
    await andar(3000)
    act(() => mostrarAviso({ titulo: 'Rastreio salvo.', frase: 'O código ficou no pedido.' }))
    await andar(4900)
    expect(host()).toHaveTextContent('Rastreio salvo.')
  })

  it('o texto QUEBRA: nenhum `truncate` nem `whitespace-nowrap` no aviso (MAA-33)', () => {
    render(<AvisoDaAcao />)
    act(() => mostrarAviso({ titulo: 'Material registrado.', frase: 'O pedido #0251 foi para a bancada. Juliana recebe a confirmação por e-mail.' }))
    for (const el of [host(), ...host().querySelectorAll('*')]) {
      expect(tokens(el)).not.toContain('truncate')
      expect(tokens(el)).not.toContain('whitespace-nowrap')
    }
    expect(tokens(host().querySelector('[data-parte="cartao"]'))).toContain('[overflow-wrap:anywhere]')
  })

  it('não se move: nenhuma classe de movimento no aviso (MAA-34)', () => {
    render(<AvisoDaAcao />)
    act(() => mostrarAviso({ titulo: 'Rastreio salvo.', frase: 'O código ficou no pedido.' }))
    for (const el of [host(), ...host().querySelectorAll('*')]) {
      for (const t of tokens(el)) expect(t).not.toMatch(/^(?:[a-z-]+:)*(?:transition|animate)(?!-none)/)
    }
  })
})

describe('a posição (MAA-31, design §3.6)', () => {
  it('sem rodapé: acima da barra (+ o inset), fixo e com o gutter de 16 px', () => {
    render(<AvisoDaAcao />)
    act(() => mostrarAviso({ titulo: 'Rastreio salvo.', frase: 'O código ficou no pedido.' }))
    expect(tokens(host())).toEqual(expect.arrayContaining(['fixed', 'inset-x-0', 'px-4', AVISO_ACIMA_DA_BARRA]))
    expect(tokens(host())).not.toContain(AVISO_ACIMA_DO_RODAPE)
    expect(AVISO_ACIMA_DA_BARRA).toContain(ALTURA_DA_BARRA)
    expect(AVISO_ACIMA_DA_BARRA).toContain('env(safe-area-inset-bottom)')
  })

  it('com o rodapé montado (o detalhe, sem barra): acima do rodapé — e volta quando o rodapé sai', () => {
    render(<AvisoDaAcao />)
    act(() => mostrarAviso({ titulo: 'Rastreio salvo.', frase: 'O código ficou no pedido.' }))
    let sair = () => {}
    act(() => {
      sair = registrarRodape()
    })
    expect(tokens(host())).toContain(AVISO_ACIMA_DO_RODAPE)
    expect(tokens(host())).not.toContain(AVISO_ACIMA_DA_BARRA)
    // A altura medida do rodapé já inclui o inset; a barra não está na tela.
    expect(AVISO_ACIMA_DO_RODAPE).not.toContain(`calc(${ALTURA_DA_BARRA}+`)
    expect(AVISO_ACIMA_DO_RODAPE).toContain('var(--altura-do-rodape')
    act(() => sair())
    expect(tokens(host())).toContain(AVISO_ACIMA_DA_BARRA)
  })

  it('numa tela sem barra e sem rodapé (o detalhe sem ação): no fim, acima do inset', () => {
    render(<AvisoDaAcao comBarra={false} />)
    act(() => mostrarAviso({ titulo: 'Rastreio salvo.', frase: 'O código ficou no pedido.' }))
    expect(tokens(host())).toContain(AVISO_NO_FIM)
    expect(tokens(host())).not.toContain(AVISO_ACIMA_DA_BARRA)
  })
})
