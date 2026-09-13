import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminUser } from '@/features/admin-users/api/useAdminUsers'

/**
 * `/admin/usuarios` — `USR-20`, `USR-22`, `USR-26`, `USR-31`, `USR-32`, `USR-35`.
 *
 * **Os diálogos NÃO são mockados de propósito.** O defeito que a feature 44 quase entregou foi um
 * teste que montava a própria árvore: `<ProductInfo />` e `<MaterialDrawer />` escritos lado a lado
 * dentro do arquivo de teste. Apagar a gaveta da página fazia ela sumir da loja com 2828 testes
 * verdes. Aqui quem monta é `AdminUsersPage` — apagar `<DeleteAccountDialog />` dela reprova.
 */

const { useAdminUsersMock } = vi.hoisted(() => ({ useAdminUsersMock: vi.fn() }))
vi.mock('@/features/admin-users/api/useAdminUsers', () => ({
  useAdminUsers: useAdminUsersMock,
}))

import AdminUsersPage from './AdminUsersPage'

const ADRI = '11111111-1111-1111-1111-111111111111'
const ANA = '22222222-2222-2222-2222-222222222222'

const usuario = (over: Partial<AdminUser> = {}): AdminUser => ({
  id: ANA,
  email: 'ana@exemplo.invalid',
  name: 'Ana Helena',
  // Meio-dia UTC, e não meia-noite: `00:00:00Z` cai no dia ANTERIOR em qualquer fuso a oeste de
  // Greenwich — inclusive o de Porto Alegre, onde a loja opera. Com a fixture à meia-noite, o teste
  // mediria o fuso da máquina em vez da tela (a mesma família de `storeOrigin.test.ts`).
  created_at: '2026-05-05T12:00:00Z',
  last_sign_in_at: '2026-09-10T12:00:00Z',
  is_self: false,
  ...over,
})

/** Datas DIVERGENTES das da Ana: com as duas linhas iguais, ler a linha errada passaria (`L-013`). */
const EU = usuario({
  id: ADRI,
  email: 'adri@exemplo.invalid',
  name: 'Adri Muniz',
  is_self: true,
  created_at: '2026-01-02T12:00:00Z',
  last_sign_in_at: '2026-09-13T12:00:00Z',
})

const create = vi.fn(async () => null)
const update = vi.fn(async () => null)
const revoke = vi.fn(async () => null)
const remove = vi.fn(async () => null)
const resetPassword = vi.fn(async () => null)
const refetch = vi.fn()

const montar = (over: Record<string, unknown> = {}) => {
  useAdminUsersMock.mockReturnValue({
    users: [EU, usuario()],
    loading: false,
    error: null,
    refetch,
    create,
    update,
    revoke,
    remove,
    resetPassword,
    ...over,
  })
  return render(<AdminUsersPage />)
}

beforeEach(() => {
  for (const m of [create, update, revoke, remove, resetPassword, refetch]) m.mockReset()
  for (const m of [create, update, revoke, remove, resetPassword]) m.mockResolvedValue(null)
})

