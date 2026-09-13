// Edge function `checkout` — a porta do caixa sem conta (feature `49`).
//
// Este arquivo é APENAS wiring: lê env, constrói o client real e serve. Roteamento e lógica estão
// em `handlers.ts`, que recebe essas dependências por parâmetro e por isso roda sob teste no
// vitest (`AD-004`) — sem `Deno` e sem `esm.sh` no caminho do módulo testado.
//
// `verify_jwt = false` no `config.toml`, e aqui isso não é teatro de segurança como nas outras:
// **a convidada não tem JWT nenhum**, por definição. Quem autoriza é o próprio handler — a sessão
// quando existe, o token de posse do pedido quando não.
//
// O client é service-role porque a gravação do pedido de convidada não passa por RLS: não há
// `auth.uid()` para escopar. É a mesma razão pela qual esta function existe.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  IDENTIFY_MAX,
  IDENTIFY_WINDOW_MS,
  createRateLimiter,
  route,
  type Deps,
} from './handlers.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const now = () => Date.now()

const deps: Deps = {
  supabase: createClient(supabaseUrl, serviceRoleKey),
  now,
  // Uma instância por isolate. O teto é por isolate de propósito — ver o comentário de
  // `createRateLimiter`: a fronteira de segurança é a recusa de `create-order`, não este número.
  limiter: createRateLimiter(IDENTIFY_MAX, IDENTIFY_WINDOW_MS, now),
}

Deno.serve((req) => route(deps, req))
