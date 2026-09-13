# Checkout sem conta — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implemente estas tasks com a skill `tlc-spec-driven`: **ative-a pelo nome** e siga o fluxo de Execute
e as Critical Rules dela. Não procure os arquivos da skill por caminho de sistema.

**Se a skill não puder ser ativada, PARE e avise — não siga sem ela.**

---

**Design**: `.specs/features/49-checkout-sem-conta/design.md`
**Status**: In Progress

---

## Progresso

Medido por workspace, um por vez, com exit code capturado **fora de pipe**.

| Task | Estado | Contagem depois |
| --- | --- | --- |
| T1 `resolveCheckoutIdentity` | ✅ | core 2216/86 (era 2199/84) |
| T2 `guestAccess` | ✅ | core 2229/87 |
| T3 identidade em `isContactComplete` | ✅ | core 2235/87 · store 3128/203 · `tsc` 0 |
| T4 migration `49` + guarda | ✅ | store +24 · **migration aplicada e provada no banco local** |
| T5 `_shared/http.ts` | ✅ | functions 443/9 (era 436/8) |
| T6 function `checkout` + `identify` | ✅ | functions 463/10 |
| T7 `create-order` | ✅ | functions 495/11 |
| T8 `get-order` | ✅ | functions 503/12 |
| T9 `create-payment` aceita o token | ✅ | functions 512/12 |
| T10 `buildOrderPayload` | ✅ | store (checkout) 364/16 |
| T11 `useCreateOrder` pela function | ✅ | store 405/20 · `tsc` 0 |
| T12 guarda do gravador único | ✅ | +8 |
| T13 `orderAccess` + guarda da chave | ✅ | +15 |
| T14 `useOrder` da convidada + confirmação | ✅ | +11 · +6 na confirmação |
| T15 o portão cai | ✅ | `CheckoutPage.test.tsx` 80/80 |
| T16 `SignInInvite` | ✅ | +9 no componente, +3 de fiação na página |
| T17 `useAccountLookup` | ✅ | +16 |
| T18 desafio inline | ✅ | +8 no componente, +7 na página, +5 no guarda |
| T19 identidade muda ⇒ invalida | ✅ | página 93/93 |
| T20 registro | ✅ | documentação e baselines |

### Achados que viraram trabalho fora do plano

- **`CSC-05` seria FALSO sem uma peça que o plano não tinha.** A aprovação do PIX é detectada por
  **Supabase Realtime**, e Realtime respeita RLS: a única policy de `SELECT` em `orders` é
  `TO authenticated` (conferido no banco). A convidada é `anon` — o canal conecta, o filtro casa e o
  payload **nunca chega**, sem erro nenhum. Ela pagaria e ficaria na tela do QR para sempre.
  Consertado com uma espera de 5s pela **mesma porta** da confirmação (`fetchGuestOrder`), ativa só
  quando há token. Cinco casos novos, incluindo o par inverso (quem tem sessão não pergunta) e a
  parada no desmonte.
- **`useCreatePayment` precisava ENVIAR o token**, e o plano só previa o servidor aceitá-lo. Sem
  isso, `create-payment` responderia 403 para toda convidada.
- **`CSC-08` também seria falso** sem o recuo do pagador para `orders.customer_document`: pedido
  órfão tem `customer_id` nulo, `buildPayer` não acharia CPF e o pagamento seria recusado com 422
  por falta de um documento que a cliente já tinha informado.

### Desvios do plano, declarados

- **T1 ganhou um guarda que o plano não previa** (`denoReach.test.ts`, 8 casos). O critério "todo
  especificador relativo leva `.ts`" não tinha asserção nenhuma — e é exatamente o que derruba a
  edge function em runtime sem teste acusar (feature `33`). O **barrel** ficou fora do escopo, com
  a razão escrita no arquivo: torná-lo alcançável arrastaria `core/validators` inteiro.
- **T5 unificou TRÊS declarações, não uma.** `corsHeaders` estava escrito em `melhor-envio`,
  `mercado-pago` **e** `send-notification`. Unificar só uma delas deixaria o defeito de pé com a
  aparência de resolvido.
- **T6 criou `core/validators/email.ts`**, que o plano não previa. O padrão do e-mail já estava
  escrito duas vezes (`blocks.ts` e `AuthContext.tsx`) e a function seria a terceira — e a mais
  cara, porque é ela que decide se o pedido é gravado. `packages/auth` **continua com a cópia
  inline**: registrado para o T20, fora do alcance desta feature.

### Achados de medição

- **A suíte da LOJA também precisa de `--testTimeout=20000`**, não só a do backoffice. Sem ele, seis
  casos reprovam por `Test timed out in 5000ms` em três arquivos que varrem disco (`routes`,
  `accentText`, `touchTarget`), e **o arquivo muda a cada execução** — a assinatura de contenção. Com
  o teto maior: **3128/203, exit 0**. O `CLAUDE.md` documenta isso só para o painel; entra na T20.
