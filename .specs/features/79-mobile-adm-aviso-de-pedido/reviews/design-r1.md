# Revisão — Design (rodada 1)

Veredito: REPROVADO

## Achados

### R1 — Entrega parcial grava a linha como `failed`, e a retentativa reenvia a quem já recebeu (bloqueante)
- Onde: `design.md` §4.2, passo 9 de `deliverPush`: "≥1 entregue → `provider_message_id = 'push:<entregues>/<total>'`, `error` = `entregue a X de Y aparelhos` quando parcial". A RPC que fecha a linha é `finish_order_notification` (`supabase/migrations/20260907120000_42-notificacoes.sql:193-209`): `set status = case when p_error is null then 'sent' else 'failed' end`. A `52` não a recriou.
- Problema: passar qualquer `p_error` não nulo transforma a linha em `failed`. O design usa `error` para o resumo parcial, então todo envio parcial vira `failed`. E `claim_order_notification` (mesmo arquivo, :172-191) reivindica de novo qualquer linha com `status <> 'sent'`.
- Cenário: dois aparelhos inscritos, um entrega e o outro dá 503. A linha fica `failed`, o que contraria `MAN-09` ("entregue a um ou mais aparelhos ⇒ `sent`"). Na retentativa do webhook do Mercado Pago, o claim volta a valer e `deliverPush` manda de novo para os **dois** aparelhos. O que já recebeu ganha o aviso duas vezes, e `MAN-05`/`MAN-01` ("exatamente um") caem. O histórico ainda mostraria "O aviso no celular não chegou." (`MAN-38`) para um aviso que chegou.
- Sugestão: decidir no design como o parcial é gravado sem `p_error`. Uma saída é guardar o resumo em `provider_message_id` (ou só no log) com `p_error = null`. A outra é uma migration nova que recrie `finish_order_notification` com um parâmetro de status explícito, guardada pelo `orderNotificationsSchema`/`entregaDeEmailSchema`. Escrever um caso de teste: com entrega parcial a linha fica `sent` e a segunda chamada devolve `already_sent`.

### R2 — O webhook do PIX não recebe o `push`: `fireTrigger` da `mercado-pago` monta as dependências do motor campo a campo (bloqueante)
- Onde: `design.md` §4.2, "Fiação — `send-notification/index.ts` **e** `mercado-pago/index.ts` … `push: createWebPushSender(...)`", e §7 R5 (`pushSoNoMotor.test.ts` exige `createWebPushSender(` nos dois `index.ts`). O código real está em `supabase/functions/mercado-pago/handlers.ts:98-103`:
  ```ts
  await dispatchTrigger(
    { supabase: deps.supabase, fetch: deps.fetch, env: deps.notifications, providers: deps.providers },
    { orderId, trigger, budgetMs },
  )
  ```
- Problema: a `mercado-pago` não repassa o objeto de dependências inteiro. O handler reconstrói o `NotificationDeps` com quatro campos, então um `push` acrescentado em `mercado-pago/index.ts` nunca chega ao motor. O design não cita `mercado-pago/handlers.ts` (o tipo `Deps` e o `fireTrigger`) nem o teste dele. O guarda proposto em R5 só procura `createWebPushSender(` nos `index.ts` e ficaria verde com o push morto.
- Cenário: as tasks seguem o design e fiam só o `index.ts`. `owner_order_paid` e `owner_order_received` saem pelo webhook e pelo `create-payment`, que são o caminho principal da feature (Success Criteria: "PIX aprovado → aviso"). Os dois cairiam em `skipped: no_provider`, e só o `notify` da `send-notification` (`owner_material_incoming`) avisaria.
- Sugestão: incluir `mercado-pago/handlers.ts` em §4.2: o `Deps` ganha `push?` e o `fireTrigger` o repassa. Trocar a régua de R5 por um caso **executado** em `mercado-pago/__tests__/handlers.test.ts`, em que um `PushSender` dublê é chamado quando o webhook aprova. A presença da string no `index.ts` não prova a fiação.

