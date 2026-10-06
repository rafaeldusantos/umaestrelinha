// Handlers da edge function `checkout` — a porta do caixa sem conta.
//
// Separado de `index.ts` (que só faz wiring) por `AD-004`: sem `Deno.env` e sem import de `esm.sh`
// aqui, este módulo carrega no vitest, então o layer de I/O deixa de ser ponto cego.
//
// Três ações, e a razão de cada uma estar AQUI e não no navegador:
//
//   identify      "este e-mail já tem conta?" — `auth.users` não é legível por `anon`, e não deve
//                 ser. A resposta é um booleano, com teto por IP.
//   create-order  grava o pedido. É a ÚNICA porta, para convidada e para quem tem sessão, porque
//                 dois caminhos de gravação divergiriam sem build, `tsc` ou teste acusarem.
//   get-order     devolve o pedido a quem apresenta o token daquele pedido.
//
// A regra de identidade **não mora aqui**: ela vem de `packages/core/src/checkout/identity.ts`,
// que é a mesma linha que a tela chama. `IDN-02` (mostrar o desafio) e `IDN-08` (recusar a
// gravação) são a mesma pergunta — escritas duas vezes, a tela deixaria seguir quem o servidor
// recusa.

import {
  checkoutIdentityRefusal,
  resolveCheckoutIdentity,
  type CheckoutIdentity,
} from '../../../packages/core/src/checkout/identity.ts'
import {
  accessGrant,
  guestAccessExpiry,
  hashAccessToken,
  newAccessToken,
} from '../../../packages/core/src/checkout/guestAccess.ts'
import { isValidEmail, normalizeEmail } from '../../../packages/core/src/validators/email.ts'
import { corsHeaders, json, preflight } from '../_shared/http.ts'

/** Tudo que os handlers tocam fora do próprio processo. O wiring (`index.ts`) fornece o real. */
export interface Deps {
  // Client service-role. Tipado como `any` porque o import real vem de esm.sh (Deno) e o dublê do
  // teste implementa só a superfície usada — tipar aqui exigiria arrastar o SDK para o vitest.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
  /** Relógio injetável: sem ele o teto por IP não é testável sem dormir. */
  now: () => number
  /** O teto de consultas de e-mail. Injetado para o teste poder exercê-lo em milissegundos. */
  limiter: RateLimiter
}

function log(entry: Record<string, unknown>) {
  console.log(JSON.stringify(entry))
}

// ---------------------------------------------------------------------------------------------
// Teto por IP
// ---------------------------------------------------------------------------------------------

/** `IDN-09`: no máximo 20 consultas de e-mail por IP a cada 5 minutos. */
export const IDENTIFY_MAX = 20
export const IDENTIFY_WINDOW_MS = 5 * 60 * 1000

export interface RateLimiter {
  /** `true` quando a chamada é permitida; `false` quando o teto foi atingido. */
  hit(chave: string): boolean
}

/**
 * Janela deslizante em memória.
 *
 * É por isolate, então não é um teto global — e não precisa ser. O que **decide** de verdade é a
 * recusa de `create-order` (`IDN-08`): esta ação é uma cortesia da tela, e o teto existe para
 * encarecer a varredura, não para ser a fronteira de segurança.
 */
export function createRateLimiter(
  max: number,
  janelaMs: number,
  now: () => number,
): RateLimiter {
  const batidas = new Map<string, number[]>()

  return {
    hit(chave: string): boolean {
      const agora = now()
      const recentes = (batidas.get(chave) ?? []).filter((t) => agora - t < janelaMs)
      if (recentes.length >= max) {
        batidas.set(chave, recentes)
        return false
      }
      recentes.push(agora)
      batidas.set(chave, recentes)
      return true
    },
  }
}

/**
 * O IP de quem chamou, ou `null` quando não dá para saber.
 *
 * **`null` libera, não bloqueia**, e isso é decisão: sem IP, todo mundo cairia no MESMO balde e um
 * único visitante esgotaria o teto para a loja inteira. Um throttle que pune todos por um header
 * ausente é pior que nenhum — e a recusa que importa continua sendo a de `create-order`.
 */
export function clientIp(req: Request): string | null {
  const encaminhado = req.headers.get('x-forwarded-for')
  const primeiro = encaminhado?.split(',')[0]?.trim()
  if (primeiro) return primeiro
  const direto = req.headers.get('cf-connecting-ip')?.trim()
  return direto || null
}

