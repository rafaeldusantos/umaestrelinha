// Edge function `cancel-unpaid-orders` — o cancelamento automático do pedido não pago.
//
// Este arquivo é APENAS wiring: lê env, constrói o client real e serve. A regra e a ordem dos passos
// estão em `handlers.ts`, que recebe estas dependências por parâmetro e por isso roda sob teste no
// vitest (`AD-004`).
//
// Quem chama é o job `cancel-unpaid-orders` do `pg_cron` (migration `20261118120000`), por `pg_net`,
// com a chave de serviço lida do Vault no `Authorization`. `verify_jwt = false` no `config.toml`: a
// checagem é a do handler — a chave apresentada tem de ser a `SUPABASE_SERVICE_ROLE_KEY` deste
// projeto, que já é segredo do ambiente e não pede secret novo.
//
// O remetente é composto das DUAS envs, como na `mercado-pago` e na `send-notification`: o motor de
// notificação roda no mesmo processo (`AD-005`).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  DEFAULT_SENDER_FROM,
  createResendProvider,
  senderFrom,
} from '../../../packages/core/src/notifications/index.ts'
import { route, type Deps } from './handlers.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

/** Env declarada e vazia vale como ausente (o `??` não pega a string vazia). */
function envOr(name: string, fallback: string): string {
  const value = Deno.env.get(name)?.trim()
  return value === undefined || value === '' ? fallback : value
}

function envOptional(name: string): string | undefined {
  const value = Deno.env.get(name)?.trim()
  return value === undefined || value === '' ? undefined : value
}

const resendFrom =
  senderFrom(envOptional('RESEND_SENDER_NAME'), envOptional('RESEND_SENDER_EMAIL')) || DEFAULT_SENDER_FROM

const deps: Deps = {
  supabase: createClient(supabaseUrl, serviceRoleKey),
  fetch: globalThis.fetch.bind(globalThis),
  env: {
    mpAccessToken: Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') ?? '',
    jobKey: serviceRoleKey,
  },
  providers: [createResendProvider({ apiKey: Deno.env.get('RESEND_API_KEY') ?? '', from: resendFrom })],
  notifications: {
    resendApiKey: Deno.env.get('RESEND_API_KEY') ?? '',
    resendFrom,
    storePublicUrl: envOr('STORE_PUBLIC_URL', 'http://localhost:8080'),
    adminPublicUrl: envOr('ADMIN_PUBLIC_URL', 'http://localhost:8083'),
    resendDevRedirectTo: envOptional('RESEND_DEV_REDIRECT_TO'),
  },
}

Deno.serve((req) => route(deps, req))
