# supabase/ — o backend compartilhado

`@estrelinha/functions`. Um único backend para os dois apps: migrations, RLS, edge functions, auth e
e-mail. Leia [`../CLAUDE.md`](../CLAUDE.md) antes deste arquivo.

**Dev roda contra o Supabase local** (`http://127.0.0.1:54341`), na faixa 54341–54349. `supabase start`
sobe **junto** com as outras instâncias da máquina — **nunca use `supabase stop --all`**, que derruba
as dos outros projetos.

## O deploy é AUTOMÁTICO — `.github/workflows/supabase-deploy.yml`

**Todo push em `master` aplica migrations pendentes no hospedado** (`supabase db push --linked`) e,
quando `supabase/functions/**` mudou, faz `supabase functions deploy`. Não há filtro de `paths`: run
ausente seria indistinguível de run quebrado na aba Actions.

- **`db push` não é condicionado por diff**, e a assimetria com as functions é deliberada: sem
  migration pendente ele já é no-op, e decidir por diff arriscaria pular uma migration que ficou para
  trás num push que falhou. **Estado de banco se decide pelo estado, nunca pelo diff.**
- **O deploy das functions É condicionado**, porque redeployar as cinco a cada commit de documentação
  reinicia a `mercado-pago`, que atende o webhook de pagamento. Na dúvida (branch nova, force-push,
  histórico sem base comum) ele **deploya**: uma function velha em produção é mais cara que um deploy
  a mais.
- **O workflow NÃO faz `supabase config push`, e isso é regra.** O `config.toml` é a configuração de
  **desenvolvimento local** (`site_url = 127.0.0.1:8080`, redirect urls de localhost, SMTP com
  redirect de dev). Empurrá-lo **derrubaria o auth de produção**. Auth, SMTP e templates do hospedado
  são configurados no painel.
- **Os secrets são conferidos ANTES do `db push`**, de propósito: falhando ali, nada foi aplicado.
  Secret ausente chega ao step como string **vazia** — o GitHub não avisa, e a CLI reclama de
  `required flag(s) "project-ref" not set`, mensagem que manda procurar no lugar errado. Já custou um
  deploy (run de 2026-08-16, commit `9fb5dde`).
- **`RESEND_DEV_REDIRECT_TO` fica fora da conferência porque NÃO pode existir em produção** —
  preenchida, ela desvia todo transacional e nenhum cliente recebe e-mail. `STRICT_VARIANT_PRICING`
  também fica fora: é opcional e o default é `true`.

## O estado do hospedado, antes de qualquer comando que escreva

- **O projeto hospedado é `hgkrsfpupypxtygjgthf`** — é o que está nos `rewrites` do
  `apps/store/vercel.json`. No CI ele vem da **variable** `SUPABASE_PROJECT_REF` do environment
  `production` (variable, não secret: o ref já é público neste repositório, e mascará-lo faria toda
  mensagem de erro do deploy dizer `***` no lugar da informação que interessa).
- **`supabase/.temp/project-ref` diz `zwvrqtjvaltpbevjqzks`, que NÃO é ele.** É link velho do CLI, e é
  armadilha: um `supabase db push` **local** daqui vai para o projeto errado. Confira com
  `supabase projects list` e re-linke antes de escrever no hospedado.
- **O schema ESTÁ implantado.** O run do commit `bf2537e` (2026-08-17) aplicou as 44 migrations —
  `Finished supabase db push.`. Foi ele que expirou a `AD-017`.
- **As functions `google-feed` e `product-page` não foram implantadas.** Enquanto não forem,
  `/produtos/:slug` fica **fora do ar em produção**: o `rewrite` tira a rota do catch-all do SPA e o
  destino devolve erro. `curl -I` nas duas é o que fecha a `BL-016`.

## Migrations

44 arquivos em `migrations/`. **Nenhuma credencial no código.**

