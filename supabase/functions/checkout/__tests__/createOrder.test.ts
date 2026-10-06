import { describe, expect, it } from 'vitest'

import { createFakeSupabase, type FakeSupabaseOptions } from '../../_shared/testing/fakes.ts'
import { hashAccessToken } from '../../../../packages/core/src/checkout/guestAccess.ts'
import { IDENTIFY_MAX, IDENTIFY_WINDOW_MS, createRateLimiter, route, type Deps } from '../handlers.ts'

/**
 * `PED-01` … `PED-09`, `CSC-04`, `CSC-07`, `CSC-08`, `IDN-08`, `ADR-G1`/`ADR-G2` — a ação que grava
 * o pedido.
 *
 * **A ordem das escritas é o requisito.** Vários casos aqui asserem sobre `supabase.inserts` e
 * `criacoesDeConta(supabase)` em vez de só sobre o status: um 200 é verdadeiro tanto na
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
    createdUser: { id: 'usr-1' },
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

/**
 * As criações de conta, filtradas de `adminCalls`.
 *
 * O dublê é compartilhado com a feature `48` (`admin-users`), que registra **toda** chamada a
 * `auth.admin.*` numa lista só, com o método. Uma segunda lista exclusiva de `createUser` seria o
 * "defeito 01" dentro do próprio dublê.
 */
const criacoesDeConta = (supabase: ReturnType<typeof createFakeSupabase>) =>
  supabase.adminCalls.filter((c) => c.method === 'createUser')

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

  it('o pedido nasce `pending`', async () => {
    const supabase = cenario()
    await route(criarDeps(supabase), pedir(PEDIDO))

    expect(linhaDoPedido(supabase).status).toBe('pending')
  })

  it('a function NÃO manda `order_number` — o dono é o banco (feature 58)', async () => {
    // ⚠️ **Esta régua foi INVERTIDA, não descartada.** Até a `58` ela exigia o número com o prefixo
    // da marca anterior, cunhado aqui; a feature move o dono para o `default` da coluna
    // (`lpad(nextval(…)::text, 4, '0')`), e uma régua deixada como estava ficaria **verde a favor
    // do comportamento que a feature remove** — é a lição da `41`, onde um teste asseria a trava
    // que a spec mandava tirar.
    //
    // A ausência é o requisito inteiro: valor explícito **vence** o default no Postgres, então
    // mandar a coluna daqui — mesmo "só para garantir" — devolveria o gerador ao JavaScript sem
    // nada quebrar. `toHaveProperty` e não `toBeUndefined`: a chave presente com valor indefinido
    // seria enviada pelo client e chegaria como `null`, derrubando a criação por not-null.
    const supabase = cenario()
    await route(criarDeps(supabase), pedir(PEDIDO))

    expect(linhaDoPedido(supabase)).not.toHaveProperty('order_number')
  })

  it('`order_number` vindo do CORPO também não é gravado', async () => {
    // O par da régua acima, e o que ela existe para impedir de verdade: um navegador (ou um script)
    // mandando o número escolhido por ele. `COLUNAS_DO_PEDIDO` é a allowlist, e a coluna não está
    // nela — mas isso é uma linha de distância de deixar de ser verdade.
    const supabase = cenario()
    await route(criarDeps(supabase), pedir({ ...PEDIDO, order_number: '0001' }))

    expect(linhaDoPedido(supabase)).not.toHaveProperty('order_number')
  })

  it('quarenta criações seguidas não inventam número nenhum', async () => {
    // O caso anterior media UMA criação. Este mede a classe: sob relógio fixo, a forma antiga
    // dependia de um sufixo aleatório para não colidir, e a colisão custava a venda. Hoje nenhuma
    // das quarenta leva a coluna, e quem garante unicidade é `nextval` mais o índice único.
    const comNumero: unknown[] = []
    for (let i = 0; i < 40; i++) {
      const supabase = cenario()
      await route(criarDeps(supabase), pedir({ ...PEDIDO, client_request_id: `t-${i}` }))
      const linha = linhaDoPedido(supabase)
      if (Object.prototype.hasOwnProperty.call(linha, 'order_number')) comNumero.push(linha)
    }

    expect(comNumero).toEqual([])
  })

  it('grava os itens com o `order_id` do pedido recém-criado', async () => {
    const supabase = cenario()
    await route(criarDeps(supabase), pedir(PEDIDO))
    const itens = supabase.inserts.find((i) => i.table === 'order_items')?.values as unknown[]

    expect(itens).toEqual([expect.objectContaining({ product_id: 'p1', order_id: 'ord-1' })])
  })
})

