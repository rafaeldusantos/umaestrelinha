import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `/admin/conta` (feature 48).
 *
 * **`ChangePasswordCard` NÃO é mockado.** O que esta tela entrega é justamente montá-lo — apagar
 * `<ChangePasswordCard />` do arquivo tem de reprovar aqui. Um teste que compusesse a árvore por
 * conta própria passaria com o cartão sumido do painel inteiro.
 */

const ctx = vi.hoisted(() => ({
  current: {
    user: { id: 'u1', email: 'adri@exemplo.invalid' } as unknown,
    customer: { name: 'Adri Muniz' } as unknown,
    changeOwnPassword: vi.fn(async () => ({ error: null })),
  },
}))
vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => ctx.current }))

import AdminAccountPage from './AdminAccountPage'

beforeEach(() => {
  ctx.current = {
    user: { id: 'u1', email: 'adri@exemplo.invalid' },
    customer: { name: 'Adri Muniz' },
    changeOwnPassword: vi.fn(async () => ({ error: null })),
  }
})

describe('AdminAccountPage', () => {
  it('mostra quem está conectada — nome e e-mail', () => {
    render(<AdminAccountPage />)

    expect(screen.getByText('Adri Muniz')).toBeInTheDocument()
    expect(screen.getByText('adri@exemplo.invalid')).toBeInTheDocument()
  })

  it('USR-09: a PÁGINA monta o cartão de senha, com os três campos', () => {
    // O caso que reprova se `<ChangePasswordCard />` sair de `AdminAccountPage.tsx`.
    render(<AdminAccountPage />)

    expect(screen.getByLabelText('Senha atual')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha nova')).toBeInTheDocument()
    expect(screen.getByLabelText('Repita a senha nova')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trocar senha' })).toBeInTheDocument()
  })

  it('sem nome na ficha, mostra um traço em vez de "undefined"', () => {
    ctx.current = { ...ctx.current, customer: null }
    render(<AdminAccountPage />)

    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('diz a quem pedir para mudar nome ou e-mail — esta tela não os edita', () => {
    // A tela troca senha e só. Sem a frase, a dona procura um campo editável que não existe.
    render(<AdminAccountPage />)

    expect(
      screen.getByText(/peça a quem administra os acessos/i),
    ).toBeInTheDocument()
  })
})
