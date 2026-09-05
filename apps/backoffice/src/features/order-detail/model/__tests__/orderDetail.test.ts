import { describe, expect, it } from 'vitest'
import type { DbOrder } from '@estrelinha/supabase/types'
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
      { id: 'e1', order_id: 'o1', type: 'order_shipped', status: 'sent', attempts: 1, provider_message_id: 'x', error: null, created_at: '2026-08-27T09:00:00Z', sent_at: '2026-08-27T09:00:00Z' },
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
      { id: 'e1', order_id: 'o1', type: 'order_shipped', status: 'sent', attempts: 1, provider_message_id: 'x', error: null, created_at: '2026-08-27T08:00:00Z', sent_at: '2026-08-27T09:00:00Z' },
    ], [])

    expect(ev.emailSent).toBe(true)
    expect(ev.at).toBe('2026-08-27T09:00:00Z')
    expect(ev.title).toBe('Aviso de postagem enviado')
  })

  it('e-mail que falhou usa `created_at` — o que aconteceu foi a TENTATIVA', () => {
    const [ev] = buildHistory([], [
      { id: 'e1', order_id: 'o1', type: 'order_shipped', status: 'failed', attempts: 2, provider_message_id: null, error: 'SMTP timeout', created_at: '2026-08-27T08:00:00Z', sent_at: null },
    ], [])

    expect(ev.emailSent).toBe(false)
    expect(ev.at).toBe('2026-08-27T08:00:00Z')
    expect(ev.detail).toBe('SMTP timeout')
  })

  it('falha sem mensagem ainda diz o que importa: a cliente não soube', () => {
    const [ev] = buildHistory([], [
      { id: 'e1', order_id: 'o1', type: 'order_shipped', status: 'failed', attempts: 1, provider_message_id: null, error: null, created_at: '2026-08-27T08:00:00Z', sent_at: null },
    ], [])

    expect(ev.detail).toBe('A cliente NÃO foi avisada')
  })

  it('e-mail que precisou de duas tentativas anuncia isso', () => {
    const [ev] = buildHistory([], [
      { id: 'e1', order_id: 'o1', type: 'order_shipped', status: 'sent', attempts: 3, provider_message_id: 'x', error: null, created_at: '2026-08-27T08:00:00Z', sent_at: '2026-08-27T09:00:00Z' },
    ], [])

    expect(ev.detail).toBe('Enviado na 3ª tentativa')
  })

  it('o tipo viaja no evento, para o reenvio saber qual template repetir', () => {
    const [ev] = buildHistory([], [
      { id: 'e1', order_id: 'o1', type: 'material_received', status: 'failed', attempts: 1, provider_message_id: null, error: 'x', created_at: '2026-08-27T08:00:00Z', sent_at: null },
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