### R3 — `forEvent` sai antes do ramo push quando o e-mail está mal configurado (importante)
- Onde: `design.md` §4.2, que diz que `forEvent` passa a: "(1) `orderStateFailure` primeiro … (2) os canais de e-mail exatamente como hoje … (3) … `deliverPush`". O código real está em `supabase/functions/send-notification/dispatch.ts:419-447`. Antes de qualquer outra coisa vem `if (!isValidFrom(deps.env.resendFrom)) return [{ … reason: 'invalid_from' }]`. Depois vem `if (canais.length === 0) return [{ … skipped: 'no_provider' }]`.
- Problema: o design não diz onde fica a checagem `invalid_from`, nem que os dois `return` antecipados do e-mail não podem pular o passo 3. "Exatamente como hoje" mantém os dois `return`, e o push nunca é alcançado.
- Cenário: o remetente do Resend fica malformado ou vazio. Foi o caso do `RESEND_FROM` em 2026-09-06, com treze dias sem e-mail (`supabase/CLAUDE.md`). `forEvent` devolve `invalid_from`, e o aviso no celular também não sai, justamente quando ele seria o único sinal de venda. Isso viola `MAN-06` ("push e e-mail são canais independentes") e o espírito de `MAN-37`, que pede o inverso: falta do provedor de push não derruba o e-mail.
- Sugestão: escrever a ordem de `forEvent` explicitamente. Primeiro o estado. Depois o ramo do e-mail, com `invalid_from`, `no_owner_contact` e `no_provider` restritos a ele, acumulando resultados em vez de dar `return`. Por último o push. Prever no plano de testes um caso de `dispatch.test.ts` com `resendFrom` inválido em que o push ainda sai.

### R4 — Secrets VAPID sem configuração local, sem `.env.example` e sem decisão no CI (importante)
- Onde: `design.md` §4.2 lê `Deno.env.get('VAPID_KEYS')` e `Deno.env.get('VAPID_SUBJECT')`; §4.6 emenda `MAN-42`. Nenhuma seção cita `supabase/config.toml` `[edge_runtime.secrets]` (`config.toml:461`), o `.env.example` ou a etapa "conferir secrets das edge functions" de `.github/workflows/supabase-deploy.yml:158-178`.
- Problema: no local, uma function só enxerga um secret declarado em `[edge_runtime.secrets]` (`supabase/CLAUDE.md`, *Secrets*). Sem a entrada, `supabase functions serve` roda com o push sempre em `no_provider` e o `config` da porta sempre em 503. O design também não decide se o CI confere os dois secrets. Como a ausência é tolerada (`MAN-37`), esquecê-los em produção deixa o canal mudo e verde. Por fim, `MAN-42` (migration → secrets → functions → bundle) não tem onde morar além da emenda.
- Cenário: a prova em Chrome (Success Criteria) e o probe local não conseguem ativar avisos. Em produção, um deploy sem `VAPID_KEYS` faz a tela dizer "Não consegui ativar os avisos." sem ninguém saber por quê. É a mesma família do `MELHOR_ENVIO_*` que rodou meses ausente.
- Sugestão: acrescentar ao design a entrada em `[edge_runtime.secrets]`, a linha no `.env.example` com o comando de geração (`exportVapidKeys`) e uma decisão explícita sobre o `supabase-deploy.yml`, que pode conferir os dois ou declarar por que não confere. Incluir também uma subseção "Publicação" com a ordem de `MAN-42` e o aviso de `BL-044` (gravar de um diretório sem `.env`).

