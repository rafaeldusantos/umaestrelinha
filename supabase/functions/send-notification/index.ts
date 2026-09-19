// Edge function send-notification — as quatro portas do envio transacional.
// Actions (query param, molde melhor-envio/mercado-pago): send, trigger, notify, preview.
// verify_jwt=false no config.toml porque a anon key pública já é um JWT válido e passaria pelo
// gateway; a autorização real (papel admin, ou dona do pedido em `notify`) é manual em handlers.ts.
//
// Este arquivo é APENAS wiring: lê env, constrói o client real, REGISTRA OS PROVEDORES e serve.
// Roteamento e lógica estão em handlers.ts / dispatch.ts, que recebem as dependências por parâmetro
// e por isso rodam sob vitest (AD-004) — sem `Deno` e sem `esm.sh` no caminho do módulo testado.
//
// A lista de provedores é o ponto de extensão da feature 43: acrescentar o WhatsApp é acrescentar
// UM item aqui e UM arquivo em `core/notifications/providers/`. O motor não muda.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  DEFAULT_SENDER_FROM,
  createResendProvider,
  senderFrom,
} from '../../../packages/core/src/notifications/index.ts'
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

const resendApiKey = Deno.env.get('RESEND_API_KEY')!
/**
 * O remetente sai de DUAS envs (feature 52, T8), espelhando o auth — que sempre teve `sender_name`
 * e `admin_email` separados no config.toml. Uma única string em RFC 5322 era o campo que mais
 * errava: colar o formato de um no campo do outro derruba TODO o envio (BUG-20260728).
 *
 * `senderFrom` é o dono da composição, em `core`, e ele devolve vazio quando não dá para montar um
 * remetente válido — inclusive quando alguém cola o valor antigo, combinado, no campo do endereço.
 * Vazio cai no default abaixo, que o `Email check` recusa por `from_is_default`.
 *
 * `RESEND_FROM` NÃO é mais lida. O nome antigo foi aposentado de propósito: reusá-lo com
 * significado novo faria um valor esquecido em produção ser interpretado como "só o nome".
 */
const resendFrom =
  senderFrom(envOptional('RESEND_SENDER_NAME'), envOptional('RESEND_SENDER_EMAIL')) ||
  DEFAULT_SENDER_FROM

const deps: Deps = {
  supabase: createClient(supabaseUrl, serviceRoleKey),
  fetch: globalThis.fetch.bind(globalThis),
  providers: [createResendProvider({ apiKey: resendApiKey, from: resendFrom })],
  env: {
    resendApiKey,
    // Já composto acima. O default (`onboarding@resend.dev`) entrega só ao dono da conta Resend —
    // sucesso aparente e nenhuma cliente recebendo, que é por isso que o sensor o recusa.
    resendFrom,
    // Origem DA LOJA, não do Supabase. Base do link `/conta` dos e-mails.
    storePublicUrl: envOr('STORE_PUBLIC_URL', 'http://localhost:8080'),
    // Origem do PAINEL — outra implantação, outra env. Só os e-mails da DONA a usam
    // (`{{link_pedido_admin}}`), e os dois nascem desligados, então um default de dev aqui nunca
    // chega a uma cliente. Ver `.env.example`.
    adminPublicUrl: envOr('ADMIN_PUBLIC_URL', 'http://localhost:8083'),
    resendDevRedirectTo: envOptional('RESEND_DEV_REDIRECT_TO'),
  },
}

Deno.serve((req) => route(deps, req))
