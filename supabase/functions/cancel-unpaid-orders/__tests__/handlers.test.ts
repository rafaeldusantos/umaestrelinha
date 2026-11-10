import { describe, expect, it } from 'vitest'

import { createFakeFetch } from '../../_shared/testing/fakes.ts'
import { type Deps, route, runUnpaidCancellation } from '../handlers.ts'

/**
 * O job do cancelamento automático, contra um banco em memória que ENXERGA os filtros: cada `.eq`,
 * `.is`, `.neq`, `.not('…','in',…)`, `.gte`, `.lte` e `.in` da cadeia é aplicado às linhas de verdade.
 * Um dublê que devolvesse a fixtura inteira tornaria o recorte inauditável — o filtro da consulta e o
 * da gravação são metade da regra.
 */

type Linha = Record<string, any>

interface Banco {
  orders: Linha[]
  order_manual_payments: Linha[]
  order_status_history: Linha[]
}

interface Opcoes {
  desde?: string | null
  erroNoCorte?: boolean
  /** Roda depois da leitura dos candidatos e antes da primeira gravação (a corrida). */
  depoisDaLeitura?: (banco: Banco) => void
}

function criarBanco(banco: Banco, opcoes: Opcoes = {}) {
  const updates: { tabela: string; patch: Linha; ids: string[] }[] = []
  let lido = false

  const consulta = (tabela: keyof Banco) => {
    const filtros: ((l: Linha) => boolean)[] = []
    let modo: 'select' | 'update' | 'insert' = 'select'
    let patch: Linha = {}
    let limite = Infinity
    let ordem: string | null = null

    const linhas = () => {
      let r = banco[tabela].filter((l) => filtros.every((f) => f(l)))
      if (ordem) r = [...r].sort((a, b) => String(a[ordem!]).localeCompare(String(b[ordem!])))
      return r.slice(0, limite)
    }

    const executar = async () => {
      if (modo === 'update') {
        if (!lido) lido = true
        const alvo = linhas()
        for (const l of alvo) Object.assign(l, patch)
        updates.push({ tabela, patch, ids: alvo.map((l) => l.id) })
        return { data: alvo.map((l) => ({ id: l.id })), error: null }
      }
      const r = linhas().map((l) => ({ ...l }))
      if (tabela === 'orders' && !lido) {
        lido = true
        opcoes.depoisDaLeitura?.(banco)
      }
      return { data: r, error: null }
    }

    const b: any = {
      select: () => b,
      update: (p: Linha) => {
        modo = 'update'
        patch = p
        return b
      },
      insert: async (linha: Linha | Linha[]) => {
        modo = 'insert'
        banco[tabela].push(...(Array.isArray(linha) ? linha : [linha]))
        return { data: null, error: null }
      },
      eq: (c: string, v: unknown) => (filtros.push((l) => l[c] === v), b),
      neq: (c: string, v: unknown) => (filtros.push((l) => l[c] !== v), b),
      is: (c: string, v: unknown) => (filtros.push((l) => (l[c] ?? null) === v), b),
      in: (c: string, vs: unknown[]) => (filtros.push((l) => vs.includes(l[c])), b),
      gte: (c: string, v: string) => (filtros.push((l) => l[c] >= v), b),
      lte: (c: string, v: string) => (filtros.push((l) => l[c] <= v), b),
      not: (c: string, op: string, v: string) => {
        if (op !== 'in') throw new Error(`dublê: not.${op} não suportado`)
        const lista = v.replace(/^\(|\)$/g, '').split(',')
        filtros.push((l) => !lista.includes(l[c]))
        return b
      },
      order: (c: string) => ((ordem = c), b),
      limit: (n: number) => ((limite = n), b),
      then: (ok: (v: unknown) => unknown, falha: (e: unknown) => unknown) => executar().then(ok, falha),
    }
    return b
  }

  const supabase = {
    from: (tabela: keyof Banco) => consulta(tabela),
    rpc: async (nome: string) => {
      if (nome !== 'unpaid_cancel_since') throw new Error(`dublê: rpc ${nome}`)
      if (opcoes.erroNoCorte) return { data: null, error: { message: 'boom' } }
      return { data: opcoes.desde ?? DESDE, error: null }
    },
  }
  return { supabase, updates }
}

const AGORA = new Date('2026-12-20T12:00:00.000Z')
const DESDE = '2026-11-01T00:00:00.000Z'
const DIA = 24 * 60 * 60 * 1000
const diasAtras = (n: number) => new Date(AGORA.getTime() - n * DIA).toISOString()

