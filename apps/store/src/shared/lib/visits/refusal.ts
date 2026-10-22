// A decisão pura de contar uma visita (feature `71`, `VIS-22`).
//
// **Não recebe o interruptor do GA4, o ID de medição nem a resposta do GA4 sobre "posso medir?"**
// — por construção, e `contadorSemGa.test.ts` guarda a fonte. O contador é independente da medição:
// desligar o GA4 no painel não pode zerar as visitas. Das fontes da medição ele reusa só as de
// prévia, de ambiente, de consentimento e de host (`trafficType`).
//
// O veredito é `string | null`, no formato de `menuTargetRefusal`: com `strictNullChecks` em
// `false`, uma união discriminada por booleano não estreita.
//
// Quem decide de verdade é o servidor (a function `visit` relê o host do banco): esta decisão evita
// a chamada que ele recusaria. O pior caso de uma configuração lida com o padrão de recuo é uma
// chamada a mais por dia, respondida `interno` (`design.md`, D4).

import { trafficType } from '@estrelinha/core/analytics'
import { isBotUserAgent } from '@estrelinha/core/visits'

export interface VisitContext {
  /** Build de produção (`import.meta.env.PROD`, a mesma fonte da medição). */
  production: boolean
  /** Janela de prévia do painel (`isPreviewWindow`, a mesma fonte da medição). */
  preview: boolean
  /** `store_settings` terminou de ler. Antes disso o host abaixo é o PADRÃO, não a configuração. */
  settingsLoaded: boolean
  /** `store_settings.analytics.production_host`. */
  productionHost: string
  /** `location.hostname`. */
  hostname: string
  /** A escolha da cliente sobre Estatísticas (relida do armazenamento no instante da decisão). */
  statistics: boolean
  /** A marca de "não contar este navegador" (`VIS-42`). */
  optedOut: boolean
  /** `navigator.webdriver === true`. */
  webdriver: boolean
  userAgent: string
}

/**
 * `null` ⇒ pode chamar. Texto ⇒ o motivo de não chamar:
 * - `'ambiente'` — build de desenvolvimento ou de teste;
 * - `'previa'` — a loja dentro do iframe do painel;
 * - `'esperando'` — a configuração ainda não chegou; o contador tenta de novo quando ela chegar;
 * - `'interno'` — o host não é o de produção (ou não há host de produção configurado);
 * - `'recusa'` — a cliente desligou Estatísticas;
 * - `'marca'` — este navegador foi tirado da contagem pelo parâmetro da URL;
 * - `'robo'` — `webdriver` ligado ou user agent de robô.
 */
export function visitRefusal(ctx: VisitContext): string | null {
  if (!ctx.production) return 'ambiente'
  if (ctx.preview) return 'previa'
  if (!ctx.settingsLoaded) return 'esperando'
  if (trafficType(ctx.hostname, ctx.productionHost) === 'internal') return 'interno'
  if (!ctx.statistics) return 'recusa'
  if (ctx.optedOut) return 'marca'
  if (ctx.webdriver) return 'robo'
  if (isBotUserAgent(ctx.userAgent)) return 'robo'
  return null
}