- **`AD-017` VENCEU em 2026-08-17, e a regra agora é a normal: migration aplicada é IMUTÁVEL.**
  Até o primeiro `db push` bem-sucedido era permitido corrigir uma migration no lugar — foi assim que
  os defaults de `store_settings` passaram a nascer corretos, sem migration de correção. Isso acabou.
  **Correção vem em migration nova, sempre.**
  - **O modo de falhar é silencioso**, e é por isso que a regra é dura: o `db push` compara a lista de
    arquivos com o que já foi aplicado, e **não reexamina o conteúdo do que já passou**. Reescrever um
    arquivo aplicado deixa o banco local (que veio de `db reset`) e o hospedado divergirem sem que
    nada acuse — nem o push, nem o build, nem o teste.
- **`supabase db reset` NÃO recarrega auth.** Mudança em `config.toml` exige
  `supabase stop && supabase start`.
- **`db reset` apaga o catálogo real.** O `seed.sql` não tem mais produto nem categoria (feature `21`)
  — só cupons e o usuário admin. Depois de um reset, rode o importador. Ao aplicar uma migration nova
  sobre um banco com catálogo importado, aplique **à mão**, sem reset.
- **A limpeza da seção 0 do `seed.sql` leva `AND nuvemshop_id IS NULL` em todo `DELETE`.** Sem isso,
  executar o seed avulso **depois** do import apagaria a categoria real `joias-afetivas` e, por
  cascade, os vínculos de produto dela.

### RLS — o molde que os guardas cobram

Quatro migrations são lidas do disco por teste (`materialTransitions`, `homeSections`, `faqSchema`,
`googleShoppingSchema`). O que eles reprovam é sempre a mesma família de afrouxamento:

- **`anon` não alcança escrita em nada.** Nenhum `grant` de escrita, em nenhuma tabela nova.
- **Policy de escrita passa por `has_role`.** Sem exceção.
- **Leitura pública é filtrada pelo que a loja pode ver** (seção ativa, produto ativo) — com uma
  exceção declarada: **`product_faqs` é lido publicamente sem condição, de propósito**, para que o
  vínculo a uma entrada inativa chegue ao navegador com `faq: null` e o ramo de "pular" rode em
  produção. Fechá-lo na policy faria o código existir sem nada exercitá-lo.
- **Escrita de estado sensível só existe por RPC `security definer`**, que escreve o campo e nada
  mais. `orders` **não tem policy de `UPDATE` para cliente**, de propósito (PAY-10): abrir uma exporia
  `payment_status` e os valores. `set_material_status` (admin) e `set_material_tracking` (dona do
  pedido **ou** admin) são as duas portas. **A mesma RPC de rastreio serve às duas pontas** — duas
  seriam duas máquinas de estado que divergem no primeiro ajuste.
- **FK de destino não vira `cascade` sem decisão.** `faqs` ↔ `product_faqs` é **`on delete restrict`**:
  apagar entrada em uso removeria a pergunta de até 453 páginas em silêncio, e o caminho reversível é
  `is_active = false`.
- **Contagem é VIEW, não coluna** (`faq_usage`, `promotion_eligible_products`). Materializar daria um
  segundo dono do número, que o importador desatualizaria ao gravar 3.475 vínculos de uma vez. View
  pública carrega `security_invoker`.

## Edge functions

`index.ts` é **só wiring** (env + client + `Deno.serve`); a lógica vive em `handlers.ts` com
dependências injetadas e é testada em `@estrelinha/functions` (`AD-004`). **337 testes em 6 arquivos.**

**As functions importam de `packages/core` por caminho relativo com extensão explícita**
(`../../../packages/core/src/shopping/identity.ts`) — Deno não passa pelo Vite e não conhece o alias
`@estrelinha/*`. É o precedente de `payment/payer.ts` e `payment/status.ts`. Por isso os módulos de
`core` consumidos aqui **não podem importar React nem Supabase-js do browser**: `purity.test.ts`
assere.

| Function | `verify_jwt` | O que faz |
| --- | --- | --- |
| `melhor-envio` | `false` | frete. A API **exige** identificação no `User-Agent` |
| `mercado-pago` | `false` | pagamento — `create-payment` e `webhook` |
| `send-email` | `false` | e-mail transacional pela API HTTP do Resend |
| `google-feed` | `false` | o feed RSS 2.0 do Merchant Center |
| `product-page` | `false` | a página do produto servida com JSON-LD no `<head>` |

