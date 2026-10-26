// Feature `73` · `MAI-05`, `MAI-06` · `AD-057` — "em qual bloco da fila este pedido está?" tem UM
// dono, e ele é DADO.
//
// Até a `73` a regra vivia no painel em duas escritas que não se viam: o `or=` da visão "Precisa de
// ação" (`orderQuery.ts`) e as quatro contagens do topo (`fetchTiles`, em `useAdminOrderList.ts`).
// O app do ateliê precisa das MESMAS contagens, e as lê por uma RPC admin (`store_overview`), em
// SQL — uma terceira escrita. Para as três não divergirem em silêncio, a regra de cada bloco é uma
// lista de condições, e dois tradutores a escrevem:
//
// - `toPostgrestFilter` — a forma aceita por `.or()` do PostgREST (painel e a lista da `74`);
// - `toSqlPredicate` — a forma que a migration carrega BYTE A BYTE (`filaComDonoUnico.test.ts`, na
//   suíte da loja, lê a migration e compara com a saída deste tradutor, bloco a bloco).
//
// "Precisa de ação" é a UNIÃO dos três primeiros blocos — um pedido pago que ainda espera o envelope
// está em dois blocos e conta UMA vez —, nunca a soma.
//
// O arquivo não importa nada, de propósito: alcançável pelo Deno e por Node por construção (molde de
// `shipping/pickup.ts`).

/** Os quatro blocos, na ordem do painel. */
export type QueueBlockId = 'aguardando' | 'a-separar' | 'sem-rastreio' | 'pix-aguardando'

/** As colunas de `orders` que a regra da fila lê. Fechado: nada vira SQL fora desta lista. */
export type QueueColumn = 'status' | 'material_status' | 'tracking_code' | 'payment_method' | 'payment_status'

/**
 * Uma condição. Discriminada por literal de STRING (`op`), que estreita com `strictNullChecks`
 * desligado — o "ou" é `{ any }`, sem `col`.
 */
export type QueueCond =
  | { col: QueueColumn; op: 'eq'; value: string }
  | { col: QueueColumn; op: 'in'; value: readonly string[] }
  | { col: QueueColumn; op: 'is_null' }
  | { any: readonly QueueCond[] }

/** As condições de um bloco, todas juntas (E). */
export type QueueRule = readonly QueueCond[]

export interface QueueBlock {
  id: QueueBlockId
  label: string
  /** A frase que diz **o que é aquilo**, e não o que a coluna se chama. */
  hint: string
  /** Só o primeiro carrega o acento — um acento por tela. */
  accent: boolean
  /** A regra da CONTAGEM do bloco. */
  rule: QueueRule
  /**
   * A regra com que o bloco entra na UNIÃO "Precisa de ação", quando ela difere da contagem.
   * Ausente ⇒ a própria `rule`. Ver `a-separar`.
   */
  unionRule?: QueueRule
}

/**
 * Os estados de material que **não seguram** a separação: o pedido pode andar.
 *
 * O contador do bloco e o predicado da visão precisam ser a MESMA lista. Quando eram duas, o bloco
 * "Pago, a separar" dizia 3 e o clique trazia 4 — dois pedidos que ainda esperavam o envelope
 * contavam como prontos para separar.
 */
export const MATERIAL_NAO_SEGURA_LISTA: readonly string[] = ['nao_aplicavel', 'material_recebido', 'em_producao']

export const QUEUE_BLOCKS: readonly QueueBlock[] = [
  {
    id: 'aguardando',
    label: 'Aguardando material',
    hint: 'Ninguém pode fazer nada até o envelope chegar',
    // O único que ACUMULA, e por isso o único com acento. Ele carrega a idade do mais antigo.
    accent: true,
    rule: [{ col: 'material_status', op: 'eq', value: 'aguardando_material' }],
  },
  {
    id: 'a-separar',
    label: 'Pago, a separar',
    hint: 'Material já recebido ou não exigido',
    accent: false,
    // **Pago E com o material resolvido.** Contar só `status = 'paid'` incluiria quem ainda espera
    // o envelope — e a frase do bloco diz "material já recebido ou não exigido".
    rule: [
      { col: 'status', op: 'eq', value: 'paid' },
      { col: 'material_status', op: 'in', value: MATERIAL_NAO_SEGURA_LISTA },
    ],
    // R1 do design da `73`, PRESERVADO e não unificado: a visão "Precisa de ação" sempre aceitou o
    // `material_status` nulo neste bloco, e a contagem dele nunca aceitou. Um pago com material nulo
    // entra na união e em nenhum bloco. Medido em 2026-10-22 (`baseline.md`): zero pedidos assim no
    // banco local e em produção. Unificar muda o comportamento do painel e é decisão do usuário.
    unionRule: [
      { col: 'status', op: 'eq', value: 'paid' },
      {
        any: [
          { col: 'material_status', op: 'is_null' },
          { col: 'material_status', op: 'in', value: MATERIAL_NAO_SEGURA_LISTA },
        ],
      },
    ],
  },
  {
    id: 'sem-rastreio',
    label: 'Enviado sem rastreio',
    hint: 'A cliente não foi avisada da postagem',
    accent: false,
    rule: [
      { col: 'status', op: 'eq', value: 'shipped' },
      { col: 'tracking_code', op: 'is_null' },
    ],
  },
  {
    id: 'pix-aguardando',
    label: 'Pix aguardando',
    // A frase existe para dizer que **não é fila**: ele expira sozinho. R2 do design, preservado:
    // a contagem não recorta `status` (zero pedidos assim em 2026-10-22).
    hint: 'Expiram sozinhos — nada a fazer',
    accent: false,
    rule: [
      { col: 'payment_method', op: 'eq', value: 'pix' },
      { col: 'payment_status', op: 'eq', value: 'pending' },
    ],
  },
]

