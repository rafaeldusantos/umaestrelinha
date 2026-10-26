# Revisão — Design (rodada 2)

Veredito: REPROVADO

Os nove achados da rodada 1 foram respondidos em `## Resposta do autor` e conferi no `design.md` que a correção está lá: R1 em §4.2 passo 9, R2 em §4.2 "Fiação", R3 nas duas metades de `forEvent`, R4 em §4.4.1, R5 em §4.4.1 e §6 (`vercelConfig`), R6 na "Corrida de dois `claim`", R7 em "Exceção dentro do ramo push", R8 na RPC `claim_push_test` e R9 no cabeçalho e em §6. Nenhum deles volta. O achado novo que reprova esta rodada é R1, abaixo.

## Achados

### R1 — Na porta do app, "isAccessDenied para 401/403" não funciona, e 403 nem sempre é recusa (importante)
- Onde: `design.md` §4.5, `portaDeAvisos.ts`: "Erro de rede × recusa separados (`isAccessDenied` de `core/hooks` para 401/403 → a recusa da `72`, L-047)". Também §5, linha "Porta recusa (401/403) | A recusa de acesso da `72`".
- Problema, em três partes:
  1. `isAccessDenied` (`packages/core/src/hooks/useStoreOverview.ts:24-25`) só testa `erro.code === ACCESS_DENIED_CODE` (`'42501'`). O erro de `functions.invoke` para uma resposta 401/403 é um `FunctionsHttpError` com o status em `context`, sem `code`. Aplicada a ele, a função devolve `false`.
  2. `requireAdmin` (`supabase/functions/_shared/auth.ts:45-46` e `:59-75`) devolve **403 também quando a RPC `has_role` erra**. Ler 403 como "não é admin" reproduz a recusa falsa por instabilidade, o defeito que a `72` fechou (`BL-048`, `adminStatus: 'unknown'`).
  3. 401 quer dizer "sem sessão" (`auth.ts:59`), e não "sem papel".
- O app já tem um molde para isso, e o design não o cita. `features/order-actions/api/gravarAcao.ts` converte a recusa no formato único do app (`Object.assign(new Error(...), { code: ACCESS_DENIED_CODE })`). Quando a resposta é ambígua, ele pergunta antes a `conferirPapel()` (`shared/api/lerComPapel.ts`): `42501` vira recusa, papel de pé vira outro desfecho, e falta de rede vira falha, nunca recusa.
- Cenário: quem implementa segue a frase ao pé da letra. Ou nenhuma recusa da porta chega ao episódio da `72`, e a conta que perdeu o papel vê "Não consegui ativar os avisos. Tente de novo." para sempre. Ou a task mapeia "403 ⇒ recusa", e um soluço do banco na `has_role` leva a Adri à tela de acesso restrito. Nos dois casos `MAN-16`/`MAN-23` e a regra "rede nunca é recusa" ficam sem dono no design.
- Sugestão: escrever em §4.5 a tradução por extenso. 403 da porta ⇒ `conferirPapel()`: `42501` lança a recusa no formato `{ code: ACCESS_DENIED_CODE }`, papel de pé vira `erro` com a frase da ação, e falta de rede também vira `erro`. 401 fica a cargo do `AuthProvider`/`RequireAdmin`, sem recusa própria. Rede vira `erro`. Prever no plano de testes o par "403 com papel de pé ⇒ não é recusa", no molde de `acoesComClientReal.test.tsx`.

### R2 — Pôr o estado antes de `invalid_from` muda a saída de `forEvent` para os eventos sem push (menor)
- Onde: `design.md` §4.2, `forEvent`: "1. **Comum**: `orderStateFailure` … 2. **Metade e-mail** … `invalid_from` …", com a afirmação "Para todo evento sem push … a saída de `forEvent` é a de hoje, elemento por elemento". Hoje (`send-notification/dispatch.ts`, `forEvent`) `invalid_from` vem **antes** de `preconditionFailure`.
- Problema: quando o remetente é inválido **e** o estado não casa, hoje sai `{ channel: 'email', reason: 'invalid_from' }`; com a nova ordem sai `{ channel: null, precondition: … }`. A afirmação "elemento por elemento" fica falsa nessa combinação. `dispatch.test.ts:185` provavelmente continua verde porque a fixture tem estado válido, e é por isso que a suíte não acusaria a mudança.
- Sugestão: declarar a mudança como intencional, com um caso de teste, ou manter `invalid_from` antes do estado dentro da metade e-mail e conferir o estado de novo na metade push.

### R3 — A tabela de erros (§5) ficou com a resposta antiga para exceção no ramo push (menor)
- Onde: `design.md` §5, "Exceção no ramo push | O `catch` de `run` (contrato "nunca lança")". Em §4.2 o design passou a usar um `try/catch` próprio que devolve `reason: 'unexpected_error'` (o R7 da r1).
- Problema: as duas seções se contradizem, e a tabela descreve justamente o comportamento que a r1 apontou como defeito (zera `results` e faz `found: false`).
- Sugestão: alinhar a linha de §5 com §4.2.

### R4 — `claim_push_test` tem duas assinaturas e uma ordem ambígua (menor)
- Onde: §4.3 descreve `claim_push_test(p_user_id)`; §4.4 declara `claim_push_test(p_user_id uuid, p_endpoint text)`. A regra diz "grava `last_test_at = now()` na linha do endpoint e devolve `false` se alguma linha da conta tem `last_test_at` dentro de 30 s".
- Problema: lida na ordem escrita (grava, depois confere), a função sempre acha a própria linha recém-gravada e devolve `false`. A assinatura também diverge entre as duas seções, e a lista literal de `marcacaoSoPorAcao` e o `it.each` dependem dela.
- Sugestão: uma assinatura só (`(uuid, text)`) e a ordem explícita: lock, conferir, gravar só se passou, devolver.

