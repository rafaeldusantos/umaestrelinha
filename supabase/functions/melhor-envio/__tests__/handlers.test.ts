import { describe, expect, it } from 'vitest'

import { createFakeSupabase } from '../../_shared/testing/fakes.ts'
import { handleCreate, type MeFetch } from '../handlers.ts'

/**
 * `RET-15` (feature `63`) provado por EXECUÇÃO: pedido de retirada no escritório não chega à API do
 * Melhor Envio — nem ao carrinho, que é a primeira chamada e já põe a etiqueta na conta — e não
 * grava nada em `orders`.
 *
 * Até a rodada 3 da verificação esta regra era guardada só lendo a fonte do `index.ts`, e cada
 * rodada achava uma forma sintática nova que comprava a etiqueta e passava (recusa aninhada noutro
 * `if`, dentro de arrow que ninguém chama, `meFetch` com outro nome, helper de módulo antes do
 * portão, `try/finally`, `order` sombreado). Com o handler carregável, a pergunta deixa de ser "o
 * texto tem a forma certa?" e passa a ser "a API foi chamada?" — que nenhuma forma sintática burla.
 *
 * O PAR importa: o pedido dos Correios CHEGA à API pelo mesmo handler. Sem ele, "zero chamadas"
 * seria verdade num handler que nunca chamasse nada.
 */

interface MeCall {
  path: string
  method: string | undefined
  body: unknown
}

/** O dublê da API: registra cada chamada e responde por caminho. Lança em caminho desconhecido. */
function criarMeFetch(respostas: Record<string, unknown> = {}) {
  const chamadas: MeCall[] = []
  const meFetch: MeFetch = async (path, options = {}) => {
    chamadas.push({
      path,
      method: options.method,
      body: typeof options.body === 'string' ? JSON.parse(options.body) : options.body,
    })
    if (!(path in respostas)) throw new Error(`meFetch: caminho sem resposta: ${path}`)
    return respostas[path]
  }
  return { meFetch, chamadas }
}

const RESPOSTAS_OK: Record<string, unknown> = {
  '/api/v2/me/cart': { id: 'ship-1' },
  '/api/v2/me/shipment/checkout': [{ id: 'ship-1', service: 'PAC', protocol: 'PRT-1', tracking: '' }],
  '/api/v2/me/shipment/generate': { ok: true },
  '/api/v2/me/shipment/tracking': [{ tracking: 'BR123', protocol: 'PRT-T' }],
}

const SENDER = {
  name: 'Ateliê',
  phone: '51999999999',
  email: 'a@exemplo.invalid',
  document: '00000000000',
  address: 'Rua A',
  number: '1',
  district: 'Centro',
  city: 'Porto Alegre',
  state_abbr: 'RS',
  postal_code: '91240010',
}

const PEDIDO_BASE = {
  id: 'o1',
  customer_name: 'Cliente',
  customer_email: 'c@exemplo.invalid',
  address_street: 'Rua B',
  address_number: '2',
  address_complement: '',
  address_neighborhood: 'Bairro',
  address_city: 'São Paulo',
  address_state: 'SP',
  address_zip: '01310100',
  total: 140,
}

/**
 * A leitura de `orders` só devolve `shipping_service_id` quando o `select` o pede (`*` ou a coluna
 * nomeada) — como o PostgREST. Assim, uma leitura que deixasse de trazer a coluna faria a retirada
 * passar pelo portão, e o caso de retirada abaixo reprovaria: a régua da coluna é EXECUTADA, não lida.
 */
