// Feature `88` · T12 — o portão de aviso e o diálogo, montados como a página vai montar: um botão que
// chama `pedir`, e o `dialogo` do hook na tela.
//
// `AVS-01`, `AVS-02`, `AVS-04` (o texto com a caixa desmarcada), `AVS-05`, `AVS-07` (o erro fica no
// diálogo), `AVS-19` (a forma do lote), `AVS-22` (a prévia com o pedido), `CRG-07`, `A-02`, `A-06`.
//
// Os nomes dos e-mails aparecem aqui por extenso de propósito: o teste prova que o diálogo os lê de
// `NOTIFICATION_EVENT_NAMES` comparando com o texto que a cliente vê, não com a própria constante.
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const invocacoes = vi.hoisted(() => [] as Array<{ porta: string; body: Record<string, unknown> }>)
vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (porta: string, { body }: { body: Record<string, unknown> }) => {
        invocacoes.push({ porta, body })
        return Promise.resolve({
          data: { subject: 'Seu pedido foi postado', html: '<p>Olá, Ana</p>', text: 'Olá, Ana', sample: false },
          error: null,
        })
      },
    },
  },
}))

import { FALHA_INESPERADA, useNoticeGate, type NoticeRequest } from '..'

const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

const segurada = () => {
  let resolver!: (v: string | null) => void
  const promessa = new Promise<string | null>((ok) => {
    resolver = ok
  })
  return { promessa, resolver }
}

const pedidoDeEnvio = (over: Partial<NoticeRequest> = {}): NoticeRequest => ({
  titulo: 'Marcar como enviado?',
  mudanca: 'O pedido #1042 passa de Em Separação para Enviado',
  confirmar: 'Mudar para Enviado',
  gerundio: 'Mudando para Enviado…',
  cliente: 'ana@exemplo.invalid',
  orderId: 'ord-1042',
  eventos: [{ event: 'order_shipped' }],
  executar: vi.fn(async () => null),
  ...over,
})

function Tela({ req }: { req: () => NoticeRequest }) {
  const { pedir, dialogo, ocupado } = useNoticeGate()
  return (
    <>
      <button onClick={() => pedir(req())}>Marcar como enviado</button>
      <span data-testid="ocupado">{String(ocupado)}</span>
      {dialogo}
    </>
  )
}

const abrir = async () => {
  const origem = screen.getByRole('button', { name: 'Marcar como enviado' })
  origem.focus()
  fireEvent.click(origem)
  return screen.findByRole('dialog')
}

const caixa = () => screen.getByRole('checkbox', { name: /Avisar .* por e-mail/ })

afterEach(() => {
  invocacoes.length = 0
  vi.restoreAllMocks()
})

describe('AVS-02 — o que o diálogo mostra', () => {
  it('título, a mudança, a caixa MARCADA, o nome do e-mail, o e-mail da cliente e um botão com o verbo', async () => {
    render(<Tela req={() => pedidoDeEnvio()} />)
    const d = await abrir()

    expect(within(d).getByRole('heading', { name: 'Marcar como enviado?' })).toBeInTheDocument()
    expect(within(d).getByText('O pedido #1042 passa de Em Separação para Enviado')).toBeInTheDocument()
    expect(caixa()).toBeChecked()
    expect(caixa()).toHaveAccessibleName(/^Avisar a cliente por e-mail/)
    expect(within(d).getByText('Pedido postado')).toBeInTheDocument()
    expect(within(d).getByText('Para ana@exemplo.invalid:')).toBeInTheDocument()
    expect(within(d).getByRole('button', { name: 'Mudar para Enviado' })).toBeEnabled()
    expect(within(d).getByText('Desmarque se você já avisou por outro caminho ou só está acertando o registro.')).toBeInTheDocument()
  })

  it('AVS-04: desmarcar RISCA os e-mails e troca a frase pela do histórico com o avião', async () => {
    render(<Tela req={() => pedidoDeEnvio()} />)
    const d = await abrir()
    const lista = within(d).getByText('Pedido postado').closest('ul')!
    expect(tokens(lista)).not.toContain('line-through')

    fireEvent.click(caixa())

    expect(caixa()).not.toBeChecked()
    expect(tokens(lista)).toContain('line-through')
    expect(lista).toHaveAttribute('data-riscado', 'true')
    const frase = within(d).getByText(
      'A cliente não recebe e-mail. Fica anotado no histórico, com o avião para enviar depois se você mudar de ideia.',
    )
    expect(frase.parentElement!.querySelector('svg.lucide-send')).not.toBeNull()
    expect(within(d).queryByText(/Desmarque se você já avisou/)).toBeNull()
  })

  it('a nota da dona aparece quando quem chama a manda', async () => {
    render(<Tela req={() => pedidoDeEnvio({ notaDaDona: 'O aviso para você sai de qualquer forma.' })} />)
    const d = await abrir()
    expect(within(d).getByText('O aviso para você sai de qualquer forma.')).toBeInTheDocument()
  })
})

