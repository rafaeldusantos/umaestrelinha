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
 * `rpc('<literal>')` em todo `apps/**` e compara o conjunto por igualdade. Nenhuma constante.
 */
export const lerComPapel = async <T>(consulta: () => Promise<T>): Promise<{ resultado: T; lido_em: string }> => {
  // A consulta embrulhada num `async`: um `throw` síncrono dela vira rejeição e passa pela régua (1).
  const [relogio, leitura] = await Promise.allSettled([supabase.rpc('atelie_clock'), (async () => consulta())()])

  if (relogio.status === 'rejected') throw relogio.reason
  if (relogio.value.error) throw relogio.value.error
  const lido_em = (relogio.value.data as { lido_em?: unknown } | null)?.lido_em
  // Uma confirmação que não confirmou (200 sem o instante) não é confirmação: falha de leitura.
  if (typeof lido_em !== 'string') throw new Error('atelie_clock respondeu sem lido_em')

  if (leitura.status === 'rejected') throw leitura.reason
  return { resultado: leitura.value, lido_em }
}