describe('AdminUsersPage — a listagem', () => {
  it('USR-20: mostra nome, e-mail e último acesso de cada pessoa', () => {
    montar()
    expect(screen.getByText('Ana Helena')).toBeInTheDocument()
    expect(screen.getByText('ana@exemplo.invalid')).toBeInTheDocument()
    expect(screen.getByText('10/09/2026')).toBeInTheDocument()
  })

  it('quem nunca entrou lê "nunca entrou", e não uma data vazia', () => {
    montar({ users: [usuario({ last_sign_in_at: null })] })
    expect(screen.getByText('nunca entrou')).toBeInTheDocument()
  })

  it('marca quem está logada com o selo "você"', () => {
    montar()
    expect(screen.getByText('você')).toBeInTheDocument()
  })

  it('USR-26: erro de leitura mostra o motivo e o "Tentar de novo" — não a tabela vazia', () => {
    // "Quebrou" e "não há ninguém" são estados diferentes. Aqui a diferença é maior que o normal:
    // "nenhum acesso" seria um painel em que ninguém entra, se fosse verdade.
    montar({ users: [], error: 'Não foi possível ler quem tem acesso ao painel.' })

    // O rótulo da tela e o motivo do servidor são textos DISTINTOS: o primeiro diz o que falhou, o
    // segundo diz por quê. Colapsá-los faria a tela repetir a mesma frase duas vezes.
    expect(screen.getByText('Não conseguimos carregar a lista de acessos.')).toBeInTheDocument()
    expect(screen.getByText('Não foi possível ler quem tem acesso ao painel.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(refetch).toHaveBeenCalled()
  })

  it('lista vazia SEM erro tem texto próprio, distinto do de falha', () => {
    montar({ users: [], error: null })
    expect(screen.getByText('Nenhum acesso cadastrado.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument()
  })
})

describe('AdminUsersPage — as duas ações destrutivas', () => {
  it('USR-13: "Remover do painel" chama `revoke`, e NÃO `remove`', () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Remover Ana Helena do painel' }))

    expect(revoke).toHaveBeenCalledWith(ANA)
    expect(remove).not.toHaveBeenCalled()
  })

  it('remover com sucesso diz em texto que a conta e o histórico FICAM', async () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Remover Ana Helena do painel' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Ana Helena não tem mais acesso ao painel. A conta e o histórico ficam.',
    )
  })

  it('a recusa de remover aparece em `role="alert"`', async () => {
    revoke.mockResolvedValue(
      'Este é o único acesso ao painel. Crie outro antes de remover este — sem nenhum, ninguém entra.',
    )
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Remover Ana Helena do painel' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('único acesso ao painel')
  })

  it('USR-35: "Apagar conta" abre o diálogo de confirmação — e a PÁGINA é quem o monta', async () => {
    // O caso que reprova se `<DeleteAccountDialog />` sair de `AdminUsersPage.tsx`.
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Apagar a conta de Ana Helena' }))

    expect(await screen.findByText('Apagar a conta de Ana Helena?')).toBeInTheDocument()
    // E ele não apaga nada só por abrir.
    expect(remove).not.toHaveBeenCalled()
  })

  it('USR-35: apagar só acontece depois de digitar o e-mail', async () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Apagar a conta de Ana Helena' }))

    const confirmar = await screen.findByRole('button', { name: /Apagar conta/ })
    expect(confirmar).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/Para confirmar, digite/), {
      target: { value: 'ana@exemplo.invalid' },
    })
    fireEvent.click(confirmar)

    await waitFor(() => expect(remove).toHaveBeenCalledWith(ANA))
  })

  it('USR-32: a saída "Remover do painel" DENTRO do diálogo chama `revoke` e fecha', async () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Apagar a conta de Ana Helena' }))
    await screen.findByText('Apagar a conta de Ana Helena?')

    fireEvent.click(screen.getByRole('button', { name: 'Remover do painel' }))

    await waitFor(() => expect(revoke).toHaveBeenCalledWith(ANA))
    expect(remove).not.toHaveBeenCalled()
  })

  it('USR-14/USR-34: as duas ações ficam DESABILITADAS na própria linha, com motivo', () => {
    // Recusa que só aparece depois do clique faz a dona pensar que algo quebrou.
    montar()

    const remover = screen.getByRole('button', { name: 'Remover Adri Muniz do painel' })
    const apagar = screen.getByRole('button', { name: 'Apagar a conta de Adri Muniz' })

    expect(remover).toBeDisabled()
    expect(apagar).toBeDisabled()
    expect(remover).toHaveAttribute('title', 'Você não pode remover o seu próprio acesso')
    expect(apagar).toHaveAttribute('title', 'Você não pode apagar a sua própria conta')
  })

  it('as ações da linha de OUTRA pessoa continuam habilitadas', () => {
    // O sentido inverso: sem ele, uma página que desabilitasse tudo passaria no caso acima.
    montar()
    expect(screen.getByRole('button', { name: 'Remover Ana Helena do painel' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Apagar a conta de Ana Helena' })).toBeEnabled()
  })
})

describe('AdminUsersPage — criar, editar e reenviar', () => {
  it('USR-22: "Novo acesso" abre o editor — e a PÁGINA é quem o monta', async () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: /Novo acesso/ }))

    expect(await screen.findByText('Novo acesso ao painel')).toBeInTheDocument()
  })

  it('criar pelo editor chama `create` com os três campos', async () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: /Novo acesso/ }))
    await screen.findByText('Novo acesso ao painel')

    fireEvent.change(screen.getByLabelText(/^Nome$/), { target: { value: 'Bia' } })
    fireEvent.change(screen.getByLabelText(/^E-mail$/), { target: { value: 'bia@exemplo.invalid' } })
    fireEvent.change(screen.getByLabelText(/^Senha inicial$/), { target: { value: 'segredo123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar acesso' }))

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        name: 'Bia',
        email: 'bia@exemplo.invalid',
        password: 'segredo123',
      }),
    )
  })

  it('editar abre o editor JÁ preenchido, e salva por `update`', async () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Editar Ana Helena' }))

    const nome = await screen.findByLabelText(/^Nome$/)
    expect(nome).toHaveValue('Ana Helena')

    fireEvent.change(nome, { target: { value: 'Ana H. Coelho' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(ANA, 'Ana H. Coelho', 'ana@exemplo.invalid'),
    )
    expect(create).not.toHaveBeenCalled()
  })

  it('USR-18: reenviar link chama `resetPassword` e confirma NOMEANDO o endereço', async () => {
    montar()
    fireEvent.click(
      screen.getByRole('button', { name: 'Enviar link de redefinição para ana@exemplo.invalid' }),
    )

    expect(resetPassword).toHaveBeenCalledWith(ANA)
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Enviamos um código de redefinição para ana@exemplo.invalid.',
    )
  })

  it('USR-30: envio recusado NÃO diz que enviou', async () => {
    // Dizer "enviado" sobre um envio recusado faria a Adri esperar um e-mail que não vem.
    resetPassword.mockResolvedValue('Aguarde alguns segundos para reenviar')
    montar()
    fireEvent.click(
      screen.getByRole('button', { name: 'Enviar link de redefinição para ana@exemplo.invalid' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('Aguarde alguns segundos')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
