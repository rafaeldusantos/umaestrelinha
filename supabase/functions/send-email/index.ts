// Edge function send-email — porta HTTP do envio transacional (Resend), usada pelo backoffice.
// Action (query param, molde melhor-envio/mercado-pago): send.
// verify_jwt=false no config.toml porque a anon key pública já é um JWT válido e passaria pelo
// gateway; a autorização real (papel admin) é manual dentro de handlers.ts.
//
// Este arquivo é APENAS wiring: lê env, constrói o client real e serve. Roteamento e lógica estão em
// handlers.ts / sender.ts, que recebem as dependências por parâmetro e por isso rodam sob vitest
// (AD-004) — sem `Deno` e sem `esm.sh` no caminho do módulo testado.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { type Deps, route } from './handlers.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/**
 * `??` NÃO serve aqui: uma env declarada e vazia (`RESEND_FROM=` no .env, que é o estado normal de
 * quem só copiou o .env.example) devolve `""`, que não é nullish — e um `resendFrom` vazio reprova na
 * validação de formato e bloqueia TODO envio. Vazio tem de significar "use o default".
 */
function envOr(name: string, fallback: string): string {
  const value = Deno.env.get(name)?.trim()
  return value === undefined || value === '' ? fallback : value
}

function envOptional(name: string): string | undefined {
  const value = Deno.env.get(name)?.trim()
  return value === undefined || value === '' ? undefined : value
}

const deps: Deps = {
  supabase: createClient(supabaseUrl, serviceRoleKey),
  fetch: globalThis.fetch.bind(globalThis),
  env: {
    resendApiKey: Deno.env.get('RESEND_API_KEY')!,
    // Default do remetente vive aqui: `onboarding@resend.dev` funciona sem domínio verificado, mas só
    // entrega para o e-mail dono da conta Resend. Trocar por um endereço do domínio da Nanita depois
    // de verificar o domínio no painel — só mexendo na env, sem tocar em código.
    resendFrom: envOr('RESEND_FROM', 'Nanita <onboarding@resend.dev>'),
    // Origem DA LOJA, não do Supabase. Base do link `/conta` dos e-mails.
    storePublicUrl: envOr('STORE_PUBLIC_URL', 'http://localhost:8080'),
    resendDevRedirectTo: envOptional('RESEND_DEV_REDIRECT_TO'),
  },
}

Deno.serve((req) => route(deps, req))
