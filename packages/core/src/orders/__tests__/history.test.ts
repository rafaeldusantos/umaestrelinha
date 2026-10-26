import { describe, expect, it } from 'vitest'

import { NOTIFICATION_EVENT_NAMES } from '../../notifications/catalog.ts'
import { NOTIFICATION_EVENTS } from '../../notifications/events.ts'
import { buildHistory, type HistoryNotificationRow, type HistoryStatusRow } from '../history.ts'

/**
 * Feature `74` (`MAP-28`, `MAP-48`): o histórico de um pedido. Os textos esperados foram COPIADOS do
 * disco do painel (`apps/backoffice/src/features/order-detail/model/history.ts`, no `775e407e`).
 */
const st = (o: Partial<HistoryStatusRow>): HistoryStatusRow => ({
  id: 's1', from_status: null, to_status: 'pending', note: null, created_at: '2026-10-01T10:00:00Z', ...o,
})
const em = (o: Partial<HistoryNotificationRow>): HistoryNotificationRow => ({
  id: 'e1', event: 'order_received', channel: 'email', status: 'sent', attempts: 1,
  delivery_status: null, error: null, created_at: '2026-10-01T10:01:00Z', sent_at: '2026-10-01T10:01:30Z', ...o,
})

describe('buildHistory — as três fontes num fio só', () => {
  it('status sem origem ⇒ "Pedido <rótulo>"; com origem ⇒ "<de> → <para>"', () => {
    const [a, b] = buildHistory(
      [st({ id: 'a', to_status: 'pending' }), st({ id: 'b', from_status: 'paid', to_status: 'separating', note: 'combinado', created_at: '2026-10-02T10:00:00Z' })],
      [],
      [],
    )
    expect(a).toEqual({ id: 'status-b', kind: 'status', at: '2026-10-02T10:00:00Z', title: 'Pago → Em Separação', detail: 'combinado' })
    expect(b).toEqual({ id: 'status-a', kind: 'status', at: '2026-10-01T10:00:00Z', title: 'Pedido Pendente', detail: null })
  })

  it('e-mail que saiu: o rótulo do evento, o canal e a data de envio', () => {
    const [e] = buildHistory([], [em({})], [])
    expect(e).toMatchObject({
      id: 'email-e1', kind: 'email', at: '2026-10-01T10:01:30Z',
      title: 'Confirmação do pedido enviada (E-mail)', detail: null, emailSent: true,
    })
  })

  it('WhatsApp na 2ª tentativa, lido ⇒ o detalhe junta as duas coisas', () => {
    const [e] = buildHistory([], [em({ channel: 'whatsapp', attempts: 2, delivery_status: 'read' })], [])
    expect(e.title).toBe('Confirmação do pedido enviada (WhatsApp)')
    expect(e.detail).toBe('Enviado na 2ª tentativa · Lido')
  })

  it('e-mail que falhou sem erro ⇒ "A cliente NÃO foi avisada", na data da tentativa', () => {
    const [e] = buildHistory([], [em({ status: 'failed', sent_at: null })], [])
    expect(e).toMatchObject({
      at: '2026-10-01T10:01:00Z',
      title: 'Falha ao enviar o aviso: Pedido recebido (E-mail)',
      detail: 'A cliente NÃO foi avisada',
      emailSent: false,
    })
  })

  // BUG-20261024-falha-de-aviso-diz-enviado: a falha usava o rótulo de HISTÓRICO (no passado) e saía
  // "Falha ao enviar aviso … enviado". Na falha a linha nomeia o EVENTO (`NOTIFICATION_EVENT_NAMES`).
  it.each(NOTIFICATION_EVENTS)('a falha de %s nomeia o evento e nunca diz "enviado"', (event) => {
    const [e] = buildHistory([], [em({ event, status: 'failed', sent_at: null })], [])
    expect(e.title).toBe(`Falha ao enviar o aviso: ${NOTIFICATION_EVENT_NAMES[event]} (E-mail)`)
    expect(e.title).not.toMatch(/enviad[oa]/i)
  })

  it('a falha de evento fora do vocabulário nomeia o slug, sem "enviado"', () => {
    const [e] = buildHistory([], [em({ event: 'algo_novo', status: 'failed', sent_at: null, channel: 'whatsapp' })], [])
    expect(e.title).toBe('Falha ao enviar o aviso: algo_novo (WhatsApp)')
  })

  it('e-mail que falhou com erro ⇒ o erro', () => {
    const [e] = buildHistory([], [em({ status: 'failed', sent_at: null, error: 'caixa cheia' })], [])
    expect(e.detail).toBe('caixa cheia')
  })

  it('evento fora do vocabulário ⇒ "Aviso <evento> enviado"', () => {
    const [e] = buildHistory([], [em({ event: 'algo_novo' })], [])
    expect(e.title).toBe('Aviso algo_novo enviado (E-mail)')
  })

  it('as notas internas entram (A19)', () => {
    const [n] = buildHistory([], [], [{ id: 'n1', note: 'cliente pediu embrulho', created_at: '2026-10-03T10:00:00Z', created_by: 'u1' }])
    expect(n).toEqual({ id: 'note-n1', kind: 'note', at: '2026-10-03T10:00:00Z', title: 'Nota interna', detail: 'cliente pediu embrulho', author: 'u1' })
  })

  it('do mais recente para o mais antigo, intercalando as três fontes', () => {
    const fio = buildHistory(
      [st({ id: 's', created_at: '2026-10-01T10:00:00Z' })],
      [em({ id: 'e', sent_at: '2026-10-03T10:00:00Z' })],
      [{ id: 'n', note: 'x', created_at: '2026-10-02T10:00:00Z', created_by: null }],
    )
    expect(fio.map((e) => e.id)).toEqual(['email-e', 'note-n', 'status-s'])
  })
})

