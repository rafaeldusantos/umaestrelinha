import type {
  CabecalhoDeCliente,
  LinhaDeCliente,
  PedidoDaFicha,
} from '@/entities/customer/model/linha'

/**
 * Fixturas de cliente para os testes da lista e da ficha (feature `76`, T14). As chaves são as de
 * `COLUNAS_DA_LISTA`/`COLUNAS_DA_FICHA`/`COLUNAS_DO_PEDIDO`, e o probe `01-banco.ts` confere essas
 * chaves contra a resposta real do PostgREST local (`AD-012`) — um campo a mais aqui seria uma
 * afirmação que o banco não faz. Cada teste muda só o que mede.
 *
 * Os instantes vêm com MICROSSEGUNDOS e `+00:00`, como o PostgREST os devolve: `last_activity_at` é o
 * cursor da página seguinte (R1), e passar por `Date` o truncaria.
 *
 * Os dados são sintéticos (`@exemplo.invalid`): nenhuma pessoa de verdade.
 */

const UUID = (n: number) => `00000000-0000-4000-c076-${String(n).padStart(12, '0')}`

export const cliente = (extra: Partial<LinhaDeCliente> = {}): LinhaDeCliente => ({
  id: UUID(1),
  name: 'Marina Duarte',
  email: 'marina@exemplo.invalid',
  phone: '51998124471',
  created_at: '2026-03-12T15:20:11.482913+00:00',
  orders_paid: 3,
  total_spent: 1167.7,
  last_order_at: '2026-10-12T13:04:05.123456+00:00',
  last_activity_at: '2026-10-20T09:15:30.654321+00:00',
  orders_open: 0,
  ...extra,
})

export const fichaDeCliente = (extra: Partial<CabecalhoDeCliente> = {}): CabecalhoDeCliente => ({
  id: UUID(1),
  name: 'Marina Duarte',
  email: 'marina@exemplo.invalid',
  phone: '51998124471',
  created_at: '2026-03-12T15:20:11.482913+00:00',
  orders_paid: 3,
  orders_total: 4,
  total_spent: 1167.7,
  avg_ticket: 389.23,
  orders_open: 0,
  ...extra,
})

export const pedidoDaFicha = (extra: Partial<PedidoDaFicha> = {}): PedidoDaFicha => ({
  id: '00000000-0000-4000-8000-000000000244',
  order_number: '0244',
  status: 'paid',
  payment_status: 'approved',
  shipping_service_id: '1',
  material_status: 'nao_aplicavel',
  total: 389.9,
  created_at: '2026-10-12T13:04:05.123456+00:00',
  item: 'Pingente Gota',
  ...extra,
})

/** `n` clientes com ids, e-mails e instantes distintos, do mais recente ao mais antigo (a ordem da lista). */
export const listaDeClientes = (n: number, desde = 0): LinhaDeCliente[] =>
  Array.from({ length: n }, (_, i) => {
    const k = desde + i
    return cliente({
      id: UUID(1000 + k),
      name: `Cliente ${String(k).padStart(4, '0')}`,
      email: `cliente${k}@exemplo.invalid`,
      phone: null,
      orders_paid: 1,
      total_spent: 100 + k,
      last_activity_at: `2026-10-${String(28 - (k % 27)).padStart(2, '0')}T10:00:00.${String(100000 + k).slice(-6)}+00:00`,
    })
  })

// ---- As fixturas nomeadas (cada uma é um caso de borda que a tela já enfrentou ou vai enfrentar) ----

/** Tem conta na loja, comprou três vezes e tem um pedido em andamento. */
export const COM_CONTA = cliente({ id: UUID(2), name: 'Marina Duarte', orders_paid: 3, orders_open: 1 })

/** Comprou sem criar conta: a view a traz pelo primeiro pedido, e nada na linha a distingue. */
export const CONVIDADA = cliente({
  id: UUID(3),
  name: 'Helena Rocha',
  email: 'helena.rocha@exemplo.invalid',
  created_at: '2026-09-02T18:41:00.100200+00:00',
  orders_paid: 1,
  total_spent: 289.9,
})

/** Sem nome gravado: a tela usa o e-mail no lugar. */
export const SEM_NOME = cliente({ id: UUID(4), name: null, email: 'sem.nome@exemplo.invalid' })

/** Nome só de espaços: vale como sem nome. */
export const NOME_EM_BRANCO = cliente({ id: UUID(5), name: '   ', email: 'em.branco@exemplo.invalid' })

/** Sem telefone: nenhuma linha de telefone e nenhum botão de WhatsApp. */
export const SEM_TELEFONE = cliente({ id: UUID(6), name: 'Beatriz Lemos', email: 'beatriz@exemplo.invalid', phone: null })

/** E-mail de mais de 60 caracteres, sem nome: a linha tem de quebrar, nunca truncar. */
export const EMAIL_LONGO = cliente({
  id: UUID(7),
  name: null,
  email: 'uma.pessoa.com.um.endereco.de.email.realmente.comprido.demais@subdominio.exemplo.invalid',
})

/** `_` no e-mail (curinga de LIKE): o vínculo com os pedidos NÃO pode puxar o de `VROSAXRJ@…` (A10). */
export const COM_SUBLINHADO = cliente({ id: UUID(8), name: 'Valéria Rosa', email: 'VROSA_RJ@exemplo.invalid' })

/** A pessoa de quem o vínculo NÃO pode confundir com a de cima. */
export const VIZINHA_DO_SUBLINHADO = cliente({ id: UUID(9), name: 'Valdete Rosa', email: 'VROSAXRJ@exemplo.invalid' })

/** Nunca pagou: sem última compra, sem ticket. */
export const NUNCA_PAGOU = cliente({
  id: UUID(10),
  name: 'Lívia Prado',
  email: 'livia@exemplo.invalid',
  orders_paid: 0,
  total_spent: 0,
  last_order_at: null,
})

/** Sem atividade nenhuma: `last_activity_at` nulo (vem por último na ordem). */
export const SEM_ATIVIDADE = cliente({ id: UUID(11), last_activity_at: null, last_order_at: null, orders_paid: 0, total_spent: 0 })

/**
 * `valor ILIKE padrao`, como o Postgres o lê depois do PostgREST (A10): o valor do filtro vem ENTRE
 * ASPAS, e dentro delas `\\` e `\"` valem `\` e `"`; o LIKE então lê `%` e `_` como curinga e `\x` como
 * o caractere `x` literal. É o que faz o dublê de uma tabela provar que o vínculo do e-mail é EXATO: com
 * o escape errado, `VROSA_RJ` casaria `VROSAXRJ`. Lança para um filtro que não seja `<coluna>.ilike."…"`.
 */
export const ilikeDoPostgres = (filtro: string, coluna: string, valor: string): boolean => {
  const m = new RegExp(`${coluna}\\.ilike\\."((?:[^"\\\\]|\\\\.)*)"`).exec(filtro)
  if (!m) throw new Error(`ilikeDoPostgres: sem ${coluna}.ilike entre aspas em ${filtro}`)
  const padrao = m[1].replace(/\\(["\\])/g, '$1')
  let re = ''
  for (let i = 0; i < padrao.length; i++) {
    const c = padrao[i]
    if (c === '\\') re += (padrao[++i] ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    else if (c === '%') re += '.*'
    else if (c === '_') re += '.'
    else re += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${re}$`, 'is').test(valor)
}