const pedido = (id: string, extra: Linha = {}): Linha => ({
  id,
  status: 'pending',
  payment_status: 'expired',
  payment_method: 'pix',
  paid_at: null,
  material_status: 'nao_aplicavel',
  nuvemshop_id: null,
  created_at: diasAtras(8),
  mp_order_id: `ORD-${id}`,
  unpaid_cancelled_at: null,
  ...extra,
})

function montar(banco: Banco, opcoes: Opcoes = {}) {
  const { supabase, updates } = criarBanco(banco, opcoes)
  const fetch = createFakeFetch([{ match: /\/v1\/orders\/.+\/cancel$/, status: 200, body: {} }])
  const avisos: { orderId: string; trigger: string }[] = []
  const deps: Deps = {
    supabase,
    fetch: fetch.fetch,
    env: { mpAccessToken: 'TEST-mp', jobKey: 'chave-do-job' },
    notifications: {
      resendApiKey: 're_x',
      resendFrom: 'Loja <loja@exemplo.invalid>',
      storePublicUrl: 'https://loja.exemplo.invalid',
      adminPublicUrl: 'https://painel.exemplo.invalid',
    },
    providers: [],
    now: () => AGORA,
    dispatch: async (_d, opcoesDoAviso) => {
      avisos.push({ orderId: opcoesDoAviso.orderId, trigger: opcoesDoAviso.trigger })
      return { trigger: opcoesDoAviso.trigger, results: [], orderFound: true }
    },
  }
  return { deps, updates, fetch, avisos }
}

const vazio = (): Banco => ({ orders: [], order_manual_payments: [], order_status_history: [] })

describe('o recorte — só o pedido não pago de 7 dias é cancelado', () => {
  it('cancela o pendente sem pagamento de 8 dias, e deixa todo o resto como estava', async () => {
    const banco = vazio()
    banco.orders.push(
      pedido('vencido'),
      pedido('seis-dias', { created_at: diasAtras(6) }),
      pedido('pago', { status: 'paid', payment_status: 'approved', paid_at: diasAtras(7) }),
      pedido('separando', { status: 'separating', payment_status: 'approved', paid_at: diasAtras(7) }),
      pedido('aprovado-pendente', { payment_status: 'approved' }),
      pedido('com-paid-at', { paid_at: diasAtras(7) }),
      pedido('material-enviado', { material_status: 'material_enviado' }),
      pedido('material-recebido', { material_status: 'material_recebido' }),
      pedido('aguardando-material', { material_status: 'aguardando_material' }),
      pedido('antes-do-corte', { created_at: '2026-10-31T23:59:59.000Z' }),
      pedido('importado', { nuvemshop_id: 123456 }),
      pedido('ja-cancelado', { status: 'cancelled' }),
    )
    const { deps } = montar(banco)

    const r = await runUnpaidCancellation(deps)

    expect(r.cancelled.sort()).toEqual(['aguardando-material', 'vencido'])
    const porId = Object.fromEntries(banco.orders.map((o) => [o.id, o]))
    expect(porId.vencido.status).toBe('cancelled')
    expect(porId.vencido.unpaid_cancelled_at).toBe(AGORA.toISOString())
    for (const id of [
      'seis-dias', 'pago', 'separando', 'aprovado-pendente', 'com-paid-at', 'material-enviado',
      'material-recebido', 'antes-do-corte', 'importado',
    ]) {
      expect(porId[id].unpaid_cancelled_at, id).toBeNull()
    }
    expect(porId['seis-dias'].status).toBe('pending')
    expect(porId['material-enviado'].status).toBe('pending')
    expect(porId.importado.status).toBe('pending')
    expect(porId['ja-cancelado'].unpaid_cancelled_at).toBeNull()
  })

  it('exatamente 7 dias depois da criação já cancela; um minuto antes, não', async () => {
    const banco = vazio()
    banco.orders.push(
      pedido('sete-dias', { created_at: diasAtras(7) }),
      pedido('quase', { created_at: new Date(AGORA.getTime() - 7 * DIA + 60_000).toISOString() }),
    )
    const { deps } = montar(banco)

    expect((await runUnpaidCancellation(deps)).cancelled).toEqual(['sete-dias'])
  })

  it('pedido com pagamento registrado à mão vivo nunca é cancelado pelo prazo', async () => {
    const banco = vazio()
    // Estado que a RPC de registro não produz (ela leva o pedido a Pago), e o recorte recusa mesmo assim.
    banco.orders.push(pedido('registrado'))
    banco.order_manual_payments.push({ order_id: 'registrado', undone_at: null })
    const { deps } = montar(banco)

    expect((await runUnpaidCancellation(deps)).cancelled).toEqual([])
    expect(banco.orders[0].status).toBe('pending')
  })

  it('grava uma linha no histórico do pedido cancelado, sem autor, e só dele', async () => {
    const banco = vazio()
    banco.orders.push(pedido('vencido'), pedido('novo', { created_at: diasAtras(1) }))
    const { deps } = montar(banco)

    await runUnpaidCancellation(deps)

    expect(banco.order_status_history).toEqual([
      expect.objectContaining({
        order_id: 'vencido',
        from_status: 'pending',
        to_status: 'cancelled',
        created_by: null,
        note: expect.stringContaining('falta de pagamento'),
      }),
    ])
  })
})

