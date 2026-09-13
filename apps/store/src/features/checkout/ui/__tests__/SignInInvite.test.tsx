import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useAuthUiStore } from '@/features/auth/model/authUiStore'
import SignInInvite from '../SignInInvite'

/**
 * `ENT-01` … `ENT-07` — o convite para entrar dentro do checkout.
 *
 * ⚠️ **A fiação NÃO é provada aqui.** Montar `<SignInInvite />` neste arquivo prova o componente e
 * nada mais: apagá-lo de `CheckoutPage.tsx` deixaria todos estes casos verdes com o convite fora da
 * loja. Quem prova que ele está na página é `CheckoutPage.test.tsx`, renderizando a página real —
 * é a lição que a feature `44` custou uma rodada de verificação para aprender.
 */

const { authUser } = vi.hoisted(() => ({ authUser: { current: null as { id: string } | null } }))
vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => ({ user: authUser.current }) }))
vi.mock('@/features/auth', async () => ({
  useAuthUiStore: (await vi.importActual<typeof import('@/features/auth/model/authUiStore')>(
    '@/features/auth/model/authUiStore',
  )).useAuthUiStore,
}))

beforeEach(() => {
  authUser.current = null
  useAuthUiStore.getState().close()
})

describe('SignInInvite — quando aparece (ENT-01, ENT-04)', () => {
  it('sem sessão, convida', () => {
    render(<SignInInvite />)

    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByText('Já comprou aqui?')).toBeInTheDocument()
  })

  it('COM sessão, não renderiza nada', () => {
    // O par inverso. Sem ele, um convite que aparecesse sempre passaria no primeiro caso.
    authUser.current = { id: 'usr-1' }
    const { container } = render(<SignInInvite />)

    expect(container).toBeEmptyDOMElement()
  })
})

describe('SignInInvite — o que o clique faz (ENT-02)', () => {
  it('abre o overlay com `returnTo` no próprio checkout', () => {
    // `returnTo === '/checkout'` é o que faz `finish()` **não navegar** ao concluir (`ENT-03`): o
    // fluxo do `useAuthFlow` compara com `window.location.pathname` e só fecha. Sem isso, entrar
    // recarregaria a rota e o rascunho de `sessionStorage` reapareceria numa árvore nova.
    render(<SignInInvite />)

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    const estado = useAuthUiStore.getState()
    expect(estado.isOpen).toBe(true)
    expect(estado.returnTo).toBe('/checkout')
  })

  it('o overlay abre no passo de entrada, não num passo do meio', () => {
    render(<SignInInvite />)

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(useAuthUiStore.getState().step).toBe('entry')
  })
})

describe('SignInInvite — a forma (ENT-06, ENT-07)', () => {
  it('o ícone NÃO é marca de provedor de identidade', () => {
    // O botão abre o overlay inteiro — código, senha e Google. Um "G" colorido prometeria um
    // caminho só. A régua é a cor da marca do Google, que é o que um SVG dela traria.
    const { container } = render(<SignInInvite />)

    expect(container.innerHTML).not.toContain('4285F4')
    expect(container.innerHTML).not.toContain('EA4335')
    expect(screen.queryByText(/google/i)).not.toBeInTheDocument()
  })

  it('o botão tem os 44px da premissa mobile, por token exato', () => {
    // `h-11` é substring de `min-h-11`: conferir por `includes` aprovaria o token errado.
    render(<SignInInvite />)

    const botao = screen.getByRole('button', { name: 'Entrar' })
    expect(botao.className.split(/\s+/)).toContain('min-h-11')
  })

  it('a faixa embrulha em vez de estourar a largura', () => {
    // jsdom devolve 0 para toda medida de layout, então o que se prova é a **forma** que permite o
    // embrulho. A medida de verdade é de navegador, em 390 — dívida declarada.
    render(<SignInInvite />)

    const faixa = screen.getByRole('region', { name: 'Já tem conta' })
    const classes = faixa.className.split(/\s+/)
    expect(classes).toContain('flex-wrap')
    expect(classes.some((c) => /^(min-)?w-\[\d/.test(c))).toBe(false)
  })

  it('a copy não promete tempo nem usa urgência fabricada', () => {
    // O board diz "finaliza em 20 segundos". Numa loja memorial, pressa não é argumento.
    const { container } = render(<SignInInvite />)

    expect(container.textContent).not.toMatch(/segundo|minuto|rápido|agora|última|corre|!/i)
  })

  it('o botão de ação não é a pílula sólida — essa é do CTA de pagar', () => {
    render(<SignInInvite />)

    const classes = screen.getByRole('button', { name: 'Entrar' }).className
    expect(classes).toContain('border-2')
    expect(classes).not.toContain('bg-estrelinha-primary')
  })
})
