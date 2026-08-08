// Edge function mercado-pago — única porta server-side para o Mercado Pago.
// Actions (query param, molde melhor-envio): create-payment, webhook.
// verify_jwt=false no config.toml (webhook é público); auth do create-payment é manual.
//
// Este arquivo é APENAS wiring: lê env, constrói o client real e serve. Roteamento e lógica
// estão em handlers.ts, que recebe essas dependências por parâmetro e por isso roda sob teste
// no vitest (AD-004) — sem `Deno` e sem `esm.sh` no caminho do módulo testado.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"
import { route, type Deps } from "./handlers.ts"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

// A URL de notificação NÃO é enviada no corpo: a Orders API valida por schema fechado e recusa
// `notification_url` como propriedade não suportada (medido no T16). Ela vive exclusivamente no
// painel da aplicação do Mercado Pago — em dev, apontando para o túnel; em produção, para o
// projeto hospedado. Por isso não há env de URL aqui.
// `??` não serve para as envs de e-mail: uma env declarada e VAZIA no `.env` devolve `""`, que não é
// nullish — e um `resendFrom` vazio reprovaria na validação de formato e bloquearia todo envio.
// Mesma função existe em send-email/index.ts; duplicada porque wiring não compartilha módulo.
function envOr(name: string, fallback: string): string {
  const value = Deno.env.get(name)?.trim()
  return value === undefined || value === "" ? fallback : value
}

function envOptional(name: string): string | undefined {
  const value = Deno.env.get(name)?.trim()
  return value === undefined || value === "" ? undefined : value
}

const deps: Deps = {
  supabase: createClient(supabaseUrl, serviceRoleKey),
  fetch: globalThis.fetch.bind(globalThis),
  env: {
    mpAccessToken: Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")!,
    mpWebhookSecret: Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET")!,
    // Padrão LIGADO (07/T14, PST-09): só é desligada explicitamente com "false". A flag cobre a
    // janela entre o deploy da function e o do bundle da loja, em que abas abertas mandariam item
    // sem `variant_id`. Não havendo nada em produção, o valor seguro é o estrito — e um default
    // desligado significaria cobrar `base_price` por uma variação de R$ 18,40, calado.
    strictVariantPricing: envOr("STRICT_VARIANT_PRICING", "true").toLowerCase() !== "false",
  },
  // Esta function dispara `order_received` (PIX criado) e `order_paid` (aprovação), importando o
  // motor de `send-email/sender.ts` no mesmo processo (AD-005) — daí precisar do env de e-mail aqui.
  email: {
    resendApiKey: Deno.env.get("RESEND_API_KEY")!,
    resendFrom: envOr("RESEND_FROM", "Nanita <onboarding@resend.dev>"),
    storePublicUrl: envOr("STORE_PUBLIC_URL", "http://localhost:8080"),
    resendDevRedirectTo: envOptional("RESEND_DEV_REDIRECT_TO"),
  },
}

Deno.serve((req) => route(deps, req))
