import { describe, expect, it } from 'vitest'
import type { DbOrder } from '@estrelinha/supabase/types'
import { NOTIFICATION_EVENTS } from '@estrelinha/core/notifications'
import { buildHistory, filterHistory } from '../history'
import { nextStep } from '../nextStep'

const order = (over: Partial<DbOrder> = {}): DbOrder =>
  ({
    id: 'o1',
    order_number: '1042',
    status: 'paid',
    payment_status: 'approved',
    material_status: 'aguardando_material',
    tracking_code: null,
    created_at: '2026-08-20T00:00:00Z',
    ...over,
  }) as unknown as DbOrder

describe('buildHistory — os três fios num só (PED-27)', () => {
  const eventos = buildHistory(
    [
      { id: 'h1', order_id: 'o1', from_status: 'pending', to_status: 'paid', note: null, created_by: null, created_at: '2026-08-20T14:35:00Z' },
      { id: 'h2', order_id: 'o1', from_status: null, to_status: 'pending', note: null, created_by: null, created_at: '2026-08-20T14:32:00Z' },
    ],
    [
      { id: 'e1', order_id: 'o1', event: 'order_shipped', channel: 'email', delivery_status: null, status: 'sent', attempts: 1, provider_message_id: 'x', error: null, created_at: '2026-08-27T09:00:00Z', sent_at: '2026-08-27T09:00:00Z' },
    ],
    [
      { id: 'n1', order_id: 'o1', note: 'Falei no WhatsApp', created_by: null, created_at: '2026-08-26T16:12:00Z' },
    ],
  )

  it('funde status, e-mails e notas', () => {
    expect(eventos.map(e => e.kind)).toEqual(['email', 'note', 'status', 'status'])
  })

  it('ordena do mais recente para o mais antigo', () => {
    // A pergunta ao abrir um pedido é "o que aconteceu por último?", não "como isso começou?".
    const datas = eventos.map(e => new Date(e.at).getTime())
    expect(datas).toEqual([...datas].sort((a, b) => b - a))
  })

  it('a primeira transição de status não inventa um "de"', () => {
    // `from_status: null` é a criação do pedido, e "null → Pendente" não é uma frase.
    expect(eventos.find(e => e.id === 'status-h2')!.title).toBe('Pedido Pendente')
    expect(eventos.find(e => e.id === 'status-h1')!.title).toBe('Pendente → Pago')
  })

  it('o filtro devolve a aba a quem a queria, sem partir a sequência', () => {
    expect(filterHistory(eventos, 'note')).toHaveLength(1)
    expect(filterHistory(eventos, 'status')).toHaveLength(2)
    expect(filterHistory(eventos, 'all')).toHaveLength(4)
  })
})

