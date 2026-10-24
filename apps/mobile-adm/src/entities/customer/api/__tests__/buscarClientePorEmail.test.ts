// Feature `76` · T19 — "Ver cliente": a leitura de `customer_directory` por e-mail, com a cadeia
// registrada (`L-060`) e SEM nenhum `ilike` escrito à mão (`MAC-21`, A10).
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { directoryEmailCondition } from '@estrelinha/core/customers'

import { fake } from '@/test/fakeSupabase'
import { ilikeDoPostgres } from '@/test/clientes'

import { COLUNAS_DO_ACHADO } from '../../model/linha'
import { buscarClientePorEmail } from '../buscarClientePorEmail'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const LIDO_EM = '2026-10-24T14:30:00.123456+00:00'
const ID = '00000000-0000-4000-c076-000000000001'

beforeEach(() => {
  fake.reset()
  fake.responderRpc('atelie_clock', { lido_em: LIDO_EM })
})

describe('a cadeia é a de core, por igualdade (L-060)', () => {
  it('select(id) → or(directoryEmailCondition) → has_account desc → created_at asc → limit 1', async () => {
    fake.responderTabela('customer_directory', { data: [{ id: ID }], error: null })
    await buscarClientePorEmail('marina@exemplo.invalid')
    expect(fake.cadeiasDe('customer_directory')).toEqual([
      [
        { metodo: 'select', args: [COLUNAS_DO_ACHADO] },
        { metodo: 'or', args: [directoryEmailCondition('marina@exemplo.invalid')] },
        { metodo: 'order', args: ['has_account', { ascending: false }] },
        { metodo: 'order', args: ['created_at', { ascending: true }] },
        { metodo: 'limit', args: [1] },
      ],
    ])
  })

  it('o filtro é o EXATO, sem `%`: `email.ilike."…"` com `_` escapado', async () => {
    fake.responderTabela('customer_directory', { data: [], error: null })
    await buscarClientePorEmail('VROSA_RJ@exemplo.invalid')
    const or = String(fake.cadeiasDe('customer_directory')[0].find((e) => e.metodo === 'or')!.args[0])
    expect(or).toBe('email.ilike."VROSA\\\\_RJ@exemplo.invalid"')
    expect(or).not.toContain('%')
  })

  it('a pessoa de `_` NÃO acha a de `VROSAXRJ` (o dublê aplica o `ilike` do Postgres)', async () => {
    const diretorio = [
      { id: 'a', email: 'VROSAXRJ@exemplo.invalid' },
      { id: ID, email: 'vrosa_rj@exemplo.invalid' },
    ]
    fake.responderTabela('customer_directory', (cadeia) => {
      const or = String(cadeia.find((e) => e.metodo === 'or')!.args[0])
      return { data: diretorio.filter((p) => ilikeDoPostgres(or, 'email', p.email)).map(({ id }) => ({ id })), error: null }
    })
    expect(await buscarClientePorEmail('VROSA_RJ@exemplo.invalid')).toEqual({ id: ID })
  })
})

describe('o resultado', () => {
  it('achou ⇒ `{ id }`, e só o id (nada mais da pessoa atravessa)', async () => {
    fake.responderTabela('customer_directory', { data: [{ id: ID, email: 'x', cpf: '123' }], error: null })
    expect(await buscarClientePorEmail('marina@exemplo.invalid')).toEqual({ id: ID })
  })
  it('nenhuma linha ⇒ null', async () => {
    fake.responderTabela('customer_directory', { data: [], error: null })
    expect(await buscarClientePorEmail('ninguem@exemplo.invalid')).toBeNull()
  })
  it('data null ⇒ null', async () => {
    fake.responderTabela('customer_directory', { data: null, error: null })
    expect(await buscarClientePorEmail('ninguem@exemplo.invalid')).toBeNull()
  })
  it.each([[''], ['   ']])('e-mail %j ⇒ null SEM ir à rede', async (email) => {
    expect(await buscarClientePorEmail(email)).toBeNull()
    expect(fake.log()).toEqual([])
  })
  it('o e-mail vai aparado', async () => {
    fake.responderTabela('customer_directory', { data: [], error: null })
    await buscarClientePorEmail('  marina@exemplo.invalid ')
    expect(fake.cadeiasDe('customer_directory')[0][1]).toEqual({ metodo: 'or', args: [directoryEmailCondition('marina@exemplo.invalid')] })
  })
})

describe('erros e recusa (MAC-11)', () => {
  it('erro da consulta LANÇA o erro dele', async () => {
    const erro = { message: 'boom' }
    fake.responderTabela('customer_directory', { data: null, error: erro })
    await expect(buscarClientePorEmail('a@exemplo.invalid')).rejects.toBe(erro)
  })
  it('erro da RPC LANÇA o erro da RPC — e vence a consulta que trouxe linhas', async () => {
    const recusa = { message: 'acesso restrito', code: '42501' }
    fake.falharRpc('atelie_clock', recusa)
    fake.responderTabela('customer_directory', { data: [{ id: ID }], error: null })
    await expect(buscarClientePorEmail('a@exemplo.invalid')).rejects.toBe(recusa)
  })
  it('a RPC sai UMA vez por busca', async () => {
    fake.responderTabela('customer_directory', { data: [{ id: ID }], error: null })
    await buscarClientePorEmail('a@exemplo.invalid')
    expect(fake.chamadasDe('atelie_clock')).toHaveLength(1)
  })
})