function supabaseCom(pedido: Record<string, unknown> | null) {
  return createFakeSupabase({
    rows: {
      orders: (eq: [string, unknown] | null, select: string) => {
        if (!pedido || !eq || eq[0] !== 'id' || eq[1] !== pedido.id) return null
        const trazColuna = select.trim() === '*' || /(^|[\s,])shipping_service_id([\s,]|$)/.test(select)
        if (trazColuna) return pedido
        const { shipping_service_id: _fora, ...resto } = pedido
        return resto
      },
    },
    lists: {
      order_items: [{ product_id: 'p1', product_name: 'Pingente', quantity: 2, unit_price: 70 }],
      products: [{ id: 'p1', weight_kg: 0.1, width_cm: 11, height_cm: 2, length_cm: 16 }],
    },
  })
}

async function executar(pedido: Record<string, unknown> | null, body: Record<string, unknown>) {
  const sb = supabaseCom(pedido)
  const me = criarMeFetch(RESPOSTAS_OK)
  const res = await handleCreate({ supabase: sb.client, meFetch: me.meFetch, sender: SENDER }, body)
  return { res, corpo: await res.json(), chamadas: me.chamadas, updates: sb.updates }
}

const RETIRADA = { ...PEDIDO_BASE, shipping_service_id: 'retirada' }
const CORREIOS = { ...PEDIDO_BASE, shipping_service_id: '1' }

describe('handleCreate — RET-15: retirada não chega à API', () => {
  it('pedido de retirada ⇒ 422 pickup_order, ZERO chamadas à API e nenhuma gravação em orders', async () => {
    const { res, corpo, chamadas, updates } = await executar(RETIRADA, { order_id: 'o1', service_id: 1 })
    expect(res.status).toBe(422)
    expect(corpo).toEqual({ error: 'pickup_order' })
    expect(chamadas).toEqual([])
    expect(updates.filter((u) => u.table === 'orders')).toEqual([])
  })

  it('campos a mais no corpo (force, debug, override, skip, bypass) não abrem o portão', async () => {
    const hostil = {
      order_id: 'o1',
      service_id: 1,
      force: true,
      debug: true,
      override: true,
      skip: true,
      skip_pickup: true,
      bypass: true,
      dry_run: false,
    }
    const { res, corpo, chamadas, updates } = await executar(RETIRADA, hostil)
    expect(res.status).toBe(422)
    expect(corpo).toEqual({ error: 'pickup_order' })
    expect(chamadas).toEqual([])
    expect(updates).toEqual([])
  })

  it('PAR — pedido dos Correios chega à API, começando pelo carrinho', async () => {
    const { res, chamadas } = await executar(CORREIOS, { order_id: 'o1', service_id: 1 })
    expect(res.status).toBe(200)
    expect(chamadas.length).toBeGreaterThan(0)
    expect(chamadas[0].path).toBe('/api/v2/me/cart')
  })

  it('pedido sem serviço gravado (anterior à feature 63) segue para a API — nunca recusa por falta de dado', async () => {
    const { res, chamadas } = await executar({ ...PEDIDO_BASE, shipping_service_id: null }, {
      order_id: 'o1',
      service_id: 1,
    })
    expect(res.status).toBe(200)
    expect(chamadas[0].path).toBe('/api/v2/me/cart')
  })
})

