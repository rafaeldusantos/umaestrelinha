// Feature `88` · T17 — o avião na linha pulada (`AVS-12`, `AVS-13`) e o estado por linha (`CRG-08`).
//
// As linhas saem de `buildHistory` de verdade (`@estrelinha/core/orders`), a partir das linhas de
// `order_notifications` — escrever o `HistoryEvent` à mão provaria o componente contra uma forma que o
// dono pode não produzir.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { buildHistory } from '../model/history'

import OrderHistory from './OrderHistory'

const linha = (id: string, status: string, over: Record<string, unknown> = {}) => ({
  id, order_id: 'o1', event: 'order_shipped', channel: 'email', delivery_status: null, status,
  attempts: 1, provider_message_id: null, error: null, created_at: '2026-08-21T09:00:00Z', sent_at: null,
  ...over,
})

const eventos = (emails: ReturnType<typeof linha>[]) =>
  buildHistory([], emails as never, [])

const montar = (emails: ReturnType<typeof linha>[], props: Partial<React.ComponentProps<typeof OrderHistory>> = {}) => {
  const onResendEmail = vi.fn().mockResolvedValue(undefined)
  const onAddNote = vi.fn().mockResolvedValue(undefined)
  render(
    <OrderHistory events={eventos(emails)} onAddNote={onAddNote} onResendEmail={onResendEmail} {...props} />,
  )
  return { onResendEmail, onAddNote }
}

const AVIAO = 'Enviar agora o e-mail “Pedido postado” para a cliente'

describe('AVS-12 — a linha pulada tem o avião', () => {
  it('mostra a frase da escolha e o botão com o nome acessível do e-mail', () => {
    montar([linha('e1', 'skipped')])
    expect(screen.getByText('Aviso à cliente não enviado: Pedido postado')).toBeInTheDocument()
    expect(screen.getByText('Você escolheu não avisar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: AVIAO })).toBeInTheDocument()
    expect(screen.queryByText('Reenviar')).not.toBeInTheDocument()
  })

  it('o avião é um alvo de 44 × 44 (token exato)', () => {
    montar([linha('e1', 'skipped')])
    const classes = screen.getByRole('button', { name: AVIAO }).className.split(/\s+/)
    expect(classes).toContain('h-11')
    expect(classes).toContain('w-11')
    expect(classes).toContain('min-w-11')
  })

  it('a linha pulada NÃO está em tom de falha (o detalhe e o ícone em tom neutro)', () => {
    montar([linha('e1', 'skipped')])
    const li = screen.getByText('Aviso à cliente não enviado: Pedido postado').closest('li')!
    expect(li).toHaveAttribute('data-pulado', 'true')
    expect(within(li).getByText('Você escolheu não avisar').className.split(/\s+/)).not.toContain('text-destructive')
    expect(li.innerHTML).not.toContain('text-destructive')
  })

  it('tocar o avião chama a porta de reenvio com o evento, o canal e a linha', async () => {
    const { onResendEmail } = montar([linha('e1', 'skipped')])
    fireEvent.click(screen.getByRole('button', { name: AVIAO }))
    await waitFor(() => expect(onResendEmail).toHaveBeenCalledWith('order_shipped', 'email', 'email-e1'))
  })
})

describe('as outras linhas de e-mail continuam como eram', () => {
  it('a de falha continua com "Reenviar" (e sem o avião)', async () => {
    const { onResendEmail } = montar([linha('e1', 'failed', { error: 'SMTP timeout' })])
    expect(screen.queryByRole('button', { name: AVIAO })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Reenviar/ }))
    await waitFor(() => expect(onResendEmail).toHaveBeenCalledWith('order_shipped', 'email', 'email-e1'))
  })

  it('a enviada não tem botão nenhum', () => {
    montar([linha('e1', 'sent', { sent_at: '2026-08-21T09:00:00Z' })])
    expect(screen.queryByRole('button', { name: AVIAO })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Reenviar/ })).not.toBeInTheDocument()
  })
})

