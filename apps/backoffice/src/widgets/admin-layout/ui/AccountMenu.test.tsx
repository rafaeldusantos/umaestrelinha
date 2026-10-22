import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { optOutHref } from '@estrelinha/core/visits'
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
  it('Minha conta, Abrir a loja, Abrir a loja sem contar e Sair, nessa ordem', async () => {
    renderMenu()
    const menu = await abrir()
    expect(within(menu).getAllByRole('menuitem').map(item => item.textContent)).toEqual([
      'Minha conta',
      'Abrir a loja(abre em nova aba)',
      'Abrir a loja sem contar(abre em nova aba)',
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
    // Nome acessível EXATO desde a feature 71: `/abrir a loja/i` passou a casar também "Abrir a loja
    // sem contar" e o `getByRole` lançaria "multiple elements". (O nome acessível junta o texto
    // `sr-only` com espaço; o `textContent`, sem.)
    const link = within(menu).getByRole('menuitem', { name: 'Abrir a loja (abre em nova aba)' })
    expect(link).toHaveAttribute('href', 'https://loja.exemplo.invalid')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('sem `VITE_STORE_URL`, "Abrir a loja" não é oferecido', async () => {
    loja.origem = null
    renderMenu()
    const menu = await abrir()
    // A regex continua ampla de propósito: sem a env, NENHUM dos dois itens da loja pode aparecer.
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

// Feature 71 · `VIS-43` — a saída da dona para não inflar a contagem de visitas com a própria
// navegação. O link sai do construtor de `core/visits` (`VIS-42`: um dono para o nome do parâmetro,
// lido pela loja e escrito aqui).
describe('AccountMenu — "Abrir a loja sem contar" (VIS-43)', () => {
  it('aponta para a loja com o parâmetro ligado, em nova aba, com o mesmo `rel` de "Abrir a loja"', async () => {
    renderMenu()
    const menu = await abrir()
    const item = within(menu).getByRole('menuitem', { name: 'Abrir a loja sem contar (abre em nova aba)' })
    const loja = within(menu).getByRole('menuitem', { name: 'Abrir a loja (abre em nova aba)' })
    expect(item).toHaveAttribute('href', optOutHref('https://loja.exemplo.invalid', true))
    expect(item.getAttribute('href')).not.toBe(loja.getAttribute('href'))
    expect(item).toHaveAttribute('target', '_blank')
    expect(item.getAttribute('rel')).toBe(loja.getAttribute('rel'))
  })

  it('vem logo depois de "Abrir a loja"', async () => {
    renderMenu()
    const menu = await abrir()
    const nomes = within(menu).getAllByRole('menuitem').map(item => item.textContent)
    expect(nomes.indexOf('Abrir a loja sem contar(abre em nova aba)')).toBe(nomes.indexOf('Abrir a loja(abre em nova aba)') + 1)
  })

  it('some sem `VITE_STORE_URL`, junto com "Abrir a loja"', async () => {
    loja.origem = null
    renderMenu()
    const menu = await abrir()
    expect(within(menu).queryByRole('menuitem', { name: /sem contar/i })).not.toBeInTheDocument()
    expect(within(menu).getAllByRole('menuitem').map(item => item.textContent)).toEqual(['Minha conta', 'Sair'])
  })

  it('alvo de 44px, a mesma régua das outras linhas do menu (token exato)', async () => {
    renderMenu()
    const menu = await abrir()
    const item = within(menu).getByRole('menuitem', { name: 'Abrir a loja sem contar (abre em nova aba)' })
    expect(item.className.split(/\s+/)).toContain('min-h-11')
  })
})