### R5 — `sw-avisos.js` não tem tratamento no `vercel.json` do app (menor)
- Onde: `design.md` §4.5 (`public/sw-avisos.js`, carregado por `workbox.importScripts`) e §6 (os guardas do app não citam `vercelConfig.test.ts`). O arquivo real é `apps/mobile-adm/vercel.json`: o rewrite da SPA exclui por nome `sw.js`, `manifest.webmanifest`, `registerSW.js` e `workbox-`, e só `sw.js`/manifest recebem `no-cache`.
- Problema: o arquivo novo, que o service worker importa, fica fora do padrão que a `72` estabeleceu para os scripts do SW. Na Vercel o sistema de arquivos tende a vencer o rewrite, então isso provavelmente não quebra hoje. Mesmo assim, o padrão do repositório (e `vercelConfig.test.ts`) trata cada script do SW de forma explícita.
- Sugestão: incluir `sw-avisos\.js` na exclusão do rewrite e no header `no-cache`, e estender `vercelConfig.test.ts`.

### R6 — Duas reivindicações concorrentes da mesma linha `pending` (menor)
- Onde: `design.md` §3 ("`MAN-05` sem código novo de dedupe") e a edge case da spec ("dois gatilhos … ao mesmo tempo … o `claim` serializa"). `claim_order_notification` reivindica de novo uma linha `pending` (`where n.status <> 'sent'`).
- Problema: dois envios simultâneos do mesmo gatilho recebem um id cada e os dois enviam. Para o e-mail existe a terceira camada, o `idempotencyKey` do Resend. No push, quem segura isso é a `tag` do aviso (o Android substitui o de mesma tag), e o design a trata como acessória ("se algum dia chegarem duas").
- Sugestão: declarar em §7 que a `tag = pedido-<id>-<event>` é a contenção real da concorrência e cobri-la com um caso do `sw-avisos.js` (a mesma `tag` em `showNotification`).

### R7 — Exceção no ramo push apaga o relatório do gatilho inteiro (menor)
- Onde: `design.md` §5, "Exceção no ramo push | O `catch` de `run`". Em `dispatch.ts:375-393` o `catch` de `run` devolve `{ found: false, results: [] }`.
- Problema: uma exceção em `deliverPush` descarta os resultados de todos os eventos já entregues e transforma `found` em `false`. A porta `trigger` passa a responder como se o pedido não existisse.
- Sugestão: `deliverPush` com `try/catch` próprio, devolvendo `{ reason: 'unexpected_error' }` para o canal push.

### R8 — Teto do aviso de teste é ler e depois gravar (menor)
- Onde: `design.md` §4.3, ação `test`: "`max(last_test_at)` … < 30 s → 429; grava `last_test_at` **antes** de enviar".
- Problema: duas requisições quase simultâneas leem o mesmo valor antigo, e as duas passam.
- Sugestão: um `update … set last_test_at = now() where … and (last_test_at is null or last_test_at < now() - interval '30 seconds') returning`. Zero linhas viram 429.

### R9 — Imprecisões de referência (menor)
- `design.md` §6 diz que `storeSettingsDefaults` passa a ler o `check` de canal. O guarda real (`apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts`) não menciona `channel`; quem o lê é `orderNotificationsSchema.test.ts:182`.
- O cabeçalho do design aponta para `.specs/features/79-mobile-adm-aviso-de-pedido/spec.md`, mas a feature em revisão está em `81-79-mobile-adm-aviso-de-pedido/`. As duas cópias estão idênticas hoje (`diff` vazio); se divergirem, o design vai citar a errada.

