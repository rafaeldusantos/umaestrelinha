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

### T01: `notificationDraftRefusal` ganha dono em `core` ✅

> Concluída em 2026-09-19. Movida corpo a corpo para `packages/core/src/notifications/copy.ts`, com
> uma mudança de assinatura exigida pelo próprio design: `channel` deixou de ser literal `'email'`
> hard-coded dentro do corpo e virou parâmetro (`notificationDraftRefusal(event, channel, fields)`).
> `handlers.ts` passou a importar e delegar — `export const draftRefusal = notificationDraftRefusal`
> (identidade, não cópia) — e `preview()` chama a versão de `core`. Os 4 casos originais de
> `handlers.test.ts:591-620` migraram para `copy.test.ts`, mais 2 novos que só fazem sentido depois da
> mudança de assinatura (o terceiro estágio, tamanho, e o `channel` como parâmetro). `handlers.test.ts`
> ficou só com a checagem de identidade (`toBe`) e um smoke test. **A contagem de `functions` CAIU em
> 2** (654→652) — é o esperado, não uma perda: 4 casos viraram 2 (wiring), e os outros migraram para
> `core`, que subiu 6 (as 4 migradas + 2 novas). Líquido combinado core+functions: **+4**, e nenhum
> comportamento perdeu cobertura — é o mesmo caso, medido no lugar novo.
>
> Gates: `core` 2372→2378/93 (+6) · `functions` 654→652/14 (−2, explicado acima). Os dois exit 0.

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
- [x] `notificationDraftRefusal` exportado de `core/notifications`, com os mesmos 6+ casos que
      `handlers.test.ts:591-619` tinha, movidos para `copy.test.ts`
- [x] `handlers.ts` não declara mais a composição — só importa e chama; `handlers.test.ts` mantém uma
      checagem de identidade/wiring (`draftRefusal === notificationDraftRefusal` ou smoke test
      equivalente), não a lista inteira de casos
- [x] Import por caminho relativo com `.ts` explícito (grafo do Deno)
- [x] Gate: `pnpm --filter @estrelinha/core test --testTimeout=20000` e
      `pnpm --filter @estrelinha/functions test --testTimeout=20000` verdes, contagem de `functions`
      sem queda líquida (casos migram, não somem) — **líquido combinado core+functions em +4**; a
      queda isolada de `functions` (−2) é o esperado do encolhimento de `handlers.test.ts` para
      wiring-only, ver nota de fecho acima

---

### T02: `useNotificationSettings()` ✅

> Concluída em 2026-09-19. Leitura RASA, mesmo molde de `useMaterialSettings`. Testes: default sem
> linha no banco, linha gravada (parcial no sentido de faltar campos de `events`, não descartada por
> `fetchAllSettings`), e erro de consulta devolvendo o default. Gate: `core` 2378→2381/93 (+3).

**What**: hook novo em `useStoreSettings.ts`, mesmo molde de `useMaterialSettings`/
`useGoogleShoppingSettings` — `data?.notifications ?? DEFAULT_NOTIFICATIONS`.
**Where**: `packages/core/src/hooks/useStoreSettings.ts`, `__tests__/useStoreSettings.test.tsx`
**Depends on**: —
**Reuses**: `DEFAULT_NOTIFICATIONS` (já importado neste arquivo desde a T8 da `42`)
**Requirement**: `ABN-01` (leitura que sustenta a aba inteira)

**Done when**:
- [x] `useNotificationSettings()` exportado, devolve o default quando a linha do banco está ausente
- [x] Teste: uma linha `notifications` parcial vinda do dublê é lida (mesmo sensor de
      `storeSettingsDefaults`/T19 original: `if (key in map)` não descarta)
- [x] Gate: `pnpm --filter @estrelinha/core test --testTimeout=20000` verde

---

### T03: `model/sections.ts` — as três seções, derivadas ✅

> Concluída em 2026-09-19. `sectionFor` checa audiência `owner` primeiro, depois `isMaterialEvent`,
> depois o resto — na ORDEM da spec, mesmo os dois grupos nunca se sobrepondo hoje. `groupedEvents()`
> itera `NOTIFICATION_EVENTS` uma vez. Âncora de contagem (soma = 15, sem repetição), ordem por
> índice, e o par material/owner exato. Gate: backoffice +10 testes (só este arquivo; ver T04/T05
> abaixo para os outros dois do lote medidos juntos).

