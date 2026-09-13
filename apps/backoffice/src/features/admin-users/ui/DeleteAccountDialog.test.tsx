import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DeleteAccountDialog from './DeleteAccountDialog'

// `USR-35` — a confirmação por digitação do e-mail.
//
// O botão desabilitado é a asserção central, e ela tem de ser medida nos DOIS sentidos: só "desabilita
// com texto errado" passaria num diálogo que nunca habilita.

const onConfirm = vi.fn(async () => null)
const onClose = vi.fn()
const onRevoke = vi.fn()

const EMAIL = 'ana@exemplo.invalid'

beforeEach(() => {
  onConfirm.mockReset().mockResolvedValue(null)
  onClose.mockReset()
  onRevoke.mockReset()
})

const abrir = (email = EMAIL) =>
  render(
    <DeleteAccountDialog
      open
      email={email}
      name="Ana Helena"
      onClose={onClose}
      onRevoke={onRevoke}
      onConfirm={onConfirm}
    />,
  )

const botaoApagar = () => screen.getByRole('button', { name: /Apagar conta/ })
const digitar = (valor: string) =>
  fireEvent.change(screen.getByLabelText(/Para confirmar, digite/), { target: { value: valor } })

describe('DeleteAccountDialog — a confirmação', () => {
  it('nasce com o botão DESABILITADO', () => {
    abrir()
    expect(botaoApagar()).toBeDisabled()
  })

  it('habilita quando o e-mail casa exatamente', () => {
    // O outro sentido. Sem ele, um diálogo que nunca habilita passaria em todos os casos de recusa.
    abrir()
    digitar(EMAIL)
    expect(botaoApagar()).toBeEnabled()
  })

  it.each([
    ['quase certo, um caractere a menos', 'ana@exemplo.invali'],
    ['outro endereço', 'adri@exemplo.invalid'],
    ['vazio', ''],
    ['só o nome antes do arroba', 'ana'],
  ])('continua desabilitado com %s', (_rotulo, texto) => {
    abrir()
    digitar(texto)
    expect(botaoApagar()).toBeDisabled()
  })

  it('aceita caixa diferente e espaço nas bordas — quem copia e cola já leu o endereço', () => {
    abrir()
    digitar('  Ana@Exemplo.INVALID  ')
    expect(botaoApagar()).toBeEnabled()
  })

  it('e-mail VAZIO na conta nunca habilita, mesmo digitando vazio', () => {
    // A borda que uma comparação ingênua abre: `'' === ''` liberaria o botão sem confirmação
    // nenhuma, justamente numa linha cujos dados vieram incompletos.
    abrir('')
    digitar('')
    expect(botaoApagar()).toBeDisabled()
  })
})

describe('DeleteAccountDialog — o que ele faz', () => {
  it('chama `onConfirm` e fecha quando apaga', async () => {
    abrir()
    digitar(EMAIL)
    fireEvent.click(botaoApagar())

    await waitFor(() => expect(onConfirm).toHaveBeenCalled())
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('a recusa do servidor aparece em `role="alert"` e o diálogo NÃO fecha', async () => {
    onConfirm.mockResolvedValue(
      'Esta conta tem 7 pedidos no histórico da loja, e apagá-la deixaria esses registros sem dono. Use “Remover do painel”: o acesso sai e o histórico fica.',
    )
    abrir()
    digitar(EMAIL)
    fireEvent.click(botaoApagar())

    expect(await screen.findByRole('alert')).toHaveTextContent('7 pedidos')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('USR-32: oferece “Remover do painel” como saída, e ela chama `onRevoke`', () => {
    // A metade acionável da recusa. Sem o botão aqui, a dona lê "use Remover do painel" e tem de
    // fechar o diálogo para achá-lo.
    abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Remover do painel' }))

    expect(onRevoke).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('explica o que é destruído, e que a saída reversível existe', () => {
    abrir()
    expect(screen.getByText(/ficha de cliente e a lista de desejos/i)).toBeInTheDocument()
    expect(screen.getByText(/Não há como desfazer/i)).toBeInTheDocument()
  })

  it('nomeia a pessoa no título — a conta que está na frente', () => {
    abrir()
    expect(screen.getByText('Apagar a conta de Ana Helena?')).toBeInTheDocument()
  })

  it('o campo digitado é limpo ao reabrir', () => {
    const { rerender } = abrir()
    digitar(EMAIL)
    expect(botaoApagar()).toBeEnabled()

    rerender(
      <DeleteAccountDialog
        open={false}
        email={EMAIL}
        name="Ana Helena"
        onClose={onClose}
        onRevoke={onRevoke}
        onConfirm={onConfirm}
      />,
    )
    rerender(
      <DeleteAccountDialog
        open
        email={EMAIL}
        name="Ana Helena"
        onClose={onClose}
        onRevoke={onRevoke}
        onConfirm={onConfirm}
      />,
    )

    // Sem a limpeza, reabrir sobre OUTRA pessoa manteria o botão habilitado com o texto da anterior.
    expect(botaoApagar()).toBeDisabled()
  })
})
