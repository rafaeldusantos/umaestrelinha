// Edge function seo-suggest — sugerir título e descrição de SEO de uma peça (feature 84).
//
// `verify_jwt = false` no config.toml porque a anon key pública já é um JWT válido do projeto e
// passaria pelo gateway; a autorização real (papel admin, via `_shared/auth.ts`) é manual em
// handlers.ts, antes de qualquer chamada ao modelo.
//
// Este arquivo é APENAS wiring: lê env, constrói o client do Supabase, a porta do Claude e o teto
// por conta, e serve. A regra está em handlers.ts, que recebe as dependências por parâmetro e por
// isso roda sob vitest (`AD-004`).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { createClaudeJson } from '../_shared/claude.ts'
import { createRateLimiter } from '../_shared/rateLimit.ts'
import { type Deps, route } from './handlers.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const anthropicKey = (Deno.env.get('ANTHROPIC_API_KEY') ?? '').trim()

const deps: Deps = {
  /** Client de service role: só lê `products`, `categories` e o vínculo, com colunas literais. */
  supabase: createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }),
  /** Sem a chave, a porta não existe e o handler responde 503 `not_configured` (`SIA-20`). */
  claude: anthropicKey === '' ? null : createClaudeJson(anthropicKey),
  /** 30 sugestões por conta a cada 10 minutos (`SIA-18`). Por isolate: o teto da conta na Anthropic é a fronteira. */
  limiter: createRateLimiter(30, 600_000, () => Date.now()),
}

Deno.serve((req) => route(deps, req))
