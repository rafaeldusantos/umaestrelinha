import { describe, expect, it } from 'vitest'

import { createFakeSupabase, type FakeSupabaseOptions } from '../../_shared/testing/fakes.ts'
import { hashAccessToken } from '../../../../packages/core/src/checkout/guestAccess.ts'
import { IDENTIFY_MAX, IDENTIFY_WINDOW_MS, createRateLimiter, route, type Deps } from '../handlers.ts'

/**
 * `PED-01` … `PED-09`, `CSC-04`, `CSC-07`, `CSC-08`, `IDN-08`, `ADR-G1`/`ADR-G2` — a ação que grava
 * o pedido.
 *
 * **A ordem das escritas é o requisito.** Vários casos aqui asserem sobre `supabase.inserts` e
 * `supabase.adminCreateUsers` em vez de só sobre o status: um 200 é verdadeiro tanto na
 * implementação certa quanto numa que cria a conta antes do pedido — e é essa última que deixa
 * conta órfã depois de uma falha de rede, fazendo a PRÓXIMA tentativa da mesma pessoa cair num
 * desafio de código por um pedido que ela nunca fez.
 */

const AGORA = 1_789_300_800_000 // 2026-09-13T12:00:00Z

const PEDIDO = {
  client_request_id: 'tentativa-1',
  customer_name: 'Marina Yamashita',
  customer_email: '  Marina@Exemplo.COM ',
  customer_phone: '11988887777',
  customer_document: '529.982.247-25',
  payment_method: 'pix',
  address_zip: '01310100',
  address_street: 'Av. Paulista',
  address_number: '1000',
  address_neighborhood: 'Bela Vista',
  address_city: 'São Paulo',
  address_state: 'SP',
  subtotal: 100,
  discount: 0,
  shipping_cost: 10,
  total: 110,
  material_status: 'aguardando_material',
  items: [{ product_id: 'p1', product_name: 'Joia', quantity: 1, unit_price: 100 }],
}

const criarDeps = (supabase: ReturnType<typeof createFakeSupabase>): Deps => ({
  supabase: supabase.client,
  now: () => AGORA,
  limiter: createRateLimiter(IDENTIFY_MAX, IDENTIFY_WINDOW_MS, () => AGORA),
})

/** O cenário padrão: e-mail livre, gravação bem-sucedida, conta criada. */
const cenario = (extra: FakeSupabaseOptions = {}) =>
  createFakeSupabase({
    rpcByFn: { account_exists: { data: false } },
    rows: { orders: null, customers: { id: 'cus-1' } },
    inserted: { orders: { id: 'ord-1' } },
    adminCreateUser: () => ({ data: { user: { id: 'usr-1' } } }),
    ...extra,
  })

const pedir = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://x.test/functions/v1/checkout?action=create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })

const tabelasGravadas = (supabase: ReturnType<typeof createFakeSupabase>) =>
  supabase.inserts.map((i) => i.table)

const linhaDoPedido = (supabase: ReturnType<typeof createFakeSupabase>) =>
  supabase.inserts.find((i) => i.table === 'orders')?.values as Record<string, unknown>

// ---------------------------------------------------------------------------------------------

