// Edge function admin-users — quem entra no painel (feature 48).
//
// Actions (query param, molde melhor-envio/mercado-pago/send-notification):
//   list · create · update · revoke · delete · reset-password
//
// `verify_jwt = false` no config.toml porque a anon key pública já é um JWT válido do projeto e
// passaria pelo gateway; a autorização real (papel admin, via a RPC canônica `has_role`) é manual em
// handlers.ts.
//
// Este arquivo é APENAS wiring: lê env, constrói o client real, e serve. Roteamento e regra estão em
// handlers.ts, que recebe as dependências por parâmetro e por isso roda sob vitest (`AD-004`) — sem
// `Deno` e sem `esm.sh` no caminho do módulo testado.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { type Deps, route } from './handlers.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const deps: Deps = {
  /**
   * Client de **service role**, e é ele que justifica esta function existir: criar e apagar conta no
   * GoTrue não tem outro caminho, e esta chave não pode chegar ao navegador.
   *
   * `autoRefreshToken` e `persistSession` desligados porque não há sessão a manter — a chave de
   * serviço não expira e não pertence a ninguém. Ligados, o client agenda um timer de refresh que
   * mantém o worker acordado sem necessidade.
   */
  supabase: createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }),
}

Deno.serve((req) => route(deps, req))