// ---------------------------------------------------------------------------------------------
// identify — "este e-mail já tem conta?"
// ---------------------------------------------------------------------------------------------

export async function identify(
  deps: Deps,
  req: Request,
  body: { email?: string },
): Promise<Response> {
  const email = normalizeEmail(body?.email ?? '')

  // E-mail sem formato válido não consulta o banco. A régua é a MESMA de `isContactComplete` —
  // uma cópia mais frouxa aqui deixaria o servidor procurar o que a tela nunca enviaria.
  if (!isValidEmail(email)) {
    return json({ error: 'Informe um e-mail válido.' }, 400)
  }

  const ip = clientIp(req)
  if (ip && !deps.limiter.hit(ip)) {
    log({ action: 'identify', status: 'rate_limited' })
    return json({ error: 'Muitas consultas. Tente de novo em alguns minutos.' }, 429)
  }

  const { data, error } = await deps.supabase.rpc('account_exists', { p_email: email })
  if (error) {
    log({ action: 'identify', status: 'rpc_error', message: error.message })
    return json({ error: 'Não foi possível consultar agora.' }, 502)
  }

  // O log NUNCA carrega o e-mail inteiro: a ação existe para responder sobre identidade, e um log
  // dela é um índice de quem comprou aqui.
  log({ action: 'identify', status: 'ok', registered: data === true })
  return json({ registered: data === true })
}

// ---------------------------------------------------------------------------------------------
// A identidade de uma requisição — a mesma pergunta que a tela faz
// ---------------------------------------------------------------------------------------------

export interface IdentityResolution {
  identity: CheckoutIdentity
  /** O `customers.id` da sessão, quando há uma. */
  customerId: string | null
  /** O `auth.users.id` da sessão, quando há uma. */
  userId: string | null
}

/**
 * Resolve quem está fechando o pedido, do lado do servidor.
 *
 * A ordem importa: **a sessão é conferida primeiro**, e um JWT válido dispensa a consulta de
 * e-mail. Sem isso, quem está logada e digita o e-mail de outra pessoa (o do presenteado) seria
 * desafiada — que é a borda escrita na spec.
 */
export async function resolveIdentity(
  deps: Deps,
  req: Request,
  email: string,
): Promise<IdentityResolution> {
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')

  if (jwt) {
    const { data: userData } = await deps.supabase.auth.getUser(jwt)
    const user = userData?.user
    if (user) {
      const { data: customer } = await deps.supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      return {
        identity: resolveCheckoutIdentity({ hasSession: true, emailHasAccount: false }),
        customerId: customer?.id ?? null,
        userId: user.id,
      }
    }
  }

  const { data: existe } = await deps.supabase.rpc('account_exists', { p_email: email })
  return {
    identity: resolveCheckoutIdentity({ hasSession: false, emailHasAccount: existe === true }),
    customerId: null,
    userId: null,
  }
}

// ---------------------------------------------------------------------------------------------
// create-order — o dono único de "como nasce um pedido"
// ---------------------------------------------------------------------------------------------

// ⚠️ **Esta function NÃO cunha mais o número do pedido** (feature `58`). Ela cunhava — prefixo da
// marca anterior + o relógio em base36 + quatro caracteres aleatórios contra a colisão de
// milissegundo —, e o gerador inteiro foi apagado no mesmo movimento em que a coluna ganhou
// `default lpad(nextval(…)::text, 4, '0')`.
//
// O dono é o banco, e a razão é concorrência: `nextval` é seguro por construção e é o único que
// enxerga todas as transações. Mandar a coluna daqui reabriria o "defeito 01" na pior forma — dois
// geradores para o mesmo número, cada um certo sozinho —, e o insert do cliente **venceria** o
// default em silêncio. Por isso `order_number` não aparece em `COLUNAS_DO_PEDIDO` nem no objeto
// gravado, e `createOrder.test.ts` cobra a ausência.

/** As colunas de `orders` que a loja preenche. Tudo o mais é default do banco. */
const COLUNAS_DO_PEDIDO = [
  'customer_name',
  'customer_email',
  'customer_phone',
  'customer_document',
  'payment_method',
  'address_street',
  'address_number',
  'address_neighborhood',
  'address_city',
  'address_state',
  'address_zip',
  'address_complement',
  'shipping_service_id',
  'shipping_carrier',
  'shipping_method',
  'delivery_estimate_min',
  'delivery_estimate_max',
  'subtotal',
  'discount',
  'shipping_cost',
  'total',
  'coupon_code',
  'coupon_id',
  'promotion_id',
  'promotion_discount',
  'material_status',
] as const