**What**: `NotificationSection`, `SECTION_LABELS`, `sectionFor(event)`, `groupedEvents()` — deriva
de `EVENT_AUDIENCE`/`isMaterialEvent`, nunca uma lista nova.
**Where**: `apps/backoffice/src/features/notification-settings/model/sections.ts` *(novo)* e teste
**Depends on**: —
**Reuses**: `NOTIFICATION_EVENTS`, `EVENT_AUDIENCE`, `isMaterialEvent` de `@estrelinha/core/notifications`
**Requirement**: `ABN-01`

**Done when**:
- [x] Os 15 eventos cobertos, cada um em **exatamente uma** seção (soma das três seções = 15, sem
      repetição — âncora de contagem)
- [x] Dentro de cada seção, a ordem é a de `NOTIFICATION_EVENTS` (prova: comparar índices)
- [x] Sensor: um evento de material classificado como `customer` por engano faz o caso de contagem
      da seção "Material" cair
- [x] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` verde

---

### T04: `model/preconditions.ts` — as duas réguas ✅

> Concluída em 2026-09-19. `materialAddressMissing` (trim vazio) e `adminUrlLooksLocal` (não começa
> com `https://` OU contém `localhost`/`127.0.0.1`; string vazia conta como "não é produção", nunca
> "não sei"). 9 casos, incluindo o default `DEFAULT_MATERIAL` (street vazio → true) e a forma `http://`
> sem "s".

**What**: `materialAddressMissing(material)`, `adminUrlLooksLocal(adminPublicUrl)`.
**Where**: `apps/backoffice/src/features/notification-settings/model/preconditions.ts` *(novo)* e teste
**Depends on**: —
**Reuses**: `MaterialSettings` de `@estrelinha/supabase/types/settings`
**Requirement**: `ABN-08`, `ABN-09`

**Done when**:
- [x] `materialAddressMissing`: `street` vazio ou só espaço ⇒ `true`; preenchido ⇒ `false`
- [x] `adminUrlLooksLocal`: `http://localhost:8083` ⇒ `true`; `https://painel.umaestrelinha.com.br` ⇒
      `false`; string vazia ⇒ `true` (trata ausência como "não é de produção", não como "não sei")
- [x] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` verde

---

### T05: `model/notificationsWrite.ts` — a escrita sempre com os 15 ✅

> Concluída em 2026-09-19. `buildNotificationsValue` itera `NOTIFICATION_EVENTS` uma vez, monta
> `{ email: resolved[event] }` por chave. Sensor real: um `resolved` de faz-de-conta com `subject`
> distinto de `DEFAULT_NOTIFICATIONS` em TODOS os 15 eventos, editar só `pix_expired`, e provar que os
> outros 14 saem com o valor do `resolved` (não do default) — se a função reconstruísse do default por
> engano, o assert do subject fake reprovaria. `post_delivery_days` preservado byte a byte, incluindo
> o valor 0. Gate: T03+T04+T05 juntos, backoffice 2711→2735/151 (+24/+3, exatamente os 10+9+5 casos).

**What**: `buildNotificationsValue(resolved, postDeliveryDays)` — reconstrói `NotificationSettings`
iterando `NOTIFICATION_EVENTS` uma vez; `post_delivery_days` é preservado, nunca editado aqui.
**Where**: `apps/backoffice/src/features/notification-settings/model/notificationsWrite.ts` *(novo)* e teste
**Depends on**: —
**Reuses**: `NOTIFICATION_EVENTS`
**Requirement**: `ABN-13`

**Done when**:
- [x] O objeto construído tem **as 15 chaves** de `events`, sempre — mesmo quando `resolved` só
      reflete edição de 1 evento
- [x] Sensor: construir passando um `resolved` com só `pix_expired` alterado prova que os outros 14
      saem com o valor de `resolved` (não com `DEFAULT_NOTIFICATIONS` por engano — `resolved` já veio
      resolvido de `resolveAllEventSettings`, o teste finge isso com um dublê)
- [x] `post_delivery_days` de entrada == de saída, byte a byte
- [x] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` verde

---

### T06: `model/useNotificationsDraft.ts` — o estado da aba inteira ✅

