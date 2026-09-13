import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminUserEditorDialog from './AdminUserEditorDialog'

// `USR-04`, `USR-05`, `USR-06`, `USR-21`, `USR-28`.
//
// A régua que o arquivo existe para sustentar: a recusa é a MESMA de `core/admin-users`, e o modo de
// edição não pede senha.

const onSave = vi.fn(async () => null)
const onClose = vi.fn()

beforeEach(() => {
  onSave.mockReset().mockResolvedValue(null)
  onClose.mockReset()
})

const abrir = (draft?: { id?: string; name: string; email: string }) =>
  render(
    <AdminUserEditorDialog open draft={draft} onClose={onClose} onSave={onSave} />,
  )

const digitar = (rotulo: RegExp, valor: string) =>
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } })

describe('AdminUserEditorDialog — criar', () => {
  it('manda nome, e-mail e senha ao salvar', async () => {
    abrir()
    digitar(/^Nome$/, 'Ana Helena')
    digitar(/^E-mail$/, 'ana@exemplo.invalid')
    digitar(/^Senha inicial$/, 'segredo123')

    fireEvent.click(screen.getByRole('button', { name: 'Criar acesso' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith('Ana Helena', 'ana@exemplo.invalid', 'segredo123'),
    )
  })

  it('fecha depois de salvar', async () => {
    abrir()
    digitar(/^Nome$/, 'Ana')
    digitar(/^E-mail$/, 'ana@exemplo.invalid')
    digitar(/^Senha inicial$/, 'segredo123')
    fireEvent.click(screen.getByRole('button', { name: 'Criar acesso' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it.each([
    ['USR-21', '  ', 'ana@exemplo.invalid', 'segredo123', 'Informe o nome de quem vai acessar'],
    ['USR-05', 'Ana', 'sem-arroba', 'segredo123', 'E-mail inválido'],
    ['USR-06', 'Ana', 'ana@exemplo.invalid', 'abc', 'A senha precisa de pelo menos 6 caracteres'],
  ])('%s: exibe a recusa em `role="alert"` e NÃO chama onSave', async (_id, nome, email, senha, esperado) => {
    abrir()
    digitar(/^Nome$/, nome)
    digitar(/^E-mail$/, email)
    digitar(/^Senha inicial$/, senha)

    fireEvent.click(screen.getByRole('button', { name: 'Criar acesso' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(esperado)
    // A metade que importa: barrar cedo é o que impede a dona de perder o que digitou.
    expect(onSave).not.toHaveBeenCalled()
  })

  it('a recusa do SERVIDOR também aparece, e o diálogo NÃO fecha', async () => {
    onSave.mockResolvedValue('Esta pessoa já tem acesso ao painel.')
    abrir()
    digitar(/^Nome$/, 'Ana')
    digitar(/^E-mail$/, 'ana@exemplo.invalid')
    digitar(/^Senha inicial$/, 'segredo123')

    fireEvent.click(screen.getByRole('button', { name: 'Criar acesso' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Esta pessoa já tem acesso ao painel.')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('o campo de senha nasce oculto, e o botão alterna com rótulo acessível', () => {
    abrir()
    const campo = screen.getByLabelText(/^Senha inicial$/)
    expect(campo).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(screen.getByLabelText(/^Senha inicial$/)).toHaveAttribute('type', 'text')

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar senha' }))
    expect(screen.getByLabelText(/^Senha inicial$/)).toHaveAttribute('type', 'password')
  })

  it('o botão de mostrar senha NÃO perde a posição — `absolute` presente, `relative` ausente', () => {
    // O defeito medido na loja em 2026-09-13: `TAP_44` começa com `relative`, e juntá-lo a um
    // controle `absolute` derruba a posição nas duas formas de compor classe. Aqui o alvo de 44px
    // vem de `w-11 h-full`, sem auxiliar.
    abrir()
    const classes = screen.getByRole('button', { name: 'Mostrar senha' }).className.split(/\s+/)

    expect(classes).toContain('absolute')
    expect(classes).not.toContain('relative')
    expect(classes).toContain('w-11')
  })

  it('diz que o painel NÃO envia a senha por e-mail', () => {
    // A frase existe porque o caminho da senha inicial é fora do sistema. Sem ela, a dona espera um
    // e-mail que não vai chegar.
    abrir()
    expect(screen.getByText(/o painel não envia esta senha por e-mail/i)).toBeInTheDocument()
  })
})

describe('AdminUserEditorDialog — editar', () => {
  const DRAFT = { id: 'u1', name: 'Ana Helena', email: 'ana@exemplo.invalid' }

  it('preenche os campos com o rascunho', () => {
    abrir(DRAFT)
    expect(screen.getByLabelText(/^Nome$/)).toHaveValue('Ana Helena')
    expect(screen.getByLabelText(/^E-mail$/)).toHaveValue('ana@exemplo.invalid')
  })

  it('USR-28: NÃO pede senha — o campo não existe', () => {
    // Exigir aqui uma senha que a ação não usa forçaria uma segunda régua só para a edição, e é
    // assim que as duas passam a divergir.
    abrir(DRAFT)
    expect(screen.queryByLabelText(/^Senha inicial$/)).not.toBeInTheDocument()
  })

  it('salva sem senha, e a régua NÃO recusa por senha vazia', async () => {
    abrir(DRAFT)
    digitar(/^Nome$/, 'Ana H. Coelho')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith('Ana H. Coelho', 'ana@exemplo.invalid', ''),
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('o botão diz "Salvar", e o título diz "Editar acesso"', () => {
    abrir(DRAFT)
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument()
    expect(screen.getByText('Editar acesso')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Criar acesso' })).not.toBeInTheDocument()
  })

  it('editar ainda recusa nome vazio', async () => {
    abrir(DRAFT)
    digitar(/^Nome$/, '   ')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Informe o nome de quem vai acessar')
    expect(onSave).not.toHaveBeenCalled()
  })
})
