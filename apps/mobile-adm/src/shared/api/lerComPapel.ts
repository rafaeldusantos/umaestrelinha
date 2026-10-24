import { supabase } from '@estrelinha/supabase/client'

/**
 * A confirmação de papel NA MESMA leitura (feature `74`, `MAP-36`, `MAP-37`, `MAP-38`, `AD-058`,
 * emendas E1 e E2 do Design).
 *
 * Por que existe: a lista e o detalhe leem `order_list` e as tabelas do pedido pelo PostgREST, e a
 * RLS de `orders`/`order_items` devolve à conta SEM papel admin os pedidos DELA como cliente — sem
 * erro nenhum (probe `03-cliente-sem-papel`). Sozinha, a consulta desenharia esses pedidos como se
 * fossem a fila da loja. A RPC `atelie_clock` recusa com `42501` quem não é admin e devolve o
 * instante do banco; ela sai EM PARALELO com a consulta, e o dado só sai daqui se ela respondeu.
 *
 * A ordem da decisão (E2):
 *   1. a RPC devolveu `{ error }` (ou rejeitou) ⇒ lança o erro DA RPC — a recusa vence, mesmo que a
 *      consulta tenha trazido linhas ou tenha falhado (senão uma falha de rede da consulta esconderia o
 *      `42501`, e a tela diria "não consegui carregar" a uma conta sem papel);
 *   2. a consulta rejeitou ⇒ lança o erro dela;
 *   3. devolve `{ resultado, lido_em }`.
 *
 * `Promise.allSettled`, e não `Promise.all`: com `all`, a consulta que rejeita primeiro decidiria o
 * erro antes de a RPC responder.
 *
 * A consulta é quem lança o próprio erro (o supabase-js não rejeita; devolve `{ error }`): a lista
 * lança se a leitura falhou, e o detalhe lança só no erro do PEDIDO e converte o dos blocos em
 * `Bloco 'falhou'`.
 *
 * **O nome da RPC é LITERAL, e só aqui** (E1): `marcacaoSoPorAcao.test.ts` (suíte da loja) exige
 * `rpc('<literal>')` em todo `apps/**` e compara o conjunto por igualdade. Nenhuma constante — e,
 * desde a `75`, uma chamada só (`perguntarAoRelogio`), lida pela leitura e por `conferirPapel`.
 */
const perguntarAoRelogio = () => supabase.rpc('atelie_clock')

/** O instante do banco na resposta da RPC — ou lança: 200 sem o instante não é confirmação. */
const instanteDe = (data: unknown): string => {
  const lido_em = (data as { lido_em?: unknown } | null)?.lido_em
  if (typeof lido_em !== 'string') throw new Error('atelie_clock respondeu sem lido_em')
  return lido_em
}

export const lerComPapel = async <T>(consulta: () => Promise<T>): Promise<{ resultado: T; lido_em: string }> => {
  // A consulta embrulhada num `async`: um `throw` síncrono dela vira rejeição e passa pela régua (1).
  const [relogio, leitura] = await Promise.allSettled([perguntarAoRelogio(), (async () => consulta())()])

  if (relogio.status === 'rejected') throw relogio.reason
  if (relogio.value.error) throw relogio.value.error
  // Uma confirmação que não confirmou (200 sem o instante) não é confirmação: falha de leitura.
  const lido_em = instanteDe(relogio.value.data)

  if (leitura.status === 'rejected') throw leitura.reason
  return { resultado: leitura.value, lido_em }
}

/**
 * "Quem é você?" — feature `75` (`MAA-21`, `MAA-23`, A3). Uma escrita que respondeu sem erro e sem
 * linha é ambígua: o pedido mudou (a guarda de status filtrou) ou a conta perdeu o papel (a RLS
 * filtrou). A porta de escrita do app pergunta à MESMA RPC da leitura:
 *
 * - `42501` ⇒ lança o erro da RPC (o `{ code: '42501' }` que `isAccessDenied` reconhece);
 * - resposta com o instante ⇒ resolve (o papel está de pé: o pedido mudou);
 * - rede, 5xx, ou 200 sem o instante ⇒ lança um erro SEM o código de recusa. Rede nunca é recusa.
 */
export const conferirPapel = async (): Promise<void> => {
  const { data, error } = await perguntarAoRelogio()
  if (error) throw error
  instanteDe(data)
}