describe('create-order — a convidada (CSC-03, CSC-04, PED-05)', () => {
  it('grava o pedido e devolve o id com um token de acesso', async () => {
    const supabase = cenario()
    const res = await route(criarDeps(supabase), pedir(PEDIDO))
    const corpo = await res.json()

    expect(res.status).toBe(200)
    expect(corpo.order_id).toBe('ord-1')
    expect(typeof corpo.access_token).toBe('string')
    expect(corpo.access_token).toHaveLength(43)
  })

  it('o banco recebe o HASH do token, nunca o texto puro (PED-05)', async () => {
    // A propriedade que faz um dump do banco não dar acesso a pedido nenhum.
    const supabase = cenario()
    const res = await route(criarDeps(supabase), pedir(PEDIDO))
    const { access_token } = await res.json()
    const linha = linhaDoPedido(supabase)

    expect(linha.guest_access_hash).toBe(await hashAccessToken(access_token))
    expect(linha.guest_access_hash).not.toBe(access_token)
    expect(JSON.stringify(linha)).not.toContain(access_token)
  })

  it('a validade do acesso é sete dias depois da criação', async () => {
    const supabase = cenario()
    await route(criarDeps(supabase), pedir(PEDIDO))

    expect(linhaDoPedido(supabase).guest_access_expires_at).toBe('2026-09-20T12:00:00.000Z')
  })

  it('grava nome, e-mail, telefone e documento como vieram (CSC-04)', async () => {
    const supabase = cenario()
    await route(criarDeps(supabase), pedir(PEDIDO))
    const linha = linhaDoPedido(supabase)

    expect(linha.customer_name).toBe('Marina Yamashita')
    expect(linha.customer_phone).toBe('11988887777')
    expect(linha.customer_document).toBe('529.982.247-25')
  })

  it('o e-mail gravado é o NORMALIZADO — é a chave que liga o pedido à conta', async () => {
    // `handle_new_customer` adota pedido órfão comparando `lower(customer_email)`. Gravar cru
    // funcionaria hoje e falharia no dia em que alguém digitasse com maiúscula.
    const supabase = cenario()
    await route(criarDeps(supabase), pedir(PEDIDO))

    expect(linhaDoPedido(supabase).customer_email).toBe('marina@exemplo.com')
  })

  it('repassa endereço, envio e promoção coluna a coluna', async () => {
    // Estas asserções vinham de `useOrders.test.tsx`, onde provavam o `insert` que o hook montava
    // (`ADR-05`, `SHP-07`/`SHP-08`, `PRM-12`). A responsabilidade mudou de camada com a feature
    // `49`; a cobertura vem junto, senão a mudança de caminho seria uma deleção silenciosa.
    const supabase = cenario()
    await route(
      criarDeps(supabase),
      pedir({
        ...PEDIDO,
        address_complement: 'Apto 42',
        shipping_service_id: '2',
        shipping_carrier: 'Correios',
        shipping_method: 'SEDEX',
        delivery_estimate_min: '2026-09-20',
        delivery_estimate_max: '2026-09-24',
        coupon_code: 'ESTRELA10',
        coupon_id: 'cup-1',
        promotion_id: 'promo-1',
        promotion_discount: 11.7,
      }),
    )

    expect(linhaDoPedido(supabase)).toMatchObject({
      address_zip: '01310100',
      address_complement: 'Apto 42',
      address_street: 'Av. Paulista',
      address_number: '1000',
      address_neighborhood: 'Bela Vista',
      address_city: 'São Paulo',
      address_state: 'SP',
      shipping_service_id: '2',
      shipping_carrier: 'Correios',
      shipping_method: 'SEDEX',
      delivery_estimate_min: '2026-09-20',
      delivery_estimate_max: '2026-09-24',
      subtotal: 100,
      discount: 0,
      shipping_cost: 10,
      total: 110,
      coupon_code: 'ESTRELA10',
      coupon_id: 'cup-1',
      promotion_id: 'promo-1',
      promotion_discount: 11.7,
      material_status: 'aguardando_material',
      payment_method: 'pix',
    })
  })

  it('coluna que a loja não enviou não é inventada com nulo', async () => {
    // O par do caso acima. `undefined` no corpo tem de ficar FORA do insert, para o default da
    // coluna valer — mandar `null` explícito sobrescreveria `promotion_discount default 0`.
    const supabase = cenario()
    await route(criarDeps(supabase), pedir({ ...PEDIDO, coupon_code: undefined }))

    expect(linhaDoPedido(supabase)).not.toHaveProperty('coupon_code')
  })

  it('o pedido nasce `pending` e com número', async () => {
    // `orders.order_number` é `text` SEM default: sem geração, toda criação morreria com not-null.
    const supabase = cenario()
    await route(criarDeps(supabase), pedir(PEDIDO))

    expect(linhaDoPedido(supabase).status).toBe('pending')
    expect(linhaDoPedido(supabase).order_number).toMatch(/^NP-[0-9A-Z]+$/)
  })

  it('grava os itens com o `order_id` do pedido recém-criado', async () => {
    const supabase = cenario()
    await route(criarDeps(supabase), pedir(PEDIDO))
    const itens = supabase.inserts.find((i) => i.table === 'order_items')?.values as unknown[]

    expect(itens).toEqual([expect.objectContaining({ product_id: 'p1', order_id: 'ord-1' })])
  })
})

