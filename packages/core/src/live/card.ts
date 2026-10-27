// Feature `83` · `LAV-04` — as frases do cartão "Visitas hoje" da Início, puras.
//
// O nome acessível muda com o que o toque FAZ: com dado ou carregando o toque abre a Loja ao vivo;
// na falha ele relê. Nada aqui é ao vivo na Fase 1 (critério 7 do PRD): sem ponto dourado, sem
// "Ao vivo em breve", sem "pessoas".

import { formatCount } from '../stats/labels.ts'

export const VISITS_TODAY_TITLE = 'Visitas hoje'
export const VISITS_TODAY_HINT = 'Hoje, ontem e a semana, por horário'

/** `'Visitas hoje, 41. Abrir loja ao vivo'` — o número em pt-BR (`1.240`). */
export const visitsTodayLabel = (n: number): string => `Visitas hoje, ${formatCount(n)}. Abrir loja ao vivo`

export const visitsTodayLoadingLabel = 'Visitas hoje, carregando. Abrir loja ao vivo'
export const visitsTodayFailedLabel = 'Visitas hoje: não consegui carregar. Tentar de novo'
