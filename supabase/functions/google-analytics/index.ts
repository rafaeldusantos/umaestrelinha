// Edge function google-analytics — a chave secreta do Measurement Protocol (feature 61).
//
// Actions (query param): status · save-secret · clear-secret. Todas exigem admin.
//
// `verify_jwt = false` no config.toml porque a anon key pública já é um JWT válido do projeto e
// passaria pelo gateway; a autorização real (papel admin, via `_shared/auth.ts`) é manual em
// handlers.ts.
//
// Este arquivo é APENAS wiring: lê env, constrói o client real, e serve. A regra está em
// handlers.ts, que recebe as dependências por parâmetro e por isso roda sob vitest (`AD-004`).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { type Deps, route } from './handlers.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const deps: Deps = {
  /**
   * Client de **service role**: `analytics_secrets` não tem policy nenhuma, e é isso que a fecha
   * para `anon` e `authenticated`. Sem sessão a manter, por isso sem refresh.
   */
  supabase: createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }),
}

Deno.serve((req) => route(deps, req))
