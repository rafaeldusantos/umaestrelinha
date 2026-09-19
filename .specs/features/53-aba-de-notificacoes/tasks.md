# Aba Notificações — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source
of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier,
discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/53-aba-de-notificacoes/design.md`
**Status**: Draft

---

## Convenções deste repositório que valem em toda task

- **Um commit por FEATURE, não por task** (`CLAUDE.md`, `BL-012` fechado). As tasks rodam o gate cada
  uma; os commits saem no fim, completos, na T15.
- **Gate por workspace, um por vez, com exit code fora de pipe e `--testTimeout=20000` SEM `--`**:
  `pnpm --filter @estrelinha/<workspace> test --testTimeout=20000`. O `--` antes da flag **engole**
  a flag e o teto volta a 5s.
- **Baseline de entrada, medida com a árvore parada**: **9742 testes em 498 arquivos** — store
  3493/220 · backoffice 2711/148 · core 2372/93 · functions 654/14 · catalog-import 512/23. Lint
  **26/6** (store 2/2 · backoffice 24/4). Tipos **0·0·0**.
- `packages/core/src/payment/**` fecha a feature sem uma linha alterada — confira com
  `git diff --name-only -- packages/core/src/payment` no fecho.
- **Três workspaces tocados**: `core` (T01, T02), `functions` (T01) e `backoffice` (T02–T14). `store`
  e `catalog-import` não deveriam mudar — remeça e compare.
- **`draftRefusal`/`notificationDraftRefusal` é resolvido pelo Deno por caminho relativo** — todo
  import dentro do grafo de `send-notification` precisa de `.ts` explícito, `import type` incluso
  (lição da `33`/`39`/`48`/`49`). A T01 está dentro desse grafo.

---

## Test Coverage Matrix

| Requisito | Onde é provado | Tipo | Sensor de mutação |
| --- | --- | --- | --- |
| `ABN-01` três seções, ordem preservada | `model/__tests__/sections.test.ts` + `NotificationsTab.test.tsx` | unidade pura + componente | trocar `isMaterialEvent` por `EVENT_AUDIENCE==='owner'` só ⇒ `material_instructions` cai na seção errada |
| `ABN-02` campos editáveis exatos | `ui/__tests__/EventCard.test.tsx` | componente | renderizar um campo a mais/a menos ⇒ o caso de "exatamente 5" cai |
| `ABN-03` variável fechada, recusa nomeando | `model/__tests__/useNotificationsDraft.test.tsx` | componente (renderHook) | trocar `{{x}}` desconhecido por conhecido ⇒ recusa vira `null` |
| `ABN-04` tom (urgência/emoji/`!!`/`!`) | idem + `packages/core/.../__tests__/copy.test.ts` (T01) | unidade + componente | apagar a chamada a `notificationCopyRefusal` no `refusalFor` ⇒ "corra" passa a salvar |
| `ABN-05` limite de tamanho | idem | unidade + componente | apagar a chamada a `limitsRefusal` ⇒ `lead` de 900 chars salva |
| `ABN-06` prévia = mesmo renderizador, sem recompor | `api/__tests__/previewNotification.test.ts` + `ui/__tests__/EmailPreviewFrame.test.tsx` | unidade + componente | fazer o componente concatenar `heading`+`lead` em vez de usar `html` cru ⇒ o caso "byte a byte" cai |
| `ABN-07` exemplo × pedido real, selo | idem | componente | apagar o selo quando `sample: true` ⇒ o caso cai |
| `ABN-08` gate de material bloqueia salvar | `model/__tests__/preconditions.test.ts` + `useNotificationsDraft.test.tsx` | unidade + componente | remover o `&& opts.enabled` ⇒ bloquear mesmo desligado (falso positivo) |
| `ABN-09` aviso não-bloqueante nos cards `owner_*` | `ui/__tests__/EventCard.test.tsx` + `api/__tests__/checkNotificationConfig.test.ts` | componente + unidade | trocar `localhost` por string vazia na régua ⇒ URL de produção real acusada |
| `ABN-10` prova em navegador | `validation.md` (evidência) | e2e manual (`playwright-cli`) | — |
| `ABN-11` guarda de disco — zero segunda declaração | `apps/backoffice/src/shared/lib/__tests__/notificationCopySingleOwner.test.ts` | varredura de disco | injeção real: declarar `URGENCY_TERMS` de novo num arquivo do painel ⇒ o guarda acusa |
| `ABN-12` edição não salva é descartada | `NotificationsTab.test.tsx` | componente | não resetar o draft ao remontar ⇒ edição fantasma sobrevive |
| `ABN-13` escrita sempre com os 15 | `model/__tests__/notificationsWrite.test.ts` | unidade pura | construir só com o evento alterado ⇒ o caso "as outras 14 chaves presentes" cai |

## Gate Check Commands

```bash
# por task (workspace tocado)
pnpm --filter @estrelinha/core test --testTimeout=20000
pnpm --filter @estrelinha/functions test --testTimeout=20000
pnpm --filter @estrelinha/backoffice test --testTimeout=20000

# no fecho da feature — um workspace por vez, exit code fora de pipe
npx tsc --noEmit -p apps/backoffice/tsconfig.app.json
npx tsc --noEmit -p apps/store/tsconfig.app.json
pnpm lint
pnpm build
git diff --name-only -- packages/core/src/payment    # tem de sair vazio
```

---

## Execution Plan

```
Fase 1 (motor — dono único da recusa)     T01
Fase 2 (leitura)                          T02
Fase 3 (modelo puro do painel)            T03, T04, T05 (independentes) ──→ T06 (depende de T01,T02,T04,T05)
Fase 4 (chamadas à function)              T07, T08 (independentes)
Fase 5 (UI)                               T07 ──→ T09 ──→ (T04,T06) ──→ T10 ──→ (T03,T06) ──→ T11
Fase 6 (integração, guarda, prova)        T11 ──→ T12, T13 (independentes) ──→ T14
Fase 7 (fecho)                            T14 ──→ T15
```

Dentro de cada fase os tasks sem seta entre si são independentes — executam em sequência (um agente
por vez), mas nenhum bloqueia o outro. `T03`, `T04` e `T05` são três módulos puros sem relação entre
si; só `T06` (o hook que os compõe) depende deles. `T07` e `T08` são dois wrappers de chamada
independentes.

**15 tasks.** Fases 1+2+3+4 = 8 · Fase 5+6+7 = 7 — os dois lotes naturais para sub-agentes, se
oferecidos no Execute.

---

## Task Breakdown

### T01: `notificationDraftRefusal` ganha dono em `core`

**What**: mover `draftRefusal` (`handlers.ts:241-259`) para
`packages/core/src/notifications/copy.ts` como `notificationDraftRefusal(event, channel, fields:
Partial<EmailFields>): string | null` — corpo idêntico. `handlers.ts` passa a importar e delegar
(`export const draftRefusal = notificationDraftRefusal` ou chamada direta no `preview`/`send`).
**Where**: `packages/core/src/notifications/copy.ts`, `packages/core/src/notifications/__tests__/copy.test.ts`,
`supabase/functions/send-notification/handlers.ts`, `supabase/functions/send-notification/__tests__/handlers.test.ts`
**Depends on**: —
**Reuses**: `variablesRefusal`, `notificationCopyRefusal`, `limitsRefusal` (já no mesmo pacote)
**Requirement**: `ABN-04`, `ABN-05`, `ABN-11` (fundação)

**Done when**:
- [ ] `notificationDraftRefusal` exportado de `core/notifications`, com os mesmos 6+ casos que
      `handlers.test.ts:591-619` tinha, movidos para `copy.test.ts`
- [ ] `handlers.ts` não declara mais a composição — só importa e chama; `handlers.test.ts` mantém uma
      checagem de identidade/wiring (`draftRefusal === notificationDraftRefusal` ou smoke test
      equivalente), não a lista inteira de casos
- [ ] Import por caminho relativo com `.ts` explícito (grafo do Deno)
- [ ] Gate: `pnpm --filter @estrelinha/core test --testTimeout=20000` e
      `pnpm --filter @estrelinha/functions test --testTimeout=20000` verdes, contagem de `functions`
      sem queda líquida (casos migram, não somem)

---

### T02: `useNotificationSettings()`

**What**: hook novo em `useStoreSettings.ts`, mesmo molde de `useMaterialSettings`/
`useGoogleShoppingSettings` — `data?.notifications ?? DEFAULT_NOTIFICATIONS`.
**Where**: `packages/core/src/hooks/useStoreSettings.ts`, `__tests__/useStoreSettings.test.tsx`
**Depends on**: —
**Reuses**: `DEFAULT_NOTIFICATIONS` (já importado neste arquivo desde a T8 da `42`)
**Requirement**: `ABN-01` (leitura que sustenta a aba inteira)

**Done when**:
- [ ] `useNotificationSettings()` exportado, devolve o default quando a linha do banco está ausente
- [ ] Teste: uma linha `notifications` parcial vinda do dublê é lida (mesmo sensor de
      `storeSettingsDefaults`/T19 original: `if (key in map)` não descarta)
- [ ] Gate: `pnpm --filter @estrelinha/core test --testTimeout=20000` verde

---

### T03: `model/sections.ts` — as três seções, derivadas

**What**: `NotificationSection`, `SECTION_LABELS`, `sectionFor(event)`, `groupedEvents()` — deriva
de `EVENT_AUDIENCE`/`isMaterialEvent`, nunca uma lista nova.
**Where**: `apps/backoffice/src/features/notification-settings/model/sections.ts` *(novo)* e teste
**Depends on**: —
**Reuses**: `NOTIFICATION_EVENTS`, `EVENT_AUDIENCE`, `isMaterialEvent` de `@estrelinha/core/notifications`
**Requirement**: `ABN-01`

**Done when**:
- [ ] Os 15 eventos cobertos, cada um em **exatamente uma** seção (soma das três seções = 15, sem
      repetição — âncora de contagem)
- [ ] Dentro de cada seção, a ordem é a de `NOTIFICATION_EVENTS` (prova: comparar índices)
- [ ] Sensor: um evento de material classificado como `customer` por engano faz o caso de contagem
      da seção "Material" cair
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` verde

---

### T04: `model/preconditions.ts` — as duas réguas

**What**: `materialAddressMissing(material)`, `adminUrlLooksLocal(adminPublicUrl)`.
**Where**: `apps/backoffice/src/features/notification-settings/model/preconditions.ts` *(novo)* e teste
**Depends on**: —
**Reuses**: `MaterialSettings` de `@estrelinha/supabase/types/settings`
**Requirement**: `ABN-08`, `ABN-09`

**Done when**:
- [ ] `materialAddressMissing`: `street` vazio ou só espaço ⇒ `true`; preenchido ⇒ `false`
- [ ] `adminUrlLooksLocal`: `http://localhost:8083` ⇒ `true`; `https://painel.umaestrelinha.com.br` ⇒
      `false`; string vazia ⇒ `true` (trata ausência como "não é de produção", não como "não sei")
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` verde

---

### T05: `model/notificationsWrite.ts` — a escrita sempre com os 15

**What**: `buildNotificationsValue(resolved, postDeliveryDays)` — reconstrói `NotificationSettings`
iterando `NOTIFICATION_EVENTS` uma vez; `post_delivery_days` é preservado, nunca editado aqui.
**Where**: `apps/backoffice/src/features/notification-settings/model/notificationsWrite.ts` *(novo)* e teste
**Depends on**: —
**Reuses**: `NOTIFICATION_EVENTS`
**Requirement**: `ABN-13`

**Done when**:
- [ ] O objeto construído tem **as 15 chaves** de `events`, sempre — mesmo quando `resolved` só
      reflete edição de 1 evento
- [ ] Sensor: construir passando um `resolved` com só `pix_expired` alterado prova que os outros 14
      saem com o valor de `resolved` (não com `DEFAULT_NOTIFICATIONS` por engano — `resolved` já veio
      resolvido de `resolveAllEventSettings`, o teste finge isso com um dublê)
- [ ] `post_delivery_days` de entrada == de saída, byte a byte
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` verde

---

### T06: `model/useNotificationsDraft.ts` — o estado da aba inteira

**What**: hook que inicializa o rascunho dos 15 eventos a partir de `resolveAllEventSettings`,
expõe `setField`/`setEnabled`/`refusalFor`/`canSave`/`isSaving`/`isDirty`/`save()`. `refusalFor`
compõe `notificationDraftRefusal` (T01) e, só para `material_instructions` ligado, o gate de
`materialAddressMissing` (T04). `save()` chama `buildNotificationsValue` (T05) +
`useUpdateSettings().mutateAsync`.
**Where**: `apps/backoffice/src/features/notification-settings/model/useNotificationsDraft.ts`
*(novo)* e teste
**Depends on**: T01, T02, T04, T05
**Reuses**: `useNotificationSettings`, `useMaterialSettings`, `useUpdateSettings`,
`resolveAllEventSettings`
**Requirement**: `ABN-03`, `ABN-04`, `ABN-05`, `ABN-08`, `ABN-12`, `ABN-13`

**Done when**:
- [ ] Draft inicializado do servidor; não se reinicializa sozinho enquanto há edição pendente
      (`isDirty`), mas volta ao estado do servidor quando a tela remonta sem salvar (`ABN-12`)
- [ ] `refusalFor('material_instructions')` com `enabled: true` e endereço vazio devolve recusa
      nomeando a aba Material; com `enabled: false` **não** recusa (ela pode digitar o texto sem
      travar, só não pode LIGAR)
- [ ] `refusalFor` de variável/tom/limite delega 100% para `notificationDraftRefusal` — nenhuma cópia
      local da composição (prova indireta de `ABN-11`, o guarda de disco em T13 confirma)
- [ ] `canSave` é `false` quando qualquer um dos 15 tem `refusalFor !== null`
- [ ] `save()` chama `useQueryClient`/`useUpdateSettings` dentro de um `QueryClientProvider` no teste
      (lição `L-030` do projeto — `renderHook` sem provider derruba com "No QueryClient set")
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` verde

---

### T07: `api/previewNotification.ts`

**What**: `previewNotification({ event, draft, orderId? })` — `supabase.functions.invoke
('send-notification?action=preview', { body: { event, channel: 'email', draft, order_id } })`;
nunca lança, devolve `{ error }` em qualquer falha.
**Where**: `apps/backoffice/src/features/notification-settings/api/previewNotification.ts` *(novo)*
e teste
**Depends on**: —
**Reuses**: mesmo padrão de `entities/order/api/notifyOrder.ts` (`resendNotification`)
**Requirement**: `ABN-06`, `ABN-07`

**Done when**:
- [ ] Corpo da chamada exato: `event`, `channel: 'email'`, `draft`, `order_id` só quando informado
- [ ] Resposta de sucesso repassada tal qual (`{ subject, html, text, sample }`)
- [ ] Erro de rede/function vira `{ error }`, sem `throw`
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` verde

---

### T08: `api/checkNotificationConfig.ts`

**What**: `useNotificationConfigCheck()` — `useQuery` sobre `?action=config-check`, `staleTime` de 5
minutos, devolve `undefined` em qualquer erro (nunca populate um estado de erro).
**Where**: `apps/backoffice/src/features/notification-settings/api/checkNotificationConfig.ts`
*(novo)* e teste
**Depends on**: —
**Requirement**: `ABN-09`

**Done when**:
- [ ] Sucesso devolve `{ adminPublicUrl: string }` a partir de `admin_public_url` da resposta
- [ ] Erro (rede, resposta sem o campo) devolve `undefined`, não lança
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` verde

---

### T09: `ui/EmailPreviewFrame.tsx`

**What**: `<iframe sandbox="" srcDoc={html}>`, alternância 390/600px, `text` abaixo em `<pre>`, selo
"Prévia de exemplo" quando `sample`, estado de erro no lugar do iframe.
**Where**: `apps/backoffice/src/features/notification-settings/ui/EmailPreviewFrame.tsx` *(novo)* e teste
**Depends on**: T07
**Requirement**: `ABN-06`, `ABN-07`

**Done when**:
- [ ] `srcDoc` recebe o `html` **tal qual** — nenhuma concatenação/recomposição no componente (prova:
      um `html` com uma tag inventada aparece intacta no `srcDoc`)
- [ ] Botões 390/600 mudam a largura declarada, nenhum terceiro valor
- [ ] `sample: true` mostra o selo; `sample: false` não mostra
- [ ] Estado de erro renderiza a mensagem, não um iframe vazio
- [ ] Alvos de toque ≥44px (`TAP_44`)
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` verde

---

### T10: `ui/EventCard.tsx`

**What**: um evento — rótulo (`NOTIFICATION_EVENT_LABELS`), toggle, os 5 campos com contador contra
`COPY_LIMITS`, recusa inline, banner de aviso (material/e-mail-vazio/URL-local), botão "ver prévia".
**Where**: `apps/backoffice/src/features/notification-settings/ui/EventCard.tsx` *(novo)* e teste
**Depends on**: T04, T06, T09
**Reuses**: `FieldGroup`, `ToggleField`, `FormCard` (`@/shared/ui`)
**Requirement**: `ABN-02`, `ABN-09`, parte de `ABN-10`

**Done when**:
- [ ] Renderiza **exatamente** `subject`, `heading`, `lead`, `extra[]` (até 5 linhas), `cta_label` —
      nenhum campo de itens/totais/endereço/rastreio/casca/CTA-destino
- [ ] Contador de caracteres por campo, contra `COPY_LIMITS` (subject 120 · heading 80 · lead 600 ·
      extra 160 cada, até 5 linhas)
- [ ] Recusa de `refusalFor` aparece inline junto ao campo
- [ ] Banner de aviso só em `material_instructions` (endereço) e nos dois `owner_*`
      (e-mail/URL) — nenhum outro evento mostra banner
- [ ] Todo alvo de toque ≥44px (`TAP_44`)
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` verde

---

### T11: `ui/NotificationsTab.tsx`

**What**: monta as três seções (T03), um `EventCard` por evento (T10), **um** preview ativo por vez
(abrir um fecha o anterior), `SaveButton` único da aba com `useToast` no erro.
**Where**: `apps/backoffice/src/features/notification-settings/ui/NotificationsTab.tsx` *(novo)*,
`index.ts` (barrel), e teste
**Depends on**: T03, T06, T10
**Reuses**: `useToast` (mesmo padrão das outras 7 abas)
**Requirement**: `ABN-01`, `ABN-12`

**Done when**:
- [ ] 15 cards, na ordem de `NOTIFICATION_EVENTS`, agrupados nas 3 seções com rótulo visível
- [ ] Nenhuma coluna/campo de WhatsApp em lugar nenhum da árvore
- [ ] Abrir a prévia de um card fecha a de outro que estivesse aberta
- [ ] Sair da aba sem salvar e voltar mostra o último estado do servidor (não o rascunho perdido)
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` verde

---

### T12: Wiring em `AdminSettingsPage.tsx`

**What**: `<TabsTrigger value="notifications">Notificações</TabsTrigger>` +
`<TabsContent value="notifications"><NotificationsTab /></TabsContent>`; `TabsList` de
`sm:grid-cols-7` para `sm:grid-cols-8`.
**Where**: `apps/backoffice/src/pages/admin/AdminSettingsPage.tsx`, `__tests__/AdminSettingsPage.test.tsx`
**Depends on**: T11
**Requirement**: `ABN-01`

**Done when**:
- [ ] A aba existe e monta `NotificationsTab`; as outras 7 abas continuam inalteradas
- [ ] `save()` da página **não** ganha um branch `notifications` (a aba é autocontida)
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` + `tsc` do backoffice verdes

---

### T13: Guarda `notificationCopySingleOwner.test.ts`

**What**: varredura de `apps/backoffice/src/**` recusando uma segunda declaração de
`URGENCY_TERMS`/regex de emoji equivalente, `NOTIFICATION_VARIABLES`, `COPY_LIMITS`, ou uma função
chamada `notificationCopyRefusal`/`variablesRefusal`/`limitsRefusal` que não seja **import** de
`@estrelinha/core/notifications`.
**Where**: `apps/backoffice/src/shared/lib/__tests__/notificationCopySingleOwner.test.ts` *(novo)*
**Depends on**: T06, T10, T11 (varre o código que elas produziram — não depende de T12, a aba não
precisa estar montada em `AdminSettingsPage` para o guarda ler o disco)
**Requirement**: `ABN-11`

**Done when**:
- [ ] Âncora dupla: arquivos lidos > 0 **e** ao menos um import real de `core/notifications`
      encontrado (senão o guarda passaria varrendo zero arquivo)
- [ ] Sensor: colar a lista de `URGENCY_TERMS` dentro de um arquivo de `apps/backoffice/**` faz o
      guarda reprovar
- [ ] Inverso: o import legítimo (`import { notificationCopyRefusal } from
      '@estrelinha/core/notifications'`) **não** é acusado
- [ ] Removedor de comentário com CRLF e LF (lição recorrente do projeto, `BL-027`)
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` verde

---

### T14: Prova em navegador — 390×844 e 1440

**What**: com `pnpm dev:backoffice` e o Supabase local rodando, abrir `/admin/configuracoes` →
Notificações via `playwright-cli`, medir `document.body.scrollWidth`, alvos de toque, testar o fluxo
completo: editar `lead` de `material_instructions` com o endereço vazio → recusa; preencher o
endereço na aba Material → salvar → sucesso; "ver prévia" → o iframe mostra o texto; digitar
`{{materia}}` → recusa nomeando a variável; ligar `owner_order_paid` e conferir o aviso de URL local
(o `ADMIN_PUBLIC_URL` do ambiente local É `http://localhost:8083` — o aviso deve aparecer de verdade
aqui). Repetir em 1440. Capturas e medidas para `validation.md`.
**Where**: `.specs/features/53-aba-de-notificacoes/validation.md` (seção *Prova em navegador*)
**Depends on**: T12, T13
**Requirement**: `ABN-10`

**Done when**:
- [ ] `scrollWidth` do `body` == largura da viewport nas duas larguras
- [ ] Nenhum controle <44px (lista dos medidos)
- [ ] O fluxo de recusa de material funciona ponta a ponta, e some ao preencher o endereço
- [ ] O aviso de `admin_public_url` local aparece nos cards `owner_*` (é verdadeiro no ambiente local)
- [ ] Defeitos achados viram correções **antes** da T15, não dívida registrada

---

### T15: Fecho — baselines, documentação, backlog, decisão

**What**: medir os 5 workspaces (um por vez, exit code fora de pipe, `--testTimeout=20000`), lint,
tipos, `pnpm build`; atualizar `CLAUDE.md` (tabela de baselines + "O que espera decisão da dona"),
`supabase/CLAUDE.md` (a linha "os outros onze esperam a aba... que não existe" deixa de valer),
fechar `BL-033` no `BACKLOG.md` com referência a esta feature, atualizar o `Status` das linhas
`PNL-01..10`/`PDC-01` na tabela de `42/spec.md` apontando para `53`, `STATE.md` Handoff. Gerar os
commits completos (`BL-012`).
**Where**: `CLAUDE.md`, `supabase/CLAUDE.md`, `.specs/BACKLOG.md`, `.specs/features/42-.../spec.md`,
`.specs/STATE.md`
**Depends on**: T14
**Requirement**: — (fecho)

**Done when**:
- [ ] Os 5 workspaces medidos e registrados, com delta contra 9742/498 explicado por arquivo/guarda
- [ ] `git diff --name-only -- packages/core/src/payment` vazio
- [ ] `BL-033` marcada FECHADA, com o que ficou de fora (rotina de `post_delivery_care`, `BL-037`)
      registrado como "O que espera decisão/infra" se ainda não estiver
- [ ] Commits gerados de uma vez, mensagem descrevendo a feature inteira

---

## Phase Execution Map

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7

Fase 1:  T01
Fase 2:  T02
Fase 3:  T03    T04    T05  (independentes) ──┬──→ T06 (← T01, T02, T04, T05)
                                                │
Fase 4:  T07    T08  (independentes)           │
                 │                              │
Fase 5:  T07 ──→ T09 ──→ T10 (← T04, T06, T09) ──→ T11 (← T03, T06, T10)
Fase 6:  T11 ──→ T12         T11 ──→ T13 (← T06, T10, T11)     T12, T13 ──→ T14
Fase 7:  T14 ──→ T15
```

**Cross-check** (Depends on ↔ diagrama): `T04`→`T06` ✅ · `T05`→`T06` ✅ · `T01`→`T06` ✅ (fase
anterior) · `T02`→`T06` ✅ (fase anterior) · `T07`→`T09` ✅ · `T04`→`T10` ✅ · `T06`→`T10` ✅ ·
`T09`→`T10` ✅ · `T03`→`T11` ✅ · `T06`→`T11` ✅ · `T10`→`T11` ✅ · `T11`→`T12` ✅ · `T06`→`T13` ✅ ·
`T10`→`T13` ✅ · `T11`→`T13` ✅ · `T12`→`T14` ✅ · `T13`→`T14` ✅ · `T14`→`T15` ✅. `T12` e `T13` entre
si: nenhuma seta, nenhum `Depends on` — os dois só precisam de `T11`, não um do outro. `T03`, `T04`,
`T05` entre si: idem. `T07`/`T08` entre si: idem.
