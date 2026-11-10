import { describe, expect, it } from 'vitest'

import {
  MANUAL_PAYMENT_NOTE_MAX,
  RECEIPT_MAX_BYTES,
  RECEIPT_MAX_FILES,
  canRecordManualPayment,
  needsPaymentRecord,
  paidAtRefusal,
  receiptContentType,
  receiptRefusal,
} from '../manualPayment.ts'
import { PROXIMO } from '../nextStep.ts'
import * as barril from '../index.ts'

const CRIADO = '2026-11-09T12:00:30.000Z'
const AGORA = new Date('2026-11-09T18:00:00.000Z')

describe('a data e a hora do pagamento', () => {
  it('entre a criação do pedido e agora, passa', () => {
    expect(paidAtRefusal('2026-11-09T15:00:00.000Z', CRIADO, AGORA)).toBeNull()
    expect(paidAtRefusal(AGORA.toISOString(), CRIADO, AGORA)).toBeNull()
  })

  it('no futuro, é recusada com o motivo', () => {
    expect(paidAtRefusal('2026-11-09T18:05:00.000Z', CRIADO, AGORA)).toBe(
      'A data do pagamento não pode estar no futuro.',
    )
  })

  it('antes da criação do pedido, é recusada com o motivo', () => {
    expect(paidAtRefusal('2026-11-09T11:59:00.000Z', CRIADO, AGORA)).toBe(
      'A data do pagamento não pode ser anterior à criação do pedido.',
    )
  })

  it('o mesmo minuto da criação passa: o campo não tem segundos', () => {
    expect(paidAtRefusal('2026-11-09T12:00:00.000Z', CRIADO, AGORA)).toBeNull()
  })

  it('o campo vazio ou inválido é recusado', () => {
    expect(paidAtRefusal(null, CRIADO, AGORA)).toBe('Informe a data e a hora do pagamento.')
  })
})

const arquivo = (name: string, type: string, size = 1000) => ({ name, type, size })

describe('os comprovantes, recusados antes da rede', () => {
  it('até 3 arquivos JPG, PNG, WebP, HEIC ou PDF de até 10 MB passam', () => {
    expect(
      receiptRefusal([
        arquivo('a.jpg', 'image/jpeg'),
        arquivo('b.heic', 'image/heic', RECEIPT_MAX_BYTES),
        arquivo('c.pdf', 'application/pdf'),
      ]),
    ).toBeNull()
    expect(receiptRefusal([])).toBeNull()
    expect(RECEIPT_MAX_FILES).toBe(3)
    expect(RECEIPT_MAX_BYTES).toBe(10 * 1024 * 1024)
  })

  it('mais de 3 é recusado', () => {
    const quatro = ['a.png', 'b.png', 'c.png', 'd.png'].map((n) => arquivo(n, 'image/png'))
    expect(receiptRefusal(quatro)).toBe('São no máximo 3 comprovantes por pagamento.')
  })

  it('arquivo acima de 10 MB é recusado, nomeado', () => {
    expect(receiptRefusal([arquivo('extrato.pdf', 'application/pdf', RECEIPT_MAX_BYTES + 1)])).toBe(
      'extrato.pdf passa de 10 MB.',
    )
  })

  it('tipo que não é aceito é recusado, nomeado', () => {
    expect(receiptRefusal([arquivo('planilha.xlsx', 'application/vnd.ms-excel')])).toBe(
      'planilha.xlsx não é JPG, PNG, WebP, HEIC ou PDF.',
    )
    expect(receiptRefusal([arquivo('video.mp4', 'video/mp4')])).toBe('video.mp4 não é JPG, PNG, WebP, HEIC ou PDF.')
  })

  it('arquivo vazio é recusado', () => {
    expect(receiptRefusal([arquivo('vazio.png', 'image/png', 0)])).toBe('vazio.png está vazio.')
  })

  it('a foto HEIC do iPhone sem tipo informado é reconhecida pela extensão', () => {
    expect(receiptContentType(arquivo('IMG_0001.HEIC', ''))).toBe('image/heic')
    expect(receiptContentType(arquivo('comprovante.JPG', ''))).toBe('image/jpeg')
    expect(receiptContentType(arquivo('x.bin', ''))).toBeNull()
    expect(receiptRefusal([arquivo('IMG_0001.HEIC', '')])).toBeNull()
  })

  it('o teto da observação é 1000', () => {
    expect(MANUAL_PAYMENT_NOTE_MAX).toBe(1000)
  })
})

const pedido = (over: Record<string, unknown> = {}) => ({
  status: 'pending',
  payment_status: 'pending',
  paid_at: null,
  ...over,
})

describe('quando o registro de pagamento existe', () => {
  it.each(['pending', 'rejected', 'expired'])('pagamento %s, pedido não cancelado: pode registrar', (ps) => {
    expect(canRecordManualPayment(pedido({ payment_status: ps }))).toBe(true)
  })

  it('pagamento aprovado, estornado ou cancelado: não pode', () => {
    expect(canRecordManualPayment(pedido({ payment_status: 'approved', paid_at: '2026-11-09T12:00:00Z' }))).toBe(false)
    expect(canRecordManualPayment(pedido({ payment_status: 'refunded' }))).toBe(false)
    expect(canRecordManualPayment(pedido({ payment_status: 'cancelled' }))).toBe(false)
  })

  it('pedido cancelado: não pode', () => {
    expect(canRecordManualPayment(pedido({ status: 'cancelled' }))).toBe(false)
  })
})

describe('levar um pedido não pago adiante pede o registro', () => {
  it('o próximo passo de Pendente (Pago) com o pagamento não aprovado leva ao registro', () => {
    expect(PROXIMO.pending).toBe('paid')
    expect(needsPaymentRecord(pedido(), PROXIMO.pending!)).toBe(true)
  })

  it.each(['paid', 'separating', 'shipped', 'delivered'])('o "Outro status" de não pago para %s leva ao registro', (para) => {
    expect(needsPaymentRecord(pedido({ payment_status: 'rejected' }), para)).toBe(true)
  })

  it('cancelar ou voltar a Pendente não pede registro', () => {
    expect(needsPaymentRecord(pedido(), 'cancelled')).toBe(false)
    expect(needsPaymentRecord(pedido({ status: 'paid' }), 'pending')).toBe(false)
  })

  it('pedido já pago avança sem registro', () => {
    expect(needsPaymentRecord(pedido({ status: 'paid', payment_status: 'approved', paid_at: CRIADO }), 'separating')).toBe(false)
  })

  it('o barril expõe as regras', () => {
    expect(barril.needsPaymentRecord).toBe(needsPaymentRecord)
    expect(barril.canRecordManualPayment).toBe(canRecordManualPayment)
    expect(barril.receiptRefusal).toBe(receiptRefusal)
    expect(barril.paidAtRefusal).toBe(paidAtRefusal)
    expect(barril.PROXIMO).toBe(PROXIMO)
  })
})