describe('handleCreate — o resto do contrato, igual ao de antes da extração', () => {
  it('sem order_id ou service_id ⇒ 400, sem ler nada e sem chamar a API', async () => {
    for (const body of [{ service_id: 1 }, { order_id: 'o1' }, {}]) {
      const { res, corpo, chamadas } = await executar(CORREIOS, body)
      expect(res.status).toBe(400)
      expect(corpo).toEqual({ error: 'order_id e service_id são obrigatórios' })
      expect(chamadas).toEqual([])
    }
  })

  it('pedido não encontrado ⇒ 404, ZERO chamadas à API e nenhuma gravação', async () => {
    const { res, corpo, chamadas, updates } = await executar(CORREIOS, { order_id: 'outro', service_id: 1 })
    expect(res.status).toBe(404)
    expect(corpo).toEqual({ error: 'Pedido não encontrado' })
    expect(chamadas).toEqual([])
    expect(updates).toEqual([])
  })

  it('Correios: carrinho → checkout → generate → tracking, nesta ordem, com os mesmos corpos', async () => {
    const { chamadas } = await executar(CORREIOS, { order_id: 'o1', service_id: 1 })
    expect(chamadas.map((c) => [c.path, c.method])).toEqual([
      ['/api/v2/me/cart', 'POST'],
      ['/api/v2/me/shipment/checkout', 'POST'],
      ['/api/v2/me/shipment/generate', 'POST'],
      ['/api/v2/me/shipment/tracking', 'POST'],
    ])
    expect(chamadas.slice(1).map((c) => c.body)).toEqual([
      { orders: ['ship-1'] },
      { orders: ['ship-1'] },
      { orders: ['ship-1'] },
    ])
    expect(chamadas[0].body).toEqual({
      service: 1,
      from: {
        name: 'Ateliê',
        phone: '51999999999',
        email: 'a@exemplo.invalid',
        document: '00000000000',
        address: 'Rua A',
        number: '1',
        complement: '',
        district: 'Centro',
        city: 'Porto Alegre',
        state_abbr: 'RS',
        country_id: 'BR',
        postal_code: '91240010',
      },
      to: {
        name: 'Cliente',
        phone: '',
        email: 'c@exemplo.invalid',
        document: '',
        address: 'Rua B',
        number: '2',
        complement: '',
        district: 'Bairro',
        city: 'São Paulo',
        state_abbr: 'SP',
        country_id: 'BR',
        postal_code: '01310100',
      },
      products: [{ name: 'Pingente', quantity: 2, unitary_value: 70 }],
      volumes: [{ height: 4, width: 11, length: 16, weight: 0.2 }],
      options: { insurance_value: 140, receipt: false, own_hand: false },
    })
  })

  it('Correios: grava o envio no pedido e devolve o resumo (o checkout vence o tracking)', async () => {
    const { res, corpo, updates } = await executar(CORREIOS, { order_id: 'o1', service_id: 1 })
    expect(res.status).toBe(200)
    expect(corpo).toEqual({ shipment_id: 'ship-1', tracking_code: 'BR123', protocol: 'PRT-1', carrier: 'PAC' })
    expect(updates).toEqual([
      {
        table: 'orders',
        values: {
          melhor_envio_id: 'ship-1',
          melhor_envio_protocol: 'PRT-1',
          tracking_code: 'BR123',
          shipping_carrier: 'PAC',
        },
        eq: ['id', 'o1'],
      },
    ])
  })

  it('carrinho sem id ⇒ 500 sem seguir para checkout e sem gravar', async () => {
    const sb = supabaseCom(CORREIOS)
    const me = criarMeFetch({ ...RESPOSTAS_OK, '/api/v2/me/cart': { erro: 'x' } })
    const res = await handleCreate({ supabase: sb.client, meFetch: me.meFetch, sender: SENDER }, {
      order_id: 'o1',
      service_id: 1,
    })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Falha ao adicionar ao carrinho', details: { erro: 'x' } })
    expect(me.chamadas.map((c) => c.path)).toEqual(['/api/v2/me/cart'])
    expect(sb.updates).toEqual([])
  })

  it('tracking que falha não derruba a etiqueta (o catch de antes continua)', async () => {
    const sb = supabaseCom(CORREIOS)
    const me = criarMeFetch({
      '/api/v2/me/cart': { id: 'ship-1' },
      '/api/v2/me/shipment/checkout': [],
      '/api/v2/me/shipment/generate': {},
    })
    const res = await handleCreate({ supabase: sb.client, meFetch: me.meFetch, sender: SENDER }, {
      order_id: 'o1',
      service_id: 1,
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ shipment_id: 'ship-1', tracking_code: '', protocol: '', carrier: '' })
    expect(sb.updates[0].values).toEqual({
      melhor_envio_id: 'ship-1',
      melhor_envio_protocol: '',
      tracking_code: null,
      shipping_carrier: null,
    })
  })
})
