import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import AccountMenu, { type AccountMenuVariant } from './AccountMenu'
import { enableRadixSelectInJsdom, RADIX_POINTER_DOWN } from '@/test/radix'

const auth = vi.hoisted(() => ({ user: { email: 'adri@exemplo.invalid' } as { email: string } | null }))
vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => ({ user: auth.user }) }))

// `STORE_URL` é lido no carregamento do módulo, então o valor dependeria do `.env` de quem roda a
// suíte — o teste mediria a máquina, não o código. O dublê devolve o que cada caso pede.
const loja = vi.hoisted(() => ({ origem: 'https://loja.exemplo.invalid' as string | null }))
vi.mock('@/shared/lib/storeOrigin', () => ({ storeOrigin: () => loja.origem }))

const renderMenu = (
  { variant = 'sidebar', pathname = '/admin/pedidos' }: { variant?: AccountMenuVariant; pathname?: string } = {},
) => {
  const onLogout = vi.fn()
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <AccountMenu variant={variant} pathname={pathname} onLogout={onLogout} />
    </MemoryRouter>,
  )
  return { onLogout }
}

const gatilho = () => screen.getByRole('button', { name: /sua conta/i })

/** `pointerDown`, e não `click`: o Radix só abre com `pointerType` de mouse (`test/radix.ts`). */
const abrir = async () => {
  fireEvent.pointerDown(gatilho(), RADIX_POINTER_DOWN)
  return screen.findByRole('menu')
}

beforeAll(enableRadixSelectInJsdom)

beforeEach(() => {
  auth.user = { email: 'adri@exemplo.invalid' }
  loja.origem = 'https://loja.exemplo.invalid'
})

describe('AccountMenu — o gatilho', () => {
  it('nomeia a conta pelo e-mail, e o cartão da sidebar mostra o e-mail escrito', () => {
    renderMenu()
    expect(gatilho()).toHaveAccessibleName('Sua conta: adri@exemplo.invalid')
    expect(within(gatilho()).getByText('adri@exemplo.invalid')).toBeInTheDocument()
  })

  it('no trilho e na barra do celular é só o avatar — nenhum texto visível além da inicial', () => {
    for (const variant of ['rail', 'header'] as const) {
      const { unmount } = render(
        <MemoryRouter>
          <AccountMenu variant={variant} pathname="/admin" onLogout={vi.fn()} />
        </MemoryRouter>,
      )
      expect(gatilho().textContent).toBe('A')
      unmount()
    }
  })

  it('sem sessão carregada, o gatilho continua existindo e diz "Sua conta"', () => {
    auth.user = null
    renderMenu()
    expect(gatilho()).toHaveAccessibleName('Sua conta')
  })

  it('alvo de 44px nas três formas, por token exato', () => {
    for (const variant of ['sidebar', 'rail', 'header'] as const) {
      const { unmount } = render(
        <MemoryRouter>
          <AccountMenu variant={variant} pathname="/admin" onLogout={vi.fn()} />
        </MemoryRouter>,
      )
      const tokens = gatilho().className.split(/\s+/)
      expect(tokens.includes('h-11') || tokens.includes('min-h-11')).toBe(true)
      unmount()
    }
  })

  it('se marca em `/admin/conta`', () => {
    renderMenu({ pathname: '/admin/conta' })
    expect(gatilho()).toHaveAttribute('data-active', 'true')
  })

  it('fora de `/admin/conta` não se marca', () => {
    renderMenu({ pathname: '/admin/contas-a-pagar' })
    expect(gatilho()).not.toHaveAttribute('data-active')
  })
})

describe('AccountMenu — os itens', () => {
  it('Minha conta, Abrir a loja e Sair, nessa ordem', async () => {
    renderMenu()
    const menu = await abrir()
    expect(within(menu).getAllByRole('menuitem').map(item => item.textContent)).toEqual([
      'Minha conta',
      'Abrir a loja(abre em nova aba)',
      'Sair',
    ])
  })

  it('"Minha conta" leva a `/admin/conta`', async () => {
    renderMenu()
    const menu = await abrir()
    expect(within(menu).getByRole('menuitem', { name: 'Minha conta' })).toHaveAttribute('href', '/admin/conta')
  })

  it('"Abrir a loja" aponta para a LOJA, em nova aba — e não para a raiz do painel', async () => {
    // O "Ver Loja" que este item substitui era `<Link to="/">`: o painel não tem a rota `/`, e o
    // clique caía na 404 dele mesmo.
    renderMenu()
    const menu = await abrir()
    const link = within(menu).getByRole('menuitem', { name: /abrir a loja/i })
    expect(link).toHaveAttribute('href', 'https://loja.exemplo.invalid')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('sem `VITE_STORE_URL`, "Abrir a loja" não é oferecido', async () => {
    loja.origem = null
    renderMenu()
    const menu = await abrir()
    expect(within(menu).queryByRole('menuitem', { name: /abrir a loja/i })).not.toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Sair' })).toBeInTheDocument()
  })

  it('"Sair" chama o logout', async () => {
    const { onLogout } = renderMenu()
    const menu = await abrir()
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Sair' }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })

  it('o e-mail aparece no topo do menu aberto, nas três formas', async () => {
    renderMenu({ variant: 'rail' })
    const menu = await abrir()
    expect(within(menu).getByText('adri@exemplo.invalid')).toBeInTheDocument()
  })
})