describe('create-order — a ordem das escritas (CSC-08)', () => {
  it('o pedido e os itens já estão gravados QUANDO a conta é criada', async () => {
    // ⚠️ A versão anterior deste caso asseria `tabelasGravadas[0] === 'orders'` e
    // `adminCreateUsers.length === 1` — **verdadeiro nos dois mundos**, porque as duas listas são
    // independentes e `orders` seria a primeira gravação mesmo com a conta criada antes dela.
    // Sobreviveu à inversão da ordem na verificação independente; quem matou o mutante foram os
    // vizinhos, por acidente.
    //
    // A régua agora é temporal de verdade: o dublê é perguntado **de dentro** do `createUser`, e
    // nesse instante `orders` e `order_items` já têm de estar gravados. Inverter a ordem produz
    // zero aqui.
    let gravadoAoCriarConta: string[] = []
    const supabase: ReturnType<typeof createFakeSupabase> = cenario({
      onAdminCall: (call) => {
        if (call.method === 'createUser') gravadoAoCriarConta = supabase.inserts.map((i) => i.table)
      },
    })
    await route(criarDeps(supabase), pedir(PEDIDO))

    expect(gravadoAoCriarConta).toEqual(['orders', 'order_items'])
  })

  it('a conta nasce SEM senha, sem e-mail confirmado, e com o nome que a ficha vai usar', async () => {
    const supabase = cenario()
    await route(criarDeps(supabase), pedir(PEDIDO))

    expect(supabase.adminCalls[0].attributes).toEqual({
      email: 'marina@exemplo.com',
      // Ela só digitou o e-mail; não provou que é dela. Confirmar aqui seria afirmar o que não
      // sabemos — quem confirma é o código, quando ela entrar pela primeira vez.
      email_confirm: false,
      // A chave exata que `handle_new_customer` lê para nomear a ficha em `customers`.
      user_metadata: { full_name: 'Marina Yamashita' },
    })
    expect(supabase.adminCalls[0].attributes).not.toHaveProperty('password')
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
      adminErrors: { createUser: { message: 'GoTrue fora do ar' } },
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
      adminErrors: { createUser: { message: 'User already registered' } },
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
    expect(criacoesDeConta(supabase)).toHaveLength(0)
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
    expect(criacoesDeConta(supabase)).toEqual([])
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
    expect(criacoesDeConta(supabase)).toEqual([])
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

  /**
   * ⚠️ Os dois casos abaixo nasceram de um achado da verificação independente: **nenhum filtro de
   * coluna era observável**. O dublê só enxerga o `.eq()` quando a fixtura é **função**, e todos os
   * cenários usavam fixtura de valor — trocar a coluna do filtro deixava 66/66 verdes.
   *
   * O que cada mutação produzia:
   *
   *   `client_request_id` → `customer_email` : a SEGUNDA compra devolveria o pedido da primeira, e
   *                                            a pessoa pagaria o pedido errado
   *   `user_id` → `id` (em `customers`)      : TODO pedido com sessão nasceria órfão, e depois o
   *                                            `create-payment` recusaria a cliente logada com 403
   */
  it('o filtro da idempotência é a coluna `client_request_id`, com o valor enviado', async () => {
    const filtros: ([string, unknown] | null)[] = []
    const supabase = cenario({
      rows: {
        orders: (eq) => {
          filtros.push(eq)
          return null
        },
        customers: { id: 'cus-1' },
      },
    })
    await route(criarDeps(supabase), pedir(PEDIDO))

    expect(filtros).toContainEqual(['client_request_id', 'tentativa-1'])
  })

  it('o `customers` da sessão é buscado por `user_id`, não por `id`', async () => {
    const filtros: ([string, unknown] | null)[] = []
    const supabase = createFakeSupabase({
      user: { id: 'usr-logada' },
      rpcByFn: { account_exists: { data: false } },
      rows: {
        orders: null,
        customers: (eq) => {
          filtros.push(eq)
          return { id: 'cus-logada' }
        },
      },
      inserted: { orders: { id: 'ord-2' } },
    })
    await route(criarDeps(supabase), pedir(PEDIDO, { Authorization: 'Bearer jwt' }))

    expect(filtros).toContainEqual(['user_id', 'usr-logada'])
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

/**
 * A dimensão *Observabilidade* da spec: "**nunca** registra o token nem o código".
 *
 * ⚠️ Nasceu de um achado da verificação independente — ela não tinha asserção nenhuma, e pôr o
 * token no log deixava 518/518 verdes. Log de edge function vai para um destino que muita gente
 * lê, e um token ali é acesso a pedido alheio em texto puro.
 */
describe('create-order — o log não carrega o segredo', () => {
  const capturarLog = async (executar: () => Promise<unknown>): Promise<string> => {
    const linhas: string[] = []
    const original = console.log
    console.log = (...args: unknown[]) => linhas.push(args.map(String).join(' '))
    try {
      await executar()
    } finally {
      console.log = original
    }
    return linhas.join('\n')
  }

  it('o token emitido não aparece em nenhuma linha de log', async () => {
    const supabase = cenario()
    let token = ''
    const saida = await capturarLog(async () => {
      const res = await route(criarDeps(supabase), pedir(PEDIDO))
      token = (await res.json()).access_token
    })

    expect(token).toHaveLength(43)
    expect(saida).not.toContain(token)
    // E a âncora: o log EXISTE — senão a asserção acima passaria sobre string vazia.
    expect(saida).toContain('create-order')
    expect(saida).toContain('ord-1')
  })

  it('o log da recusa por conta existente também não carrega segredo', async () => {
    const supabase = cenario({ rpcByFn: { account_exists: { data: true } } })
    const saida = await capturarLog(() => route(criarDeps(supabase), pedir(PEDIDO)))

    expect(saida).toContain('needs_otp')
    expect(saida).not.toContain('tentativa-1')
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
    const supabase = cenario({ insertErrorByTable: { orders: { message: 'boom' } } })
    const res = await route(criarDeps(supabase), pedir(PEDIDO))

    expect(res.status).toBe(500)
    expect(criacoesDeConta(supabase)).toEqual([])
  })

  it('itens que não gravam respondem 500 — pedido sem item não é pedido', async () => {
    const supabase = cenario({ insertErrorByTable: { order_items: { message: 'boom' } } })
    const res = await route(criarDeps(supabase), pedir(PEDIDO))

    expect(res.status).toBe(500)
    expect(criacoesDeConta(supabase)).toEqual([])
  })
})

describe('create-order — CPF e endereço (PED-08, ADR-G1, ADR-G2)', () => {
  it('o CPF vai para `customers.cpf`, só com dígitos — é de lá que `buildPayer` lê', async () => {
    // Reescrito pela feature `59` (`DAD-05`/`DAD-06`), sem perder nenhum valor da asserção antiga:
    // ela exigia CPF e telefone num update SÓ, e isso deixou de ser possível. O CPF agora leva o
    // filtro "só quando vazio" — e, no mesmo update, esse filtro impediria o TELEFONE de ser
    // gravado para quem já tem CPF. Os dois viraram updates irmãos, cada um com a sua asserção.
    const supabase = cenario()
    await route(criarDeps(supabase), pedir(PEDIDO))
    const fichas = supabase.updates.filter((u) => u.table === 'customers')
    const doCpf = fichas.find((u) => 'cpf' in u.values)
    const doTelefone = fichas.find((u) => 'phone' in u.values)

    expect(doCpf?.values).toEqual({ cpf: '52998224725' })
    expect(doCpf?.eq).toEqual(['id', 'cus-1'])
    expect(doTelefone?.values).toEqual({ phone: '11988887777' })
    expect(doTelefone?.eq).toEqual(['id', 'cus-1'])
  })

  it('DAD-05: o CPF só é gravado quando a ficha ainda não tem um — o filtro "vazio" vai no update', async () => {
    // A service role passa pelo gatilho `guard_customer_identity` (é a saída dela), então o "CPF
    // travado" só vale para o checkout se o próprio update se recusar a sobrescrever. Sem o filtro,
    // a segunda compra com outro documento trocaria o pagador da ficha em silêncio.
    const supabase = cenario()
    await route(criarDeps(supabase), pedir(PEDIDO))
    const doCpf = supabase.updates.find((u) => u.table === 'customers' && 'cpf' in u.values)

    expect(doCpf?.or).toBe('cpf.is.null,cpf.eq.')
  })

  it('o telefone NÃO leva o filtro do CPF — senão quem já tem CPF nunca atualizaria o WhatsApp', async () => {
    const supabase = cenario()
    await route(criarDeps(supabase), pedir(PEDIDO))
    const doTelefone = supabase.updates.find((u) => u.table === 'customers' && 'phone' in u.values)

    expect(doTelefone).toBeDefined()
    expect(doTelefone).not.toHaveProperty('or')
    expect(doTelefone?.values).not.toHaveProperty('cpf')
  })

  it('sem CPF no corpo, nenhum update de CPF — e o telefone segue gravado', async () => {
    const supabase = cenario()
    await route(criarDeps(supabase), pedir({ ...PEDIDO, customer_document: '' }))
    const fichas = supabase.updates.filter((u) => u.table === 'customers')

    expect(fichas.some((u) => 'cpf' in u.values)).toBe(false)
    expect(fichas.find((u) => 'phone' in u.values)?.values).toEqual({ phone: '11988887777' })
  })

  it('o endereço é gravado para a próxima compra (ADR-G1)', async () => {
    const supabase = cenario()
    await route(criarDeps(supabase), pedir(PEDIDO))
    const endereco = supabase.inserts.find((i) => i.table === 'addresses')?.values

    expect(endereco).toEqual(
      expect.objectContaining({ customer_id: 'cus-1', cep: '01310100', city: 'São Paulo' }),
    )
  })

  it('ADR-G2: endereço que NÃO grava não derruba o pedido', async () => {
    // ⚠️ `ADR-G2` não tinha caso nenhum — só o nome de um `describe` —, achado da verificação
    // independente. É a mesma regra de `ADR-03`, que a loja já aplicava: `addresses` é conveniência
    // para a próxima compra, e falhar ali não pode custar a compra desta.
    const supabase = cenario({ insertErrorByTable: { addresses: { message: 'boom' } } })
    const res = await route(criarDeps(supabase), pedir(PEDIDO))
    const corpo = await res.json()

    expect(res.status).toBe(200)
    expect(corpo.order_id).toBe('ord-1')
    expect(typeof corpo.access_token).toBe('string')
    // E a âncora: a gravação foi TENTADA — senão o caso passaria por o endereço nunca ter saído.
    expect(supabase.inserts.some((i) => i.table === 'addresses')).toBe(true)
  })

  it('ADR-G2: CPF que não grava também não derruba o pedido', async () => {
    const supabase = cenario({ updateError: { message: 'boom' } })
    const res = await route(criarDeps(supabase), pedir(PEDIDO))

    expect(res.status).toBe(200)
    expect((await res.json()).order_id).toBe('ord-1')
  })

  it('sem CEP, nenhum endereço é inventado', async () => {
    const supabase = cenario()
    await route(criarDeps(supabase), pedir({ ...PEDIDO, address_zip: undefined }))

    expect(supabase.inserts.find((i) => i.table === 'addresses')).toBeUndefined()
  })

  /**
   * "A cliente já tem endereço padrão?" — a fixture é função para o dublê ENXERGAR os dois `.eq()`:
   * só a leitura escopada pela ficha DESTA cliente e por `is_default` devolve o padrão. Sem os dois
   * filtros, o endereço de outra cliente (ou um não-padrão) decidiria por esta.
   */
  const comPadrao = (_eq: unknown, _select: string, eqs: Array<[string, unknown]>) =>
    eqs.some(([c, v]) => c === 'customer_id' && v === 'cus-1') &&
    eqs.some(([c, v]) => c === 'is_default' && v === true)
      ? { id: 'end-padrao' }
      : null

  it('DAD-08: o primeiro endereço da cliente nasce padrão — é o que o próximo caixa lê', async () => {
    const supabase = cenario({ rows: { orders: null, customers: { id: 'cus-1' }, addresses: null } })
    await route(criarDeps(supabase), pedir(PEDIDO))
    const endereco = supabase.inserts.find((i) => i.table === 'addresses')?.values

    expect(endereco).toEqual(expect.objectContaining({ customer_id: 'cus-1', is_default: true }))
  })

  it('quem JÁ tem padrão ganha o endereço novo como não-padrão — o padrão dela não muda', async () => {
    const supabase = cenario({ rows: { orders: null, customers: { id: 'cus-1' }, addresses: comPadrao } })
    await route(criarDeps(supabase), pedir(PEDIDO))
    const endereco = supabase.inserts.find((i) => i.table === 'addresses')?.values

    expect(endereco).toEqual(expect.objectContaining({ customer_id: 'cus-1', is_default: false }))
  })

  it('o padrão de OUTRA ficha não conta — a leitura é escopada por esta cliente', async () => {
    const deOutra = (_eq: unknown, _select: string, eqs: Array<[string, unknown]>) =>
      eqs.some(([c, v]) => c === 'customer_id' && v === 'cus-outra') ? { id: 'end-alheio' } : null
    const supabase = cenario({ rows: { orders: null, customers: { id: 'cus-1' }, addresses: deOutra } })
    await route(criarDeps(supabase), pedir(PEDIDO))
    const endereco = supabase.inserts.find((i) => i.table === 'addresses')?.values

    expect(endereco).toEqual(expect.objectContaining({ is_default: true }))
  })

  it('pedido órfão não grava conveniência em ficha nenhuma', async () => {
    const supabase = cenario({ rows: { orders: null, customers: null } })
    await route(criarDeps(supabase), pedir(PEDIDO))

    expect(supabase.updates.find((u) => u.table === 'customers')).toBeUndefined()
    expect(supabase.inserts.find((i) => i.table === 'addresses')).toBeUndefined()
  })
})

describe('create-order — o número que o banco cunhou volta na resposta (board 58 K)', () => {
  // A espera do cartão mostra o número no passo 2 — é o que responde "perdi minha compra?". O
  // número é LIDO de volta do insert, nunca escrito: as réguas acima continuam provando que a
  // function não manda a coluna. Uma não substitui a outra — devolver sem ler (inventando aqui)
  // passaria nesta e reprovaria naquelas.
  it('pedido novo: devolve o `order_number` do insert', async () => {
    const supabase = cenario({ inserted: { orders: { id: 'ord-1', order_number: '0244' } } })
    const corpo = await (await route(criarDeps(supabase), pedir(PEDIDO))).json()

    expect(corpo.order_id).toBe('ord-1')
    expect(corpo.order_number).toBe('0244')
    expect(linhaDoPedido(supabase)).not.toHaveProperty('order_number')
  })

  it('retentativa: devolve o número do pedido que já existia', async () => {
    const supabase = cenario({
      rows: { orders: { id: 'ord-ja-existe', order_number: '0243' }, customers: { id: 'cus-1' } },
    })
    const corpo = await (await route(criarDeps(supabase), pedir(PEDIDO))).json()

    expect(corpo.reused).toBe(true)
    expect(corpo.order_number).toBe('0243')
  })

  it('sem número na linha, a resposta diz `null` — nunca um número inventado', async () => {
    const supabase = cenario()
    const corpo = await (await route(criarDeps(supabase), pedir(PEDIDO))).json()

    expect(corpo.order_number).toBeNull()
  })
})

// ---------------------------------------------------------------------------------------------
// Feature 61 · CMP-01 — os ids do GA4 e a recusa da medição chegam ao pedido
// ---------------------------------------------------------------------------------------------

describe('create-order — os ids do GA4 (feature 61, CMP-01)', () => {
  const COM_GA = {
    ...PEDIDO,
    ga_client_id: '1234567890.1728000000',
    ga_session_id: '1728000123',
    analytics_declined: false,
  }

  it('os três chegam ao insert de `orders`, como vieram', async () => {
    const supabase = cenario()
    const res = await route(criarDeps(supabase), pedir(COM_GA))
    const linha = linhaDoPedido(supabase)

    expect(res.status).toBe(200)
    expect(linha.ga_client_id).toBe('1234567890.1728000000')
    expect(linha.ga_session_id).toBe('1728000123')
    expect(linha.analytics_declined).toBe(false)
  })

  it('a recusa (`true`) também chega — é ela que impede o `purchase` (CMP-04)', async () => {
    const supabase = cenario()
    await route(criarDeps(supabase), pedir({ ...COM_GA, analytics_declined: true }))
    expect(linhaDoPedido(supabase).analytics_declined).toBe(true)
  })

  it.each([
    ['letra', 'GA1.1.123.456'],
    ['espaço', '123 456'],
    ['vazio', ''],
    ['65 caracteres', '1'.repeat(65)],
    ['número em vez de texto', 1234567890],
    ['injeção', "1'; drop table orders; --"],
  ])('id fora do formato (%s) é DESCARTADO, e o pedido nasce assim mesmo', async (_r, lixo) => {
    const supabase = cenario()
    const res = await route(criarDeps(supabase), pedir({ ...COM_GA, ga_client_id: lixo, ga_session_id: lixo }))
    const linha = linhaDoPedido(supabase)

    expect(res.status).toBe(200)
    expect(linha).not.toHaveProperty('ga_client_id')
    expect(linha).not.toHaveProperty('ga_session_id')
    // o booleano válido do mesmo corpo continua chegando — o descarte é por campo
    expect(linha.analytics_declined).toBe(false)
  })

  it('64 caracteres só de dígitos e ponto passam (o teto é inclusivo)', async () => {
    const supabase = cenario()
    const id = `${'1'.repeat(32)}.${'2'.repeat(31)}`
    expect(id).toHaveLength(64)
    await route(criarDeps(supabase), pedir({ ...COM_GA, ga_client_id: id }))
    expect(linhaDoPedido(supabase).ga_client_id).toBe(id)
  })

  it.each([
    ['texto "true"', 'true'],
    ['número 1', 1],
    ['nulo', null],
  ])('recusa que não é booleano estrito (%s) não grava nada — fica o default do banco', async (_r, valor) => {
    const supabase = cenario()
    const res = await route(criarDeps(supabase), pedir({ ...COM_GA, analytics_declined: valor }))
    expect(res.status).toBe(200)
    expect(linhaDoPedido(supabase)).not.toHaveProperty('analytics_declined')
  })

  it('sem nenhum dos três no corpo, nenhuma das colunas é inventada', async () => {
    const supabase = cenario()
    await route(criarDeps(supabase), pedir(PEDIDO))
    const linha = linhaDoPedido(supabase)
    for (const coluna of ['ga_client_id', 'ga_session_id', 'analytics_declined']) {
      expect(linha).not.toHaveProperty(coluna)
    }
  })

  it('NADA disso chega a `order_items`', async () => {
    const supabase = cenario()
    await route(criarDeps(supabase), pedir(COM_GA))
    const itens = supabase.inserts.find((i) => i.table === 'order_items')?.values as unknown as Array<
      Record<string, unknown>
    >

    expect(itens).toHaveLength(1) // âncora: os itens foram gravados, e é sobre eles a ausência
    for (const item of itens) {
      for (const coluna of ['ga_client_id', 'ga_session_id', 'analytics_declined']) {
        expect(item).not.toHaveProperty(coluna)
      }
    }
  })
})
