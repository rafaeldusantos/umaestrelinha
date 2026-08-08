import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  buildManifest,
  buildManifestCandidates,
  parseXSignature,
  validateWebhookSignature,
} from '../webhookSignature'

// PAY-05: webhook valida x-signature (HMAC-SHA256 do manifest oficial do MP);
// inválida ou ausente → rejeitar (401 na edge function).

const SECRET = 'test-webhook-secret'

// Assinatura de referência computada com node:crypto — independente da implementação.
const signWithNode = (manifest: string, secret: string) =>
  createHmac('sha256', secret).update(manifest).digest('hex')

describe('buildManifest (template oficial do MP)', () => {
  it('com data.id, x-request-id e ts', () => {
    expect(buildManifest({ dataId: '12345', requestId: 'req-abc', ts: '1704908010' })).toBe(
      'id:12345;request-id:req-abc;ts:1704908010;',
    )
  })

  it('sem data.id → parte id removida', () => {
    expect(buildManifest({ dataId: null, requestId: 'req-abc', ts: '1704908010' })).toBe(
      'request-id:req-abc;ts:1704908010;',
    )
  })

  it('sem x-request-id → parte request-id removida', () => {
    expect(buildManifest({ dataId: '12345', requestId: null, ts: '1704908010' })).toBe(
      'id:12345;ts:1704908010;',
    )
  })

  it('data.id alfanumérico → lowercase', () => {
    expect(buildManifest({ dataId: 'ABC123xyz', requestId: 'req-1', ts: '10' })).toBe(
      'id:abc123xyz;request-id:req-1;ts:10;',
    )
  })
})

// D2 (medido no T16): o `data.id` do tópico `order` chega em MAIÚSCULAS
// (`ORDTST01KYMAZV96DKQHXSZB5FG0K86E`), e o lowercase do template oficial — escrito para o id
// NUMÉRICO do tópico de pagamentos — muda a string e derruba o HMAC. A validação passa a tentar o
// id como recebido antes do lowercase.
describe('buildManifestCandidates (D2)', () => {
  const ORDER_DATA_ID = 'ORDTST01KYMAZV96DKQHXSZB5FG0K86E'

  it('id MAIÚSCULO → 2 candidatos, e o primeiro preserva o caixa recebido', () => {
    const candidates = buildManifestCandidates({
      dataId: ORDER_DATA_ID,
      requestId: 'req-abc',
      ts: '1704908010',
    })

    expect(candidates).toEqual([
      `id:${ORDER_DATA_ID};request-id:req-abc;ts:1704908010;`,
      `id:${ORDER_DATA_ID.toLowerCase()};request-id:req-abc;ts:1704908010;`,
    ])
  })

  it('id numérico → 1 candidato (lowercase é no-op, não duplica)', () => {
    expect(
      buildManifestCandidates({ dataId: '170892698670', requestId: 'req-abc', ts: '1704908010' }),
    ).toEqual(['id:170892698670;request-id:req-abc;ts:1704908010;'])
  })

  it('o candidato lowercase é exatamente o buildManifest (template oficial preservado)', () => {
    const parts = { dataId: ORDER_DATA_ID, requestId: 'req-abc', ts: '1704908010' }
    expect(buildManifestCandidates(parts).at(-1)).toBe(buildManifest(parts))
  })

  it('sem data.id → 1 candidato, com a parte id removida', () => {
    expect(
      buildManifestCandidates({ dataId: null, requestId: 'req-abc', ts: '1704908010' }),
    ).toEqual(['request-id:req-abc;ts:1704908010;'])
  })
})

describe('parseXSignature', () => {
  it('extrai ts e v1 do header', () => {
    expect(parseXSignature('ts=1704908010,v1=abcdef012345')).toEqual({
      ts: '1704908010',
      v1: 'abcdef012345',
    })
  })

  it('header ausente ou sem chaves → null', () => {
    expect(parseXSignature(null)).toBeNull()
    expect(parseXSignature('')).toBeNull()
    expect(parseXSignature('foo=bar')).toBeNull()
  })
})

describe('validateWebhookSignature (PAY-05)', () => {
  const ts = '1704908010'
  const manifest = buildManifest({ dataId: '12345', requestId: 'req-abc', ts })
  const validV1 = signWithNode(manifest, SECRET)
  const validHeader = `ts=${ts},v1=${validV1}`

  it('assinatura válida passa', async () => {
    await expect(validateWebhookSignature(validHeader, manifest, SECRET)).resolves.toBe(true)
  })

  it('assinatura inválida (v1 errado) falha', async () => {
    const header = `ts=${ts},v1=${'0'.repeat(64)}`
    await expect(validateWebhookSignature(header, manifest, SECRET)).resolves.toBe(false)
  })

  it('header ausente falha', async () => {
    await expect(validateWebhookSignature(null, manifest, SECRET)).resolves.toBe(false)
    await expect(validateWebhookSignature('', manifest, SECRET)).resolves.toBe(false)
  })

  it('header sem v1 falha', async () => {
    await expect(validateWebhookSignature(`ts=${ts}`, manifest, SECRET)).resolves.toBe(false)
  })

  it('ts adulterado falha (manifest não bate com o v1 assinado)', async () => {
    const tamperedTs = '9999999999'
    const tamperedHeader = `ts=${tamperedTs},v1=${validV1}`
    const tamperedManifest = buildManifest({ dataId: '12345', requestId: 'req-abc', ts: tamperedTs })
    await expect(
      validateWebhookSignature(tamperedHeader, tamperedManifest, SECRET),
    ).resolves.toBe(false)
  })

  it('secret errado falha', async () => {
    await expect(validateWebhookSignature(validHeader, manifest, 'outro-secret')).resolves.toBe(
      false,
    )
  })
})
