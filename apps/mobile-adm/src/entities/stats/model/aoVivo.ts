import type { MovementPeriodKey } from '@estrelinha/core/stats'
import { ehPeriodo } from './periodos'

/**
 * O endereço da Loja ao vivo (feature `83`, `LAV-06`, `LAV-50`). Sem aba própria: alcançada pelo
 * cartão "Visitas hoje" da Início.
 */
export const AO_VIVO_PATH = '/ao-vivo'

/**
 * O estado da entrada de `/ao-vivo` quando a Adri chega pelo app: `doApp` (o "Voltar" volta uma
 * entrada) e o período escolhido na faixa do Início. O período mora no `history.state`, NUNCA na URL:
 * sobrevive ao F5 e ao voltar sem sujar o endereço.
 */
export const estadoDaEntrada = (periodo: MovementPeriodKey) => ({ doApp: true as const, periodo })

const lerPeriodo = (state: unknown): MovementPeriodKey => {
  const v = state && typeof state === 'object' ? (state as { periodo?: unknown }).periodo : undefined
  return ehPeriodo(v) ? v : 'hoje'
}

/** O período inicial da seção Acessos: o `periodo` do estado da entrada; fora do vocabulário ⇒ Hoje. */
export const periodoDaEntrada = (state: unknown): MovementPeriodKey => lerPeriodo(state)

/** O período em que a faixa do Início reabre (o que foi gravado na entrada dela); sem ⇒ Hoje. */
export const periodoDoInicio = (state: unknown): MovementPeriodKey => lerPeriodo(state)

/**
 * Grava o período na entrada ATUAL do histórico, sem tocar a URL — molde de `useTermoDaEntrada`, mas
 * no `history.state`. Dois leitores: a Início (ela desmonta ao abrir `/ao-vivo`, e o voltar tem de
 * reabrir a faixa no período em que a Adri saiu) e a própria Loja ao vivo (o F5 — e o Chrome do
 * Android recarregando a aba em segundo plano — reabre no período escolhido depois de chegar). O React
 * Router lê o estado da entrada em `history.state.usr`; o resto (`key`, `idx`, `doApp`) é preservado.
 */
export const gravarPeriodoNaEntrada = (periodo: MovementPeriodKey): void => {
  const atual = (window.history.state ?? {}) as { usr?: unknown }
  const usr = atual.usr && typeof atual.usr === 'object' ? atual.usr : {}
  window.history.replaceState({ ...atual, usr: { ...usr, periodo } }, '')
}