describe('executar — o estado da caixa e o desfecho', () => {
  it('confirmar com a caixa marcada ⇒ `executar(true)`; `null` FECHA o diálogo', async () => {
    const executar = vi.fn(async () => null)
    render(<Tela req={() => pedidoDeEnvio({ executar })} />)
    const d = await abrir()

    await act(async () => {
      fireEvent.click(within(d).getByRole('button', { name: 'Mudar para Enviado' }))
    })

    expect(executar).toHaveBeenCalledTimes(1)
    expect(executar).toHaveBeenCalledWith(true)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('desmarcada ⇒ `executar(false)`', async () => {
    const executar = vi.fn(async () => null)
    render(<Tela req={() => pedidoDeEnvio({ executar })} />)
    const d = await abrir()
    fireEvent.click(caixa())

    await act(async () => {
      fireEvent.click(within(d).getByRole('button', { name: 'Mudar para Enviado' }))
    })
    expect(executar).toHaveBeenCalledWith(false)
  })

  it('uma FRASE de volta ⇒ fica no diálogo (alerta), o botão reabilita e a caixa fica como estava', async () => {
    const executar = vi.fn(async () => 'Não foi possível mudar o status. Nada foi alterado — tente de novo.')
    render(<Tela req={() => pedidoDeEnvio({ executar })} />)
    const d = await abrir()
    fireEvent.click(caixa())

    await act(async () => {
      fireEvent.click(within(d).getByRole('button', { name: 'Mudar para Enviado' }))
    })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(within(d).getByRole('alert')).toHaveTextContent('Não foi possível mudar o status. Nada foi alterado — tente de novo.')
    expect(within(d).getByRole('button', { name: 'Mudar para Enviado' })).toBeEnabled()
    expect(caixa()).not.toBeChecked()
    expect(screen.getByTestId('ocupado')).toHaveTextContent('false')
  })

  it('`executar` que LANÇA vira a frase genérica, sem prender o diálogo em ocupado', async () => {
    const executar = vi.fn(async () => {
      throw new Error('boom')
    })
    render(<Tela req={() => pedidoDeEnvio({ executar })} />)
    const d = await abrir()
    await act(async () => {
      fireEvent.click(within(d).getByRole('button', { name: 'Mudar para Enviado' }))
    })
    expect(within(d).getByRole('alert')).toHaveTextContent(FALHA_INESPERADA)
    expect(within(d).getByRole('button', { name: 'Mudar para Enviado' })).toBeEnabled()
  })
})

describe('CRG-07 — enquanto `executar` corre', () => {
  it('o botão mostra o gerúndio; Voltar e a caixa desabilitados; `Esc` e o clique fora NÃO fecham; o duplo clique não executa duas vezes', async () => {
    const g = segurada()
    const executar = vi.fn(() => g.promessa)
    const aoCancelar = vi.fn()
    render(<Tela req={() => pedidoDeEnvio({ executar, aoCancelar })} />)
    const d = await abrir()

    const botao = within(d).getByRole('button', { name: 'Mudar para Enviado' })
    fireEvent.click(botao)
    fireEvent.click(botao)

    const emCurso = await within(d).findByRole('button', { name: 'Mudando para Enviado…' })
    expect(emCurso).toHaveAttribute('aria-busy', 'true')
    expect(within(d).getByRole('button', { name: 'Voltar' })).toBeDisabled()
    expect(caixa()).toBeDisabled()
    expect(screen.getByTestId('ocupado')).toHaveTextContent('true')

    fireEvent.keyDown(d, { key: 'Escape' })
    fireEvent.pointerDown(document.body)
    fireEvent.click(within(d).getByRole('button', { name: 'Close' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(aoCancelar).not.toHaveBeenCalled()

    await act(async () => g.resolver(null))
    expect(executar).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})

describe('AVS-05 — Voltar, Esc e clique fora não gravam nada', () => {
  it('"Voltar" fecha SEM chamar `executar`, e chama `aoCancelar`', async () => {
    const executar = vi.fn(async () => null)
    const aoCancelar = vi.fn()
    render(<Tela req={() => pedidoDeEnvio({ executar, aoCancelar })} />)
    const d = await abrir()
    fireEvent.click(within(d).getByRole('button', { name: 'Voltar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(executar).not.toHaveBeenCalled()
    expect(aoCancelar).toHaveBeenCalledTimes(1)
  })

  it('`Esc` fecha SEM chamar `executar`, e chama `aoCancelar`', async () => {
    const executar = vi.fn(async () => null)
    const aoCancelar = vi.fn()
    render(<Tela req={() => pedidoDeEnvio({ executar, aoCancelar })} />)
    const d = await abrir()
    fireEvent.keyDown(d, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(executar).not.toHaveBeenCalled()
    expect(aoCancelar).toHaveBeenCalledTimes(1)
  })

  it('a caixa nasce MARCADA a cada abertura — desmarcar e voltar não vaza para o gesto seguinte', async () => {
    render(<Tela req={() => pedidoDeEnvio()} />)
    let d = await abrir()
    fireEvent.click(caixa())
    expect(caixa()).not.toBeChecked()
    fireEvent.click(within(d).getByRole('button', { name: 'Voltar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    d = await abrir()
    expect(caixa()).toBeChecked()
    expect(within(d).queryByRole('alert')).toBeNull()
  })
})

describe('o foco', () => {
  it('vai ao TÍTULO ao abrir e VOLTA ao botão de origem ao fechar', async () => {
    render(<Tela req={() => pedidoDeEnvio()} />)
    const origem = screen.getByRole('button', { name: 'Marcar como enviado' })
    const d = await abrir()
    await waitFor(() => expect(document.activeElement).toBe(within(d).getByRole('heading', { name: 'Marcar como enviado?' })))

    fireEvent.click(within(d).getByRole('button', { name: 'Voltar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(origem))
  })
})

describe('AVS-22 — "Ver o e-mail"', () => {
  let aba: { opener: unknown; document: Document }

  beforeEach(() => {
    aba = { opener: {}, document: document.implementation.createHTMLDocument('') }
    vi.spyOn(window, 'open').mockImplementation(() => aba as unknown as Window)
  })

  it('abre uma aba com a prévia DAQUELE evento e DAQUELE pedido, sem gravar nem fechar o diálogo', async () => {
    const executar = vi.fn(async () => null)
    render(<Tela req={() => pedidoDeEnvio({ executar })} />)
    const d = await abrir()

    await act(async () => {
      fireEvent.click(within(d).getByRole('button', { name: 'Ver o e-mail' }))
    })

    expect(window.open).toHaveBeenCalledWith('', '_blank')
    expect(invocacoes).toEqual([
      {
        porta: 'send-notification?action=preview',
        body: { event: 'order_shipped', channel: 'email', draft: {}, order_id: 'ord-1042' },
      },
    ])
    await waitFor(() => expect(aba.document.querySelector('iframe')).not.toBeNull())
    const quadro = aba.document.querySelector('iframe')!
    expect(quadro.getAttribute('srcdoc')).toBe('<p>Olá, Ana</p>')
    // Sem scripts e sem a origem do painel: o atributo existe e está vazio.
    expect(quadro.getAttribute('sandbox')).toBe('')
    expect(aba.opener).toBeNull()
    expect(executar).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('sem `orderId` (o lote) não há "Ver o e-mail"', async () => {
    render(<Tela req={() => pedidoDeEnvio({ orderId: undefined })} />)
    const d = await abrir()
    expect(within(d).queryByRole('button', { name: 'Ver o e-mail' })).toBeNull()
  })
})

describe('AVS-19 — a forma do lote', () => {
  const lote = (comEmail: number, over: Partial<NoticeRequest> = {}): NoticeRequest =>
    pedidoDeEnvio({
      titulo: 'Avançar 8 pedidos?',
      mudanca: '8 pedidos passam para o próximo status',
      confirmar: 'Avançar 8 pedidos',
      gerundio: 'Avançando…',
      cliente: undefined,
      orderId: undefined,
      lote: { comEmail },
      eventos: [
        { event: 'order_shipped', quantos: 4 },
        { event: 'order_delivered', quantos: 1 },
      ],
      jaRecebeu: '1 pedido já recebeu “Pedido postado” antes',
      extra: <ul data-testid="lista-do-lote"><li>#1042</li></ul>,
      ...over,
    })

  it('"Avisar as 5 clientes por e-mail", a contagem por e-mail, a linha "já recebeu" e a lista do lote', async () => {
    render(<Tela req={() => lote(5)} />)
    const d = await abrir()
    expect(caixa()).toHaveAccessibleName(/^Avisar as 5 clientes por e-mail/)
    expect(within(d).getByText('5 e-mails, um para cada cliente:')).toBeInTheDocument()
    const postado = within(d).getByText('Pedido postado').closest('li')!
    expect(postado).toHaveTextContent('4')
    expect(within(d).getByText('Pedido entregue').closest('li')).toHaveTextContent('1')
    expect(within(d).getByText('1 pedido já recebeu “Pedido postado” antes')).toBeInTheDocument()
    expect(within(d).getByTestId('lista-do-lote')).toBeInTheDocument()
    expect(within(d).getByRole('button', { name: 'Avançar 8 pedidos' })).toBeInTheDocument()

    fireEvent.click(caixa())
    expect(within(d).getByText(/^Nenhuma cliente recebe e-mail\. Fica anotado no histórico/)).toBeInTheDocument()
  })

  it('com UM e-mail no lote: "Avisar a cliente por e-mail" e "1 e-mail:"', async () => {
    render(<Tela req={() => lote(1)} />)
    const d = await abrir()
    expect(caixa()).toHaveAccessibleName(/^Avisar a cliente por e-mail/)
    expect(within(d).getByText('1 e-mail:')).toBeInTheDocument()
  })
})