describe('buildHistory — o e-mail diz se SAIU (PED-28)', () => {
  it('e-mail enviado marca `emailSent` e usa `sent_at` como instante', () => {
    const [ev] = buildHistory([], [
      { id: 'e1', order_id: 'o1', event: 'order_shipped', channel: 'email', delivery_status: null, status: 'sent', attempts: 1, provider_message_id: 'x', error: null, created_at: '2026-08-27T08:00:00Z', sent_at: '2026-08-27T09:00:00Z' },
    ], [])

    expect(ev.emailSent).toBe(true)
    expect(ev.at).toBe('2026-08-27T09:00:00Z')
    expect(ev.title).toBe('Aviso de postagem enviado (E-mail)')
  })

  it('e-mail que falhou usa `created_at` — o que aconteceu foi a TENTATIVA', () => {
    const [ev] = buildHistory([], [
      { id: 'e1', order_id: 'o1', event: 'order_shipped', channel: 'email', delivery_status: null, status: 'failed', attempts: 2, provider_message_id: null, error: 'SMTP timeout', created_at: '2026-08-27T08:00:00Z', sent_at: null },
    ], [])

    expect(ev.emailSent).toBe(false)
    expect(ev.at).toBe('2026-08-27T08:00:00Z')
    expect(ev.detail).toBe('SMTP timeout')
  })

  it('falha sem mensagem ainda diz o que importa: a cliente não soube', () => {
    const [ev] = buildHistory([], [
      { id: 'e1', order_id: 'o1', event: 'order_shipped', channel: 'email', delivery_status: null, status: 'failed', attempts: 1, provider_message_id: null, error: null, created_at: '2026-08-27T08:00:00Z', sent_at: null },
    ], [])

    expect(ev.detail).toBe('A cliente NÃO foi avisada')
  })

  it('e-mail que precisou de duas tentativas anuncia isso', () => {
    const [ev] = buildHistory([], [
      { id: 'e1', order_id: 'o1', event: 'order_shipped', channel: 'email', delivery_status: null, status: 'sent', attempts: 3, provider_message_id: 'x', error: null, created_at: '2026-08-27T08:00:00Z', sent_at: '2026-08-27T09:00:00Z' },
    ], [])

    expect(ev.detail).toBe('Enviado na 3ª tentativa')
  })

  it('o tipo viaja no evento, para o reenvio saber qual template repetir', () => {
    const [ev] = buildHistory([], [
      { id: 'e1', order_id: 'o1', event: 'material_received', channel: 'email', delivery_status: null, status: 'failed', attempts: 1, provider_message_id: null, error: 'x', created_at: '2026-08-27T08:00:00Z', sent_at: null },
    ], [])

    expect(ev.emailType).toBe('material_received')
  })
})

describe('nextStep — diz o que segura, e nunca bloqueia (PED-29)', () => {
  it('material aguardando segura a SEPARAÇÃO, e o passo continua disponível', () => {
    const passo = nextStep(order({ status: 'paid', material_status: 'aguardando_material' }))

    expect(passo.status).toBe('separating')
    expect(passo.blockedReason).toContain('registrado como recebido')
    // O `status` continua preenchido: a tela oferece `Avançar mesmo assim`.
    expect(passo.status).not.toBeNull()
  })

  it('material recebido não segura nada', () => {
    expect(nextStep(order({ status: 'paid', material_status: 'material_recebido' })).blockedReason).toBeNull()
  })

  it('o material NÃO segura a entrega — só a separação', () => {
    const passo = nextStep(order({ status: 'shipped', material_status: 'aguardando_material', tracking_code: 'BR1' }))
    expect(passo.status).toBe('delivered')
    expect(passo.blockedReason).toBeNull()
  })

  it('entregar sem rastreio avisa que a cliente não foi notificada', () => {
    const passo = nextStep(order({ status: 'shipped', material_status: 'nao_aplicavel', tracking_code: null }))
    expect(passo.blockedReason).toContain('não recebeu o aviso de postagem')
  })

  it('marcar como pago sem aprovação declara que isso não cobra ninguém', () => {
    const passo = nextStep(order({ status: 'pending', payment_status: 'pending' }))
    expect(passo.blockedReason).toContain('não cobra ninguém')
  })

  it('entregue e cancelado são fim de linha — `status` nulo', () => {
    // Oferecer "avançar" faria pedido entregue voltar a andar.
    expect(nextStep(order({ status: 'delivered' })).status).toBeNull()
    expect(nextStep(order({ status: 'cancelled' })).status).toBeNull()
    expect(nextStep(order({ status: 'cancelled' })).label).toBe('Pedido cancelado')
  })

  it('`blockedReason` é `string | null`, e não união por booleano', () => {
    // Com `strictNullChecks: false`, ler `.reason` no ramo do `else` de `{ ok } | { ok, reason }` é
    // erro de compilação (TS2339). Um veredito sem ramo não tem ramo para esquecer.
    const passo = nextStep(order({ status: 'delivered' }))
    expect(passo.blockedReason).toBeNull()
    expect(typeof passo.label).toBe('string')
  })

  it('`separating` é um estado REAL — o CHECK do banco o recusava até a feature 34', () => {
    // Toda gravação de "Em separação" falhava com 23514, e nada acusava: o tipo é `text`, o `tsc`
    // achava certo, e os testes mockavam o client. A migration da 34 corrigiu o CHECK.
    expect(nextStep(order({ status: 'paid', material_status: 'material_recebido' })).status).toBe(
      'separating',
    )
  })
})


