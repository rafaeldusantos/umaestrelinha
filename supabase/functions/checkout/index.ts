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
import { buildDeps, route } from './handlers.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Os dois tetos por IP (o de `identify` e o da página do link, `SEG-04`) são montados por
// `buildDeps`, que tem teste; aqui só entra o client real e o relógio.
const deps = buildDeps(createClient(supabaseUrl, serviceRoleKey), () => Date.now())

Deno.serve((req) => route(deps, req))
