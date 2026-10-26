// Edge function atelie-avisos — as inscrições do aviso no celular da dona (feature 79, `AD-062`).
//
// Actions (query param, molde admin-users): config · status · subscribe · events · unsubscribe · test
//
// `verify_jwt = false` no config.toml porque a anon key pública já é um JWT válido do projeto e
// passaria pelo gateway; a autorização real (papel admin, via a RPC canônica `has_role`) é manual em
// handlers.ts, em TODA ação.
//
// Este arquivo é APENAS wiring: lê env, constrói o client real, monta o envio do aviso de teste e
// serve. Roteamento e regra estão em handlers.ts, que recebe as dependências por parâmetro e por isso
// roda sob vitest (`AD-004`).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { type Deps, route } from './handlers.ts'
// O único arquivo que importa a biblioteca de Web Push. A chave pública que o `config` devolve sai
// do MESMO secret que assina — não há segunda cópia dela numa env do app.
import { createWebPushSender } from '../_shared/webPush.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/** `undefined` sem `VAPID_KEYS`/`VAPID_SUBJECT`: `config` e `test` respondem 503 (`MAN-37`). */
const webPush = await createWebPushSender({
  keys: Deno.env.get('VAPID_KEYS'),
  subject: Deno.env.get('VAPID_SUBJECT'),
})

const deps: Deps = {
  // Service role: a tabela das inscrições não tem policy de cliente nenhuma (`MAN-23`). Sem sessão a
  // manter, então sem refresh agendado (mesma razão da `admin-users`).
  supabase: createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }),
  sender: webPush?.sender,
  vapidPublicKey: webPush?.applicationServerKey,
}

Deno.serve((req) => route(deps, req))
