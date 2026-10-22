// Edge function `visit` — a gravação de uma visita única (feature `71`, `AD-055`).
//
// Este arquivo é APENAS wiring: lê env, constrói o client real e serve. Os portões e a lógica estão
// em `handlers.ts`, que recebe estas dependências por parâmetro e por isso roda sob teste no vitest
// (`AD-004`).
//
// `verify_jwt = false` no `config.toml`: a loja chama esta function só com a chave publicável — de
// propósito, nunca com o JWT da sessão da cliente (`VIS-13`) — e quem decide se a visita conta é o
// handler (robô, origem, corpo, teto), não o gateway.
//
// O client é service-role porque `record_store_visit` e `store_clock` só são executáveis por esse
// papel: a tabela de visitas é fechada a `anon` e `authenticated` (`VIS-28`).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { createRateLimiter } from '../_shared/rateLimit.ts'
import { createClockCache, route, type Deps } from './handlers.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const now = () => Date.now()

const deps: Deps = {
  supabase: createClient(supabaseUrl, serviceRoleKey),
  now,
  // 30 gravações por minuto por IP, por isolate (`VIS-27`). É cortesia, não fronteira: o que segura
  // o crescimento da tabela é o teto diário de linhas, no banco.
  limiter: createRateLimiter(30, 60_000, now),
  clock: createClockCache(),
  log: (linha) => console.log(JSON.stringify(linha)),
}

Deno.serve((req) => route(deps, req))
