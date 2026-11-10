import { beforeEach, describe, expect, it, vi } from 'vitest'

import { recordManualPayment, type ManualPaymentDeps, type RecordManualPaymentInput } from '../manualPayment.ts'

// A escrita do pagamento registrado à mão: recusa antes da rede, envia os comprovantes, grava pela
// RPC `record_manual_payment` e, gravado, dispara o gatilho `payment_recorded` com a escolha da caixa.
// Desfecho sem gravação apaga os comprovantes enviados.

const ID = 'ord-1'
const CRIADO = '2026-11-09T12:00:00.000Z'
const AGORA = new Date('2026-11-09T18:00:00.000Z')

interface Envio {
  bucket: string
  path: string
  opts: unknown
}

let log: string[]
let enviados: Envio[]
let removidos: string[][]
let rpcs: { fn: string; args: unknown }[]
let respostaRpc: unknown
let falhaNoEnvio: number | null
let notify: ReturnType<typeof vi.fn>
let deps: ManualPaymentDeps
let ids: number

beforeEach(() => {
  log = []
  enviados = []
  removidos = []
  rpcs = []
  ids = 0
  respostaRpc = { data: { result: 'ok', id: 'reg-1', status: 'paid' }, error: null }
  falhaNoEnvio = null
  notify = vi.fn(async (_id: string, trigger: string) => {
    log.push(`notify ${trigger}`)
    return true
  })
  deps = {
    client: {
      storage: {
        from: (bucket: string) => ({
          upload: async (path: string, _body: unknown, opts: unknown) => {
            log.push(`upload ${path}`)
            if (falhaNoEnvio === enviados.length) return { data: null, error: { message: 'rede' } }
            enviados.push({ bucket, path, opts })
            return { data: { path }, error: null }
          },
          remove: async (paths: string[]) => {
            log.push('remove')
            removidos.push(paths)
            return { data: [], error: null }
          },
        }),
      },
      rpc: async (fn: string, args: unknown) => {
        log.push(`rpc ${fn}`)
        rpcs.push({ fn, args })
        return respostaRpc
      },
      functions: { invoke: vi.fn() },
    } as unknown as ManualPaymentDeps['client'],
    notify: notify as unknown as ManualPaymentDeps['notify'],
  }
})

const arquivo = (name: string, type: string, size = 1000) => ({ name, type, size })

const entrada = (over: Partial<RecordManualPaymentInput> = {}): RecordManualPaymentInput => ({
  orderId: ID,
  createdAt: CRIADO,
  method: 'transferencia',
  paidAt: '2026-11-09T15:30:00.000Z',
  note: 'Pagou no Itaú',
  files: [arquivo('comprovante.pdf', 'application/pdf')],
  authorName: 'Adri Muniz',
  agora: AGORA,
  novoId: () => `id${++ids}`,
  ...over,
})