/**
 * Os ids do GA4 e a recusa da medição (feature `61`, `CMP-01`) — o que o `sendPurchase` da
 * `mercado-pago` lê depois, quando a aprovação chega.
 *
 * Ficam FORA de `COLUNAS_DO_PEDIDO` de propósito: aquela lista copia o valor como veio, e estes três
 * passam por validação antes. Um `ga_client_id` com lixo não derruba o pedido — **é descartado** e o
 * pedido nasce assim mesmo, porque medição nunca pode custar uma venda (o servidor cai no
 * `client_id` sintético derivado do pedido, `CMP-05`).
 *
 *  - os dois ids: texto de até 64 caracteres, só dígitos e ponto — a forma do cookie `_ga`
 *    (`<int>.<int>`) e do `session_id` (`<int>`). Qualquer outra coisa é descartada.
 *  - `analytics_declined`: booleano **estrito**. `"true"`, `1` ou ausente não gravam nada, e a
 *    coluna fica no default `false` do banco.
 *
 * Nada disto vai para `order_items` — os itens são gravados com spread do corpo do item, nunca do
 * corpo do pedido.
 */
const ID_DO_GA = /^[0-9.]{1,64}$/

export function idsDaMedicao(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
): { ga_client_id?: string; ga_session_id?: string; analytics_declined?: boolean } {
  const saida: { ga_client_id?: string; ga_session_id?: string; analytics_declined?: boolean } = {}
  for (const coluna of ['ga_client_id', 'ga_session_id'] as const) {
    const valor = body?.[coluna]
    if (typeof valor === 'string' && ID_DO_GA.test(valor)) saida[coluna] = valor
  }
  if (typeof body?.analytics_declined === 'boolean') saida.analytics_declined = body.analytics_declined
  return saida
}

/**
 * Grava o pedido, e é a **única** porta que faz isso — para convidada e para quem tem sessão.
 *
 * **A ORDEM das escritas é requisito** (`CSC-08`), e é o que separa esta implementação de uma
 * ingênua:
 *
 *   1. resolver identidade — **sem escrever nada**
 *   2. `challenge` ⇒ 409 e para (`IDN-08`: nenhuma linha gravada)
 *   3. gravar `orders` + `order_items`
 *   4. **só então** criar a conta da convidada e ligá-la ao pedido
 *   5. gravar CPF e endereço
 *
 * O inverso — conta antes do pedido — deixaria uma **conta órfã** quando a gravação falhasse, e a
 * próxima tentativa da mesma pessoa cairia num desafio de código por um pedido que ela nunca fez.
 * Nesta ordem, o que sobra de uma falha é um pedido órfão, que `customer_directory` e
 * `handle_new_customer` já sabem tratar desde a feature `35`.
 */