## Conferido sem achado
- `NotificationProvider` é de destinatário único (`packages/core/src/notifications/providers/types.ts`, `RenderedMessage.to`), e a justificativa de §1 para o ramo próprio confere.
- Os quatro `owner_*` já nascem de `eventsForTrigger` (`triggers.ts:51,58,62,97`); `forEvent`/`dispatchTrigger`/`dispatchEventFull` existem como descrito; o reenvio passa por `dispatchEventFull` e não chegaria ao ramo de gatilho.
- `preconditionFailure` mistura estado e `blank(ctx.ownerEmail)` nos quatro `owner_*` (`precondition.ts:129-149`); a extração de `orderStateFailure` com saída idêntica é viável.
- `NOTIFICATION_CHANNELS = ['email','whatsapp']` (`settings.ts:13`) e o `check (channel in ('email','whatsapp'))` (migration 42:101-104) existem; recriar a constraint em migration nova segue `AD-017`/molde da `57`.
- `buildHistory` (`core/orders/history.ts`): `rotuloDoCanal`, `emailType`/`emailChannel`, e o "Reenviar" do painel só aparece com `ev.emailType` (`OrderHistory.tsx:85-118`). A proposta de linha push sem `emailType` tira o botão, como `MAN-38` pede.
- `shippedNoticeSent` filtra por `order_shipped`, que não é evento de push, então sem efeito colateral.
- `requireAdmin`/`has_role(_user_id,_role)` em `_shared/auth.ts:53-75`; `formatPrice` sem import (`formatters/price.ts`); `formatOrderNumber` sem import (`orders/format.ts`); `NOTIFICATION_EVENT_NAMES` dos quatro `owner_*` iguais aos rótulos de `MAN-40` (`catalog.ts:96-99`).
- `RequireAdmin.tsx:74` faz `<Navigate to={loginPath} replace />` sem `state`; `AdminLoginPage` navega para `/admin` fixo, então o `state.from` é mudança aditiva; o `LoginPage` do app navega para `/` (linha 50).
- `pwa.config.ts` usa `generateSW` sem `runtimeCaching`; `workbox.importScripts` mantém o precache.
- `escritaSoPelaPorta.test.ts` recusa `functions.invoke` e conta os importadores do client, e o design o estende com entrada literal. `marcacaoSoPorAcao.test.ts:160-172` já lista `has_role`, `claim_order_notification` e `finish_order_notification`. `isAccessDenied` existe em `core/hooks/useStoreOverview.ts:24`. `abasSaoAsRotas` recusa rota de primeiro nível sem aba, e o design prevê a lista literal `ROTAS_DA_CONTA`.
- `AD-062` está registrado em `.specs/STATE.md:1519` como `proposed`, sem colidir com AD-060/061. Nenhuma decisão ativa (`AD-004/005/008/017/034/056/058/059`) é contrariada.
- Todos os requisitos MAN-01..42 têm lugar no design, com as exceções apontadas em R1 (MAN-09/05), R2 (MAN-01 pelo webhook), R3 (MAN-06) e R4 (MAN-42).

## Resposta do autor

Todos aceitos e aplicados no `design.md` (2026-10-25), conferidos no código antes:

- **R1** (confirmado: `finish_order_notification` marca `failed` com `p_error` não nulo, migration 42) → entrega parcial fecha com `p_error = null` (linha `sent`, terminal) e a contagem em `provider_message_id = 'push:X/Y'`; o histórico a mostra no detalhe. `MAN-09` emendado na spec.
- **R2** (confirmado: `fireTrigger`, `mercado-pago/handlers.ts:98-103`) → `Deps` da `mercado-pago` ganha `push`, `fireTrigger` o repassa; a prova é de comportamento pelo handler real (webhook aprovado e `create-payment` com `PushSender` dublê), e o guarda de texto fica só para os `index.ts`.
- **R3** → `forEvent` em duas metades depois do estado comum: `invalid_from`, contato e `no_provider` encerram só a metade e-mail; o push roda qualquer que seja o desfecho do e-mail.
- **R4** → seção 4.4.1: `config.toml`, `.env.example`, o passo de secrets do deploy (fora da lista obrigatória, com `::warning::`, precedente de `MELHOR_ENVIO_ENV`), a ordem de publicação em `supabase/CLAUDE.md`.
- **R5** → `vercel.json` do app com `sw-avisos.js` fora do rewrite e `no-cache`; `vercelConfig` estendido.
- **R6** → declarado: a `tag` segura a duplicata na tela.
- **R7** → `try/catch` próprio em volta de `deliverPush` dentro de `forEvent`.
- **R8** → RPC atômica `claim_push_test` com `pg_advisory_xact_lock`; entra em `marcacaoSoPorAcao`.
- **R9** → referência a `storeSettingsDefaults` corrigida; cabeçalho cita o link simbólico.
