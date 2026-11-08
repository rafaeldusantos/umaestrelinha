import { supabase } from '@estrelinha/supabase/client'

import { invocar, traduzir, type LeitorDoErro, type RespostaDaPorta } from '@/shared/api/traduzir'

import type { PedidoDoResumo } from '../model/descontos'
import type { CanalDoEnvio, LeituraDoMontado, ListaDeMontados, MontadoRenovado, PreviaDaMontagem } from '../model/tipos'

/**
 * A porta dos pedidos montados: o app fala com a edge function `order-proposals` SÓ por
 * aqui, uma função por ação, com o nome LITERAL `'order-proposals?action=<ação>'` — o molde de
 * `features/push-notifications/api/portaDeAvisos.ts`. As tabelas da proposta não têm policy (RLS sem
 * leitura nem escrita para o navegador): quem confere o papel é a function.
 *
 * - **A tradução é a das portas** (`shared/api/traduzir.ts`): 401/403 ⇒ `conferirPapel`, e só o
 *   `42501` dele LANÇA a recusa da `72`; rede é falha, nunca recusa.
 * - **O erro da function tem a frase e o código** (`{ error: '<frase>', code: '<slug>' }`): o slug é
 *   o código (ou, sem ele, a frase), e a frase vem junto para a tela mostrar como a function a disse.
 * - **O link não fica em lugar nenhum além da tela**: esta porta só devolve o token.
 */
export interface ErroDaProposta {
  /** A frase da function, como ela a escreveu. */
  frase: string
  /** No `prices_changed` do `renew`, o total relido — o que vai como `expected_total` na confirmação. */
  totalRelido: number | null
}

export type RespostaDePropostas<T> = RespostaDaPorta<T, ErroDaProposta>

const lerErro: LeitorDoErro<ErroDaProposta> = (corpo) => {
  const frase = typeof corpo.error === 'string' ? corpo.error.trim() : ''
  const codigo = typeof corpo.code === 'string' ? corpo.code.trim() : ''
  if (!frase && !codigo) return null
  const resumo = corpo.summary as { items_total?: unknown } | null | undefined
  const total = typeof resumo?.items_total === 'number' ? resumo.items_total : null
  return { slug: codigo || frase, frase, totalRelido: total }
}

/** Os pedidos montados, com o relógio do servidor. */
export const listarMontados = async (): Promise<RespostaDePropostas<ListaDeMontados>> =>
  traduzir(await invocar(() => supabase.functions.invoke('order-proposals?action=list', { body: {} })), lerErro)

/** Um pedido montado: linhas, histórico, estado, ações e — da aberta com cifra — o token do link. */
export const lerMontado = async (id: string): Promise<RespostaDePropostas<LeituraDoMontado>> =>
  traduzir(await invocar(() => supabase.functions.invoke('order-proposals?action=get', { body: { id } })), lerErro)

/** Prazo novo e link novo; `totalEsperado` só depois de a Adri ver o total relido (`prices_changed`). */
export const renovarMontado = async (id: string, totalEsperado?: number | null): Promise<RespostaDePropostas<MontadoRenovado>> =>
  traduzir(
    await invocar(() =>
      supabase.functions.invoke('order-proposals?action=renew', {
        body: totalEsperado == null ? { id } : { id, expected_total: totalEsperado },
      }),
    ),
    lerErro,
  )

/** O link passa a dizer que o pedido não está mais disponível. */
export const cancelarMontado = async (id: string): Promise<RespostaDePropostas<{ id: string }>> =>
  traduzir(await invocar(() => supabase.functions.invoke('order-proposals?action=cancel', { body: { id } })), lerErro)

/** "Link enviado · <canal>" no histórico. */
export const registrarEnvio = async (id: string, canal: CanalDoEnvio): Promise<RespostaDePropostas<{ ok: true }>> =>
  traduzir(await invocar(() => supabase.functions.invoke('order-proposals?action=log-sent', { body: { id, channel: canal } })), lerErro)

/** A observação interna, em qualquer estado não concluído; vazio (`null`) apaga. */
export const gravarObservacaoDoMontado = async (
  id: string,
  observacao: string | null,
): Promise<RespostaDePropostas<{ id: string; admin_note: string | null }>> =>
  traduzir(await invocar(() => supabase.functions.invoke('order-proposals?action=note', { body: { id, admin_note: observacao } })), lerErro)

/**
 * O resumo vivo da montagem: só a escolha vai (peças, cupom, desconto combinado, e-mail), e volta o
 * resumo que o `save` travaria. Não grava nada. `signal` cancela a chamada anterior a cada mudança.
 */
export const conferirResumo = async (pedido: PedidoDoResumo, signal?: AbortSignal): Promise<RespostaDePropostas<PreviaDaMontagem>> =>
  traduzir(await invocar(() => supabase.functions.invoke('order-proposals?action=preview', { body: pedido, signal })), lerErro)