**`verify_jwt = true` seria teatro de segurança** onde está `false`: a anon key publicada no `.env` da
loja é um JWT válido que qualquer pessoa lê no bundle. Onde há papel a exigir, a checagem é **manual**
via `has_role` dentro do handler.

### `mercado-pago`

**API de Orders**: `POST /v1/orders`, `GET /v1/orders/{id}`, `POST /v1/orders/{id}/cancel`. A API de
Pagamentos `/v1/payments` **não é usada em código novo** (`AD-001`).

- Actions: `create-payment` (auth manual + **recálculo server-side**) e `webhook` (`type: "order"`,
  assinatura HMAC, transições idempotentes via RPC `apply_payment_approval`).
- **A URL de notificação fica só no painel do MP** — a Orders API valida o corpo por schema fechado e
  **recusa** `notification_url`.
- **O recálculo descarta o `unit_price` do cliente** e refaz a conta a partir de
  `products.base_price`, chamando o mesmo `resolveOrderPricing` que a loja chama. Ver
  [`../packages/core/CLAUDE.md`](../packages/core/CLAUDE.md).
- Secrets: `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`.

### `send-email`

Três tipos: `order_received` (PIX criado), `order_paid` (aprovação), `order_shipped` (postado com
rastreio).

- **Contrato dirigido por estado** (`AD-007`): o corpo aceita **só** `{ type, order_id }`. O
  destinatário vem de `orders.customer_email` lido com a service role, e a function **relê** o pedido
  e exige que o estado case com o tipo — `order_paid` só sai com `paid_at` preenchido (a RPC
  `apply_payment_approval` **não** toca `orders.status`, então `status='paid'` seria a condição
  errada). Estado incompatível ⇒ 422, sem efeito e retentável.
- **Duas portas, um motor** (`AD-005`): a porta HTTP (`?action=send`, papel admin manual via
  `has_role`) é do **backoffice**. A `mercado-pago` importa `sender.ts` **direto, no mesmo processo** —
  sem hop HTTP, para não inventar auth interna nem pagar um segundo cold start no caminho do PIX.
- **Idempotência é do banco** (`AD-006`): tabela `order_emails` + RPC `claim_order_email`, que
  reivindica o par `(order_id, type)` numa única statement (`on conflict … do update … where status <>
  'sent'`). Índice único **não parcial** — um índice `where status='sent'` só detectaria a colisão
  **depois** da entrega. `supabase-js` não expressa esse `on conflict`.
- **Falha de e-mail nunca altera o pagamento**: a chamada é `await` limitado por `AbortController`
  (2500ms do `create-payment`, 8000ms do webhook — **nunca trabalho em background**, `AD-008`) e vive
  dentro de `try/catch`. Um throw ali viraria **500 na cobrança**.
- Secrets: `RESEND_API_KEY`, `RESEND_FROM`, `STORE_PUBLIC_URL` (origem **da loja**, não do Supabase),
  `RESEND_DEV_REDIRECT_TO`.

### `google-feed` e `product-page` (feature `30`, `AD-020`)

As duas ficam sob o domínio da loja por `rewrites` do `vercel.json`, **com o catch-all do SPA
obrigatoriamente por último** — `vercelRedirects.test.ts` assere a ordem por índice.

- **A `product-page` entra no caminho crítico de TODA visita a produto**, não só a do rastreador —
  antes era arquivo estático, que não tem como cair. Mitigado por cache de borda (`s-maxage=300,
  stale-while-revalidate=86400`), e **não** por condicionar o rewrite ao `User-Agent`: servir HTML
  diferente para o Googlebot é cloaking.
  - **Incerteza declarada**: não está confirmado que a Vercel cacheia proxy para host externo. Se não
    cachear, a decisão precisa ser revista **antes** do cutover.
- **O shell é BUSCADO do deploy vivo, nunca embutido.** O Vite emite asset com hash a cada build, e um
  shell velho responde 200 apontando para um `<script>` que já não existe — quadro branco sem erro em
  lugar nenhum.
- **O feed é URL pública, sem segredo.** O catálogo já é público; exigir credencial acrescenta um
  segredo a rotacionar para proteger dado que qualquer pessoa lê na vitrine.