export async function createOrder(
  deps: Deps,
  req: Request,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
): Promise<Response> {
  const email = normalizeEmail(body?.customer_email ?? '')
  const itens = Array.isArray(body?.items) ? body.items : []
  const clientRequestId = typeof body?.client_request_id === 'string' ? body.client_request_id : ''

  if (!isValidEmail(email)) return json({ error: 'Informe um e-mail válido.' }, 400)
  if (!body?.customer_name?.trim()) return json({ error: 'Informe o nome.' }, 400)
  if (itens.length === 0) return json({ error: 'O pedido não tem itens.' }, 400)
  if (!clientRequestId) return json({ error: 'client_request_id é obrigatório.' }, 400)

  // PED-04: a MESMA tentativa repetida por falha de rede devolve o MESMO pedido. Esta leitura vem
  // antes de tudo — inclusive antes da identidade —, porque um pedido já gravado não deve ser
  // reavaliado: a pessoa já passou por essa porta.
  const { data: jaExiste } = await deps.supabase
    .from('orders')
    .select('id, order_number, guest_access_hash, guest_access_expires_at')
    .eq('client_request_id', clientRequestId)
    .maybeSingle()

  if (jaExiste?.id) {
    // ⚠️ A retentativa mais importante é aquela em que a PRIMEIRA resposta se perdeu na rede: o
    // pedido foi gravado, o token foi emitido e a cliente **nunca o recebeu**. Devolver `null` aqui
    // a deixaria com um pedido que ela não tem como pagar nem abrir — `PED-04` promete "o mesmo
    // pedido E o mesmo acesso", e sem isto a segunda metade seria falsa.
    //
    // O servidor não tem como redevolver o token antigo (guarda só o hash), então ele **emite um
    // novo** e substitui o hash. É seguro: quem chega aqui apresentou o mesmo `client_request_id`,
    // que é um UUID gerado no navegador de quem criou o pedido — a mesma prova que autorizou a
    // criação. O token velho, que ninguém recebeu, morre junto.
    //
    // Pedido criado COM sessão não tem hash nenhum: nada a reemitir, e o JWT continua sendo a prova.
    let tokenNovo: string | null = null
    if (jaExiste.guest_access_hash) {
      tokenNovo = newAccessToken()
      await deps.supabase
        .from('orders')
        .update({
          guest_access_hash: await hashAccessToken(tokenNovo),
          guest_access_expires_at: guestAccessExpiry(new Date(deps.now())),
        })
        .eq('id', jaExiste.id)
    }

    log({ action: 'create-order', status: 'reused', order_id: jaExiste.id })
    return json({
      order_id: jaExiste.id,
      order_number: jaExiste.order_number ?? null,
      access_token: tokenNovo,
      reused: true,
    })
  }

  const { identity, customerId: customerIdDaSessao } = await resolveIdentity(deps, req, email)

  // IDN-08: a checagem da tela é conveniência; esta é a regra. Nenhuma linha é gravada.
  const recusa = checkoutIdentityRefusal(identity)
  if (recusa) {
    log({ action: 'create-order', status: 'needs_otp' })
    return json({ error: recusa, reason: 'needs_otp' }, 409)
  }

  const ehConvidada = identity === 'guest'
  const accessToken = ehConvidada ? newAccessToken() : null
  const agora = new Date(deps.now())

  const pedido: Record<string, unknown> = {
    customer_id: customerIdDaSessao,
    client_request_id: clientRequestId,
    // `order_number` NÃO entra aqui — o dono é o `default` da coluna (feature `58`). Mandá-lo,
    // mesmo "só para garantir", venceria o default e devolveria o gerador ao JavaScript.
    status: 'pending',
    guest_access_hash: accessToken ? await hashAccessToken(accessToken) : null,
    guest_access_expires_at: accessToken ? guestAccessExpiry(agora) : null,
  }
  for (const coluna of COLUNAS_DO_PEDIDO) {
    if (body?.[coluna] !== undefined) pedido[coluna] = body[coluna]
  }
  Object.assign(pedido, idsDaMedicao(body))
  pedido.customer_email = email

  // `order_number` é LIDO de volta, nunca escrito: o `default` da coluna o cunhou agora. A espera
  // do cartão (board `58 K`) o mostra no passo 2 — é o que responde "perdi minha compra?".
  const { data: criado, error: erroPedido } = await deps.supabase
    .from('orders')
    .insert(pedido)
    .select('id, order_number')
    .single()

  if (erroPedido || !criado?.id) {
    log({ action: 'create-order', status: 'insert_failed' })
    return json({ error: 'Não conseguimos criar seu pedido.' }, 500)
  }
  const orderId = criado.id as string

  const { error: erroItens } = await deps.supabase
    .from('order_items')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(itens.map((item: any) => ({ ...item, order_id: orderId })))

  if (erroItens) {
    log({ action: 'create-order', status: 'items_failed', order_id: orderId })
    return json({ error: 'Não conseguimos criar seu pedido.' }, 500)
  }

  // CSC-07/CSC-08: daqui para baixo NADA pode derrubar a venda. O pedido já existe e já é pagável
  // pelo token; identidade e conveniências são melhorias sobre um pedido que já vale.
  let customerId = customerIdDaSessao
  if (ehConvidada) {
    customerId = await ensureGuestCustomer(deps, email, body?.customer_name ?? '')
    if (customerId) {
      await deps.supabase.from('orders').update({ customer_id: customerId }).eq('id', orderId)
    }
  }

  if (customerId) {
    await persistirConveniencias(deps, customerId, body)
  }

  log({
    action: 'create-order',
    status: 'created',
    order_id: orderId,
    identity,
    // O pedido ficou órfão? É o sinal de que a criação de conta falhou — e a venda seguiu.
    linked: Boolean(customerId),
  })
  return json({
    order_id: orderId,
    order_number: (criado.order_number as string | null) ?? null,
    access_token: accessToken,
  })
}