> Concluída em 2026-09-19. Teste com hooks REAIS de `core` (não dublados) sob `QueryClientProvider` de
> verdade + mock só do client Supabase — molde de `useStoreSettings.test.ts`, exatamente pela razão
> que a Done-when nomeia (L-030). 12 casos: inicialização (do gravado e do default), `ABN-12` nos DOIS
> sentidos (edição pendente sobrevive a um `invalidateQueries` simulando refetch; remontar sem salvar
> mostra o último estado do SERVIDOR, não o rascunho), o gate de material nos três estados
> (ligado+vazio, ligado+preenchido, desligado+vazio), a delegação a `notificationDraftRefusal` provada
> por IGUALDADE de string (não só "não é null"), `canSave` caindo por 1 entre 15 sem contaminar os
> outros, e `save()` nos dois desfechos (bloqueado sem chamar `upsert`; sucesso gravando as 15 chaves
> e limpando `isDirty`). Gate: backoffice +12 (medido junto com T07/T08 abaixo).

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
- [x] Draft inicializado do servidor; não se reinicializa sozinho enquanto há edição pendente
      (`isDirty`), mas volta ao estado do servidor quando a tela remonta sem salvar (`ABN-12`)
- [x] `refusalFor('material_instructions')` com `enabled: true` e endereço vazio devolve recusa
      nomeando a aba Material; com `enabled: false` **não** recusa (ela pode digitar o texto sem
      travar, só não pode LIGAR)
- [x] `refusalFor` de variável/tom/limite delega 100% para `notificationDraftRefusal` — nenhuma cópia
      local da composição (prova indireta de `ABN-11`, o guarda de disco em T13 confirma)
- [x] `canSave` é `false` quando qualquer um dos 15 tem `refusalFor !== null`
- [x] `save()` chama `useQueryClient`/`useUpdateSettings` dentro de um `QueryClientProvider` no teste
      (lição `L-030` do projeto — `renderHook` sem provider derruba com "No QueryClient set")
- [x] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` verde

---

### T07: `api/previewNotification.ts` ✅

> Concluída em 2026-09-19. `motivoDaFalha` (molde de `useAdminUsers.ts`) lê o corpo do
> `FunctionsHttpError` — sem isso a recusa 422 de `notificationDraftRefusal` (ex.: "Variável
> desconhecida: {{materia}}.") chegaria à tela como "Edge Function returned a non-2xx status code".
> 6 casos: corpo exato com e sem `order_id`, resposta repassada byte a byte (`html` com atributo
> inventado sobrevive intacto — prova de "não recompõe"), falha de rede, 422 com corpo legível, e erro
> sem corpo legível caindo no fallback em português.

**What**: `previewNotification({ event, draft, orderId? })` — `supabase.functions.invoke
('send-notification?action=preview', { body: { event, channel: 'email', draft, order_id } })`;
nunca lança, devolve `{ error }` em qualquer falha.
**Where**: `apps/backoffice/src/features/notification-settings/api/previewNotification.ts` *(novo)*
e teste
**Depends on**: —
**Reuses**: mesmo padrão de `entities/order/api/notifyOrder.ts` (`resendNotification`)
**Requirement**: `ABN-06`, `ABN-07`

**Done when**:
- [x] Corpo da chamada exato: `event`, `channel: 'email'`, `draft`, `order_id` só quando informado
- [x] Resposta de sucesso repassada tal qual (`{ subject, html, text, sample }`)
- [x] Erro de rede/function vira `{ error }`, sem `throw`
- [x] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` verde

---

### T08: `api/checkNotificationConfig.ts` ✅

> Concluída em 2026-09-19. Um desvio pequeno e declarado do design: o `queryFn` devolve `null` (não
> `undefined`) no caminho de falha, porque React Query v5 trata `data: undefined` vindo do `queryFn`
> como consulta inválida e reclama no console ("Query data cannot be undefined") — `null` é dado
> válido para a biblioteca. `useNotificationConfigCheck()` traduz para a interface pública
> (`data ?? undefined`), que continua sendo exatamente `{ adminPublicUrl: string } | undefined`. Os
> testes de falha esperam a query **assentar** (`fetchStatus === 'idle'` e `status !== 'pending'`) via
> `client.getQueryState`, não só o valor inicial — que também é `undefined` durante o carregamento, e
> um `waitFor` ingênuo passaria sem provar que o caminho de erro foi exercitado. Gate: T06+T07+T08
> juntos, backoffice 2711→2758/154 (+47/+6 — exatamente 10+9+5+6+5+12 dos seis arquivos do lote T03-T08).

**What**: `useNotificationConfigCheck()` — `useQuery` sobre `?action=config-check`, `staleTime` de 5
minutos, devolve `undefined` em qualquer erro (nunca populate um estado de erro).
**Where**: `apps/backoffice/src/features/notification-settings/api/checkNotificationConfig.ts`
*(novo)* e teste
**Depends on**: —
**Requirement**: `ABN-09`