describe('create-order — a ordem das escritas (CSC-08)', () => {
  it('o pedido é gravado ANTES de a conta ser criada', async () => {
    // A asserção que separa esta implementação da ingênua. Um 200 é verdadeiro nas duas; só a
    // ordem distingue "sobra pedido órfão" de "sobra conta órfã" quando algo falha no meio.
    const supabase = cenario()
    await route(criarDeps(supabase), pedir(PEDIDO))

    expect(tabelasGravadas(supabase)[0]).toBe('orders')
    expect(supabase.adminCreateUsers).toHaveLength(1)
  })

  it('a conta nasce SEM senha, sem e-mail confirmado, e com o nome que a ficha vai usar', async () => {
    const supabase = cenario()
    await route(criarDeps(supabase), pedir(PEDIDO))

    expect(supabase.adminCreateUsers[0].attributes).toEqual({
      email: 'marina@exemplo.com',
      // Ela só digitou o e-mail; não provou que é dela. Confirmar aqui seria afirmar o que não
      // sabemos — quem confirma é o código, quando ela entrar pela primeira vez.
      email_confirm: false,
      // A chave exata que `handle_new_customer` lê para nomear a ficha em `customers`.
      user_metadata: { full_name: 'Marina Yamashita' },
    })
    expect(supabase.adminCreateUsers[0].attributes).not.toHaveProperty('password')
  })

  it('depois de criar a conta, o pedido é LIGADO a ela (CSC-07)', async () => {
    const supabase = cenario()
    await route(criarDeps(supabase), pedir(PEDIDO))
    const vinculo = supabase.updates.find((u) => u.table === 'orders')

    expect(vinculo).toEqual({
      table: 'orders',
      values: { customer_id: 'cus-1' },
      eq: ['id', 'ord-1'],
    })
  })

  it('o pedido nasce com `customer_id` nulo — quem liga é o passo seguinte', async () => {
    // Se o insert já trouxesse o `customer_id`, a conta teria de vir antes; é a mesma ordem vista
    // do outro lado.
    const supabase = cenario()
    await route(criarDeps(supabase), pedir(PEDIDO))

    expect(linhaDoPedido(supabase).customer_id).toBeNull()
  })
})

describe('create-order — falha de identidade NÃO derruba a venda (CSC-08)', () => {
  it('GoTrue fora do ar: o pedido continua gravado, pagável e órfão', async () => {
    const supabase = cenario({
      adminCreateUser: () => {
        throw new Error('GoTrue fora do ar')
      },
      rows: { orders: null, customers: null },
    })
    const res = await route(criarDeps(supabase), pedir(PEDIDO))
    const corpo = await res.json()

    expect(res.status).toBe(200)
    expect(corpo.order_id).toBe('ord-1')
    // O token vem MESMO ASSIM: sem ele o pedido existiria e ninguém poderia pagá-lo.
    expect(typeof corpo.access_token).toBe('string')
    expect(supabase.updates.find((u) => u.table === 'orders')).toBeUndefined()
  })

  it('conta criada mas ficha ainda não visível: segue órfão, sem vínculo inventado', async () => {
    const supabase = cenario({ rows: { orders: null, customers: null } })
    const res = await route(criarDeps(supabase), pedir(PEDIDO))

    expect(res.status).toBe(200)
    expect(supabase.updates.find((u) => u.table === 'orders')).toBeUndefined()
  })

  it('PED-09: corrida de duas tentativas — a segunda REAPROVEITA a conta da primeira', async () => {
    // `createUser` falha com "já existe" e a ficha É encontrada na leitura seguinte. A venda não
    // pode falhar: a conta que interessa foi criada pela primeira tentativa.
    const supabase = cenario({
      adminCreateUser: () => ({ error: { message: 'User already registered' } }),
      rows: { orders: null, customers: { id: 'cus-1' } },
    })
    const res = await route(criarDeps(supabase), pedir(PEDIDO))

    expect(res.status).toBe(200)
    expect(supabase.updates.find((u) => u.table === 'orders')?.values).toEqual({
      customer_id: 'cus-1',
    })
  })
})

