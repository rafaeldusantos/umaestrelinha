import { describe, expect, it } from 'vitest'
import {
  GUEST_ACCESS_DAYS,
  accessGrant,
  guestAccessExpiry,
  hashAccessToken,
  newAccessToken,
  type GuestAccessRow,
} from '../index'

// PED-05: o pedido de convidada devolve um acesso próprio, guardado no banco só como hash
// PED-07: token que não confere, expirou, ou é de outro pedido ⇒ recusa

const AGORA = new Date('2026-09-13T12:00:00.000Z')

const linha = async (token: string, expira: string): Promise<GuestAccessRow> => ({
  guest_access_hash: await hashAccessToken(token),
  guest_access_expires_at: expira,
})

describe('newAccessToken', () => {
  it('são 32 bytes em base64url — 43 caracteres, sem preenchimento', () => {
    const token = newAccessToken()

    expect(token).toHaveLength(43)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('dois tokens seguidos diferem', () => {
    // Um gerador que devolvesse constante passaria em todo o resto deste arquivo.
    const tokens = new Set(Array.from({ length: 50 }, () => newAccessToken()))

    expect(tokens.size).toBe(50)
  })
})

describe('hashAccessToken', () => {
  it('é estável para a mesma entrada', async () => {
    const token = newAccessToken()

    expect(await hashAccessToken(token)).toBe(await hashAccessToken(token))
  })

  it('muda com um caractere', async () => {
    expect(await hashAccessToken('abcdef')).not.toBe(await hashAccessToken('abcdeg'))
  })

  it('o texto puro do token NÃO aparece no que vai para o banco', async () => {
    // A propriedade que faz um dump do banco não dar acesso a pedido nenhum.
    const token = newAccessToken()
    const hash = await hashAccessToken(token)

    expect(hash).not.toBe(token)
    expect(hash).not.toContain(token)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('guestAccessExpiry', () => {
  it('vence sete dias depois da criação', () => {
    expect(guestAccessExpiry(AGORA)).toBe('2026-09-20T12:00:00.000Z')
    expect(GUEST_ACCESS_DAYS).toBe(7)
  })
})

describe('accessGrant', () => {
  it('aceita o par certo dentro da validade', async () => {
    const token = newAccessToken()

    expect(await accessGrant(await linha(token, guestAccessExpiry(AGORA)), token, AGORA)).toBe(true)
  })

  it('recusa token diferente — o acesso é DAQUELE pedido', async () => {
    // O caso que uma comparação frouxa deixaria passar: token válido, pedido errado.
    const doPedido = newAccessToken()
    const deOutroPedido = newAccessToken()

    expect(
      await accessGrant(await linha(doPedido, guestAccessExpiry(AGORA)), deOutroPedido, AGORA),
    ).toBe(false)
  })

  it('recusa token válido depois de expirado', async () => {
    const token = newAccessToken()
    const row = await linha(token, guestAccessExpiry(AGORA))
    const oitoDias = new Date(AGORA.getTime() + 8 * 24 * 60 * 60 * 1000)

    expect(await accessGrant(row, token, oitoDias)).toBe(false)
  })

  it('aceita no último instante e recusa no primeiro instante seguinte', async () => {
    // A borda exata, porque `<=` e `<` produzem o mesmo resultado em todo o resto do intervalo.
    const token = newAccessToken()
    const row = await linha(token, guestAccessExpiry(AGORA))
    const limite = new Date(row.guest_access_expires_at)

    expect(await accessGrant(row, token, new Date(limite.getTime() - 1))).toBe(true)
    expect(await accessGrant(row, token, limite)).toBe(false)
  })

  it('recusa pedido SEM hash — o criado com sessão não tem acesso de convidada', async () => {
    // O buraco clássico do padrão: a comparação está certa e o dado é que não existe. Sem este
    // recorte, token vazio contra hash vazio passaria.
    const semHash: GuestAccessRow = {
      guest_access_hash: null,
      guest_access_expires_at: guestAccessExpiry(AGORA),
    }

    expect(await accessGrant(semHash, '', AGORA)).toBe(false)
    expect(await accessGrant(semHash, newAccessToken(), AGORA)).toBe(false)
  })

  it('recusa token vazio contra um pedido que TEM hash', async () => {
    const token = newAccessToken()

    expect(await accessGrant(await linha(token, guestAccessExpiry(AGORA)), '', AGORA)).toBe(false)
  })

  it('recusa validade ausente ou ilegível em vez de liberar', async () => {
    // Falhar para o lado fechado: coluna nula ou com lixo não pode virar "acesso eterno".
    const token = newAccessToken()
    const hash = await hashAccessToken(token)

    expect(
      await accessGrant({ guest_access_hash: hash, guest_access_expires_at: null }, token, AGORA),
    ).toBe(false)
    expect(
      await accessGrant(
        { guest_access_hash: hash, guest_access_expires_at: 'ontem' },
        token,
        AGORA,
      ),
    ).toBe(false)
  })
})
