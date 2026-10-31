// Edge function `order-proposals` — a proposta que o painel monta (feature 89, `AD-070`).
//
// Actions (query param): list · get · save · renew · cancel · log-sent.
//
// `verify_jwt = false` no config.toml porque a anon key pública já é um JWT válido do projeto e
// passaria pelo gateway; a autorização real (papel admin, pela RPC canônica `has_role`) é manual em
// handlers.ts, em TODA ação.
//
// Este arquivo é APENAS wiring: lê env, constrói o client real e serve (`AD-004`).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { type Deps, route } from './handlers.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const deps: Deps = {
  // Service role: as tabelas da proposta não têm policy nenhuma (`SEG-05`), e esta function é a
  // única porta do painel até elas.
  supabase: createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }),
  now: () => Date.now(),
}

Deno.serve((req) => route(deps, req))