- **O interruptor desligado responde 404**, e nasce desligado. Antes do cutover a fonte nem existe no
  Merchant Center, então 404 é inofensivo.
- **Prova de ponta a ponta contra o catálogo real**: `HTTP 200 · 6,99 MB · 3.233 <item> · 3.233 ids
  únicos · 0 duplicados · XML bem-formado por parser`. Contra as 3.237 do Merchant Center, a diferença
  de 4 **fica em aberto** e só se reconcilia com o export da conta.

## Auth

`AuthProvider` (de `@estrelinha/auth`) envolve cada app no `main.tsx`. A loja usa login de cliente +
admin; o backoffice usa `RequireAdmin`.

- **Configuração de auth é VERSIONADA, não é painel**: `[auth.external.google]` e
  `[auth.email.template.*]` em `config.toml`, com os templates em `templates/*.html` (todos usam
  `{{ .Token }}`). Mudança no `config.toml` exige `supabase stop && supabase start` — **`db reset` não
  recarrega auth**.
- **`magic_link` E `confirmation` são ambos necessários**: `signInWithOtp({shouldCreateUser: true})`
  dispara o de signup para e-mail novo e o magic link para e-mail existente. Configurar só um deixa
  metade dos casos no template padrão, que entrega **link** em vez do código.

### O SMTP está DESLIGADO de propósito

- Hoje o e-mail de login cai no **Mailpit** (`http://127.0.0.1:54344`), e é assim que se testa.
- O remetente de produção seria `acesso@send.umaestrelinha.com.br`, mas o domínio **ainda não está
  verificado no Resend** — medido em 2026-08-08: envio a partir dele devolve **403 "not authorized to
  send"**. Ligar o SMTP nessas condições derruba **todo** o login por código, e já derrubou uma vez
  (`BUG-20260728`). O bloco `[auth.email.smtp]` está no `config.toml`, **comentado**, com o passo exato
  de troca (incluindo o `curl` de verificação).
- **São DOIS remetentes, dois lugares, um domínio.** O do auth é `admin_email` em `[auth.email.smtp]`
  — endereço **nu**, porque o nome de exibição vem de `sender_name` e o GoTrue monta
  `From: "Nome" <addr>`. O dos transacionais é a env `RESEND_FROM`, em **RFC 5322** (`Nome <addr>`).
  **Reusar `RESEND_FROM` no `admin_email` produz `"Nome" <Nome <addr>>` — malformado, e todo envio de
  auth falha.** Confundir os dois é a causa raiz do `BUG-20260728`.

## O Resend tem DOIS usos, com uma chave

1. **SMTP do auth** — quem envia é o GoTrue; templates em `templates/*.html`.
2. **API HTTP transacional** — quem envia é `send-email`, via `POST https://api.resend.com/emails`;
   templates em `functions/send-email/{layout,templates}.ts`.

**Não confundir: mexer nos e-mails de pedido não é mexer em `templates/`.** `RESEND_DEV_REDIRECT_TO` é
válvula de dev **só dos transacionais** (o GoTrue não tem equivalente) e hoje fica vazia.

**E-mail não carrega webfont, e a pilha de fallback É a decisão de design.** Gmail e Outlook não
baixam fonte: os cinco templates (três de auth, três transacionais) usam **Georgia** no display —
serifado como o display da loja, porque cair de serifa para sans muda família e largura de uma vez — e
**Helvetica/Arial** no corpo. Tudo inline, layout em `<table>`, sem `<style>`, sem `<link>`, sem
`background-image`.

## Secrets

Todos no `.env` da **raiz** (ver `.env.example`), resolvidos no local por `[edge_runtime.secrets]` do
`config.toml` (`env()`, exige `supabase stop && supabase start`). No hospedado, `supabase secrets set`.

`SUPABASE_SERVICE_ROLE_KEY` · `MERCADO_PAGO_ACCESS_TOKEN` · `MERCADO_PAGO_WEBHOOK_SECRET` ·
`RESEND_API_KEY` · `RESEND_FROM` · `RESEND_DEV_REDIRECT_TO` · `STORE_PUBLIC_URL` · `NUVEMSHOP_*`