describe('o prazo recomeça do desfazer de um pagamento registrado à mão', () => {
  it('desfeito há 3 dias, num pedido de 10 dias: ainda não cancela', async () => {
    const banco = vazio()
    banco.orders.push(pedido('desfeito-recente', { created_at: diasAtras(10) }))
    banco.order_manual_payments.push({ order_id: 'desfeito-recente', undone_at: diasAtras(3) })
    const { deps } = montar(banco)

    expect((await runUnpaidCancellation(deps)).cancelled).toEqual([])
    expect(banco.orders[0].status).toBe('pending')
  })

  it('desfeito há 8 dias: cancela — e vale o desfazer MAIS RECENTE', async () => {
    const banco = vazio()
    banco.orders.push(pedido('desfeito-antigo', { created_at: diasAtras(20) }), pedido('dois-desfazer', { created_at: diasAtras(20) }))
    banco.order_manual_payments.push(
      { order_id: 'desfeito-antigo', undone_at: diasAtras(8) },
      { order_id: 'dois-desfazer', undone_at: diasAtras(15) },
      { order_id: 'dois-desfazer', undone_at: diasAtras(2) },
    )
    const { deps } = montar(banco)

    expect((await runUnpaidCancellation(deps)).cancelled).toEqual(['desfeito-antigo'])
  })
})

describe('executar duas vezes não repete efeito', () => {
  it('a segunda rodada não grava, não fecha cobrança e não avisa ninguém', async () => {
    const banco = vazio()
    banco.orders.push(pedido('vencido'))
    const { deps, fetch, avisos } = montar(banco)

    await runUnpaidCancellation(deps)
    const marca = banco.orders[0].unpaid_cancelled_at
    const chamadasMp = fetch.calls.length
    const historico = banco.order_status_history.length

    const segunda = await runUnpaidCancellation({ ...deps, now: () => new Date(AGORA.getTime() + DIA) })

    expect(segunda.cancelled).toEqual([])
    expect(banco.orders[0].unpaid_cancelled_at).toBe(marca)
    expect(fetch.calls).toHaveLength(chamadasMp)
    expect(banco.order_status_history).toHaveLength(historico)
    expect(avisos).toHaveLength(1)
  })

  it('o pedido pago entre a leitura e a gravação não é cancelado, e nada mais acontece com ele', async () => {
    const banco = vazio()
    banco.orders.push(pedido('pago-na-corrida'))
    const { deps, fetch, avisos } = montar(banco)
    const corrida = montar(banco, {
      depoisDaLeitura: (b) => Object.assign(b.orders[0], { status: 'paid', payment_status: 'approved', paid_at: AGORA.toISOString() }),
    })

    const r = await runUnpaidCancellation({ ...deps, supabase: corrida.deps.supabase })

    expect(r.cancelled).toEqual([])
    expect(banco.orders[0].status).toBe('paid')
    expect(banco.orders[0].unpaid_cancelled_at).toBeNull()
    expect(fetch.calls).toHaveLength(0)
    expect(avisos).toHaveLength(0)
    expect(banco.order_status_history).toHaveLength(0)
  })
})