/**
 * A conta sem senha da convidada, e a ficha em `customers` que o trigger cria a partir dela.
 *
 * Devolve `null` quando não deu — e `null` **não** é erro para quem chamou: `CSC-08` diz que a
 * venda nunca é bloqueada por falha de identidade. GoTrue fora do ar deixa um pedido órfão, que é
 * exatamente o caso que a feature `35` já trata.
 *
 * `PED-09`: duas tentativas simultâneas para o mesmo e-mail novo fazem a segunda `createUser`
 * falhar com "já existe". Isso **não** é falha da venda: a conta que interessa foi criada pela
 * primeira, e o caminho é lê-la, não desistir.
 */
async function ensureGuestCustomer(
  deps: Deps,
  email: string,
  nome: string,
): Promise<string | null> {
  try {
    await deps.supabase.auth.admin.createUser({
      email,
      // A pessoa não provou que o e-mail é dela — ela só digitou. Confirmar aqui seria afirmar o
      // que não sabemos. Quem confirma é o código, quando ela entrar pela primeira vez.
      email_confirm: false,
      // `handle_new_customer` lê exatamente esta chave para nomear a ficha em `customers`.
      user_metadata: { full_name: (nome ?? '').trim() },
    })
  } catch {
    // Rede, timeout, GoTrue fora do ar. Segue para a leitura: a ficha pode existir mesmo assim.
  }

  // A leitura acontece SEMPRE, inclusive depois de a criação falhar — é ela que resolve a corrida
  // do `PED-09` e o caso de a conta já existir por outro caminho.
  const { data: ficha } = await deps.supabase
    .from('customers')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  return ficha?.id ?? null
}

/**
 * CPF do pagador e endereço.
 *
 * `PED-08`: o CPF vai para `customers.cpf` para convidada **e** para quem tem sessão, porque
 * `buildPayer` (em `create-payment`) lê de lá e precisa continuar com uma fonte só — `AD-013` fala
 * de quem **coleta** o documento, e isso não muda.
 *
 * `ADR-G2`: falha aqui não derruba o pedido. É a mesma regra de `ADR-03`, que a loja já aplicava.
 *
 * Feature `59` mudou duas coisas, e as duas pela mesma razão — a conta passou a mostrar e a editar
 * o que esta função grava:
 *
 * - **O CPF só é gravado quando a ficha ainda não tem um** (`DAD-05`). A service role passa pelo
 *   gatilho `guard_customer_identity` (é uma das saídas dele), então o "CPF travado" só vale para
 *   o checkout se o próprio update se recusar a sobrescrever. Sem o filtro, a segunda compra com
 *   outro documento trocaria o pagador da ficha em silêncio. O telefone vai num update **irmão**:
 *   no mesmo update, o filtro do CPF impediria o WhatsApp de quem já tem CPF de ser atualizado.
 * - **O primeiro endereço da cliente nasce padrão** (`DAD-08`). Ele nascia `is_default = false`, e
 *   `useDefaultAddress` nunca achava nada: o caixa não pré-preenchia e a conta não teria endereço a
 *   mostrar. Quem já tem padrão ganha o novo como não-padrão — o padrão é escolha dela, na conta.
 *   Duas compras simultâneas de quem não tinha padrão esbarram no índice único parcial
 *   `addresses_one_default`, e a segunda gravação falha — o que `ADR-G2` já aceita.
 */
async function persistirConveniencias(
  deps: Deps,
  customerId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
): Promise<void> {
  const cpf = (body?.customer_document ?? '').replace(/\D/g, '')
  const telefone = (body?.customer_phone ?? '').trim()

  if (telefone) {
    try {
      await deps.supabase.from('customers').update({ phone: telefone }).eq('id', customerId)
    } catch {
      /* conveniência */
    }
  }

  if (cpf) {
    try {
      await deps.supabase
        .from('customers')
        .update({ cpf })
        .eq('id', customerId)
        .or('cpf.is.null,cpf.eq.')
    } catch {
      /* conveniência */
    }
  }

  if (!body?.address_zip) return
  try {
    const { data: padrao } = await deps.supabase
      .from('addresses')
      .select('id')
      .eq('customer_id', customerId)
      .eq('is_default', true)
      .maybeSingle()

    await deps.supabase.from('addresses').insert({
      customer_id: customerId,
      cep: body.address_zip,
      street: body.address_street ?? '',
      number: body.address_number ?? '',
      complement: body.address_complement ?? null,
      neighborhood: body.address_neighborhood ?? '',
      city: body.address_city ?? '',
      state: body.address_state ?? '',
      is_default: !padrao?.id,
    })
  } catch {
    /* ADR-G2: conveniência para a próxima compra, nunca pré-requisito desta */
  }
}