/**
 * Os blocos cuja união é "Precisa de ação". O Pix fica **de fora de propósito**: ele expira sozinho
 * e não é fila — somá-lo faria a Adri olhar pendências que não são dela.
 */
export const NEEDS_ACTION_BLOCKS: readonly QueueBlockId[] = ['aguardando', 'a-separar', 'sem-rastreio']

/** O bloco pelo id. Lança para id desconhecido — o vocabulário é fechado. */
export const queueBlock = (id: QueueBlockId): QueueBlock => {
  const bloco = QUEUE_BLOCKS.find((b) => b.id === id)
  if (!bloco) throw new Error(`bloco da fila desconhecido: ${String(id)}`)
  return bloco
}

/** A regra com que o bloco entra na união "Precisa de ação". */
export const needsActionRule = (bloco: QueueBlock): QueueRule => bloco.unionRule ?? bloco.rule

// -------------------------------------------------------------------------------------------
// PostgREST
// -------------------------------------------------------------------------------------------

const ehOu = (c: QueueCond): c is { any: readonly QueueCond[] } => 'any' in c

const postgrestCond = (c: QueueCond): string => {
  if (ehOu(c)) return `or(${c.any.map(postgrestCond).join(',')})`
  switch (c.op) {
    case 'eq':
      return `${c.col}.eq.${c.value}`
    case 'in':
      return `${c.col}.in.(${c.value.join(',')})`
    case 'is_null':
      return `${c.col}.is.null`
  }
}

/**
 * A regra na forma que o `.or()` do PostgREST aceita: uma condição sozinha vai nua
 * (`material_status.eq.aguardando_material`), várias vão em `and(…)`.
 */
export const toPostgrestFilter = (rule: QueueRule): string => {
  if (rule.length === 0) throw new Error('regra da fila vazia')
  if (rule.length === 1) return postgrestCond(rule[0])
  return `and(${rule.map(postgrestCond).join(',')})`
}

/** O `or=` da visão "Precisa de ação": a união dos três blocos, nunca a soma. */
export const needsActionOrFilter = (): string =>
  NEEDS_ACTION_BLOCKS.map((id) => toPostgrestFilter(needsActionRule(queueBlock(id)))).join(',')

// -------------------------------------------------------------------------------------------
// SQL — a forma que a migration de `store_overview` carrega byte a byte
// -------------------------------------------------------------------------------------------

const literalSql = (v: string): string => `'${v.replace(/'/g, "''")}'`

const ALIAS_VALIDO = /^[a-z_][a-z0-9_]*$/

const sqlCond = (c: QueueCond, alias: string): string => {
  if (ehOu(c)) return `(${c.any.map((x) => sqlCond(x, alias)).join(' or ')})`
  switch (c.op) {
    case 'eq':
      return `${alias}.${c.col} = ${literalSql(c.value)}`
    case 'in':
      return `${alias}.${c.col} in (${c.value.map(literalSql).join(', ')})`
    case 'is_null':
      return `${alias}.${c.col} is null`
  }
}

/** A regra como predicado SQL (`o.status = 'paid' and o.material_status in (…)`). */
export const toSqlPredicate = (rule: QueueRule, alias = 'o'): string => {
  if (rule.length === 0) throw new Error('regra da fila vazia')
  if (!ALIAS_VALIDO.test(alias)) throw new Error(`alias inválido: ${alias}`)
  return rule.map((c) => sqlCond(c, alias)).join(' and ')
}

/** A união "Precisa de ação" em SQL: cada bloco entre parênteses, unidos por `or`. */
export const needsActionSqlPredicate = (alias = 'o'): string =>
  NEEDS_ACTION_BLOCKS.map((id) => `(${toSqlPredicate(needsActionRule(queueBlock(id)), alias)})`).join(' or ')
