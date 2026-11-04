import { beforeEach, describe, expect, it } from 'vitest'

import { ORDER_ADMIN_NOTE_COLUMNS, writeAdminNote } from '../adminNote.ts'
import { ERRO, ZERO_LINHAS, criarDuble, passosDe, type Duble } from './dubleDoClient.ts'

// A escrita da observação do pedido tem UM dono, porque o painel e o app do ateliê gravam. O client é
// injetado; o efeito é conferido pela linha devolvida (zero linhas nunca é sucesso).

const ID = 'ord-1'
const ADMIN = 'user-admin'
const AGORA = '2026-11-03T15:00:00.000Z'
let d: Duble

const LINHA = {
  order_id: ID,
  note: 'Gravar "Ana" na frente',
  updated_by: ADMIN,
  updated_by_name: 'Adri Muniz',
  updated_at: AGORA,
}

beforeEach(() => {
  d = criarDuble()
  d.responder = () => ({ data: [LINHA], error: null })
})

describe('writeAdminNote — gravar', () => {
  it('faz upsert por pedido com o texto aparado e quem editou — o instante é do banco, nunca do aparelho — e confere pela linha', async () => {
    const r = await writeAdminNote(d.deps, {
      orderId: ID,
      texto: '  Gravar "Ana" na frente \n',
      userId: ADMIN,
      userName: 'Adri Muniz',
    })
    expect(passosDe(d, 'order_admin_notes')).toEqual([
      [
        [
          'upsert',
          { order_id: ID, note: 'Gravar "Ana" na frente', updated_by: ADMIN, updated_by_name: 'Adri Muniz' },
          { onConflict: 'order_id' },
        ],
        ['select', ORDER_ADMIN_NOTE_COLUMNS],
      ],
    ])
    expect(r).toEqual({ tipo: 'ok', nota: LINHA })
  })

  it('sem nome de quem editou, grava `null` — nunca o id no lugar do nome', async () => {
    await writeAdminNote(d.deps, { orderId: ID, texto: 'x', userId: ADMIN, userName: '  ' })
    const valores = passosDe(d, 'order_admin_notes')[0][0][1] as Record<string, unknown>
    expect(valores.updated_by).toBe(ADMIN)
    expect(valores.updated_by_name).toBeNull()
  })

  it('não grava em nenhuma outra tabela', async () => {
    await writeAdminNote(d.deps, { orderId: ID, texto: 'x', userId: ADMIN, userName: 'Adri' })
    expect(d.cadeias.map((c) => c.tabela)).toEqual(['order_admin_notes'])
    expect(d.rpcs).toEqual([])
    expect(d.notify).not.toHaveBeenCalled()
  })
})

describe('writeAdminNote — apagar', () => {
  it('texto vazio (ou só espaço) apaga a observação do pedido', async () => {
    const r = await writeAdminNote(d.deps, { orderId: ID, texto: '  \n ', userId: ADMIN, userName: 'Adri' })
    expect(passosDe(d, 'order_admin_notes')).toEqual([
      [['delete'], ['eq', 'order_id', ID], ['select', ORDER_ADMIN_NOTE_COLUMNS]],
    ])
    expect(r).toEqual({ tipo: 'ok', nota: null })
  })
})

describe('writeAdminNote — recusa antes da rede', () => {
  it('acima do teto recusa com o motivo e não toca no client', async () => {
    const r = await writeAdminNote(d.deps, {
      orderId: ID,
      texto: 'a'.repeat(1001),
      userId: ADMIN,
      userName: 'Adri',
    })
    expect(r).toEqual({ tipo: 'recusado', motivo: 'A observação vai até 1000 caracteres.' })
    expect(d.cadeias).toEqual([])
  })

  it('no teto exato grava', async () => {
    const r = await writeAdminNote(d.deps, { orderId: ID, texto: 'a'.repeat(1000), userId: ADMIN, userName: 'Adri' })
    expect(r.tipo).toBe('ok')
  })
})

describe('writeAdminNote — o efeito conferido', () => {
  it('zero linhas no upsert é `nenhuma-linha`, nunca sucesso', async () => {
    d.responder = () => ZERO_LINHAS
    const r = await writeAdminNote(d.deps, { orderId: ID, texto: 'x', userId: ADMIN, userName: 'Adri' })
    expect(r).toEqual({ tipo: 'nenhuma-linha' })
  })

  it('zero linhas no delete é `nenhuma-linha`', async () => {
    d.responder = () => ZERO_LINHAS
    const r = await writeAdminNote(d.deps, { orderId: ID, texto: '', userId: ADMIN, userName: 'Adri' })
    expect(r).toEqual({ tipo: 'nenhuma-linha' })
  })

  it('o erro do PostgREST é `falhou`, com o erro', async () => {
    d.responder = () => ERRO
    const r = await writeAdminNote(d.deps, { orderId: ID, texto: 'x', userId: ADMIN, userName: 'Adri' })
    expect(r).toEqual({ tipo: 'falhou', erro: ERRO.error })
  })

  it('a promessa rejeitada é `falhou`', async () => {
    const boom = new Error('rede')
    d.responder = () => {
      throw boom
    }
    const r = await writeAdminNote(d.deps, { orderId: ID, texto: 'x', userId: ADMIN, userName: 'Adri' })
    expect(r).toEqual({ tipo: 'falhou', erro: boom })
  })

  it('o `from` que lança na hora é `falhou`', async () => {
    d.fromLancaSincrono = true
    const r = await writeAdminNote(d.deps, { orderId: ID, texto: 'x', userId: ADMIN, userName: 'Adri' })
    expect(r.tipo).toBe('falhou')
  })
})
