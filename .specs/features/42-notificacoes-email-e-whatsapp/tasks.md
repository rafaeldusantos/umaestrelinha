# 42 — Notificações por e-mail · Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source
of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier,
discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

**Sobreposição declarada pelo `CLAUDE.md` da raiz (vale sobre a Skill):**

- **Sem commit por task.** Os commits são gerados ao fim de cada **fase** (ou ao fim da feature),
  completos. A correspondência 1:1 commit × task foi trocada de propósito (`BL-012`, fechado).
- **Um workspace por vez** ao rodar testes, com exit code capturado **fora de pipe**.
- **Baseline medida na hora de escrever**, nunca de memória. A `41` está na árvore sem fecho: antes
  da T1, medir os cinco workspaces e anotar aqui (seção *Baseline de entrada*).

---

**Design**: `.specs/features/42-notificacoes-email-e-whatsapp/design.md`
**Status**: **Approved** — usuário, 2026-09-06. Ferramentas: Skill `supabase` (T4, T11), `playwright-cli` (T23), sem MCP. Execução por sub-agentes, um lote por vez (B1 = Phase 0 · B2 = 1a · B3 = 1b · B4 = 2+3).

---

## Test Coverage Matrix

> Gerada do repositório, das diretrizes do projeto e da spec — confirmar antes do Execute.
> Diretrizes encontradas: `CLAUDE.md` (raiz: "Os guardas", "Baselines", "Mobile é o caso principal",
> `AD-012`), `supabase/CLAUDE.md` (`AD-004`: handlers com deps injetadas, testados em vitest),
> `apps/store/vitest.config.ts` e `apps/backoffice/vitest.config.ts` (`test.env` fixando as envs do
> client), `.github/workflows/ci.yml` (`turbo run test --concurrency=1`). Nenhum threshold numérico
> de cobertura: a régua é **"sem regressão"** + guarda de disco com âncora para toda regra que não
> quebra build.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| `packages/core/src/notifications/**` (regra pura) | unit | **1:1 com os ACs** que a regra decide (eventos por gatilho, pré-condição, recusa de tom, variáveis, limites, telefone); todo edge case listado; **sensor embutido** onde houver régua (default com "corra" reprova); `purity.test.ts` | `packages/core/src/notifications/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| `supabase/functions/send-notification/**` e `mercado-pago/handlers.ts` | unit com dublês (`AD-004`) | happy + cada `skipped` + cada falha classificada + auth 401/401/403 + 400 + deadline + `preview` sem efeito; a bifurcação e a reentrega do webhook | `supabase/functions/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/functions test` |
| Migration `42-notificacoes.sql` | guarda de disco + **probe HTTP** (`AD-012`) | o guarda lê o `.sql` e compara com `NOTIFICATION_EVENTS`/`DEFAULT_NOTIFICATIONS`, **âncora dupla** e **sensor por mutação**; o probe grava e lê `order_notifications` e a view `order_emails` no banco local | `apps/store/src/shared/lib/__tests__/*.test.ts` + roteiro `curl` na task | `pnpm --filter @estrelinha/store test` + `curl` |
| Backoffice `entities/order/api/**`, `features/order-detail/**`, `features/notification-settings/**` | unit (RTL + vitest, client mockado) | cada AC de painel que jsdom alcança: forma, recusa inline, chamada certa à function, rótulos; **não** largura/scroll | `apps/backoffice/src/**/__tests__/*.test.ts(x)` e `*.test.tsx` ao lado | `pnpm --filter @estrelinha/backoffice test` |
| Store `useSetMaterialTracking`, `NewsletterBanner` | unit | a chamada `notify` contida (sucesso, falha, nunca lança); a copy | `apps/store/src/**/__tests__/*.test.ts(x)` | `pnpm --filter @estrelinha/store test` |
| Tela nova em 390×844 (aba Notificações) | **prova em navegador** | sem scroll horizontal do `body`, alvo ≥ 44 px, pílula sem embrulhar, prévia em 390 e 600 — capturas em `validation.md` | — | `pnpm dev:backoffice` + Playwright/DevTools |
| Config / wiring (`index.ts`, `.env.example`, `config.toml`, `CLAUDE.md`) | none | — (gate de build + guarda de domínio) | — | build gate |

## Gate Check Commands

> Gerados do repositório — confirmar antes do Execute. **Sempre um workspace por vez, exit code
> capturado** (`pnpm … test; echo EXIT=$?` — nunca `| tail`).

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | task que toca **um** workspace | `pnpm --filter @estrelinha/<w> test` (w ∈ core · functions · store · backoffice) |
| Full | task que toca app + core/functions | os workspaces tocados, um por vez, **+** `npx tsc --noEmit -p apps/<app>/tsconfig.app.json` para cada app tocado |
| Build | fim de fase | `pnpm build` · `pnpm lint` (comparar com 27/5) · os **cinco** workspaces um por vez · `npx tsc --noEmit` nos dois apps · `git diff --name-only <base> -- packages/core/src/payment supabase/functions/mercado-pago` (só `handlers.ts` e `index.ts` da `mercado-pago` podem aparecer; `payment/` **nunca**) |

### Baseline de entrada (preencher antes da T1)

| Workspace | Testes / arquivos | Medido em |
| --- | --- | --- |
| store | **2652 / 169** | 2026-09-06, HEAD `2370054`, um por vez, exit 0 |
| backoffice | **1996 / 119** | idem |
| core | **1811 / 70** | idem |
| functions | **370 / 7** | idem |
| catalog-import | **512 / 23** | idem |
| lint | **27 / 5** (backoffice 25/4 · store 2/1) | idem |
| tipos | **0 · 0** (store · backoffice) | idem |

Total **7341 em 388**. A `41` somou +247 sobre o número do `CLAUDE.md` (7094/381), que a `41` ainda
não atualizou — o fecho desta feature (T24) escreve o número medido, não o somado.

> **HEAD moveu durante a Phase 0** (B1, 2026-09-06): `2370054` → `b6abe64` (`fix(41)`: as três ressalvas da
> rodada 2). O commit trouxe **+12 no store** (5 em `surfaceArtSingleOwner`, 2 em `heroSemOpacidadeZero`,
> 5 em `heroCarouselSemOpacidadeZero`) e **+6 no backoffice**, contados pelo diff dos `it(`. A baseline
> que a Phase 0 compara é, portanto, **store 2664/169** e **backoffice 2002/119** — e os números medidos
> ao fim dela (store 2668/170 após T1, backoffice 2004/119 após T2) batem com essa conta. Core, functions e
> catalog-import não foram tocados pelo commit.

---

## Execution Plan

Fases em ordem; tasks em ordem dentro da fase.

### Phase 0: Base — a documentação e o painel param de mentir (FIX)

```
T1 → T2 → T3 → T4
```

### Phase 1a: A regra em `core` e a memória no banco

```
T5 → T6 → T7 → T8 → T9 → T10 → T11
```

### Phase 1b: O motor, as portas e quem as chama

```
T12 → T13 → T14 → T15 → T16 → T17 → T18
```

### Phase 2: A aba Notificações

```
T19 → T20 → T21 → T22 → T23
```

### Phase 3: Fecho

```
T24
```

**Empacotamento sugerido para sub-agentes (~7 tasks, fases inteiras):** B1 = Phase 0 (4) ·
B2 = Phase 1a (7) · B3 = Phase 1b (7) · B4 = Phase 2 + Phase 3 (6). Oferta na entrada do Execute;
o Verifier roda depois da T24, sempre.

---

## Task Breakdown

### T1: Corrigir o domínio do remetente do auth e guardá-lo

**What**: `acesso@send.umaestrelinha.com.br` → `acesso@loja.umaestrelinha.com.br` em
`supabase/config.toml` (bloco comentado `[auth.email.smtp]` e o texto ao redor), `.env.example`
(pendência C-08 reescrita: o domínio verificado é `loja.`, medido em 2026-09-06) e
`supabase/CLAUDE.md`; guarda de disco `authSenderDomain.test.ts` que varre o repositório (fora de
`.specs/` e `node_modules`) e recusa `send.umaestrelinha.com.br`, com âncora (≥ 3 arquivos lidos
que **contêm** `loja.umaestrelinha.com.br`) e sensor (um fixture com o domínio antigo reprova).
**Where**: `supabase/config.toml`, `.env.example`, `supabase/CLAUDE.md`,
`apps/store/src/shared/lib/__tests__/authSenderDomain.test.ts`
**Depends on**: None
**Reuses**: molde de `brandScan.test.ts` (varredura com diretórios literais)
**Requirement**: FIX-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `grep -r "send.umaestrelinha.com.br" --exclude-dir=node_modules --exclude-dir=.specs .` devolve 0
- [ ] O passo de troca do `.env.example` e do `config.toml` está reescrito com o domínio real e a data
- [ ] `authSenderDomain.test.ts`: 3+ casos (regra, âncora, sensor) verdes
- [ ] Gate: `pnpm --filter @estrelinha/store test` verde, contagem = baseline store + 3

**Tests**: guarda de disco (store)
**Gate**: quick

---

### T2: Tirar da aba Carrinho o interruptor sem motor

**What**: remover de `AdminSettingsPage.tsx` os controles `auto_email_enabled`, `auto_email_hours` e
`reminder_coupon_code` (mantém `threshold_hours`); os campos ficam no tipo e no JSONB. Teste: a aba
renderizada **não** contém os rótulos "Enviar email de lembrete automaticamente" / "Enviar lembrete
após"; **sensor**: um componente-fixture com o controle reprova a mesma asserção.
**Where**: `apps/backoffice/src/pages/admin/AdminSettingsPage.tsx`,
`apps/backoffice/src/pages/admin/AdminSettingsPage.test.tsx`
**Depends on**: None
**Requirement**: FIX-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Aba Carrinho mostra só `threshold_hours` e o texto explicando que lembrete automático não existe
      ("A loja não envia lembrete automático. Ver `BL-030`.")
- [ ] 2 casos novos verdes (ausência + sensor)
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test` verde, contagem = baseline backoffice + 2

**Tests**: unit (backoffice)
**Gate**: quick

---

### T3: A newsletter para de prometer

**What**: copy da confirmação em `NewsletterBanner.tsx` → "Anotado. Quando houver novidades,
escrevemos." (sem "você vai receber"); `copyInstitucional.test.tsx` ganha a asserção positiva e a
negativa (`not.toMatch(/vai receber/i)`).
**Where**: `apps/store/src/features/newsletter/ui/NewsletterBanner.tsx`,
`apps/store/src/pages/__tests__/copyInstitucional.test.tsx`
**Depends on**: None
**Requirement**: FIX-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `NewsletterBanner.test.tsx` existente continua verde (a mudança é só de texto)
- [ ] 2 asserções novas em `copyInstitucional`
- [ ] Gate: `pnpm --filter @estrelinha/store test` verde, contagem = baseline + 3 (T1) + 2

**Tests**: unit (store)
**Gate**: quick

---

### T4: Rodar o roteiro ponta a ponta do `sender.ts` e registrar

**What**: com `RESEND_DEV_REDIRECT_TO` preenchido no `.env` local e `supabase stop && start`,
executar os passos 1–5 e 8 do roteiro em `sender.ts` (probe do Resend, sandbox do MP: PIX → e-mail,
aprovação → e-mail, reemissão → nada, CTA deslogada). Registrar em
`validation.md` → seção *Evidência da base (FIX-05)*: status HTTP do Resend, shape do erro 403,
linhas de `order_emails` (`select type, status, provider_message_id, attempts`), captura do Gmail no
celular.
**Where**: `.specs/features/42-notificacoes-email-e-whatsapp/validation.md` (seção inicial)
**Depends on**: T1 (o `.env.example` correto)
**Requirement**: FIX-05

**Tools**: MCP: NONE · Skill: `supabase` (restart local, secrets)

**Done when**:

- [ ] `order_emails` local tem ≥ 2 linhas `sent` com `provider_message_id`
- [ ] Reemitir o PIX do mesmo pedido **não** cria linha nova (TRG-10)
- [ ] Capturas anexadas/citadas em `validation.md`
- [ ] Nenhum código alterado nesta task (`git status` só mostra `.specs/`)

**Tests**: none (evidência manual — layer "config/wiring")
**Gate**: build (fim da Phase 0: os cinco workspaces, `pnpm build`, `pnpm lint` = 27/5)

---

### T5: `core/notifications/events.ts` + `precondition.ts`

**What**: `NotificationEvent`, `NOTIFICATION_EVENTS` (ordem da jornada, os 15 da spec),
`NOTIFICATION_EVENT_LABELS: Record<NotificationEvent, string>` (fecha o D2), `EVENT_AUDIENCE`,
`MATERIAL_EVENTS`; `preconditionFailure(event, order): string | null` movido de `sender.ts` e
estendido aos eventos novos (inclui `no_owner_contact` para `owner_*`). Todo import com `.ts`.
Barrel `index.ts` do módulo com `export * from './events.ts'` etc.
**Where**: `packages/core/src/notifications/{events,precondition,index}.ts`,
`packages/core/src/notifications/__tests__/{events,precondition}.test.ts`
**Depends on**: None
**Reuses**: `sender.ts:preconditionFailure`; molde `MATERIAL_STATUSES`/`MATERIAL_STATUS_LABELS`
**Requirement**: NTF-03, FIX-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] 15 eventos, cada um com rótulo e audiência (o `Record` não compila sem um)
- [ ] `preconditionFailure`: 1 caso "passa" + 1 caso por motivo de recusa, por evento (≥ 30 casos)
- [ ] `order_paid` recusa `aguardando_material`; `material_instructions` recusa `nao_aplicavel`
- [ ] Gate: `pnpm --filter @estrelinha/core test` verde

**Tests**: unit (core)
**Gate**: quick

---

### T6: `core/notifications/triggers.ts` — o gatilho vira eventos

**What**: `NotificationTrigger` (8 gatilhos do design), `eventsForTrigger(trigger, order):
NotificationEvent[]`, `CUSTOMER_TRIGGERS`. Regras: `payment_approved` → `[material_instructions |
order_paid, owner_order_paid]`; `pix_created` → `[order_received]`; `payment_expired` →
`[pix_expired]`; `payment_rejected` → `[payment_rejected]`; `payment_refunded` →
`[payment_refunded]`; `order_status_changed` → por `status` (`cancelled`, `shipped`, `delivered`);
`material_status_changed` → por `material_status` (`material_recebido`, `em_producao`);
`material_tracking_set` → `[material_tracking_registered, owner_material_incoming]`.
**Where**: `packages/core/src/notifications/triggers.ts`, `__tests__/triggers.test.ts`
**Depends on**: T5
**Requirement**: NTF-10, NTF-11, NTF-12, NTF-13, NTF-14, NTF-15 (a derivação); `AD-032`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Um caso por gatilho × estado relevante (≥ 14), incluindo a bifurcação nos dois sentidos
- [ ] `CUSTOMER_TRIGGERS` contém só `material_tracking_set`, e um teste assere o tamanho 1
- [ ] Gate: `pnpm --filter @estrelinha/core test` verde

**Tests**: unit (core)
**Gate**: quick

---

### T7: `core/notifications/variables.ts` + `copy.ts` — vocabulário e régua de tom

**What**: `NOTIFICATION_VARIABLES` (11 nomes), `interpolate(text, vars)`, `unknownVariables(text)`,
`variablesRefusal(text): string | null`; `notificationCopyRefusal(text, { event, channel }): string |
null` (urgência: lista de termos; emoji: `\p{Extended_Pictographic}`; `!!`; `!` em
`MATERIAL_EVENTS`; para `post_delivery_care`: `cupom|desconto|oferta|%`); `COPY_LIMITS` e
`limitsRefusal(fields)`.
**Where**: `packages/core/src/notifications/{variables,copy}.ts`, `__tests__/{variables,copy}.test.ts`
**Depends on**: T5
**Reuses**: formato `string | null` de `menuTargetRefusal`; termos de urgência de `orderList.test.ts`
**Requirement**: PNL-03, PNL-04, PNL-09

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `interpolate` cobre: variável presente, ausente (fica literal? **não** — lança? → devolve o
      texto com a variável **removida** e `unknownVariables` acusa antes; teste fixa o comportamento),
      escape não aplicado aqui (é do `layout`)
- [ ] `notificationCopyRefusal`: ≥ 12 casos (cada termo de urgência, emoji, `!!`, `!` em material vs
      `!` em `order_paid` aceito, `post_delivery_care` com "cupom", texto limpo → `null`)
- [ ] **Sensor**: `chargeMaterialText` de exemplo passa; o mesmo texto com "corra" reprova
- [ ] Gate: `pnpm --filter @estrelinha/core test` verde

**Tests**: unit (core)
**Gate**: quick

---

### T8: `core/notifications/settings.ts` + `defaults.ts` + reexport em `@estrelinha/supabase/types`

**What**: tipos `NotificationSettings`, `EmailFields`, `EventChannelSettings`;
`DEFAULT_NOTIFICATIONS` com os **quatro textos atuais byte a byte** (`order_received`, `order_paid`,
`order_shipped`, `material_received`, `enabled: true`) e texto inicial + `enabled: false` para os
outros 11; `resolveEventSettings(settings | undefined, event, channel)`. `SettingsKey` ganha
`'notifications'`; `packages/supabase/src/types/settings.ts` **reexporta** tipo e default de `core`
(molde `MenuPromo`). Testes: `defaults.test.ts` (os 4 legados ligados, os 11 desligados, e os textos
legados iguais a fixtures copiadas de `templates.ts` **antes** de ele sumir), `notificationCopyGuard.test.ts`
(todo default passa em `notificationCopyRefusal` + `limitsRefusal`; sensor), `purity.test.ts`
(sem React/Supabase/Deno; todo especificador relativo com `.ts`).
**Where**: `packages/core/src/notifications/{settings,defaults}.ts`, `packages/supabase/src/types/settings.ts`,
`__tests__/{defaults,notificationCopyGuard,purity}.test.ts`
**Depends on**: T7
**Reuses**: `core/menu` ↔ `supabase/types` (`MenuPromo`); `core/shopping/__tests__/purity.test.ts`
**Requirement**: PNL-06 (metade TS), PNL-04 (guarda)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `defaults.test.ts` compara `subject/heading/lead/extra` dos 4 legados com as strings de `templates.ts`
- [ ] `notificationCopyGuard`: 15 defaults passam; sensor com "corra" e com `!` em `material_received` reprovam
- [ ] `purity.test.ts` varre ≥ 8 arquivos (âncora) e recusa import sem `.ts`
- [ ] Gate: `pnpm --filter @estrelinha/core test` verde

**Tests**: unit (core)
**Gate**: quick

---

### T9: `normalizeBrPhone` sobe para `core`; `chargeMaterial.ts` importa de lá

**What**: `packages/core/src/notifications/phone.ts` com `normalizeBrPhone(input): string | null`
(comportamento de `whatsappNumber`: só dígitos, `55` na frente quando falta, `null` abaixo de 10
dígitos; aceita 10 e 11); `chargeMaterial.ts` apaga `whatsappNumber` e reexporta
`normalizeBrPhone as whatsappNumber` do barrel `features/order-list` **só** para não quebrar
consumidores (comentário: sair na `43`).
**Where**: `packages/core/src/notifications/phone.ts`, `__tests__/phone.test.ts`,
`apps/backoffice/src/features/order-list/model/chargeMaterial.ts`, `index.ts` do slice
**Depends on**: T5 (barrel)
**Requirement**: PNL-07

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `phone.test.ts`: 11 dígitos, 10 dígitos, com `55`, com máscara `(51) 9…`, vazio, 9 dígitos → null
- [ ] `orderList.test.ts` (cobrança) continua verde sem alteração de asserção
- [ ] Gate: core **e** backoffice, um por vez

**Tests**: unit (core + backoffice)
**Gate**: full

---

### T10: `providers/types.ts` + `providers/resend.ts` — a interface e o primeiro adaptador

**What**: `NotificationProvider`, `RenderedMessage`, `ProviderOutcome`; adaptador `resend`
(`postToResend` + `classifyResendFailure` de `sender.ts`, recebendo `fetch`, `env`, `signal`);
`REGISTERED_PROVIDERS` **não** vive aqui (é da function, que injeta env) — aqui vive só
`createResendProvider(env)`. Teste `providers.test.ts` roda **a mesma bateria** contra `resend` e
um `fakeProvider`: 2xx com id, 2xx sem id, 401/403/429/5xx, timeout por `signal`.
**Where**: `packages/core/src/notifications/providers/{types,resend}.ts`, `__tests__/providers.test.ts`
**Depends on**: T5
**Reuses**: `sender.ts:postToResend`, `classifyResendFailure` (e seus testes em `handlers.test.ts`)
**Requirement**: NTF-06 (classificação), NTF-09

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Bateria parametrizada por provedor (`describe.each`) com ≥ 7 casos × 2
- [ ] `classifyFailure` cobre 401, 403, 409, 429 (quota × rate), 400/422, 5xx, outro
- [ ] Gate: `pnpm --filter @estrelinha/core test` verde

**Tests**: unit (core)
**Gate**: quick

---

### T11: Migration `42-notificacoes.sql` + guarda de disco + probe

**What**: a migration do design (rename → colunas → `check` de `event` = `NOTIFICATION_EVENTS` →
índice único `(order_id, event, channel)` → RPCs novas → RPCs antigas delegando → view
`order_emails` `security_invoker` → seed `notifications` com `DEFAULT_NOTIFICATIONS` `on conflict do
nothing` → `notify pgrst, 'reload schema'`). Guarda `orderNotificationsSchema.test.ts` (âncora dupla,
sensor por mutação em: `check` de `event`, índice parcial, `security_invoker`, `grant anon`, `do
nothing`, delegação). `storeSettingsDefaults.test.ts` ganha o bloco `notifications` (jsonb da
migration `===` `DEFAULT_NOTIFICATIONS`). Aplicar **à mão** no banco local (sem `db reset`: o
catálogo está lá) e **probe HTTP** com service role: `claim_order_notification` via `rpc`, leitura de
`order_notifications` e de `order_emails` (view), `claim_order_email` ainda funciona.
**Where**: `supabase/migrations/20260907120000_42-notificacoes.sql`,
`apps/store/src/shared/lib/__tests__/orderNotificationsSchema.test.ts`,
`apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts`
**Depends on**: T5, T8
**Reuses**: `20260730120000_order_emails.sql`, `20260905130000_39-menu-configuravel.sql` (guarda `do $$`), `menuSchema.test.ts`
**Requirement**: NTF-01, PNL-06 (metade SQL)

**Tools**: MCP: NONE · Skill: `supabase` (aplicar migration local, `psql`/`db push --local`)

**Done when**:

- [ ] `select count(*) from order_notifications` = contagem anterior de `order_emails`
- [ ] `select * from order_emails limit 1` funciona (view) e `\d+ order_emails` mostra `security_invoker`
- [ ] Probe: `rpc('claim_order_email', …)` e `rpc('claim_order_notification', …)` devolvem id; segunda chamada após `finish` com `sent` devolve `null`
- [ ] `store_settings` tem a chave `notifications` e reexecutar o seed afeta 0 linhas
- [ ] Guarda: ≥ 10 asserções + sensores; `storeSettingsDefaults` +1 bloco
- [ ] Gate: `pnpm --filter @estrelinha/store test` verde; **Build** (fim da Phase 1a)

**Tests**: guarda de disco (store) + probe
**Gate**: build

---

### T12: Renomear `send-email` → `send-notification`; `render/email.ts` lê os textos

**What**: `git mv supabase/functions/send-email supabase/functions/send-notification`; `layout.ts` →
`render/layout.ts`; `templates.ts` **apagado** e substituído por `render/email.ts`:
`renderEmail(event, order, fields: EmailFields, vars): RenderedMessage` (interpola `subject`,
`heading`, `lead`, `extra[]`, `cta_label`; blocos fixos por evento: `highlightBox` do rastreio em
`order_shipped`, devolução condicional em `order_cancelled`, CTA secundário do guia em
`material_instructions`); `render/sample.ts` (pedido `@exemplo.invalid`); `render/vars.ts`
(`buildVars(order, settings, env)`). `__tests__/templates.test.ts` → `render.test.ts`: **os
mesmos casos** + prova de que `renderEmail(evento legado, DEFAULT_NOTIFICATIONS)` produz HTML igual
ao que `templates.ts` produzia (fixture congelada **antes** de apagar). `config.toml`: bloco
`[functions.send-notification]` com `verify_jwt = false`, e o de `send-email` removido.
**Where**: `supabase/functions/send-notification/{render/*,__tests__/render.test.ts}`, `supabase/config.toml`
**Depends on**: T8 (defaults), T7 (interpolate)
**Reuses**: tudo de `send-email/layout.ts` e `templates.ts`
**Requirement**: NTF-02 (metade), PNL-02 (o que é editável), NTF-10..14 (conteúdo dos eventos)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Os 4 e-mails legados renderizam **byte a byte** igual ao fixture congelado
- [ ] 11 eventos novos renderizam sem `!` onde proibido e com as variáveis exigidas (`pix_expired` tem `link_pedido`; `material_instructions` tem guia + endereço; `order_cancelled` bifurca)
- [ ] `sample.ts` não contém `@` fora de `@exemplo.invalid` (asserção)
- [ ] Nenhum teste de `templates.test.ts` sumiu sem reaparecer em `render.test.ts` (contagem anotada)
- [ ] Gate: `pnpm --filter @estrelinha/functions test` verde

**Tests**: unit com dublês (functions)
**Gate**: quick

---

### T13: `dispatch.ts` — o motor

**What**: `dispatchTrigger(deps, { orderId, trigger, budgetMs })` e `dispatchEvent(deps, { orderId,
event, channel?, deadline })` conforme design: releitura (`ORDER_COLUMNS` + `whatsapp_opt_in`),
settings numa consulta (`key in (…)`), `eventsForTrigger`, `preconditionFailure`, laço de
`REGISTERED_PROVIDERS` (só `resend`), habilitado?/destinatário?/tempo restante?, claim →
`budget_exhausted` se `< 500 ms` → render → `provider.send(signal)` → finish; `skipped:*` sem linha;
nunca lança; log estruturado por `(order, event, channel)`.
**Where**: `supabase/functions/send-notification/dispatch.ts`, `__tests__/dispatch.test.ts`
**Depends on**: T12, T10, T6
**Reuses**: `sender.ts` (apagado nesta task; a lógica migra), `_shared/testing/fakes.ts` (ganha `order_notifications`, `claim/finish_order_notification`, `store_settings`)
**Requirement**: NTF-04, NTF-05, NTF-06, NTF-07, NTF-15 (destino da dona)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Casos: pré-condição falha → sem claim; desabilitado → `skipped:disabled` sem linha; `no_email`; `no_owner_contact`; `already_sent`; falha do provedor → `failed` + slug + `error` ≤ 500; timeout por `signal`; **deadline**: com 400 ms restantes o segundo evento fica `failed: budget_exhausted` **com linha**; ordem cliente → dona; settings ausentes → defaults; throw interno → `unexpected_error` sem propagar
- [ ] Um teste mede: `dispatchTrigger` com provedor que dorme 3 s e `budgetMs = 2500` retorna em `< 2600 ms` (fake timers)
- [ ] Gate: `pnpm --filter @estrelinha/functions test` verde

**Tests**: unit com dublês (functions)
**Gate**: quick

---

### T14: `handlers.ts` — `send`, `trigger`, `notify`, `preview`

**What**: `route` com as quatro actions; `requireAdmin` mantido; `requireOrderOwner(deps, req,
orderId)` (JWT → `getUser` → consulta `orders … customer_id in (select id from customers where
user_id = …)` com service role → 404 se não achou); `notify` aceita só `CUSTOMER_TRIGGERS` (400
fora); `preview` valida `draft` com `variablesRefusal` + `notificationCopyRefusal` + `limitsRefusal`
(422 com motivo), renderiza sobre `sample` ou `order_id`, **não** chama claim nem provedor; `index.ts`
monta `REGISTERED_PROVIDERS = [createResendProvider(env)]`.
**Where**: `supabase/functions/send-notification/{handlers,index}.ts`, `__tests__/handlers.test.ts`
**Depends on**: T13
**Reuses**: `handlers.ts` atual (auth, `json`, CORS)
**Requirement**: NTF-08, PNL-05, NTF-13 (porta da cliente)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `send`: 401 sem header · 401 anon · 403 cliente · 400 evento inválido · 400 uuid inválido · 200/404/422
- [ ] `trigger`: idem auth; 400 gatilho inválido
- [ ] `notify`: 404 pedido de outra pessoa; 400 gatilho fora de `CUSTOMER_TRIGGERS`; 200 dona do pedido
- [ ] `preview`: admin-only; 422 para "corra", variável desconhecida, `lead` > 600; o dublê do client registra **zero** chamadas a `rpc('claim…')` e o `fetch` dublê **zero** chamadas
- [ ] Probe local: `curl` das 4 actions sem auth → 401/401/401/401; action inválida → 400 (boot da function renomeada)
- [ ] Gate: `pnpm --filter @estrelinha/functions test` verde

**Tests**: unit com dublês (functions) + probe de boot
**Gate**: quick

---

### T15: `mercado-pago` dispara gatilhos

**What**: `fireEmail` → `fireTrigger(deps, orderId, trigger, budgetMs)` importando
`../send-notification/dispatch.ts`; `:808`: `pix_created` (com QR) ou `payment_approved`
(`approvalApplied`); webhook: `payment_approved` quando `target === 'approved' && applied`;
`payment_expired | payment_rejected | payment_refunded` quando o `target` correspondente e
`applied`; `deps.email` → `deps.notifications` (`index.ts`). **Nenhuma outra linha.**
**Where**: `supabase/functions/mercado-pago/{handlers,index}.ts`, `__tests__/handlers.test.ts`, `__tests__/fakes.ts`
**Depends on**: T13
**Requirement**: NTF-02 (metade), NTF-10, NTF-11 (disparo), NTF-16

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Testes: PIX com QR → `pix_created`; PIX sem QR → nada; cartão aprovado → `payment_approved`; cartão recusado no `create-payment` → **nada** (a tela já mostra); webhook `approved` aplicado → `payment_approved`; reentrega (`applied = false`) → nada; `expired`/`rejected`/`refunded` aplicados → gatilho respectivo, uma vez
- [ ] Motor que lança → log `notification_dispatch_failed`, resposta do pagamento inalterada (caso existente, renomeado)
- [ ] `git diff --name-only -- packages/core/src/payment` vazio; em `mercado-pago/` só `handlers.ts`, `index.ts` e `__tests__/**`
- [ ] Gate: `pnpm --filter @estrelinha/functions test` verde

**Tests**: unit com dublês (functions)
**Gate**: quick

---

### T16: A loja avisa quando a cliente registra o rastreio

**What**: `useSetMaterialTracking.ts`: após `ok: true`, `supabase.functions.invoke('send-notification?action=notify', { body: { order_id, trigger: 'material_tracking_set' } })` em `try/catch`, sem `await` bloqueando o retorno para a UI (`void notify()` ou `await` com `catch` — decidir e testar que a UI não espera falha).
**Where**: `apps/store/src/entities/order/api/useSetMaterialTracking.ts`, `__tests__/useSetMaterialTracking.test.tsx`
**Depends on**: T14
**Requirement**: NTF-13

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Sucesso da RPC → `invoke` chamado com o corpo exato; falha da RPC → `invoke` **não** chamado; `invoke` rejeitando → hook resolve `ok: true` mesmo assim
- [ ] Gate: `pnpm --filter @estrelinha/store test` + `tsc` do store

**Tests**: unit (store)
**Gate**: full

---

### T17: Backoffice dispara gatilhos — `notifyOrder.ts`

**What**: `entities/order/api/notifyOrder.ts` com `notifyOrder(orderId, trigger): Promise<boolean>`
e `resendNotification(orderId, event, channel): Promise<boolean>` (`?action=trigger` e
`?action=send`), nunca lança; `sendOrderEmail.ts` apagado, `sendOrderEmail.test.ts` → `notifyOrder.test.ts`
(mesmos casos + os novos). `useAdminOrders.ts`: `updateStatus` → `order_status_changed`;
`addTrackingCode` → `order_status_changed` (o par); `setMaterialStatus` →
`material_status_changed`; `setMaterialTracking` → `material_tracking_set`.
**Where**: `apps/backoffice/src/entities/order/api/{notifyOrder,useAdminOrders}.ts` e testes
**Depends on**: T14
**Requirement**: NTF-02 (chamadores), NTF-11..14 (disparo do backoffice)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `useAdminOrders.test.ts`: cada mutação chama `notifyOrder` com o gatilho certo; 422/false não vira erro
- [ ] `grep -rn "sendOrderEmail" apps/` devolve 0
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test` + `tsc` do backoffice

**Tests**: unit (backoffice)
**Gate**: full

---

### T18: Histórico do pedido lê `order_notifications`; guarda de dono único

**What**: `useAdminOrder.ts` → `.from('order_notifications')`, `OrderNotificationRow`
(`event`, `channel`, `delivery_status`); `history.ts` → `NOTIFICATION_EVENT_LABELS` de `core`,
evento carrega `channel`; `OrderHistory.tsx` mostra canal e reenvia por linha via
`resendNotification`; `AdminOrderPage.tsx` troca `sendOrderEmail`. Guarda
`notificationSingleOwner.test.ts` (store `shared/lib/__tests__`): nenhum arquivo de `apps/**` ou
`supabase/functions/**` contém `order_emails` (fora de comentário — sensor de comentário como
`menuSurfaceSingleOwner`); nenhum literal de evento (`'order_paid'` etc.) em `apps/**` fora de
testes — o painel e o histórico consomem `NOTIFICATION_EVENTS`.
**Where**: `apps/backoffice/src/entities/order/api/useAdminOrder.ts`,
`apps/backoffice/src/features/order-detail/{model/history.ts,ui/OrderHistory.tsx}`,
`apps/backoffice/src/pages/admin/AdminOrderPage.tsx`,
`apps/store/src/shared/lib/__tests__/notificationSingleOwner.test.ts`, testes ao lado
**Depends on**: T17, T11
**Requirement**: FIX-02 (fiação), PNL-08, NTF-01 (leitura)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `orderDetail.test.ts`: `order_received` → "Confirmação do pedido enviada"; `order_paid` → "Aviso de pagamento aprovado enviado"; falha → "Falha ao enviar <rótulo>"; `channel` exibido
- [ ] `AdminOrderPage.test.tsx`: reenviar chama `resendNotification(id, event, channel)`
- [ ] Guarda: âncora dupla (≥ 200 arquivos varridos **e** ≥ 3 arquivos citando `order_notifications`), sensor de comentário, sensor de literal
- [ ] Gate: backoffice + store, um por vez; **Build** (fim da Phase 1b): `payment/**` intocado

**Tests**: unit (backoffice) + guarda (store)
**Gate**: build

---

### T19: `useStoreSettings` conhece `notifications`

**What**: `notifications: DEFAULT_NOTIFICATIONS` em `DEFAULTS`; `useNotificationSettings()`.
Teste em `packages/core/src/hooks/__tests__/useStoreSettings.test.tsx` (criar se não existir): uma
linha `notifications` vinda do client dublê **é lida** (o `if (key in map)` não a descarta) e faz
merge raso com o default.
**Where**: `packages/core/src/hooks/useStoreSettings.ts`, `__tests__/useStoreSettings.test.tsx`
**Depends on**: T8
**Requirement**: PNL-06 (leitura), risco "`fetchAllSettings` descarta chave"

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Teste: sem `notifications` em `DEFAULTS` a linha seria descartada — **sensor**: o teste roda a função com um mapa sem a chave e prova o descarte
- [ ] Gate: `pnpm --filter @estrelinha/core test` verde

**Tests**: unit (core)
**Gate**: quick

---

### T20: `features/notification-settings` — modelo e API da prévia

**What**: `model/useNotificationDraft.ts` (estado por evento, `refusalFor(fields)` compondo
`variablesRefusal` → `notificationCopyRefusal` → `limitsRefusal`, `save()` via
`useUpdateSettings` só se `refusal === null`); `api/previewNotification.ts` (invoke
`send-notification?action=preview`, devolve `{ subject, html, text } | { error }`); barrel.
**Where**: `apps/backoffice/src/features/notification-settings/{model,api,index.ts}` e testes
**Depends on**: T19, T14
**Requirement**: PNL-03, PNL-04 (lado do painel), PNL-05 (chamada)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `useNotificationDraft.test.tsx`: recusa por variável desconhecida nomeia a variável; recusa por "corra"; recusa por `lead` > 600; `save` não chama `mutateAsync` quando há recusa; chama com `{ key: 'notifications', value }` quando não há
- [ ] `previewNotification.test.ts`: corpo exato; erro → `{ error }` sem lançar
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test` verde

**Tests**: unit (backoffice)
**Gate**: quick

---

### T21: `EventCard.tsx` + `EmailPreviewFrame.tsx`

**What**: `EventCard` (rótulo de `NOTIFICATION_EVENT_LABELS`, audiência, `ToggleField` e-mail, campos
`subject/heading/lead/extra[]/cta_label` com contadores de limite, recusa inline, botão "ver prévia",
lista das variáveis disponíveis clicável); `EmailPreviewFrame` (`<iframe sandbox srcdoc>` com
alternância 390/600 px, versão texto abaixo). Mobile-first: `TAP_44`, sem pílula com texto longo.
**Where**: `apps/backoffice/src/features/notification-settings/ui/{EventCard,EmailPreviewFrame}.tsx` e testes
**Depends on**: T20
**Reuses**: `FormCard`, `FieldGroup`, `ToggleField` (`@/shared/ui`); `MenuLivePreview` (iframe)
**Requirement**: PNL-01 (card), PNL-02, PNL-05 (iframe)

**Tools**: MCP: NONE · Skill: `ui-ux-pro-max` (opcional, revisão do card)

**Done when**:

- [ ] `EventCard.test.tsx`: renderiza os 5 campos e **só** eles; interruptor chama `onToggle`; recusa aparece; "ver prévia" chama `onPreview` com o rascunho atual
- [ ] `EmailPreviewFrame.test.tsx`: `srcdoc` recebe o HTML; `sandbox` presente; alternância muda a largura declarada
- [ ] `touchTarget.test.ts` continua verde (o guarda varre o backoffice? — se não, asserção local de `min-h-11`)
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test` verde

**Tests**: unit (backoffice)
**Gate**: quick

---

### T22: `NotificationsTab.tsx` montada em `/admin/configuracoes`

**What**: `NotificationsTab` lista `NOTIFICATION_EVENTS` na ordem, agrupados em quatro seções
(Compra · Material · Envio e entrega · Avisos para você), um `EventCard` por evento, prévia num
painel lateral (desktop) / abaixo do card (mobile); aviso no topo dos `owner_*` quando
`general.email` está vazio. `AdminSettingsPage.tsx` ganha `<TabsTrigger value="notifications">Notificações</TabsTrigger>` e monta a aba; `navItems`/rotas não mudam.
**Where**: `apps/backoffice/src/features/notification-settings/ui/NotificationsTab.tsx`,
`apps/backoffice/src/pages/admin/AdminSettingsPage.tsx`, testes
**Depends on**: T21
**Requirement**: PNL-01, PNL-08 (visão do painel)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `NotificationsTab.test.tsx`: 15 cards na ordem de `NOTIFICATION_EVENTS` (asserção por índice, lida da constante — não literal); nenhuma coluna WhatsApp; aviso de `general.email` vazio aparece/desaparece
- [ ] `AdminSettingsPage.test.tsx`: a aba existe e a de Carrinho continua sem o interruptor (T2)
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test` + `tsc` do backoffice

**Tests**: unit (backoffice)
**Gate**: full

---

### T23: Prova em navegador — 390×844 e 1440

**What**: com `pnpm dev:backoffice` e o banco local: abrir `/admin/configuracoes` → Notificações em
390×844; medir `document.body.scrollWidth === 390`; alvos ≥ 44 px (`getBoundingClientRect`);
editar `lead` do `order_paid`, ver a prévia mudar sem salvar, tentar salvar "corra" → recusa
inline, salvar sem → toast; disparar `order_paid` por `?action=send` e ver no Mailpit/Resend o texto
novo. Repetir em 1440. Capturas e medidas para `validation.md`.
**Where**: `.specs/features/42-notificacoes-email-e-whatsapp/validation.md` (seção *Prova em navegador*)
**Depends on**: T22
**Requirement**: PNL-10

**Tools**: MCP: NONE · Skill: `playwright-cli`

**Done when**:

- [ ] `scrollWidth` do `body` = largura da viewport nas duas larguras
- [ ] Nenhum controle < 44 px (lista dos medidos)
- [ ] O e-mail recebido contém o `lead` editado
- [ ] Defeitos achados viram tasks de correção **antes** da T24

**Tests**: prova em navegador (evidência)
**Gate**: build (fim da Phase 2)

---

### T24: Fecho — baselines, documentação, backlog, handoff

**What**: medir os cinco workspaces (um por vez, exit code) e atualizar `CLAUDE.md` raiz (baselines;
tabela *Os guardas* com `authSenderDomain`, `orderNotificationsSchema`, `notificationSingleOwner`,
`notificationCopyGuard`, `providers`; *Estado conhecido*: "**todo evento novo de notificação nasce
DESLIGADO** — ligar em `/admin/configuracoes` → Notificações"; a `42` fechada e "**a próxima é a
44**"); `supabase/CLAUDE.md` (`send-email` → `send-notification`, as 4 actions, `order_notifications`
e a view); `apps/backoffice/CLAUDE.md` (aba Notificações, `notifyOrder`); `packages/core/CLAUDE.md`
(`notifications`); `.env.example` (nada novo nesta feature além do domínio); `BACKLOG.md`: `BL-030`
(carrinho abandonado) e `BL-031` (newsletter) com as perguntas para a dona; `STATE.md` handoff.
`git diff --name-only <base>` prova `payment/**` intocado.
**Where**: `CLAUDE.md`, `supabase/CLAUDE.md`, `apps/backoffice/CLAUDE.md`, `packages/core/CLAUDE.md`, `.specs/{BACKLOG,STATE}.md`
**Depends on**: T23
**Requirement**: todos (fecho)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Baselines novas anotadas com data e método; nenhuma queda sem contrapartida declarada (`templates.test` → `render.test`; `sendOrderEmail.test` → `notifyOrder.test`)
- [ ] Lint ≤ 27/5; tipos 0·0·0; `pnpm build` verde
- [ ] **Build gate** completo
- [ ] Verifier independente disparado (Skill) → `validation.md`

**Tests**: todos os workspaces
**Gate**: build

---

## Phase Execution Map

```
Phase 0 → Phase 1a → Phase 1b → Phase 2 → Phase 3

Phase 0:   T1 ──→ T2 ──→ T3 ──→ T4
Phase 1a:  T5 ──→ T6 ──→ T7 ──→ T8 ──→ T9 ──→ T10 ──→ T11
Phase 1b:  T12 ──→ T13 ──→ T14 ──→ T15 ──→ T16 ──→ T17 ──→ T18
Phase 2:   T19 ──→ T20 ──→ T21 ──→ T22 ──→ T23
Phase 3:   T24  → Verifier (automático)
```

Execução estritamente sequencial. Dependências cruzadas entre fases apontam sempre para trás (T11
usa T5/T8; T12 usa T7/T8; T13 usa T6/T10; T18 usa T11; T19 usa T8; T20 usa T14).

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 3 arquivos de doc/config + 1 guarda (uma regra) | ✅ coeso: uma regra, um guarda |
| T2 | 1 componente (remoção) + teste | ✅ |
| T3 | 1 componente (copy) + teste | ✅ |
| T4 | evidência manual, 0 código | ✅ |
| T5 | 2 módulos de `core` irmãos (evento + pré-condição) | ⚠️ ok: pré-condição é função sobre o vocabulário |
| T6 | 1 módulo | ✅ |
| T7 | 2 módulos irmãos (variáveis + régua) | ⚠️ ok: a régua chama `unknownVariables` |
| T8 | tipos + defaults + reexport + 3 testes | ⚠️ ok: defaults são o tipo instanciado; o reexport é 2 linhas |
| T9 | 1 função movida + 1 import | ✅ |
| T10 | interface + 1 adaptador | ✅ |
| T11 | 1 migration + 1 guarda + 1 bloco de guarda existente + probe | ⚠️ ok: o guarda **é** a verificação da migration |
| T12 | rename + 1 renderizador + sample + vars | ⚠️ fat mas uma cadeia: o rename obriga tudo a se mover junto |
| T13 | 1 módulo (motor) | ✅ |
| T14 | 1 módulo (handlers) + wiring | ✅ |
| T15 | 2 arquivos de uma function, pontos de disparo | ✅ |
| T16 | 1 hook | ✅ |
| T17 | 1 API nova + 1 hook ajustado | ⚠️ ok: o hook é o único consumidor |
| T18 | 4 arquivos do histórico + 1 guarda | ⚠️ fat: são a mesma leitura mudando de tabela; dividir criaria estado intermediário que não compila |
| T19 | 1 constante + 1 hook + teste | ✅ |
| T20 | 1 hook de rascunho + 1 API | ✅ |
| T21 | 2 componentes | ⚠️ ok: o frame só existe dentro do card |
| T22 | 1 componente + 1 montagem | ✅ |
| T23 | evidência | ✅ |
| T24 | documentação de fecho | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram | Status |
| --- | --- | --- | --- |
| T1 | — | início da Phase 0 | ✅ |
| T2 | — | após T1 (ordem da fase) | ✅ |
| T3 | — | após T2 | ✅ |
| T4 | T1 | após T3; T1 anterior | ✅ |
| T5 | — | início da Phase 1a | ✅ |
| T6 | T5 | após T5 | ✅ |
| T7 | T5 | após T6 (T5 anterior) | ✅ |
| T8 | T7 | após T7 | ✅ |
| T9 | T5 | após T8 (T5 anterior) | ✅ |
| T10 | T5 | após T9 (T5 anterior) | ✅ |
| T11 | T5, T8 | após T10 (ambos anteriores) | ✅ |
| T12 | T8, T7 | início da Phase 1b (Phase 1a completa) | ✅ |
| T13 | T12, T10, T6 | após T12 (T10, T6 em fase anterior) | ✅ |
| T14 | T13 | após T13 | ✅ |
| T15 | T13 | após T14 (T13 anterior) | ✅ |
| T16 | T14 | após T15 (T14 anterior) | ✅ |
| T17 | T14 | após T16 (T14 anterior) | ✅ |
| T18 | T17, T11 | após T17 (T11 em fase anterior) | ✅ |
| T19 | T8 | início da Phase 2 (fase anterior) | ✅ |
| T20 | T19, T14 | após T19 (T14 em fase anterior) | ✅ |
| T21 | T20 | após T20 | ✅ |
| T22 | T21 | após T21 | ✅ |
| T23 | T22 | após T22 | ✅ |
| T24 | T23 | Phase 3 | ✅ |

Nenhuma dependência aponta para fase posterior.

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | config + guarda de disco | none + guarda | guarda (store) | ✅ |
| T2 | backoffice UI | unit | unit | ✅ |
| T3 | store UI | unit | unit | ✅ |
| T4 | evidência | none | none (manual) | ✅ |
| T5 | core | unit 1:1 | unit | ✅ |
| T6 | core | unit 1:1 | unit | ✅ |
| T7 | core | unit + sensor | unit + sensor | ✅ |
| T8 | core + supabase/types | unit + purity | unit | ✅ |
| T9 | core + backoffice | unit | unit (ambos) | ✅ |
| T10 | core | unit | unit | ✅ |
| T11 | migration | guarda + probe | guarda + probe | ✅ |
| T12 | functions | unit dublês | unit | ✅ |
| T13 | functions | unit dublês | unit | ✅ |
| T14 | functions | unit dublês + probe boot | unit + probe | ✅ |
| T15 | functions | unit dublês | unit | ✅ |
| T16 | store hook | unit | unit | ✅ |
| T17 | backoffice API/hook | unit | unit | ✅ |
| T18 | backoffice + guarda | unit + guarda | unit + guarda | ✅ |
| T19 | core hook | unit | unit | ✅ |
| T20 | backoffice model/api | unit | unit | ✅ |
| T21 | backoffice UI | unit | unit | ✅ |
| T22 | backoffice UI | unit | unit | ✅ |
| T23 | tela nova | prova em navegador | prova em navegador | ✅ |
| T24 | doc | none | todos (gate) | ✅ |

Nenhuma violação. Nenhum "testado em outra task".

---

## Fora do plano, de propósito

- **PDC-01** (`post_delivery_care`, P3): o evento **existe** no vocabulário (T5) e no painel (T22,
  desligado), mas o disparo por rotina fica para depois do texto da dona — sem task nesta rodada.
- **Remoção da view `order_emails`**: migration posterior, quando nenhum deploy vivo a lê.
