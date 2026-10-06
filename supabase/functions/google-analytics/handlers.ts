// As portas HTTP da `google-analytics` — a chave secreta do Measurement Protocol (feature 61).
//
//   GET  ?action=status       → { secret_configured, secret_updated_at }
//   POST ?action=save-secret  { secret } → { ok: true, secret_updated_at }
//   POST ?action=clear-secret → { ok: true }
//
// ---------------------------------------------------------------------------------------------
// Por que esta function existe (ANL-05, ANL-06, `AD-047`)
// ---------------------------------------------------------------------------------------------
//
// A chave secreta é o que autoriza qualquer um a mandar eventos à propriedade do GA4 da loja. Ela
// não pode morar em `store_settings`, que tem `SELECT using (true)` para `anon` — estaria publicada
// no primeiro `curl`. Mora em `public.analytics_secrets`, **sem policy nenhuma**: só a service role
// lê e grava. E a service role não chega ao navegador (`AD-034`), então a tela da dona fala com
// esta porta, que exige admin.
//
// **A chave entra e nunca sai.** `status` responde se ela existe e quando foi gravada — nunca o
// valor, nem prefixo, nem tamanho. Quem precisa do valor é só o `sendPurchase` da `mercado-pago`,
// que o lê direto da tabela no mesmo processo.
//
// **E nunca vai para o log.** Nem o valor, nem a mensagem de erro do banco — uma violação de
// `check` do Postgres repete a linha recusada no `details`, e a linha carrega a chave.
//
// `verify_jwt = false` no config.toml com autorização MANUAL aqui (`requireAdmin`, dono único em
// `_shared/auth.ts`): a anon key publicada é um JWT válido do projeto e passaria pelo gateway.

export { corsHeaders, json } from '../_shared/http.ts'
import { json, preflight } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/auth.ts'

export interface Deps {
  /** Client com a service role — a única credencial que alcança `analytics_secrets`. */
  supabase: any
  /** Relógio injetável, para o teste fixar `updated_at`. */
  now?: () => Date
}

/** A única chave que a tabela aceita (`check (key = 'ga4_api_secret')` na migration). */
export const GA4_SECRET_KEY = 'ga4_api_secret'

/** O teto do `check` da migration (`char_length(value) between 1 and 128`). */
export const GA4_SECRET_MAX = 128

/** Log estruturado, uma linha por desfecho. Nunca recebe a chave nem o erro cru do banco. */
function log(entry: Record<string, unknown>) {
  console.log(JSON.stringify(entry))
}

/**
 * Por que esta chave não pode ser gravada — ou `null` (`string | null`, nunca união booleana:
 * `strictNullChecks` está desligado no repositório).
 *
 * Espaço nas pontas é aparado antes (é o que sobra de um copiar-e-colar); espaço NO MEIO recusa,
 * porque a chave do GA4 não tem espaço — se tem, a cópia pegou coisa a mais.
 */
export function secretRefusal(raw: unknown): string | null {
  const valor = typeof raw === 'string' ? raw.trim() : ''
  if (valor === '') return 'Cole a chave secreta antes de salvar.'
  if (valor.length > GA4_SECRET_MAX) {
    return `A chave secreta tem no máximo ${GA4_SECRET_MAX} caracteres. Confira se ela foi copiada sem nada a mais.`
  }
  if (/\s/.test(valor)) {
    return 'A chave secreta não tem espaços. Confira se ela foi copiada inteira e sem nada a mais.'
  }
  return null
}

/**
 * ACTION: status — a chave existe? desde quando?
 *
 * O `select` pede `updated_at` e **só** ele: a coluna `value` não atravessa nem a rede interna.
 * Falha de leitura é erro (502), nunca "não configurada" — "não consegui ler" e "não existe" são
 * estados diferentes, e só o primeiro pede "tentar de novo".
 */
async function status(deps: Deps): Promise<Response> {
  const { data, error } = await deps.supabase
    .from('analytics_secrets')
    .select('updated_at')
    .eq('key', GA4_SECRET_KEY)
    .maybeSingle()

  if (error) {
    log({ action: 'google-analytics:status', status: 'read_failed', code: error.code ?? null })
    return json({ error: 'Não foi possível ler o estado da chave secreta.' }, 502)
  }

  const atualizada = typeof data?.updated_at === 'string' ? data.updated_at : null
  return json({ secret_configured: atualizada !== null, secret_updated_at: atualizada })
}

/** ACTION: save-secret — grava (ou substitui) a chave, com quem e quando. */
async function saveSecret(deps: Deps, userId: string, body: any): Promise<Response> {
  const recusa = secretRefusal(body?.secret)
  if (recusa !== null) return json({ error: recusa }, 400)

  const agora = (deps.now ?? (() => new Date()))().toISOString()
  const { error } = await deps.supabase.from('analytics_secrets').upsert(
    {
      key: GA4_SECRET_KEY,
      value: String(body.secret).trim(),
      updated_at: agora,
      updated_by: userId,
    },
    { onConflict: 'key' },
  )

  if (error) {
    // Só o código: a mensagem e o `details` de uma violação de `check` repetem a linha — e a
    // linha carrega a chave.
    log({ action: 'google-analytics:save-secret', status: 'write_failed', code: error.code ?? null })
    return json({ error: 'Não foi possível guardar a chave secreta. Tente de novo.' }, 502)
  }

  log({ action: 'google-analytics:save-secret', status: 'saved', by: userId })
  return json({ ok: true, secret_updated_at: agora })
}

/** ACTION: clear-secret — apaga a chave. Sem ela, o servidor para de enviar compras (`CMP-06`). */
async function clearSecret(deps: Deps, userId: string): Promise<Response> {
  const { error } = await deps.supabase.from('analytics_secrets').delete().eq('key', GA4_SECRET_KEY)

  if (error) {
    log({ action: 'google-analytics:clear-secret', status: 'delete_failed', code: error.code ?? null })
    return json({ error: 'Não foi possível apagar a chave secreta. Tente de novo.' }, 502)
  }

  log({ action: 'google-analytics:clear-secret', status: 'cleared', by: userId })
  return json({ ok: true })
}

/**
 * O roteador. A autorização é o **choke point único**, antes do `switch` e antes de ler o corpo:
 * uma ação nova nasce fechada, e quem não é admin recebe 401/403 sem que nada do pedido seja lido.
 */
export async function route(deps: Deps, req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight()

  const auth = await requireAdmin(deps, req, 'google-analytics')
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  const action = new URL(req.url).searchParams.get('action') ?? ''

  switch (action) {
    case 'status':
      return await status(deps)
    case 'save-secret': {
      let body: any = {}
      try {
        const texto = await req.text()
        body = texto.trim() === '' ? {} : JSON.parse(texto)
      } catch {
        log({ action: 'google-analytics:save-secret', status: 'bad_body' })
        return json({ error: 'Corpo da requisição inválido.' }, 400)
      }
      return await saveSecret(deps, auth.userId, body)
    }
    case 'clear-secret':
      return await clearSecret(deps, auth.userId)
    default:
      log({ action: `google-analytics:${action}`, status: 'unknown_action' })
      return json({ error: 'Ação desconhecida.' }, 400)
  }
}