describe('recordManualPayment', () => {
  it('envia o comprovante para a pasta do pedido, grava pela RPC e dispara `payment_recorded`', async () => {
    const r = await recordManualPayment(deps, entrada())

    expect(r).toEqual({ tipo: 'ok', status: 'paid', emailSent: true })
    expect(enviados).toEqual([
      { bucket: 'order-payment-receipts', path: 'ord-1/id1.pdf', opts: { contentType: 'application/pdf', upsert: false } },
    ])
    expect(rpcs).toEqual([
      {
        fn: 'record_manual_payment',
        args: {
          p_order_id: ID,
          p_method: 'transferencia',
          p_paid_at: '2026-11-09T15:30:00.000Z',
          p_note: 'Pagou no Itaú',
          p_receipts: [{ path: 'ord-1/id1.pdf', content_type: 'application/pdf', size_bytes: 1000 }],
          p_author_name: 'Adri Muniz',
        },
      },
    ])
    expect(log).toEqual(['upload ord-1/id1.pdf', 'rpc record_manual_payment', 'notify payment_recorded'])
    expect(notify).toHaveBeenCalledWith(ID, 'payment_recorded')
  })

  it('com a caixa desmarcada, o gatilho sai sem os e-mails da cliente', async () => {
    await recordManualPayment(deps, entrada({ avisarCliente: false }))
    expect(notify).toHaveBeenCalledWith(ID, 'payment_recorded', { cliente: false })
  })

  it('todos os campos vazios: grava sem meio, sem observação, sem comprovante, e a data é agora', async () => {
    const r = await recordManualPayment(deps, entrada({ method: null, note: '   ', files: [], paidAt: null }))
    expect(r.tipo).toBe('ok')
    expect(enviados).toEqual([])
    expect(rpcs[0].args).toMatchObject({ p_method: null, p_note: null, p_receipts: [], p_paid_at: AGORA.toISOString() })
  })

  it.each([
    ['mais de 3', { files: ['a', 'b', 'c', 'd'].map((n) => arquivo(`${n}.png`, 'image/png')) }, 'São no máximo 3 comprovantes por pagamento.'],
    ['arquivo grande', { files: [arquivo('extrato.pdf', 'application/pdf', 10 * 1024 * 1024 + 1)] }, 'extrato.pdf passa de 10 MB.'],
    ['tipo não aceito', { files: [arquivo('planilha.xlsx', 'application/vnd.ms-excel')] }, 'planilha.xlsx não é JPG, PNG, WebP, HEIC ou PDF.'],
    ['data no futuro', { paidAt: '2026-11-09T18:10:00.000Z' }, 'A data do pagamento não pode estar no futuro.'],
    ['data antes do pedido', { paidAt: '2026-11-09T11:00:00.000Z' }, 'A data do pagamento não pode ser anterior à criação do pedido.'],
    ['observação longa', { note: 'x'.repeat(1001) }, 'A observação passa de 1000 caracteres.'],
  ])('%s: recusa com o motivo ANTES de qualquer envio ou gravação', async (_nome, over, motivo) => {
    const r = await recordManualPayment(deps, entrada(over as Partial<RecordManualPaymentInput>))
    expect(r).toEqual({ tipo: 'recusado', motivo })
    expect(log).toEqual([])
  })

  it('aprovado enquanto o formulário estava aberto: `ja-pago`, apaga os comprovantes e não avisa', async () => {
    respostaRpc = { data: { result: 'ja_pago' }, error: null }
    const r = await recordManualPayment(deps, entrada())
    expect(r).toEqual({ tipo: 'ja-pago' })
    expect(removidos).toEqual([['ord-1/id1.pdf']])
    expect(notify).not.toHaveBeenCalled()
  })

  it('sem papel: `sem-papel`, e os comprovantes saem', async () => {
    respostaRpc = { data: { result: 'sem_papel' }, error: null }
    expect(await recordManualPayment(deps, entrada())).toEqual({ tipo: 'sem-papel' })
    expect(removidos).toEqual([['ord-1/id1.pdf']])
  })

  it.each([
    ['data_futura', 'A data do pagamento não pode estar no futuro.'],
    ['data_antes_do_pedido', 'A data do pagamento não pode ser anterior à criação do pedido.'],
    ['pedido_cancelado', 'Pedido cancelado não recebe registro de pagamento.'],
  ])('a recusa do banco `%s` vira o motivo, e os comprovantes saem', async (result, motivo) => {
    respostaRpc = { data: { result }, error: null }
    expect(await recordManualPayment(deps, entrada())).toEqual({ tipo: 'recusado', motivo })
    expect(removidos).toEqual([['ord-1/id1.pdf']])
    expect(notify).not.toHaveBeenCalled()
  })

  it('a RPC falhando: `falhou`, comprovantes apagados, nenhum aviso', async () => {
    respostaRpc = { data: null, error: { message: 'boom' } }
    const r = await recordManualPayment(deps, entrada())
    expect(r.tipo).toBe('falhou')
    expect(removidos).toEqual([['ord-1/id1.pdf']])
    expect(notify).not.toHaveBeenCalled()
  })

  it('o envio do segundo arquivo falhando: apaga o primeiro e não chama a RPC', async () => {
    falhaNoEnvio = 1
    const r = await recordManualPayment(
      deps,
      entrada({ files: [arquivo('a.png', 'image/png'), arquivo('b.heic', '')] }),
    )
    expect(r.tipo).toBe('falhou-envio')
    expect(removidos).toEqual([['ord-1/id1.png']])
    expect(rpcs).toEqual([])
  })

  it('a foto HEIC sem tipo vai com o tipo da extensão', async () => {
    await recordManualPayment(deps, entrada({ files: [arquivo('IMG_1.HEIC', '')] }))
    expect(enviados[0]).toMatchObject({ path: 'ord-1/id1.heic', opts: { contentType: 'image/heic', upsert: false } })
  })
})

describe('registrar fecha a cobrança aberta no Mercado Pago', () => {
  const invoke = () => (deps.client as unknown as { functions: { invoke: ReturnType<typeof vi.fn> } }).functions.invoke

  it('gravado o registro, pede à mercado-pago que feche a cobrança do pedido', async () => {
    invoke().mockResolvedValue({ data: { result: 'fechada' }, error: null })
    const r = await recordManualPayment(deps, entrada())

    expect(r.tipo).toBe('ok')
    expect(invoke()).toHaveBeenCalledWith('mercado-pago?action=close-charge', { body: { order_id: ID } })
  })

  it('a cobrança que não fecha (ou a porta que falha) não desfaz o registro nem o aviso', async () => {
    invoke().mockRejectedValue(new Error('rede'))
    const r = await recordManualPayment(deps, entrada())

    expect(r.tipo).toBe('ok')
    expect(notify).toHaveBeenCalled()
  })

  it('sem registro gravado (o pagamento já aprovado), nada é fechado', async () => {
    respostaRpc = { data: { result: 'ja_pago' }, error: null }
    await recordManualPayment(deps, entrada())

    expect(invoke()).not.toHaveBeenCalled()
  })
})
