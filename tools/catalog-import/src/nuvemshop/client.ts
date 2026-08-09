import type { RawCategory, RawProduct } from './types.ts'

export interface NuvemshopEnv {
  storeId: string
  accessToken: string
  userAgent: string
  apiVersion: string
}

export interface ClientDeps {
  fetch: typeof globalThis.fetch
  sleep: (ms: number) => Promise<void>
  log?: (message: string) => void
}

/** 4 tentativas no total: a primeira mais 3 repetições. */
export const MAX_ATTEMPTS = 4

/** Abaixo disto, espera a janela virar em vez de gastar a última ficha. */
export const RATE_LIMIT_FLOOR = 2

/** O teto da API. 200 é o máximo aceito; 400 devolve `Bad Request`. */
const PER_PAGE = 200

export class NuvemshopError extends Error {}

/**
 * `link: <url>; rel="next", <url>; rel="last"` → a URL de `next`, ou `null`.
 *
 * É assim que a paginação é feita: `x-total-count` diz quantos existem, mas quem diz se há mais
 * página é este header. Medido: 690 produtos em 4 páginas de 200.
 */
export const nextLink = (header: string | null): string | null => {
  if (!header) return null
  for (const part of header.split(',')) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="?next"?/i)
    if (match) return match[1]
  }
  return null
}

/**
 * Cliente da API da Nuvemshop.
 *
 * As credenciais são validadas **na construção**, antes de qualquer chamada de saída. Não é
 * preciosismo: a API responde `400 "Required user-agent is missing"` quando o header falta, e esse
 * erro não parece um problema de credencial — foi medido nesta feature, e a causa era o valor do
 * `.env` com parênteses sem aspas, que não sobrevive ao carregamento.
 */
export const createNuvemshopClient = (env: NuvemshopEnv, deps: ClientDeps) => {
  const faltando = (['storeId', 'accessToken', 'userAgent', 'apiVersion'] as const)
    .filter(key => !env[key] || String(env[key]).trim() === '')

  if (faltando.length > 0) {
    const nomes: Record<string, string> = {
      storeId: 'NUVEMSHOP_STORE_ID',
      accessToken: 'NUVEMSHOP_ACCESS_TOKEN',
      userAgent: 'NUVEMSHOP_USER_AGENT',
      apiVersion: 'NUVEMSHOP_API_VERSION',
    }
    throw new NuvemshopError(
      `credencial da Nuvemshop ausente: ${faltando.map(k => nomes[k]).join(', ')}`,
    )
  }

  const base = `https://api.tiendanube.com/${env.apiVersion}/${env.storeId}`

  const headers = {
    Authentication: `bearer ${env.accessToken}`,
    'User-Agent': env.userAgent,
    'Content-Type': 'application/json',
  }

  /**
   * Respeita o orçamento que a resposta declara, em vez de um número embutido.
   *
   * O comentário do cliente das landing pages diz "500 req/hora"; os headers reais desta conta
   * dizem `x-rate-limit-limit: 40` com `x-rate-limit-reset: 1000`. Qualquer constante escrita aqui
   * estaria errada numa das duas direções — então lê-se o header.
   */
  const respectRateLimit = async (response: Response) => {
    const remaining = Number(response.headers.get('x-rate-limit-remaining'))
    const reset = Number(response.headers.get('x-rate-limit-reset'))
    if (Number.isFinite(remaining) && remaining <= RATE_LIMIT_FLOOR && Number.isFinite(reset) && reset > 0) {
      deps.log?.(`rate limit em ${remaining}; aguardando ${reset}ms`)
      await deps.sleep(reset)
    }
  }

  const request = async (url: string): Promise<Response> => {
    let ultimoStatus = 0

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const response = await deps.fetch(url, { headers })

      if (response.status !== 429 && response.status < 500) {
        if (!response.ok) {
          throw new NuvemshopError(`Nuvemshop devolveu ${response.status} em ${url}`)
        }
        await respectRateLimit(response)
        return response
      }

      ultimoStatus = response.status
      const retryAfter = Number(response.headers.get('Retry-After'))
      const esperaMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 2 ** attempt * 1000
      deps.log?.(`Nuvemshop ${response.status}; tentativa ${attempt + 1}/${MAX_ATTEMPTS} em ${esperaMs}ms`)
      await deps.sleep(esperaMs)
    }

    // Esgotadas as tentativas, LANÇA. Quem decide o que fazer é `run.ts`, que para com relatório —
    // seguir em frente deixaria o catálogo pela metade sem ninguém saber (CAT-06).
    throw new NuvemshopError(
      `Nuvemshop devolveu ${ultimoStatus} após ${MAX_ATTEMPTS} tentativas em ${url}`,
    )
  }

  const listAll = async <T>(path: string): Promise<T[]> => {
    const items: T[] = []
    let url: string | null = `${base}${path}${path.includes('?') ? '&' : '?'}per_page=${PER_PAGE}`

    while (url !== null) {
      const response: Response = await request(url)
      const page = (await response.json()) as T[]
      items.push(...page)
      url = nextLink(response.headers.get('link'))
    }

    return items
  }

  return {
    listCategories: () => listAll<RawCategory>('/categories'),
    listProducts: () => listAll<RawProduct>('/products'),
  }
}

export type NuvemshopClient = ReturnType<typeof createNuvemshopClient>
