// Feature 71 · VIS-23 — os robôs que executam JavaScript e não podem virar "visita".
//
// UM dono, lido pelo navegador (o contador da loja) e pelo servidor (a function `visit`, que o
// alcança por caminho relativo com `.ts`). Duas listas divergiriam: a loja chamaria e o servidor
// gravaria, ou o contrário.
//
// A régua é SUBSTRING sem diferenciar maiúsculas contra a lista escrita por extenso — nunca uma
// expressão genérica sobre "bot": o aparelho Android CUBOT_X30 tem "bot" no nome e é gente.
//
// ⚠️ Este arquivo não importa nada: é folha alcançável pelo Deno.

export const BOT_SIGNATURES: readonly string[] = [
  'Googlebot',
  'Storebot-Google',
  'Google-InspectionTool',
  'AdsBot-Google',
  'Mediapartners-Google',
  'Chrome-Lighthouse',
  'HeadlessChrome',
  'Google Page Speed',
  'bingbot',
  'Applebot',
  'facebookexternalhit',
  'meta-externalagent',
  'GPTBot',
  'ClaudeBot',
  'PetalBot',
  'AhrefsBot',
  'SemrushBot',
  'YandexBot',
  'DuckDuckBot',
  'Baiduspider',
]

const MINUSCULAS = BOT_SIGNATURES.map((s) => s.toLowerCase())

/** `true` quando o user agent contém uma das assinaturas. Sem user agent, não é robô. */
export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (typeof ua !== 'string' || ua === '') return false
  const alvo = ua.toLowerCase()
  return MINUSCULAS.some((s) => alvo.includes(s))
}
