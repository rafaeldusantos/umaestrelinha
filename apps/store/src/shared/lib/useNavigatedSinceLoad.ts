// "Já houve troca de rota desde a carga do documento?"
//
// O servidor escreve no `<html>` vereditos que valem para a CARGA do documento (a faixa de avisos
// existe? qual perfil de estilo?), lidos antes de a configuração chegar pelo navegador. Depois da
// primeira troca de rota dentro da loja, quem decide passa a ser a configuração. Os dois leitores
// fazem a mesma pergunta, e por isso ela mora aqui (dois widgets do mesmo app, `AD-033`).

import { useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * A chave da entrada do histórico em que o documento carregou, lida quando o módulo carrega.
 *
 * É ela que diz "já houve troca de rota" mesmo quando o leitor remonta (o checkout fica fora do
 * `StoreLayout`, e voltar dele monta a faixa de novo). O `BrowserRouter` guarda a chave em
 * `history.state.key`; sem ela, a entrada inicial é `'default'` — a mesma do `MemoryRouter`.
 */
const CHAVE_DA_CARGA: string =
  (typeof window !== 'undefined' &&
    (window.history.state as { key?: unknown } | null)?.key &&
    String((window.history.state as { key?: unknown }).key)) ||
  'default'

/**
 * `true` a partir da primeira troca de rota desde a carga do documento.
 *
 * Uma trava, e não só a comparação: voltar à entrada da carga pelo histórico não devolve a decisão ao
 * veredito da carga.
 */
export const useNavigatedSinceLoad = (): boolean => {
  const { key } = useLocation()
  const navegou = useRef(false)
  if (key !== CHAVE_DA_CARGA) navegou.current = true
  return navegou.current
}