- **O guarda da T1 reprovou o próprio arquivo que estava certo**, porque o cabeçalho de
  `identity.ts` cita `from './types'` em prosa. É a régua que casa **menção** em vez de **uso** —
  consertada com remoção de comentário de linha e de bloco na mesma varredura, com sensor de CRLF.

---

## Test Coverage Matrix

> Gerada do código, das diretrizes do projeto e da spec — confirmar antes do Execute.
> **Diretrizes encontradas**: `CLAUDE.md` (raiz — baselines, regras de medição, a tabela de guardas
> e a regra de âncora dupla + sensor), `apps/store/CLAUDE.md`, `supabase/CLAUDE.md`,
> `packages/core/CLAUDE.md`, `.specs/STATE.md` (`AD-004`, `AD-012`), `vitest.config.ts` de cada
> workspace.

| Camada | Tipo exigido | Expectativa de cobertura | Onde mora | Comando |
| --- | --- | --- | --- | --- |
| Domínio puro — `packages/core/src/**` | unit | todos os ramos; **1:1 com as ACs**; cada borda listada tem caso | `packages/core/src/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Handler de edge function — `supabase/functions/**/handlers.ts` | integration (vitest, `Deps` dublê — `AD-004`) | cada ação: caminho feliz + **cada** borda + **cada** falha; nenhuma ação sem caso de recusa | `supabase/functions/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/functions test` |
| Migration — `supabase/migrations/*.sql` | unit (guarda que lê o `.sql` do disco) | **um invariante = uma asserção + um sensor por mutação**; âncora de contagem obrigatória | `apps/store/src/shared/lib/__tests__/*.test.ts` | `pnpm --filter @estrelinha/store test` |
| Hook / model / lib da loja | unit | todos os ramos; 1:1 com as ACs; falha de rede e storage bloqueado incluídos | `apps/store/src/**/__tests__/*.test.ts(x)` | `pnpm --filter @estrelinha/store test` |
| UI da loja (`**/ui`, `pages`) | unit (RTL + jsdom) | cada AC observável no DOM; **fiação provada renderizando a página real**, nunca uma árvore montada no teste | `apps/store/src/**/__tests__/*.test.tsx` | `pnpm --filter @estrelinha/store test` |
| Guarda de dono único (lê o disco) | unit | **âncora dupla** (arquivos lidos **e** ocorrências encontradas) + **≥1 sensor por forma recusada**, incluindo remoção de comentário com CRLF e LF | `apps/store/src/shared/lib/__tests__/*.test.ts` | `pnpm --filter @estrelinha/store test` |
| Config (`supabase/config.toml`, `.env.example`) | none | portão de build. O invariante que importa (`verify_jwt = false` na function nova) vira **asserção** dentro do guarda da própria function | — | — |
| Prova de gravação real (`AD-012`) | probe HTTP (fora da suíte) | pedido criado **com** e **sem** JWT, e as linhas conferidas em `orders`, `order_items`, `customers` e `auth.users` | registrada em `.specs/features/49-checkout-sem-conta/validation.md` | `curl` + `psql` contra o Supabase local (API em 54341) |

> **jsdom devolve 0 para toda medida de layout.** Nenhuma asserção desta feature pode depender de
> largura, altura, rolagem ou sobreposição. `ENT-07` é provado por **token exato de classe**
> (`min-h-11`, e não `h-11`, que é substring dele) — a medida real é dívida declarada.

## Gate Check Commands

> Geradas do código — confirmar antes do Execute.

| Nível | Quando | Comando |
| --- | --- | --- |
| **Quick** | task que mexeu em **um** workspace | `pnpm --filter @estrelinha/<workspace> test` — **um workspace por vez**, e o exit code capturado **fora de pipe** |
| **Full** | task que cruza workspaces, ou que mexe em tipo compartilhado | os workspaces tocados, um por vez, **mais** `npx tsc --noEmit -p apps/store/tsconfig.app.json` |
| **Build** | fim de fase e fecho da feature | `pnpm build` (dois apps) + `pnpm lint` + os **cinco** workspaces um por vez (backoffice com `--testTimeout=20000`) + `git diff --name-only` provando `packages/core/src/payment/**` intocado |

> **Três armadilhas de medição, do `CLAUDE.md`:** `pnpm build` **não** faz typecheck; `pnpm lint`
> **não** olha `packages/`; e `pnpm test | tail` devolve o exit code do `tail`, não o da suíte.
> **A baseline é remedida na abertura**, nunca copiada — três features seguidas acharam linha velha.

---

## Execution Plan

### Fase 1: A regra pura (core)

```
T1 → T3
T2
```

### Fase 2: O banco

```
T4
```

### Fase 3: A porta nova

```
T5 → T6 → T7 → T8
```

### Fase 4: O caixa aceita a convidada

```
T9
```

### Fase 5: A loja grava pelo caminho novo

```
T10 → T11 → T12
T13 → T14
```

### Fase 6: O portão cai e o convite entra

```
T15 → T16 → T17 → T18 → T19
```

### Fase 7: Registro

```
T20
```

---

## Task Breakdown

> ⚠️ **Os `Commit:` abaixo NÃO são commits atômicos por task.** O `CLAUDE.md` da raiz sobrepõe, por
> escrito, o comportamento padrão da skill: *"**não** criar commits atômicos em pequenos pedaços
> durante a implementação. Aguardar a conclusão e gerar os commits completos da implementação de uma
> vez"* — decisão do usuário que fechou a `BL-012` em 2026-08-15, com o custo declarado e aceito
> (perde-se a correspondência 1:1 entre commit e "done when", e o `git bisect` passa a apontar para
> um commit com várias tasks).
>
> **O que continua valendo por task é o GATE**, que é o que a skill trata como inegociável: teste
> escrito, suíte verde e contagem conferida antes de seguir. As linhas `Commit:` são as **mensagens**
> que serão produzidas, agrupadas por fase, no fecho.

### T1: `resolveCheckoutIdentity` — a pergunta com um dono só

**What**: função pura que responde `session` / `guest` / `challenge`, e a recusa legível.
**Where**: `packages/core/src/checkout/identity.ts` (+ export no barrel `index.ts`)
**Depends on**: None
**Reuses**: o formato de recusa de `menuTargetRefusal` (`string | null`)
**Requirement**: `IDN-02`, `IDN-08`

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] `CheckoutIdentity` discrimina por **literal de string** (`kind`), nunca por booleano
- [ ] `checkoutIdentityRefusal` devolve `string | null` — sem ramo de `else` para esquecer
- [ ] **Todo** especificador relativo do arquivo e do barrel leva `.ts` explícito, `import type` incluso
- [ ] Gate quick passa: `pnpm --filter @estrelinha/core test`
- [ ] Test count: +6 casos (sessão · convidada · desafio · recusa nula nos dois primeiros · recusa com texto no terceiro)

**Tests**: unit · **Gate**: quick
**Commit**: `feat(core): a identidade do checkout tem um dono só`

---

### T2: `guestAccess` — o token de posse do pedido

**What**: gerar token, derivar o hash e conferir posse + validade.
**Where**: `packages/core/src/checkout/guestAccess.ts`
**Depends on**: None
**Reuses**: Web Crypto (existe em Deno e no vitest)
**Requirement**: `PED-05`, `PED-07`

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] `newAccessToken()` devolve 32 bytes em base64url, e dois valores seguidos **diferem**
- [ ] `hashAccessToken()` é estável para a mesma entrada e muda com um caractere
- [ ] `accessGrant()` recusa hash diferente, recusa token válido **expirado**, e aceita o par certo
- [ ] O texto puro do token **não** aparece em nenhum retorno destinado a persistência
- [ ] Gate quick passa · Test count: +8

**Tests**: unit · **Gate**: quick
**Commit**: `feat(core): o token de posse do pedido de convidada`

---

### T3: o desafio pendente entra em `isContactComplete`

**What**: `isContactComplete` e `resolveFlow` passam a receber a identidade; contato com desafio
pendente **não** completa.
**Where**: `packages/core/src/checkout/{blocks.ts,types.ts}` + o único chamador,
`apps/store/src/pages/CheckoutPage.tsx`
**Depends on**: T1
**Reuses**: `resolveFlow` inteiro — a regra entra **dentro** dele, não ao lado
**Requirement**: `IDN-04`

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] O parâmetro novo é **obrigatório** — o `tsc` acha todo chamador; opcional com default silencioso é como se ganha um segundo dono
- [ ] `kind: 'challenge'` ⇒ `contact` fora de `complete` ⇒ CTA desabilitado, provado pelo `flow`
- [ ] `kind: 'session'` e `kind: 'guest'` deixam a régua **idêntica** à de hoje (caso inverso)
- [ ] `CheckoutPage` passa `{ kind: user ? 'session' : 'guest' }` — comportamento **inalterado** nesta task
- [ ] Gate full passa (core + store + `tsc`) · Test count: core +4, store sem queda

**Tests**: unit · **Gate**: full
**Commit**: `feat(core): desafio pendente impede o contato de completar`

---

### T4: a migration da `49` e o guarda que a lê do disco

**What**: três colunas em `orders`, o índice parcial único, `account_exists`, e o guarda.
**Where**: `supabase/migrations/2026MMDDHHMMSS_49-checkout-sem-conta.sql` +
`apps/store/src/shared/lib/__tests__/checkoutSchema.test.ts`
**Depends on**: None
**Reuses**: molde de `menuSchema.test.ts` (âncora dupla + sensor por mutação)
**Requirement**: `PED-04`, `PED-05`, `IDN-08`

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] `client_request_id`, `guest_access_hash`, `guest_access_expires_at` adicionados com `if not exists`
- [ ] Índice único **parcial** (`where client_request_id is not null`), recriado por `if not exists`
- [ ] `account_exists(text)` é `security definer`, `set search_path = ''`, compara por `lower()`
- [ ] `revoke execute` de `public`/`anon`/`authenticated` e `grant` **só** a `service_role`
- [ ] A migration é **aditiva e idempotente** — nenhum `insert`/`update`/`delete` de dado
- [ ] O guarda assere que `customer_directory` (migration `35`) **ainda** exclui e-mail já presente em `customers` — sem isso a convidada vira **duas linhas** na tela de Clientes a partir desta feature
- [ ] **Âncora dupla**: arquivos lidos **e** invariantes encontrados; **um sensor por asserção**, injetado no arquivo real
- [ ] Gate quick passa (store) · Test count: +12

**Tests**: unit (guarda que lê o disco) · **Gate**: quick
**Commit**: `feat(db): as colunas de acesso da convidada e a pergunta "tem conta?"`

---

### T5: `corsHeaders`/`json` passam a ter um dono só

**What**: extrair para `_shared/http.ts`; `mercado-pago/handlers.ts` **reexporta** em vez de declarar.
**Where**: `supabase/functions/_shared/http.ts`, `supabase/functions/mercado-pago/handlers.ts`
**Depends on**: None
**Reuses**: o padrão de delegação do `AD-030` (`menuBannerArt` delegando a `surfaceArt`)
**Requirement**: infraestrutura de `PED-01`

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] `mercado-pago` continua **exportando** `corsHeaders` e `json` (nada que os importa quebra)
- [ ] Caso que prova a **identidade**: o objeto exportado pelo MP é o mesmo de `_shared/http.ts`
- [ ] Nenhuma outra linha de `mercado-pago/handlers.ts` mudou — provado por `git diff`
- [ ] Gate quick passa (functions) · Test count: +2

**Tests**: integration · **Gate**: quick
**Commit**: `refactor(functions): cabeçalho CORS com um dono só`

---

### T6: a function `checkout` e a ação `identify`

**What**: wiring + roteamento + a ação que responde "este e-mail tem conta?", com teto por IP.
**Where**: `supabase/functions/checkout/{index.ts,handlers.ts,__tests__/handlers.test.ts}` +
`supabase/config.toml`
**Depends on**: T1, T4, T5
**Reuses**: molde de `mercado-pago` (`AD-004`: wiring sem lógica, `Deps` por parâmetro)
**Requirement**: `IDN-01`, `IDN-09`

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] `index.ts` só tem env, client real e `Deno.serve` — zero regra
- [ ] `identify` responde `{ registered: true }` e `{ registered: false }` pelos dois caminhos de `account_exists`
- [ ] E-mail em branco ou sem formato ⇒ **400**, sem consultar o banco
- [ ] A 21ª chamada do mesmo IP em 5 minutos ⇒ **429** (teto declarado na spec)
- [ ] `preflight` OPTIONS responde com os headers de `_shared/http.ts`
- [ ] O guarda assere `[functions.checkout] verify_jwt = false` **lendo o `config.toml` do disco**
- [ ] Gate quick passa (functions) · Test count: +10

**Tests**: integration · **Gate**: quick
**Commit**: `feat(functions): a porta do checkout e a pergunta do e-mail`

---

### T7: a ação `create-order` — o dono único de "como nasce um pedido"

**What**: gravar pedido e itens, resolver identidade, criar a conta da convidada e devolver o acesso.
**Where**: `supabase/functions/checkout/handlers.ts` (+ testes)
**Depends on**: T1, T2, T4, T6
**Reuses**: `resolveCheckoutIdentity`, `guestAccess`, `handle_new_customer` (que já cria a ficha)
**Requirement**: `PED-01`, `PED-02`, `PED-04`, `PED-05`, `PED-08`, `PED-09`, `CSC-04`, `CSC-07`, `CSC-08`, `IDN-08`, `ADR-G1`, `ADR-G2`

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] **A ordem é asserção, não comentário**: identidade → (recusa) → `orders`+`order_items` → conta → vínculo → cpf/endereço
- [ ] Com JWT válido ⇒ `customer_id` é o `customers` daquele usuário (`PED-02`)
- [ ] Sem JWT e e-mail **com** conta ⇒ 409 legível **e zero linha gravada** — asserção sobre a contagem de `orders`, não só sobre o status (`IDN-08`)
- [ ] Sem JWT e e-mail livre ⇒ pedido gravado, conta criada com `email_confirm: false` e `user_metadata.full_name`, e `orders.customer_id` ligado a ela (`CSC-07`)
- [ ] **Falha ao criar a conta ⇒ o pedido continua gravado, pagável e órfão** (`CSC-08`) — e o token de acesso **é devolvido assim mesmo**
- [ ] Mesmo `client_request_id` duas vezes ⇒ **mesmo** `order_id`, **mesmo** acesso, e nenhuma segunda conta (`PED-04`)
- [ ] `createUser` falhando por e-mail já existente (corrida) ⇒ reaproveita a conta, nunca falha a venda (`PED-09`)
- [ ] CPF vai para `customers.cpf` para **convidada e logada** — `buildPayer` continua com uma fonte só (`PED-08`)
- [ ] Endereço gravado; falha dele **não** derruba o pedido (`ADR-G2`)
- [ ] O log registra ação, `order_id` e `session|guest` — e **nunca** o token nem o código
- [ ] Gate quick passa (functions) · Test count: +24

**Tests**: integration · **Gate**: quick
**Commit**: `feat(functions): o pedido nasce num lugar só`

---

### T8: a ação `get-order`

**What**: devolver o pedido a quem apresenta o token daquele pedido.
**Where**: `supabase/functions/checkout/handlers.ts` (+ testes)
**Depends on**: T2, T4, T6
**Reuses**: `guestAccess.accessGrant`
**Requirement**: `CSC-06`, `PED-07`

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] Token certo ⇒ o pedido com os itens
- [ ] Token de **outro** pedido ⇒ 403 (o caso que uma comparação frouxa deixaria passar)
- [ ] Token expirado ⇒ 403
- [ ] Sem token ⇒ 403, e **nada do pedido** no corpo da resposta de erro
- [ ] Gate quick passa (functions) · Test count: +8

**Tests**: integration · **Gate**: quick
**Commit**: `feat(functions): a convidada lê o próprio pedido`

---

### T9: `create-payment` aceita a segunda prova de posse

**What**: o ownership passa a ser "JWT do dono **ou** token daquele pedido".
**Where**: `supabase/functions/mercado-pago/handlers.ts` (bloco de ownership) + testes
**Depends on**: T2, T4
**Reuses**: `guestAccess.accessGrant`. `buildPayer`, preço e webhook **intocados**
**Requirement**: `PED-06`, `PED-07`

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] JWT de dono continua passando — **caso inverso obrigatório**, senão afrouxar a regra passa verde
- [ ] JWT de **outro** usuário continua 403
- [ ] Token certo, sem JWT nenhum ⇒ passa
- [ ] Token errado / expirado / de outro pedido ⇒ 403
- [ ] Pedido fora de `RETRYABLE_STATUSES` ⇒ 409 **mesmo com token válido** (`PED-07`)
- [ ] `git diff` prova que `packages/core/src/payment/**` não teve linha alterada
- [ ] Gate quick passa (functions) · Test count: +10

**Tests**: integration · **Gate**: quick
**Commit**: `feat(functions): o caixa aceita quem paga sem sessão`

---

### T10: `buildOrderPayload` — tirar a montagem de dentro do `handleConfirm`

**What**: extrair para função pura a montagem de `orderItems` e do corpo do pedido.
**Where**: `apps/store/src/features/checkout/lib/buildOrderPayload.ts`
**Depends on**: None
**Reuses**: o código que hoje vive em `CheckoutPage.tsx:300-420`, movido sem mudança de regra
**Requirement**: mitigação declarada no design (`handleConfirm` faz sete coisas)

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] Item com variação congela `price_source: 'variant'`; sem variação, `'base'`
- [ ] O bump entra com `requires_material: false` e `material_kinds: []`
- [ ] `requires_material`/`material_kinds` saem do **snapshot do carrinho**, nunca de releitura
- [ ] `address_zip` sai com 8 dígitos, sem máscara (`ADR-05`)
- [ ] `CheckoutPage` passa a chamar a função — **nenhuma** mudança de comportamento nesta task
- [ ] Gate quick passa (store) · Test count: +10

**Tests**: unit · **Gate**: quick
**Commit**: `refactor(loja): a montagem do pedido sai do meio do CTA`

---

### T11: `useCreateOrder` passa a falar com a function

**What**: trocar o `insert` do PostgREST por `functions.invoke`, com `client_request_id`.
**Where**: `apps/store/src/entities/order/api/useOrders.ts`,
`apps/store/src/features/checkout/model/checkoutStore.ts`
**Depends on**: T7, T10
**Reuses**: a mesma forma de entrada de hoje (`CreateOrderInput`)
**Requirement**: `PED-01`, `PED-04`, `CSC-03`

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] Com sessão, a chamada leva o `Authorization` do client; sem sessão, não leva
- [ ] `client_request_id` nasce uma vez por tentativa e **sobrevive à retentativa** no store
- [ ] 409 `needs_otp` vira um erro **distinguível** dos demais para a tela poder reagir
- [ ] Sucesso de convidada guarda o acesso devolvido (via T13 quando existir; nesta task, exposto no retorno)
- [ ] Gate full passa (store + `tsc`) · Test count: +12

**Tests**: unit · **Gate**: full
**Commit**: `feat(loja): o pedido passa a nascer pela function`

---

### T12: o guarda de que `apps/**` não grava pedido

**What**: recusar `from('orders').insert` e `from('order_items').insert` em `apps/**`.
**Where**: `apps/store/src/shared/lib/__tests__/pedidoComDonoUnico.test.ts`
**Depends on**: T11
**Reuses**: molde de `categoryTreeSingleOwner.test.ts` (zero allowlist, âncora dupla)
**Requirement**: `PED-03`

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] Varre `apps/store/**` **e** `apps/backoffice/**`, com os diretórios escritos **literalmente** — a régua nunca é o objeto medido
- [ ] **Âncora dupla**: arquivos lidos **e** chamadas a `from('orders')` encontradas (a leitura continua existindo)
- [ ] Remoção de comentário de **linha e de bloco na mesma varredura**, provada com CRLF e com LF
- [ ] Sensor: injetar um `insert` real num arquivo real reprova; removê-lo passa
- [ ] Sensor inverso: `from('orders').select(...)` **não** é acusado
- [ ] Gate quick passa (store) · Test count: +8

**Tests**: unit (guarda) · **Gate**: quick
**Commit**: `test(loja): o pedido tem um gravador só`

---

### T13: `orderAccess` — o dono único da chave no navegador

**What**: guardar, ler e esquecer `estrelinha-order-access`, num lugar só.
**Where**: `apps/store/src/entities/order/model/orderAccess.ts` +
`apps/store/src/shared/lib/__tests__/orderAccessSingleOwner.test.ts`
**Depends on**: None
**Reuses**: o padrão de `try/catch` em toda leitura de storage (`navRail.test.ts`)
**Requirement**: `CSC-06`, `PED-05`

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] `localStorage` que **lança** devolve `null` e não derruba nada
- [ ] Valor de lixo no storage não vira um terceiro estado
- [ ] Guarda: nenhum outro arquivo de `apps/**` cita a chave literal, com âncora dupla e sensor
- [ ] Gate quick passa (store) · Test count: +9

**Tests**: unit · **Gate**: quick
**Commit**: `feat(loja): o acesso ao pedido tem um guardião só`

---

### T14: `useOrder` lê o pedido da convidada, e a confirmação explica a expiração

**What**: ramo sem sessão no hook, e o estado "acesso expirado ⇒ entre por código" na página.
**Where**: `apps/store/src/entities/order/api/useOrder.ts`,
`apps/store/src/pages/OrderConfirmationPage.tsx`
**Depends on**: T8, T13
**Reuses**: `useOrder` como dono único de "como leio um pedido"
**Requirement**: `CSC-05`, `CSC-06`, edge case do acesso expirado

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] Com sessão ⇒ PostgREST, **exatamente** como hoje (caso inverso)
- [ ] Sem sessão e com token ⇒ `get-order`
- [ ] Sem sessão e sem token ⇒ "pedido não encontrado", **sem nada do pedido na tela**
- [ ] Acesso expirado ⇒ a página oferece entrar por código, não um erro seco
- [ ] Gate quick passa (store) · Test count: +11

**Tests**: unit · **Gate**: quick
**Commit**: `feat(loja): a convidada vê o próprio pedido`

---

### T15: o portão cai

**What**: remover o `useEffect` que abre o overlay, a tela "Faça login para continuar", o guard de
`customer?.id` e as gravações client-side de CPF e endereço.
**Where**: `apps/store/src/pages/CheckoutPage.tsx`
**Depends on**: T11
**Reuses**: nada — é remoção
**Requirement**: `CSC-01`, `CSC-02`, `CSC-03`

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] Sem sessão, a página renderiza os **três blocos** — asserção pelo DOM, não pela ausência do overlay
- [ ] `NO_CUSTOMER_MESSAGE` deixa de existir no arquivo e no teste
- [ ] `saveCpf`/`saveAddress` saem do caminho do CTA; se `useSaveCustomerCpf` ficar sem consumidor, **sai também**
- [ ] O teste que asseria a trava é **invertido**, não apagado — senão a suíte segue verde a favor do comportamento removido
- [ ] Carrinho vazio continua redirecionando para `/carrinho`, **sem sessão também**
- [ ] Gate full passa (store + `tsc`) · Test count: store não cai (conversões declaradas item a item)

**Tests**: unit · **Gate**: full
**Commit**: `feat(loja): o checkout deixa de exigir conta`

---

### T16: `SignInInvite` — o convite do board

**What**: a faixa "Já comprou aqui?" com o botão Entrar, acima do bloco Contato.
**Where**: `apps/store/src/features/checkout/ui/SignInInvite.tsx` + montagem em `CheckoutPage.tsx`
**Depends on**: T15
**Reuses**: `useAuthUiStore.open({ returnTo: '/checkout' })`, `AuthOverlay` já montado na página
**Requirement**: `ENT-01` … `ENT-07`

**Tools**: MCP `paper` (ler o board `EWX-0`, só para forma e espaçamento) · Skill NONE

**Done when**:
- [ ] Sem sessão renderiza; **com** sessão não renderiza (os dois casos)
- [ ] O clique abre o overlay com `returnTo: '/checkout'` — asserção sobre o store, não sobre pixel
- [ ] O botão tem `min-h-11` por **token exato** (`h-11` é substring de `min-h-11`)
- [ ] O ícone **não** é marca de provedor — asserção de que nenhum `<path fill="#4285F4">` entra
- [ ] Copy sem urgência fabricada: nenhum texto de tempo ou contagem
- [ ] A fiação é provada **renderizando `CheckoutPage`**, não montando o convite no teste
- [ ] Gate quick passa (store) · Test count: +9

**Tests**: unit · **Gate**: quick
**Commit**: `feat(loja): entrar sem sair do checkout`

---

### T17: `useAccountLookup` — a consulta do e-mail

**What**: perguntar à function se o e-mail tem conta, uma vez por e-mail normalizado.
**Where**: `apps/store/src/features/checkout/api/useAccountLookup.ts`
**Depends on**: T6
**Reuses**: React Query com `staleTime: Infinity` — a dedup é do cache, não de um `useRef`
**Requirement**: `IDN-01`, `IDN-09`

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] Dois blur no **mesmo** e-mail ⇒ **uma** requisição; e-mail diferente ⇒ outra
- [ ] `A@B.com` e `a@b.com` são a **mesma** chave
- [ ] Erro de rede e 429 ⇒ resolve `false` (`IDN-09`), sem derrubar a tela
- [ ] E-mail sem formato válido não gera requisição nenhuma
- [ ] Gate quick passa (store) · Test count: +8

**Tests**: unit · **Gate**: quick
**Commit**: `feat(loja): a loja reconhece o e-mail de quem já tem conta`

---

### T18: o desafio de código, dentro do bloco Contato

**What**: o aviso + `AuthCodeStep` inline, e a identidade real chegando ao `resolveFlow`.
**Where**: `apps/store/src/features/checkout/ui/CheckoutSignInChallenge.tsx`,
`apps/store/src/features/checkout/ui/ContactBlock.tsx`, `apps/store/src/pages/CheckoutPage.tsx`
**Depends on**: T3, T17
**Reuses**: `AuthCodeStep` **inteiro** — reenvio e cooldown de 60s vêm com ele
**Requirement**: `IDN-02` … `IDN-06`

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] E-mail com conta ⇒ o aviso e o campo de 6 dígitos aparecem **dentro** do bloco Contato
- [ ] O código é enviado **uma vez** ao montar, não a cada render
- [ ] Com o desafio pendente o CTA fica desabilitado — provado pela página real (`IDN-04`)
- [ ] Código aceito ⇒ desafio some, a pessoa vira sessão, **sem navegação** e com o rascunho intacto
- [ ] Trocar para e-mail sem conta ⇒ o desafio some e o caminho de convidada volta (`IDN-06`)
- [ ] Não existe um segundo campo de 6 dígitos na loja — guarda com âncora e sensor
- [ ] A fiação é provada **renderizando `CheckoutPage`** — apagar o desafio de lá tem de reprovar
- [ ] Gate full passa (store + `tsc`) · Test count: +16

**Tests**: unit · **Gate**: full
**Commit**: `feat(loja): o e-mail que já tem conta pede o código ali mesmo`

---

### T19: trocar de identidade invalida o pedido em curso

**What**: entrar, sair ou trocar o e-mail desafiado descarta o pedido `pending` já criado.
**Where**: `apps/store/src/pages/CheckoutPage.tsx` + `features/checkout/model/checkoutStore.ts`
**Depends on**: T18
**Reuses**: `invalidateOrder()` — a mecânica de `CHK-08`, inteira
**Requirement**: `IDN-07`

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] Pedido criado como convidada + entrar ⇒ o `orderId` em curso é descartado
- [ ] O caso inverso: **sem** troca de identidade, o `orderId` **sobrevive** (senão todo CTA recriaria pedido)
- [ ] Sair da sessão no meio do checkout também invalida
- [ ] Gate quick passa (store) · Test count: +6

**Tests**: unit · **Gate**: quick
**Commit**: `feat(loja): mudar de identidade descarta o pedido em curso`

---

### T20: o registro

**What**: baselines remedidas, guardas novos na tabela, `AD-035`, e as dívidas declaradas.
**Where**: `CLAUDE.md`, `apps/store/CLAUDE.md`, `supabase/CLAUDE.md`, `.specs/STATE.md`,
`.specs/BACKLOG.md`
**Depends on**: T19
**Reuses**: —
**Requirement**: o gate de fecho do `CLAUDE.md`

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] Baselines de teste **medidas**, um workspace por vez, exit code fora de pipe — nunca somadas
- [ ] Os guardas novos entram na tabela "O que trava o quê" com o que cada um derruba
- [ ] `AD-035` escrito em `.specs/STATE.md`, nomeando `AD-023` e dizendo **qual metade** foi estreitada
- [ ] `BACKLOG.md` recebe "derrubar as policies de `INSERT` em `orders`/`order_items`", com a janela de deploy explicada
- [ ] Dívidas declaradas: sem prova em navegador; a 2ª compra pede código; o menu de operação não muda
- [ ] Gate **build** passa: dois builds, lint, cinco workspaces um por vez, `git diff --name-only` de `payment/**`

**Tests**: none · **Gate**: build
**Commit**: `docs(49): baselines, guardas e a decisão da identidade da convidada`

---

## Phase Execution Map

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7

Fase 1:  T1 ──→ T3        T2
Fase 2:  T4
Fase 3:  T5 ──→ T6 ──→ T7 ──→ T8
Fase 4:  T9
Fase 5:  T10 ──→ T11 ──→ T12     T13 ──→ T14
Fase 6:  T15 ──→ T16 ──→ T17 ──→ T18 ──→ T19
Fase 7:  T20
```

Execução estritamente sequencial — sem paralelismo dentro da fase.

**Empacotamento**: 20 tasks ⇒ **3 lotes** (Fases 1–3 = 8 · Fases 4–5 = 6 · Fases 6–7 = 6).

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T1 | 1 módulo puro | ✅ |
| T2 | 1 módulo puro | ✅ |
| T3 | 1 assinatura + o único chamador | ✅ coeso |
| T4 | 1 migration + o guarda dela | ✅ coeso |
| T5 | 1 extração + 1 reexport | ✅ |
| T6 | 1 function + 1 ação | ✅ |
| T7 | 1 ação | ✅ (fatia grossa, mas indivisível: a ordem das escritas **é** o requisito) |
| T8 | 1 ação | ✅ |
| T9 | 1 bloco de ownership | ✅ |
| T10 | 1 função pura | ✅ |
| T11 | 1 hook + 1 campo de store | ✅ coeso |
| T12 | 1 guarda | ✅ |
| T13 | 1 módulo + 1 guarda | ✅ coeso |
| T14 | 1 hook + o estado de erro da página que o lê | ✅ coeso |
| T15 | 1 remoção numa página | ✅ |
| T16 | 1 componente | ✅ |
| T17 | 1 hook | ✅ |
| T18 | 1 componente + a fiação dele | ✅ coeso |
| T19 | 1 regra numa página | ✅ |
| T20 | documentação | ✅ |

---

## Diagram-Definition Cross-Check

| Task | `Depends on` (corpo) | Diagrama | Status |
| --- | --- | --- | --- |
| T1 | None | raiz da Fase 1 | ✅ |
| T2 | None | raiz solta na Fase 1 | ✅ |
| T3 | T1 | `T1 → T3` | ✅ |
| T4 | None | raiz da Fase 2 | ✅ |
| T5 | None | raiz da Fase 3 | ✅ |
| T6 | T1, T4, T5 | `T5 → T6` + fases 1 e 2 anteriores | ✅ |
| T7 | T1, T2, T4, T6 | `T6 → T7` + fases anteriores | ✅ |
| T8 | T2, T4, T6 | `T7 → T8` (ordem dentro da fase) + fases anteriores | ✅ |
| T9 | T2, T4 | Fase 4, depois das fases 1–2 | ✅ |
| T10 | None | raiz da Fase 5 | ✅ |
| T11 | T7, T10 | `T10 → T11` + Fase 3 anterior | ✅ |
| T12 | T11 | `T11 → T12` | ✅ |
| T13 | None | segunda raiz da Fase 5 | ✅ |
| T14 | T8, T13 | `T13 → T14` + Fase 3 anterior | ✅ |
| T15 | T11 | Fase 6, depois da Fase 5 | ✅ |
| T16 | T15 | `T15 → T16` | ✅ |
| T17 | T6 | Fase 6, depois da Fase 3 | ✅ |
| T18 | T3, T17 | `T17 → T18` + Fase 1 anterior | ✅ |
| T19 | T18 | `T18 → T19` | ✅ |
| T20 | T19 | Fase 7 | ✅ |

Nenhuma task depende de fase posterior. ✅

---

## Test Co-location Validation

| Task | Camada criada/alterada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T1 | domínio puro (`core`) | unit | unit | ✅ |
| T2 | domínio puro (`core`) | unit | unit | ✅ |
| T3 | domínio puro + página | unit | unit | ✅ |
| T4 | migration + guarda | unit (lê o disco) | unit | ✅ |
| T5 | handler de function | integration | integration | ✅ |
| T6 | handler de function + config | integration (config = none, vence o maior) | integration | ✅ |
| T7 | handler de function | integration | integration | ✅ |
| T8 | handler de function | integration | integration | ✅ |
| T9 | handler de function | integration | integration | ✅ |
| T10 | lib da loja | unit | unit | ✅ |
| T11 | hook + model | unit | unit | ✅ |
| T12 | guarda | unit | unit | ✅ |
| T13 | model + guarda | unit | unit | ✅ |
| T14 | hook + página | unit | unit | ✅ |
| T15 | página | unit | unit | ✅ |
| T16 | UI | unit | unit | ✅ |
| T17 | hook | unit | unit | ✅ |
| T18 | UI + fiação | unit | unit | ✅ |
| T19 | página + model | unit | unit | ✅ |
| T20 | documentação | none | none | ✅ |

Nenhuma violação. Nenhuma task adia teste para outra.

---

## O que NÃO fecha nenhuma task

- Teste que **mocka o client do Supabase** para provar gravação — é a forma exata do `AD-012`.
- Teste que **monta a própria árvore** para provar fiação — apagar o componente da página passaria verde.
- Asserção que é verdadeira **nos dois mundos** (ex.: `not.toThrow()` para provar limpeza de ouvinte).
- Guarda sem **âncora de contagem** — caminho errado varre zero arquivo e passa em silêncio.
- Queda de contagem de teste sem a contrapartida **nomeada item a item**.