// ---------------------------------------------------------------------------------------------
// get-order — a convidada lê o próprio pedido
// ---------------------------------------------------------------------------------------------

/**
 * `CSC-06`/`PED-07`: devolve o pedido a quem apresenta o token **daquele** pedido.
 *
 * A recusa é sempre a mesma — 403 com corpo vazio de informação —, e isso é desenho: distinguir
 * "pedido não existe" de "token errado" transformaria a ação num oráculo de quais ids existem.
 */
export async function getOrder(
  deps: Deps,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
): Promise<Response> {
  const orderId = typeof body?.order_id === 'string' ? body.order_id : ''
  const token = typeof body?.access_token === 'string' ? body.access_token : ''

  if (!orderId || !token) return json({ error: 'Pedido não encontrado.' }, 403)

  const { data: pedido } = await deps.supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .maybeSingle()

  // `accessGrant` recusa por ausência de hash (pedido criado COM sessão), por divergência e por
  // validade vencida — os três no mesmo lugar, para nenhum deles depender de um `if` daqui.
  const podeVer = pedido
    ? await accessGrant(
        {
          guest_access_hash: pedido.guest_access_hash ?? null,
          guest_access_expires_at: pedido.guest_access_expires_at ?? null,
        },
        token,
        new Date(deps.now()),
      )
    : false

  if (!podeVer) {
    log({ action: 'get-order', status: 'denied' })
    return json({ error: 'Pedido não encontrado.' }, 403)
  }

  // Três campos NÃO voltam para o navegador, e o terceiro é o que mais importa:
  //
  //   guest_access_hash        estado do servidor; devolvê-lo daria a quem tem o token um segundo
  //                            caminho para conferi-lo offline
  //   guest_access_expires_at  idem
  //   client_request_id        **é uma credencial**: quem o apresenta em `create-order` faz o
  //                            servidor REEMITIR o acesso daquele pedido. Devolvê-lo aqui tornaria
  //                            o token de 7 dias renovável para sempre — bastaria ler o pedido uma
  //                            vez, guardar a chave, e reemitir quando o acesso vencesse.
  const {
    guest_access_hash: _hash,
    guest_access_expires_at: _expira,
    client_request_id: _chave,
    ...publico
  } = pedido

  const status_events = await eventosDoPedido(deps, orderId)

  log({ action: 'get-order', status: 'ok', order_id: orderId })
  return json({ order: { ...publico, status_events } })
}

/**
 * `LIN-04` (feature `59`): os eventos da linha do tempo, no MESMO formato que a loja monta a partir
 * da RPC `customer_order_events` — `{ status, at }`, em ordem de data. A convidada não tem sessão,
 * então a RPC (que recorta por `auth.uid()`) não serve a ela; quem autoriza aqui é o token, já
 * conferido por `accessGrant` antes desta leitura.
 *
 * Só `to_status` e `created_at` são pedidos: `note` é texto interno da Adri e `created_by` diz quem
 * mexeu — nenhum dos dois é da cliente. A ordem é feita aqui, e não confiada ao banco, para o
 * formato não depender de um `order by` que alguém pode tirar.
 *
 * Falha de leitura devolve lista vazia: a linha do tempo perde as datas, a página não.
 */
async function eventosDoPedido(
  deps: Deps,
  orderId: string,
): Promise<Array<{ status: string; at: string }>> {
  try {
    const { data } = await deps.supabase
      .from('order_status_history')
      .select('to_status, created_at')
      .eq('order_id', orderId)

    return (Array.isArray(data) ? data : [])
      .filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (h: any) =>
          typeof h?.to_status === 'string' &&
          h.to_status !== '' &&
          typeof h?.created_at === 'string' &&
          !Number.isNaN(new Date(h.created_at).getTime()),
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((h: any) => ({ status: h.to_status as string, at: h.created_at as string }))
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------------------------
// Roteamento
// ---------------------------------------------------------------------------------------------

export async function route(deps: Deps, req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight()

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}

    switch (action) {
      case 'identify':
        return await identify(deps, req, body)
      case 'create-order':
        return await createOrder(deps, req, body)
      case 'get-order':
        return await getOrder(deps, body)
      default:
        return json({ error: 'action inválida. Use: identify, create-order, get-order' }, 400)
    }
  } catch (err) {
    log({ action: 'error', message: err instanceof Error ? err.message : String(err) })
    return json({ error: 'Erro interno' }, 500)
  }
}

export { checkoutIdentityRefusal, corsHeaders, json }