/**
 * Feature `79` (`MAN-09`, `MAN-34`, `MAN-38`): o aviso no celular no histórico. Canal "Celular"; a
 * entrega parcial mora em `provider_message_id` (`push:X/Y`) e aparece no detalhe só quando X < Y; a
 * falha tem título próprio e NÃO carrega `emailType`/`emailChannel` — é isso que tira o "Reenviar" do
 * painel, porque push não se reenvia.
 */
describe('buildHistory — o canal push (feature 79)', () => {
  const push = (o: Partial<HistoryNotificationRow>): HistoryNotificationRow =>
    em({ event: 'owner_order_paid', channel: 'push', provider_message_id: 'push:1/1', ...o })

  it('push entregue a todos ⇒ "(Celular)" no título e nenhum detalhe de contagem', () => {
    const [e] = buildHistory([], [push({ provider_message_id: 'push:3/3' })], [])
    expect(e.title).toBe('Aviso à dona de pedido pago enviado (Celular)')
    expect(e.detail).toBeNull()
    expect(e.emailSent).toBe(true)
  })

  it('push parcial ⇒ "Entregue a 2 de 3 aparelhos" no detalhe', () => {
    const [e] = buildHistory([], [push({ provider_message_id: 'push:2/3' })], [])
    expect(e.title).toBe('Aviso à dona de pedido pago enviado (Celular)')
    expect(e.detail).toBe('Entregue a 2 de 3 aparelhos')
  })

  it('push falho ⇒ o título próprio, o detalhe é o `error`, e sem emailType nem emailChannel', () => {
    const [e] = buildHistory(
      [],
      [push({ status: 'failed', sent_at: null, provider_message_id: null, error: 'fcm.googleapis.com: 500' })],
      [],
    )
    expect(e.title).toBe('O aviso no celular não chegou.')
    expect(e.detail).toBe('fcm.googleapis.com: 500')
    expect(e.emailSent).toBe(false)
    expect(e.emailType).toBeUndefined()
    expect(e.emailChannel).toBeUndefined()
    expect(e.at).toBe('2026-10-01T10:01:00Z')
  })

  // V03 (Verificador r1, C07): o push que ficou `pending` (o prazo acabou entre o claim e o finish)
  // também não saiu, e também não se reenvia. Sem este caso, um recorte só por `failed` mandava a
  // linha para o ramo do e-mail: "A cliente NÃO foi avisada" e `emailType`, ou seja, um "Reenviar"
  // num push (MAN-38).
  it('push `pending` ⇒ o mesmo título do falho, sem frase de cliente e sem emailType', () => {
    const [e] = buildHistory([], [push({ status: 'pending', sent_at: null, provider_message_id: null, error: null })], [])
    expect(e.title).toBe('O aviso no celular não chegou.')
    expect(e.detail).toBeNull()
    expect(e.emailSent).toBe(false)
    expect(e.emailType).toBeUndefined()
    expect(e.emailChannel).toBeUndefined()
  })

  it('e-mail falho continua igual: "A cliente NÃO foi avisada" e com emailType para o reenvio', () => {
    const [e] = buildHistory([], [em({ status: 'failed', sent_at: null, provider_message_id: null })], [])
    expect(e.detail).toBe('A cliente NÃO foi avisada')
    expect(e.emailType).toBe('order_received')
    expect(e.emailChannel).toBe('email')
  })

  it('um `provider_message_id` de e-mail nunca vira contagem de aparelhos', () => {
    const [e] = buildHistory([], [em({ provider_message_id: 'push:1/2' })], [])
    expect(e.detail).toBeNull()
  })
})