describe('CRG-08 — só a linha em curso mostra o estado', () => {
  const duas = [
    linha('e1', 'skipped'),
    linha('e2', 'failed', { event: 'order_delivered', created_at: '2026-08-20T09:00:00Z' }),
  ]

  it('o avião da linha em curso: "Enviando…" com aria-busy; a outra linha e a nota desabilitadas SEM indicador', () => {
    montar(duas, { busy: true, reenviando: 'email-e1' })
    const aviao = screen.getByRole('button', { name: AVIAO })
    expect(aviao).toHaveAttribute('aria-busy', 'true')
    expect(aviao).toHaveTextContent('Enviando…')

    const reenviar = screen.getByRole('button', { name: /Reenviar/ })
    expect(reenviar).toBeDisabled()
    expect(reenviar).not.toHaveAttribute('aria-busy')

    const anotar = screen.getByRole('button', { name: 'Anotar' })
    expect(anotar).toBeDisabled()
    expect(anotar).not.toHaveAttribute('aria-busy')
  })

  it('o "Reenviar" em curso diz "Reenviando…"; o avião da outra linha fica desabilitado sem indicador', () => {
    montar(duas, { busy: true, reenviando: 'email-e2' })
    expect(screen.getByRole('button', { name: /Reenviando…/ })).toHaveAttribute('aria-busy', 'true')
    const aviao = screen.getByRole('button', { name: AVIAO })
    expect(aviao).toBeDisabled()
    expect(aviao).not.toHaveAttribute('aria-busy')
  })

  it('a nota em curso: "Salvando nota…"', () => {
    montar([], { busy: true, anotando: true })
    expect(screen.getByRole('button', { name: /Salvando nota…/ })).toHaveAttribute('aria-busy', 'true')
  })

  it('a nota que não foi salva CONTINUA no campo (CRG-05); a salva esvazia', async () => {
    const onAddNote = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(undefined)
    montar([], { onAddNote })
    fireEvent.change(screen.getByLabelText('Nova nota interna'), { target: { value: 'Falei com ela' } })
    fireEvent.click(screen.getByRole('button', { name: 'Anotar' }))
    await waitFor(() => expect(onAddNote).toHaveBeenCalledTimes(1))
    expect(screen.getByLabelText('Nova nota interna')).toHaveValue('Falei com ela')

    fireEvent.click(screen.getByRole('button', { name: 'Anotar' }))
    await waitFor(() => expect(screen.getByLabelText('Nova nota interna')).toHaveValue(''))
  })
})

// Conserto do QA (2026-10-30, BUG pedido-rola-de-lado-com-fonte-200): com a fonte a 200 % em 390, a
// fileira de filtros (flex sem quebra) media 589 px e empurrava a página para o lado. jsdom não mede
// layout: a prova é a classe, por token exato.
describe('conserto do QA — os filtros do Histórico embrulham no próprio container', () => {
  const tem = (el: Element, token: string) => el.className.split(/\s+/).includes(token)

  it('a fileira de filtros quebra linha e pode encolher (`flex-wrap`, `min-w-0`)', () => {
    montar([])
    const fileira = screen.getByRole('tablist', { name: 'Filtrar histórico' })
    expect(tem(fileira, 'flex-wrap')).toBe(true)
    expect(tem(fileira, 'min-w-0')).toBe(true)
    expect(tem(fileira, 'flex-nowrap')).toBe(false)
  })
})

// Conserto do QA (A-14): a leitura dos e-mails falhou — o Histórico diz isso, nunca "Nada por aqui".
describe('conserto do QA — o Histórico sem os e-mails', () => {
  it('com `emailsError`: o aviso com "Tentar de novo", e nunca "Nada por aqui ainda."', () => {
    const onRetryEmails = vi.fn()
    montar([], { emailsError: true, onRetryEmails })
    expect(screen.getByText('Não consegui ler os e-mails deste pedido.')).toBeInTheDocument()
    expect(screen.queryByText('Nada por aqui ainda.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(onRetryEmails).toHaveBeenCalled()
  })
})
