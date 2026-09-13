// O cabeçalho CORS e o envelope JSON das edge functions — um dono só.
//
// Até a feature `49` esta constante estava escrita **três vezes**: em `melhor-envio/index.ts`, em
// `mercado-pago/handlers.ts` e em `send-notification/handlers.ts`. As três eram idênticas em valor
// (só divergiam no estilo de aspas), e é exatamente assim que o "defeito 01" começa: a quarta
// cópia nasceria com a function `checkout`, e a primeira divergência — uma origem restrita numa
// delas, um header novo em outra — não quebraria build, `tsc` nem teste. Quebraria o navegador de
// uma cliente, numa function só.
//
// `mercado-pago/handlers.ts` e `send-notification/handlers.ts` **reexportam** daqui em vez de
// declarar: é a mesma delegação que `menuBannerArt` faz sobre `surfaceArt` (`AD-030`), e ela
// mantém intactos todos os imports que já existiam.
//
// `Access-Control-Allow-Origin: *` é deliberado e não é descuido: estas functions servem a loja
// pública, que roda em pelo menos três origens (o domínio final, o `.vercel.app` provisório e o
// localhost do desenvolvimento). Onde há papel a exigir, quem exige é a checagem manual dentro do
// handler — nunca o CORS, que o navegador aplica e um cliente não-navegador ignora.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

/** Resposta JSON com os headers de CORS já aplicados. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

/** A resposta do preflight `OPTIONS`, igual em toda function. */
export function preflight(): Response {
  return new Response("ok", { headers: corsHeaders })
}