describe('create-order — quem tem sessão (PED-02)', () => {
  const comSessao = (extra: FakeSupabaseOptions = {}) =>
    createFakeSupabase({
      user: { id: 'usr-logada' },
      rpcByFn: { account_exists: { data: true } },
      rows: { orders: null, customers: { id: 'cus-logada' } },
      inserted: { orders: { id: 'ord-2' } },
      ...extra,
    })

  it('o pedido nasce ligado ao `customers` da sessão, sem criar conta nenhuma', async () => {
    const supabase = comSessao()
    const res = await route(criarDeps(supabase), pedir(PEDIDO, { Authorization: 'Bearer jwt' }))

    expect(res.status).toBe(200)
    expect(linhaDoPedido(supabase).customer_id).toBe('cus-logada')
    expect(supabase.adminCreateUsers).toHaveLength(0)
  })

  it('quem tem sessão NÃO recebe token de acesso — o JWT já é a prova', async () => {
    const supabase = comSessao()
    const res = await route(criarDeps(supabase), pedir(PEDIDO, { Authorization: 'Bearer jwt' }))

    expect((await res.json()).access_token).toBeNull()
    expect(linhaDoPedido(supabase).guest_access_hash).toBeNull()
  })

  it('a sessão VENCE o e-mail com conta — quem está logada não é desafiada', async () => {
    // A borda da spec: o e-mail digitado é o contato do pedido (o do presenteado, por exemplo);
    // a identidade é a da conta. `account_exists` devolve `true` neste cenário, de propósito.
    const supabase = comSessao()
    const res = await route(criarDeps(supabase), pedir(PEDIDO, { Authorization: 'Bearer jwt' }))

    expect(res.status).toBe(200)
  })

  it('JWT inválido cai no caminho de convidada, não em 500', async () => {
    const supabase = cenario({ user: null })
    const res = await route(criarDeps(supabase), pedir(PEDIDO, { Authorization: 'Bearer lixo' }))

    expect(res.status).toBe(200)
    expect((await res.json()).access_token).not.toBeNull()
  })
})

describe('create-order — e-mail com conta e sem sessão (IDN-08)', () => {
  it('recusa com 409 e motivo legível', async () => {
    const supabase = cenario({ rpcByFn: { account_exists: { data: true } } })
    const res = await route(criarDeps(supabase), pedir(PEDIDO))
    const corpo = await res.json()

    expect(res.status).toBe(409)
    expect(corpo.reason).toBe('needs_otp')
    expect(corpo.error).toContain('cadastro')
  })

  it('NENHUMA linha é gravada, e nenhuma conta é criada', async () => {
    // A asserção que importa. Só o status deixaria passar uma versão que grava e depois recusa —
    // e essa versão encheria a tabela de pedidos fantasma a cada e-mail conhecido digitado.
    const supabase = cenario({ rpcByFn: { account_exists: { data: true } } })
    await route(criarDeps(supabase), pedir(PEDIDO))

    expect(supabase.inserts).toEqual([])
    expect(supabase.adminCreateUsers).toEqual([])
    expect(supabase.updates).toEqual([])
  })
})

describe('create-order — idempotência (PED-04)', () => {
  it('a mesma tentativa repetida devolve o MESMO pedido, sem gravar de novo', async () => {
    const supabase = cenario({
      rows: { orders: { id: 'ord-ja-existe' }, customers: { id: 'cus-1' } },
    })
    const res = await route(criarDeps(supabase), pedir(PEDIDO))
    const corpo = await res.json()

    expect(corpo.order_id).toBe('ord-ja-existe')
    expect(corpo.reused).toBe(true)
    expect(supabase.inserts).toEqual([])
    expect(supabase.adminCreateUsers).toEqual([])
  })

  it('a retentativa de um pedido de convidada devolve um acesso USÁVEL', async () => {
    // A retentativa que importa é aquela em que a PRIMEIRA resposta se perdeu na rede: o pedido foi
    // gravado, o token foi emitido e a cliente nunca o recebeu. Devolver `null` a deixaria com um
    // pedido que ela não tem como pagar nem abrir — `PED-04` promete o mesmo pedido **e** o mesmo
    // acesso, e sem isto a segunda metade seria falsa.
    const supabase = cenario({
      rows: {
        orders: { id: 'ord-ja-existe', guest_access_hash: 'hash-antigo' },
        customers: { id: 'cus-1' },
      },
    })
    const res = await route(criarDeps(supabase), pedir(PEDIDO))
    const corpo = await res.json()

    expect(typeof corpo.access_token).toBe('string')
    expect(corpo.access_token).toHaveLength(43)
  })

  it('o acesso reemitido SUBSTITUI o hash — o token velho, que ninguém recebeu, morre', async () => {
    const supabase = cenario({
      rows: {
        orders: { id: 'ord-ja-existe', guest_access_hash: 'hash-antigo' },
        customers: { id: 'cus-1' },
      },
    })
    const res = await route(criarDeps(supabase), pedir(PEDIDO))
    const { access_token } = await res.json()
    const troca = supabase.updates.find((u) => u.table === 'orders')

    expect(troca?.eq).toEqual(['id', 'ord-ja-existe'])
    expect(troca?.values.guest_access_hash).toBe(await hashAccessToken(access_token))
    expect(troca?.values.guest_access_hash).not.toBe('hash-antigo')
  })

  it('retentativa de pedido criado COM sessão não reemite acesso nenhum', async () => {
    // O par inverso: sem hash não há o que reemitir, e o JWT continua sendo a prova. Reemitir aqui
    // daria um token de convidada a um pedido que nunca teve um.
    const supabase = cenario({
      rows: {
        orders: { id: 'ord-ja-existe', guest_access_hash: null },
        customers: { id: 'cus-1' },
      },
    })
    const res = await route(criarDeps(supabase), pedir(PEDIDO))

    expect((await res.json()).access_token).toBeNull()
    expect(supabase.updates).toEqual([])
  })

  it('a busca por tentativa anterior é por `client_request_id`', async () => {
    const supabase = cenario()
    await route(criarDeps(supabase), pedir(PEDIDO))

    expect(linhaDoPedido(supabase).client_request_id).toBe('tentativa-1')
  })

  it('a retentativa nem chega a perguntar a identidade', async () => {
    // Pedido já gravado não é reavaliado: a pessoa já passou por aquela porta. Sem isto, uma
    // retentativa depois de ela criar conta em outra aba cairia num 409 por um pedido que é dela.
    const supabase = cenario({
      rows: { orders: { id: 'ord-ja-existe' }, customers: { id: 'cus-1' } },
      rpcByFn: { account_exists: { data: true } },
    })
    const res = await route(criarDeps(supabase), pedir(PEDIDO))

    expect(res.status).toBe(200)
    expect(supabase.rpcs).toEqual([])
  })
})