### R5 — `notificationclick`: `navigate` em janela não controlada rejeita (menor)
- Onde: §4.5, `sw-avisos.js`: `clients.matchAll({ type: 'window', includeUncontrolled: true })` → `focus()` + `navigate(url)`.
- Problema: `WindowClient.navigate` só funciona em cliente controlado por este service worker. Com `includeUncontrolled: true` pode vir uma janela não controlada, e a promessa rejeita. O `registerType: "autoUpdate"` (`apps/mobile-adm/pwa.config.ts:19`) torna isso raro, mas não impossível (primeira carga, SW atualizado).
- Sugestão: preferir cliente com `url` na mesma origem; se `navigate` rejeitar, cair em `clients.openWindow(url)`. Incluir o caso no teste de `vm` (R10 de §7).

## Conferido sem achado
- `@negrel/webpush@0.5.0` no JSR exporta `generateVapidKeys`, `exportVapidKeys`, `importVapidKeys`, `exportApplicationServerKey`, `ApplicationServer` e `PushMessageError.isGone()`, e nenhuma assinatura aceita `AbortSignal`. Isso bate com §4.2, §8 e o risco R3 de §7.
- `finish_order_notification(p_id, p_provider_message_id, p_error)` (chamado por `finish()` em `dispatch.ts`) aceita gravar a contagem `push:X/Y` em `provider_message_id` com `p_error = null`. A correção de R1 da r1 é viável.
- `fireTrigger` (`mercado-pago/handlers.ts:98`) é chamado pelo `create-payment` (:884) e pelo webhook (:1089). Com o repasse de `push` descrito em §4.2, os dois caminhos ficam cobertos, e a prova por comportamento nos dois está prevista.
- `MIN_SEND_MS`, `DEFAULT_BUDGET_MS`, `SendResult` (com `channel: string`) e `SkipReason` existem em `dispatch.ts`. `no_device` precisa entrar em `SkipReason`, o que é aditivo.
- A porta `send` (`send-notification/handlers.ts:97-112`) repassa `channel` a `dispatchEventFull`. Recusar `push` com 400, como propõe §4.1, fecha o reenvio de push.
- `buildHistory` (`core/orders/history.ts`): `rotuloDoCanal` só conhece `whatsapp`/`email`, e o título de falha e o detalhe `'A cliente NÃO foi avisada'` são genéricos. A mudança de §4.1 (canal `Celular`, título próprio, sem `emailType`) cabe na função. `OrderHistory.tsx:112` só desenha "Reenviar" com `ev.emailType`. O painel lê `order_notifications` com `select('*')` (`useAdminOrder.ts:181`), então `provider_message_id` já chega. O app usa `COLUNAS_DAS_NOTIFICACOES` (`usePedido.ts:62`), e o design marca esse ponto como a conferir na task, o que é correto.
- `NOTIFICATION_CHANNELS`/`NotificationChannel` (`settings.ts:13-17`) são usados só nos tipos de provider e de `copy.ts`. Acrescentar `'push'` alarga o tipo sem mudar o comportamento de nenhum leitor.
- `PUSH_EVENTS` "na ordem de `NOTIFICATION_EVENTS`" (`events.ts:40-43`: received, paid, rejected, material_incoming) dá a ordem de `MAN-40`.
- `widgets/account-menu` existe no app. `/avisos` sob o `RequireAdmin` com `ROTAS_DA_CONTA` em `abasSaoAsRotas` é coerente com os guardas da `72`.
- `has_role` é chamado pelo motor com o client service-role, como `requireAdmin` já faz. As RPCs que o ramo push chama já estão em `marcacaoSoPorAcao`, e `claim_push_test` entra nele.
- Todo requisito MAN-01..42 tem lugar no design. Os emendados (`MAN-09`, `MAN-24`, `MAN-35`, `MAN-42`) estão refletidos na `spec.md`. Nada no design vai além do escopo.

## Resposta do autor

Todos aceitos e aplicados no `design.md` (2026-10-25), conferidos no código antes:

- **R1** (confirmado: `gravarAcao.ts:41-51` e `lerComPapel.ts:62`) → §4.5 escreve a tradução: o status 401/403 nunca decide sozinho; a porta pergunta a `conferirPapel()` e só a recusa dela (`42501`) vira recusa, no formato único (`recusa()` levado a um helper compartilhado em `shared/api/`, não copiado); papel de pé, rede ou 5xx ⇒ falha. Casos obrigatórios listados, incluindo o par "403 com papel de pé não é recusa" e o mutante "403 ⇒ recusa direta".
- **R2** → a metade e-mail é o `forEvent` de hoje na mesma ordem (`invalid_from` antes do estado); a metade push confere o estado por conta própria. A afirmação "idêntica em todo caso" volta a ser verdadeira, combinação de falhas inclusive.
- **R3** → §5 corrigida para o `try/catch` próprio do ramo push.
- **R4** → assinatura única `(p_user_id uuid, p_endpoint text) returns boolean`, e a ordem trava → confere → grava.
- **R5** → `navigate()` rejeitado cai em `openWindow`; o teste do service worker cobre os três casos.