// =================================================================================================
// FIX-02 (feature 42) — os rótulos vêm de `core`, e os DOIS que ocorrem de fato têm nome
// =================================================================================================
//
// O que existia era um `Record<string, string>` de quatro chaves com DUAS que nunca existiram no
// banco (`order_confirmed`, `payment_approved`), enquanto `order_received` e `order_paid` — os que
// realmente saem — caíam no fallback: a admin lia "E-mail order_received enviado". Nenhum teste
// cobria os rótulos, e é por isso que o defeito sobreviveu.

describe('FIX-02 — rótulo de cada evento no histórico', () => {
  const linha = (event: string, over: Record<string, unknown> = {}) => ({
    id: 'e1',
    order_id: 'o1',
    event,
    channel: 'email',
    delivery_status: null,
    status: 'sent',
    attempts: 1,
    provider_message_id: 'x',
    error: null,
    created_at: '2026-09-07T09:00:00Z',
    sent_at: '2026-09-07T09:00:00Z',
    ...over,
  })

  const titulo = (event: string, over: Record<string, unknown> = {}) =>
    buildHistory([], [linha(event, over) as never], [])[0].title

  it.each([
    ['order_received', 'Confirmação do pedido enviada (E-mail)'],
    ['order_paid', 'Aviso de pagamento aprovado enviado (E-mail)'],
    ['material_instructions', 'Instruções de envio do material enviadas (E-mail)'],
    ['pix_expired', 'Aviso de PIX expirado enviado (E-mail)'],
    ['order_cancelled', 'Aviso de cancelamento enviado (E-mail)'],
    ['owner_order_paid', 'Aviso à dona de pedido pago enviado (E-mail)'],
  ])('%s → "%s"', (event, esperado) => {
    expect(titulo(event)).toBe(esperado)
  })

  it('NENHUM evento do vocabulário cai no fallback genérico', () => {
    for (const event of NOTIFICATION_EVENTS) {
      expect(titulo(event), event).not.toContain(`Aviso ${event}`)
    }
  })

  it('os dois rótulos MORTOS não existem mais — eles nunca foram eventos', () => {
    expect(titulo('order_confirmed')).toContain('Aviso order_confirmed')
    expect(titulo('payment_approved')).toContain('Aviso payment_approved')
  })

  it('o CANAL aparece na linha, e o WhatsApp se identifica', () => {
    expect(titulo('order_paid', { channel: 'whatsapp' })).toBe('Aviso de pagamento aprovado enviado (WhatsApp)')
  })

  it('a confirmação de entrega entra no detalhe quando o canal devolve uma', () => {
    const ev = buildHistory([], [linha('order_paid', { channel: 'whatsapp', delivery_status: 'read' }) as never], [])[0]
    expect(ev.detail).toBe('Lido')
  })

  it('o reenvio sabe o evento E o canal da tentativa', () => {
    const ev = buildHistory(
      [],
      [linha('order_shipped', { channel: 'whatsapp', status: 'failed', sent_at: null, error: 'x' }) as never],
      [],
    )[0]
    expect(ev.emailType).toBe('order_shipped')
    expect(ev.emailChannel).toBe('whatsapp')
    expect(ev.emailSent).toBe(false)
  })

  it('a falha nomeia a mensagem em minúscula, não o slug cru', () => {
    const ev = buildHistory([], [linha('order_paid', { status: 'failed', sent_at: null, error: 'resend_forbidden' }) as never], [])[0]
    expect(ev.title).toBe('Falha ao enviar aviso de pagamento aprovado enviado (E-mail)')
    expect(ev.detail).toBe('resend_forbidden')
  })
})
