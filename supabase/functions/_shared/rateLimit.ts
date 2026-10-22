// O teto por IP das edge functions — um dono só (feature `71`, `VIS-27`).
//
// Nasceu na `checkout` (feature `49`, a consulta "este e-mail tem conta?") e a function `visit`
// precisa da mesma coisa. Movido SEM mudança de corpo; a `checkout` reexporta, e
// `__tests__/rateLimit.test.ts` recusa uma segunda declaração e confere a identidade da referência.
//
// ⚠️ Sem import nenhum: o arquivo é alcançado pelo Deno por caminho relativo.

export interface RateLimiter {
  /** `true` quando a chamada é permitida; `false` quando o teto foi atingido. */
  hit(chave: string): boolean
}

/**
 * Janela deslizante em memória.
 *
 * É por isolate, então não é um teto global — e não precisa ser. Ele é cortesia, nunca a fronteira:
 * na `checkout` quem decide é a recusa de `create-order` (`IDN-08`); na `visit`, o teto diário de
 * linhas no banco (`VIS-27`). O teto por IP existe para encarecer a varredura.
 */
export function createRateLimiter(
  max: number,
  janelaMs: number,
  now: () => number,
): RateLimiter {
  const batidas = new Map<string, number[]>()

  return {
    hit(chave: string): boolean {
      const agora = now()
      const recentes = (batidas.get(chave) ?? []).filter((t) => agora - t < janelaMs)
      if (recentes.length >= max) {
        batidas.set(chave, recentes)
        return false
      }
      recentes.push(agora)
      batidas.set(chave, recentes)
      return true
    },
  }
}

/**
 * O IP de quem chamou, ou `null` quando não dá para saber.
 *
 * **`null` libera, não bloqueia**, e isso é decisão: sem IP, todo mundo cairia no MESMO balde e um
 * único visitante esgotaria o teto para a loja inteira. Um throttle que pune todos por um header
 * ausente é pior que nenhum — e a recusa que importa continua sendo a de `create-order`.
 */
export function clientIp(req: Request): string | null {
  const encaminhado = req.headers.get('x-forwarded-for')
  const primeiro = encaminhado?.split(',')[0]?.trim()
  if (primeiro) return primeiro
  const direto = req.headers.get('cf-connecting-ip')?.trim()
  return direto || null
}