describe('create-order — entrada inválida', () => {
  it.each([
    ['sem e-mail válido', { ...PEDIDO, customer_email: 'marina@' }],
    ['sem nome', { ...PEDIDO, customer_name: '  ' }],
    ['sem itens', { ...PEDIDO, items: [] }],
    ['sem client_request_id', { ...PEDIDO, client_request_id: '' }],
  ])('%s responde 400 sem gravar nada', async (_rotulo, corpo) => {
    const supabase = cenario()
    const res = await route(criarDeps(supabase), pedir(corpo))

    expect(res.status).toBe(400)
    expect(supabase.inserts).toEqual([])
  })
})

describe('create-order — falha de gravação', () => {
  it('pedido que não grava responde 500 e não cria conta', async () => {
    const supabase = cenario({ insertError: { orders: { message: 'boom' } } })
    const res = await route(criarDeps(supabase), pedir(PEDIDO))

    expect(res.status).toBe(500)
    expect(supabase.adminCreateUsers).toEqual([])
  })

  it('itens que não gravam respondem 500 — pedido sem item não é pedido', async () => {
    const supabase = cenario({ insertError: { order_items: { message: 'boom' } } })
    const res = await route(criarDeps(supabase), pedir(PEDIDO))

    expect(res.status).toBe(500)
    expect(supabase.adminCreateUsers).toEqual([])
  })
})

describe('create-order — CPF e endereço (PED-08, ADR-G1, ADR-G2)', () => {
  it('o CPF vai para `customers.cpf`, só com dígitos — é de lá que `buildPayer` lê', async () => {
    const supabase = cenario()
    await route(criarDeps(supabase), pedir(PEDIDO))
    const ficha = supabase.updates.find((u) => u.table === 'customers')

    expect(ficha?.values).toEqual({ cpf: '52998224725', phone: '11988887777' })
    expect(ficha?.eq).toEqual(['id', 'cus-1'])
  })

  it('o endereço é gravado para a próxima compra (ADR-G1)', async () => {
    const supabase = cenario()
    await route(criarDeps(supabase), pedir(PEDIDO))
    const endereco = supabase.inserts.find((i) => i.table === 'addresses')?.values

    expect(endereco).toEqual(
      expect.objectContaining({ customer_id: 'cus-1', cep: '01310100', city: 'São Paulo' }),
    )
  })

  it('sem CEP, nenhum endereço é inventado', async () => {
    const supabase = cenario()
    await route(criarDeps(supabase), pedir({ ...PEDIDO, address_zip: undefined }))

    expect(supabase.inserts.find((i) => i.table === 'addresses')).toBeUndefined()
  })

  it('pedido órfão não grava conveniência em ficha nenhuma', async () => {
    const supabase = cenario({ rows: { orders: null, customers: null } })
    await route(criarDeps(supabase), pedir(PEDIDO))

    expect(supabase.updates.find((u) => u.table === 'customers')).toBeUndefined()
    expect(supabase.inserts.find((i) => i.table === 'addresses')).toBeUndefined()
  })
})