describe('fecha a cobrança aberta e dispara o gatilho do e-mail', () => {
  it('cancela a order do Mercado Pago do pedido e dispara `order_auto_cancelled`', async () => {
    const banco = vazio()
    banco.orders.push(pedido('vencido', { mp_order_id: 'ORD-77' }))
    const { deps, fetch, avisos } = montar(banco)

    await runUnpaidCancellation(deps)

    expect(fetch.calls).toHaveLength(1)
    expect(fetch.calls[0].method).toBe('POST')
    expect(fetch.calls[0].url).toBe('https://api.mercadopago.com/v1/orders/ORD-77/cancel')
    expect(fetch.calls[0].headers.Authorization).toBe('Bearer TEST-mp')
    expect(avisos).toEqual([{ orderId: 'vencido', trigger: 'order_auto_cancelled' }])
  })

  it('sem cobrança aberta, cancela e avisa sem chamar o Mercado Pago', async () => {
    const banco = vazio()
    banco.orders.push(pedido('sem-cobranca', { mp_order_id: null }))
    const { deps, fetch, avisos } = montar(banco)

    const r = await runUnpaidCancellation(deps)

    expect(r.cancelled).toEqual(['sem-cobranca'])
    expect(fetch.calls).toHaveLength(0)
    expect(avisos).toEqual([{ orderId: 'sem-cobranca', trigger: 'order_auto_cancelled' }])
  })

  it('a cobrança que o Mercado Pago não fecha não impede o cancelamento nem o aviso', async () => {
    const banco = vazio()
    banco.orders.push(pedido('vencido'))
    const { deps, avisos } = montar(banco)
    const recusa = createFakeFetch([{ match: /cancel$/, status: 409, body: {} }])

    const r = await runUnpaidCancellation({ ...deps, fetch: recusa.fetch })

    expect(r.cancelled).toEqual(['vencido'])
    expect(banco.orders[0].status).toBe('cancelled')
    expect(avisos).toHaveLength(1)
  })

  it('o motor que lança não derruba o job: o próximo pedido ainda é cancelado e avisado', async () => {
    const banco = vazio()
    banco.orders.push(pedido('a', { created_at: diasAtras(9) }), pedido('b', { created_at: diasAtras(8) }))
    const { deps } = montar(banco)
    const vistos: string[] = []

    const r = await runUnpaidCancellation({
      ...deps,
      dispatch: async (_d, o) => {
        vistos.push(o.orderId)
        if (o.orderId === 'a') throw new Error('motor quebrado')
        return { trigger: o.trigger, results: [], orderFound: true }
      },
    })

    expect(r.cancelled.sort()).toEqual(['a', 'b'])
    expect(vistos.sort()).toEqual(['a', 'b'])
  })
})

describe('a porta HTTP', () => {
  const chamar = (deps: Deps, init: RequestInit = {}) =>
    route(deps, new Request('http://x/functions/v1/cancel-unpaid-orders', { method: 'POST', ...init }))

  it('sem a chave do job: 401, e nada é lido', async () => {
    const banco = vazio()
    banco.orders.push(pedido('vencido'))
    const { deps } = montar(banco)

    expect((await chamar(deps)).status).toBe(401)
    expect((await chamar(deps, { headers: { Authorization: 'Bearer outra' } })).status).toBe(401)
    expect(banco.orders[0].status).toBe('pending')
  })

  it('com a chave vazia configurada, recusa toda chamada — inclusive a de chave vazia', async () => {
    const banco = vazio()
    banco.orders.push(pedido('vencido'))
    const { deps } = montar(banco)
    const semChave = { ...deps, env: { ...deps.env, jobKey: '' } }

    expect((await chamar(semChave, { headers: { Authorization: 'Bearer ' } })).status).toBe(401)
    expect(banco.orders[0].status).toBe('pending')
  })

  it('com a chave: 200, e diz quantos cancelou', async () => {
    const banco = vazio()
    banco.orders.push(pedido('vencido'))
    const { deps } = montar(banco)

    const res = await chamar(deps, { headers: { Authorization: 'Bearer chave-do-job' } })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ cancelled: 1 })
  })

  it('outro método: 405', async () => {
    const { deps } = montar(vazio())
    const res = await route(deps, new Request('http://x/functions/v1/cancel-unpaid-orders', { method: 'GET' }))
    expect(res.status).toBe(405)
  })

  it('sem a data de corte, não cancela nada: 500', async () => {
    const banco = vazio()
    banco.orders.push(pedido('vencido'))
    const { deps } = montar(banco, { erroNoCorte: true })

    const res = await chamar(deps, { headers: { Authorization: 'Bearer chave-do-job' } })

    expect(res.status).toBe(500)
    expect(banco.orders[0].status).toBe('pending')
  })
})