**Done when**:
- [x] Sucesso devolve `{ adminPublicUrl: string }` a partir de `admin_public_url` da resposta
- [x] Erro (rede, resposta sem o campo) devolve `undefined`, não lança
- [x] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` verde

---

### T09: `ui/EmailPreviewFrame.tsx` ✅

> Concluída. `<iframe sandbox="" srcDoc={html}>`, sem recompor — provado por tag inventada
> sobrevivendo intacta no `srcdoc`. Alternância 390/600px por par de botões (`aria-pressed`, `h-11`,
> nenhum terceiro valor), texto em `<pre className="whitespace-pre-wrap">` abaixo do iframe, selo
> "Prévia de exemplo" só quando `sample`, e estado de erro (`role="alert"`) no lugar do iframe — nunca
> vazio em silêncio. Gate: backoffice +10 (só este arquivo).



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

### T10: `ui/EventCard.tsx` ✅

> Concluída. Componente CONTROLADO pelo pai — rótulo (`NOTIFICATION_EVENT_LABELS`), `ToggleField`,
> exatamente os 5 campos (`subject`/`heading`/`lead`/`extra[]` até 5 linhas/`cta_label`) com contador
> contra `COPY_LIMITS`, recusa inline (`role="alert"`) vinda de `refusalFor`, banner de aviso
> (`role="status"`) quando `warnings.length > 0` — sem desabilitar o toggle —, e "ver prévia"
> montando `EmailPreviewFrame` só quando `previewActive` (o estado do preview mora no pai, T11, para
> nunca haver 15 iframes simultâneos). Alvos de toque em classe literal (`h-11`/`w-11`) — **não**
> `TAP_44`, que é de `apps/store` e o painel nunca importa (convenção já registrada em
> `apps/backoffice/CLAUDE.md`, seção do `NavRail`). Gate: backoffice +15.



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

### T11: `ui/NotificationsTab.tsx` ✅

> Concluída. Monta as três seções (T03) com um `EventCard` (T10) por evento, na ordem
> `NOTIFICATION_SECTIONS.flatMap(groupedEvents)` — que dentro de cada seção é a de
> `NOTIFICATION_EVENTS`, mas o flat inteiro da tela NÃO é literalmente `NOTIFICATION_EVENTS` (que
> intercala customer/material/owner); é o achatado seção a seção. `NotificationsTab.test.tsx` prova
> isso comparando com `NOTIFICATION_SECTIONS.flatMap((s) => groupedEvents()[s])`. Um preview ativo
> por vez (estado no pai — abrir um fecha o anterior, provado clicando em dois cards em sequência).
> Os avisos de `ABN-09` são computados aqui (`warningsFor`, inline — um único consumidor, não vai
> para `core` nem para um arquivo próprio) a partir de `materialAddressMissing`/`adminUrlLooksLocal`
> (T04) + `useMaterialSettings`/`useGeneralSettings`/`useNotificationConfigCheck` (T08), com textos
> DISTINTOS para e-mail vazio e URL local. `SaveButton` único chamando `draftState.save()`, com
> `useToast` no erro (mesmo padrão das outras 7 abas). Barrel `index.ts` exporta só `NotificationsTab`.
> Gate: backoffice +12 (+9 em `NotificationsTab.test.tsx`, incluindo a correção do primeiro caso de
> ordem, que media `NOTIFICATION_EVENTS` cru contra o flat agrupado — errado por construção — e foi
> reescrito para comparar contra `groupedEvents()`, achado ao rodar o teste pela primeira vez).



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

### T12: Wiring em `AdminSettingsPage.tsx` ✅

> Concluída. `TabsTrigger`/`TabsContent` de "Notificações" entre Checkout e SEO; `sm:grid-cols-7` →
> `sm:grid-cols-8`. `PageSettingsKey` passou a excluir `'notifications'` além de `'checkout'`
> (`Exclude<SettingsKey, 'checkout' | 'notifications'>`), o que torna `save('notifications')`
> **inalcançável por `tsc`** — mecanismo mais forte que um teste de runtime para "esta página não
> ganha um branch novo". `AdminSettingsPage.test.tsx` dubla `NotificationsTab` (mesmo molde de
> `CheckoutSettingsCard`, porque ela tem o PRÓPRIO `useNotificationsDraft`/`useUpdateSettings`, e o
> mock de `useStoreSettings` deste arquivo não declara `useNotificationSettings`/
> `useMaterialSettings`) e prova só a fiação: a aba existe, as outras 7 continuam de pé, selecionar
> monta o stub, e abrir a aba não chama o `mutateAsync` da página. Achado ao rodar `tsc`: o estado do
> preview (`PreviewState`) tinha sido escrito como união discriminada por `loading: true | false` —
> exatamente a forma que o `CLAUDE.md` da raiz avisa que **não estreita** sob `strictNullChecks:
> false` — e virou uma interface com `result` opcional. Gate: backoffice +3 (AdminSettingsPage.test.tsx
> 17→20); `tsc` do backoffice em 0.



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

### T13: Guarda `notificationCopySingleOwner.test.ts` ✅

> Concluída. Varre `apps/backoffice/src/**`, com o stripper de comentário de `freeShippingSingleOwner`
> (linha e bloco na mesma varredura, CRLF normalizado primeiro — `BL-027`). Recusa **declaração**
> (`const NOME =`/`function nome(`), nunca menção — `import { COPY_LIMITS } from
> '@estrelinha/core/notifications'` (o import real de `EventCard.tsx`) passa limpo. A régua roda só
> contra **produção** (`producao`, filtrando `.test.ts`/`__tests__/`): rodá-la contra `varridos`
> inteiro fazia o PRÓPRIO arquivo de teste reprovar, porque os sensores citam as formas proibidas
> como string dentro de fixtures sintéticas — achado ao rodar pela primeira vez, corrigido no molde
> que `freeShippingSingleOwner.test.ts` já usa (a régua nunca pode ser o objeto medido). Âncora dupla
> (arquivos lidos > 100, e o import real de `COPY_LIMITS` em `EventCard.tsx` encontrado) e sensores:
> injeção de `URGENCY_TERMS`, das duas formas de função (`function`/`const =>`), da régua de emoji
> (`Extended_Pictographic`), do ponto cego do glob de dois asteriscos (`BL-027`), o inverso do import
> legítimo (as cinco réguas importadas juntas, sem casar nada) e a prova contra o arquivo real.
> Gate: backoffice +13.



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

### T14: Prova em navegador — 390×844 e 1440 ✅

> Concluída — evidência completa em `validation.md`. `scrollWidth === innerWidth` nos dois tamanhos,
> os 15 cards renderizam, e o fluxo funcional inteiro foi exercitado ponta a ponta (recusa de
> material → preencher endereço → salvar com sucesso, conferido no Postgres real com as 15 chaves;
> "ver prévia" trazendo HTML real de 4347 caracteres da mesma function que envia; recusa de
> `{{materia}}` nomeando a variável; o aviso de `admin_public_url` local aparecendo de verdade nos
> dois cards `owner_*`, como a task previu). **Dois defeitos reais achados e corrigidos antes de
> fechar** (nenhum deixado como dívida): o `Switch` de cada evento media 24px de altura (abaixo do
> piso de 44px) e a `TabsList` de 8 abas tinha a 3ª linha cortada por um `h-10` fixo do componente
> compartilhado, sobrepondo o título da seção. Os dois consertos são aditivos/locais — não mudam
> nenhum dos 7 outros usos existentes de `ToggleField`/`TabsList` no painel. Achado de
> infraestrutura à parte: o container do edge runtime local estava parado há 5 dias e precisou de
> `supabase stop` + `supabase start` (sem `--all`) para religar.

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

### T15: Fecho — baselines, documentação, backlog, decisão ✅

> Concluída. Os 5 workspaces medidos (9881/509 no fecho, +116/+10 desta feature sobre a entrada real
> de 9742/498 — o resto, +23/+1, é a feature `54`, numa árvore compartilhada). Lint 26/6, tipos
> 0·0·0, `pnpm build` verde nos dois apps, `payment/**` intocado. `CLAUDE.md` da raiz (tabela de
> baselines + "O que espera decisão da dona"), `apps/backoffice/CLAUDE.md` (seção nova da aba),
> `supabase/CLAUDE.md` (a linha do `send-notification` corrigida), `BL-033` fechada no `BACKLOG.md`
> (com `BL-037` referenciada explicitamente), a tabela de rastreabilidade da `42/spec.md` atualizada
> — com uma correção: três linhas (`PNL-06`, `07`, `08`) já estavam implementadas na Phase 1 da
> própria `42` e foram creditadas a ela, não a `53`, para não afirmar rastreabilidade falsa.
> `STATE.md` → Handoff substituído (só o corpo, `## Decisions` intocada). A verificação final
> (standalone, seção *Verificação final* em `validation.md`) achou e corrigiu uma lacuna real —
> `ABN-07` sem campo de `order_id` na UI — além de matar os três mutantes pedidos
> (`ABN-13`, `ABN-08`, `ABN-04`/`ABN-05`), todos sem sobrevivente. Commits gerados na sequência.

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
