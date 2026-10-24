import { supabase } from '@estrelinha/supabase/client'
import {
  runAppAction,
  triggerOrderNotification,
  type AppActionOutcome,
  type OrderWriteDeps,
  type PedidoDaAcao,
} from '@estrelinha/core/order-actions'
import { ACCESS_DENIED_CODE, isAccessDenied } from '@estrelinha/core/hooks/useStoreOverview'

import { conferirPapel, type LinhaDaLista } from '@/entities/order'

/**
 * A ÚNICA porta de escrita do app do ateliê (feature `75`, design §3.4; `MAA-04`, `MAA-21`,
 * `MAA-22`, `MAA-29`, `AD-059`).
 *
 * O app não grava: quem grava é o dono (`runAppAction`, `@estrelinha/core/order-actions`), o mesmo
 * que o painel chama. Esta porta só ENTREGA o client a ele — e nunca o usa como receptor (nada de
 * `from`, `rpc` ou `functions` aqui; `escritaSoPelaPorta.test.ts` mede pela AST) — e traduz o desfecho
 * para o que o app sabe desenhar:
 *
 * - `sem-papel` (o `not_admin` da RPC do material) ⇒ LANÇA `{ code: '42501' }`: a recusa tem um
 *   formato só no app, lido por `isAccessDenied` e desenhado pelo episódio único da `72`/`74`;
 * - `nenhuma-linha` — o `update` respondeu sem erro e sem linha — é PERGUNTA, nunca resultado: a guarda
 *   de status filtrou (o pedido mudou) ou a RLS filtrou (a conta perdeu o papel). `conferirPapel`
 *   responde: `42501` ⇒ lança a recusa; papel de pé ⇒ `{ tipo: 'mudou' }`; sem rede ⇒ `falhou` (rede
 *   nunca é recusa);
 * - `parcial` com causa `nenhuma-linha`: a mesma pergunta. Recusa ⇒ lança; papel de pé ⇒ o próprio
 *   `parcial` (a frase de `MAA-15`/`MAA-40` com o "Tentar de novo").
 *   SPEC_DEVIATION (precisão — §3.4 não diz): a conferência SEM REDE de um `parcial` devolve o próprio
 *   `parcial`, e não `falhou` — a primeira escrita JÁ valeu, e "Não consegui salvar" seria falso.
 * - o resto (`ok`, `falhou`, `material-recusado`, `parcial` por falha, e o `mudou` da retentativa que
 *   achou a linha relida sem a ação que reenvia — QA C01, nada foi à rede) passa como veio.
 */
export type ResultadoDaAcao =
  | Exclude<AppActionOutcome, { tipo: 'nenhuma-linha' } | { tipo: 'sem-papel' }>
  | { tipo: 'mudou' }

/** A recusa, no formato único do app. */
const recusa = () => Object.assign(new Error('acesso restrito ao painel'), { code: ACCESS_DENIED_CODE })

/** "Quem é você?": `true` ⇒ papel de pé; a recusa é RELANÇADA; rede/5xx ⇒ o erro, devolvido. */
const papelDePe = async (): Promise<true | { erro: unknown }> => {
  try {
    await conferirPapel()
    return true
  } catch (erro) {
    if (isAccessDenied(erro)) throw erro
    return { erro }
  }
}

export const gravarAcao = async (row: LinhaDaLista, pedido: PedidoDaAcao): Promise<ResultadoDaAcao> => {
  const deps: OrderWriteDeps = {
    client: supabase,
    notify: (id, trigger) => triggerOrderNotification(supabase, id, trigger),
  }
  const r = await runAppAction(deps, row, pedido)

  if (r.tipo === 'sem-papel') throw recusa()

  if (r.tipo === 'nenhuma-linha') {
    const papel = await papelDePe()
    return papel === true ? { tipo: 'mudou' } : { tipo: 'falhou', erro: papel.erro }
  }

  if (r.tipo === 'parcial' && r.causa === 'nenhuma-linha') {
    await papelDePe()
    return r
  }

  return r as ResultadoDaAcao
}
