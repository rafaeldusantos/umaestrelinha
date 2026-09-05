# Tasks — frete grátis configurável

> **T01–T08 CONCLUÍDAS** em 2026-09-05. Gate em [`validation.md`](./validation.md).
> **Sem commit**: a árvore de trabalho carrega as features `33`, `34`, `35` e `36` não commitadas, e
> `CLAUDE.md`, `.specs/STATE.md` e `apps/backoffice/CLAUDE.md` já estavam modificados antes desta
> feature começar. Commitar sem separar varreria trabalho de terceiros para dentro do commit da `37`.

**Oito tasks, um lote.** A granularidade é por *unidade coerente com teste próprio*, não por arquivo:
as superfícies desta feature leem todas a **mesma** função nova, e fatiá-las em uma task por arquivo
multiplicaria o número de vezes que alguém pode escrever a leitura de um jeito diferente — que é
exatamente o defeito que a feature existe para fechar.

**Commits**: NÃO há commit por task. Regra do `CLAUDE.md` (`BL-012`, decisão do usuário de
2026-08-15) — implementar tudo, rodar o gate, e gerar os commits completos de uma vez no fim. O custo
conhecido e aceito é perder a correspondência 1:1 entre commit e "done when".

**Ordem é dependência real**: T01→T02→T03 constroem o dono da regra; T04–T07 só existem porque ele
existe; T08 é o que impede o nono leitor.

---

## Fase 1 — A configuração e a regra ganham dono

### T01 — `free_shipping_enabled` existe, no TypeScript e no banco

**Requisitos**: `FRG-01`, `FRG-10`, `FRG-11` · **AC**: 4, 21, 22, 23

- `packages/supabase/src/types/settings.ts`: campo `free_shipping_enabled: boolean` em
  `ShippingSettings`, com comentário dizendo por que é booleano próprio e não `threshold > 0`;
  `DEFAULT_SHIPPING.free_shipping_enabled = false`.
- `supabase/migrations/20260905120000_37-frete-gratis-configuravel.sql`: `UPDATE … SET value = value
  || jsonb_build_object('free_shipping_enabled', false) WHERE key = 'shipping' AND NOT value ?
  'free_shipping_enabled'`.
- `storeSettingsDefaults.test.ts`: bloco novo que lê **esta** migration do disco e compara com
  `DEFAULT_SHIPPING`, com âncora de leitura (molde do bloco `google_shopping`).

**Done when**: `pnpm --filter @estrelinha/store test storeSettingsDefaults` passa; trocar o `false`
do `.sql` para `true` reprova.

---

### T02 — A regra pura, com as três invariantes

**Requisitos**: `FRG-03` · **AC**: 16, 17, 18, 20

- `packages/core/src/shipping/freeShipping.ts`: `FreeShippingConfig`, `FreeShippingState`,
  `freeShippingState()`, `freeShippingRefusal()`. Sem React/Supabase/Deno; imports relativos com
  `.ts` explícito.
- `packages/core/src/shipping/index.ts` reexporta.
- `packages/core/src/shipping/__tests__/freeShipping.test.ts`: as três invariantes; subtotal acima da
  faixa **com o interruptor desligado** devolvendo `reached: false`; faixa zero e negativa sem
  `Infinity`/`NaN`; os **3 casos migrados** de `drawerFacts.test.ts`; `freeShippingRefusal` nos dois
  vereditos; teste de pureza (nenhum import de React/Supabase/Deno).

**Done when**: `pnpm --filter @estrelinha/core test` passa e cobre os casos acima.

---

### T03 — O binding: hook, runtime e `RuntimeSettingsLoader`

**Requisitos**: `FRG-03`, `FRG-07` · **AC**: 16

- `packages/core/src/hooks/useFreeShipping.ts`: `useFreeShipping(subtotal = 0)`, memoizado pelas
  primitivas.
- `packages/core/src/constants.ts`: `FREE_SHIPPING_ENABLED`, `setRuntimeShippingSettings` aceitando o
  terceiro campo, e `runtimeFreeShippingConfig(): FreeShippingConfig`.
- `apps/store/src/app/RuntimeSettingsLoader.tsx`: hidrata os três campos.

**Done when**: `useFreeShipping` devolve estado inativo com o interruptor desligado e ativo com ele
ligado, provado em teste de hook.

---

## Fase 2 — A loja para de prometer

### T04 — Vitrine: home, produto, políticas e o overlay de login

**Requisitos**: `FRG-04`, `FRG-13` · **AC**: 5, 6, 7, 10, 11

- `TrustBar.tsx`, `ProductTrustBadges.tsx`, `PoliciesPage.tsx`: trocam `useShippingSettings` por
  `useFreeShipping`; a condição passa a ser `active`.
- `AuthOverlay.tsx`: o literal `'Frete grátis acima de R$150'` morre; o item nasce das settings e
  **some** quando inativo.
- Testes: cada superfície ganha caso desligado **e** caso ligado (11 exige que ligado siga igual).
  `TrustBar.test.tsx` e `copyInstitucional.test.tsx` passam a alternar `free_shipping_enabled`.

**Done when**: com o interruptor desligado, nenhuma das quatro superfícies renderiza "frete grátis".

---

### T05 — Gaveta do carrinho, e o segundo dono é apagado

**Requisitos**: `FRG-05`, `FRG-03` · **AC**: 8

- `drawerFacts.ts`: `freeShippingProgress` e `FreeShippingProgress` **saem** (os 3 testes migraram na
  T02).
- `CartDrawer.tsx`: usa `useFreeShipping(subtotal)`; a faixa de progresso e a `CrossSell` só
  renderizam com `active`; `useAllProducts` só busca com `active && !reached`; o `shippingCost`
  passado ao `CouponInput` sai de `reached`.
- `features/shipping-calc/ui/FreeShippingBar.tsx` e sua linha no barrel: **apagados**.
- `CartDrawer.test.tsx`: caso desligado (sem faixa, sem `CrossSell`) e caso ligado.

**Done when**: `grep -rn "freeShippingProgress\|FreeShippingBar" apps/` não casa nada.

---

### T06 — Checkout: o resumo e a entrega

**Requisitos**: `FRG-06`, `FRG-07`, `FRG-08` · **AC**: 9, 12, 14, 15

- `OrderSummary.tsx`: `freeShippingBand` só existe com `active`; o sufixo ` · frete grátis` da barra
  mobile idem.
- `DeliveryBlock.tsx`: `thresholdReached` passa a vir de `useFreeShipping(subtotal).reached`. O ramo
  do cupom `free_shipping` **não é tocado**.
- `cartStore.ts`: `shippingCost()` usa `freeShippingState(runtimeFreeShippingConfig(), sub)`.
- Testes: `OrderSummary.test.tsx` e `DeliveryBlock.test.tsx` com os dois estados; **um caso explícito
  de cupom `free_shipping` com o interruptor desligado**, provando que o frete segue zerado (AC 14).

**Done when**: com o interruptor desligado e subtotal acima da faixa, a opção mais barata mantém o
preço cotado e `shippingCost()` devolve `default_shipping_cost`.

---

## Fase 3 — O painel e o guarda

### T07 — A aba Frete ganha interruptor, e recusa configuração impossível

**Requisitos**: `FRG-02`, `FRG-12` · **AC**: 1, 2, 3, 24, 25

- `AdminSettingsPage.tsx`: `ToggleField` "Oferecer frete grátis"; campo do valor **desabilitado**
  (não escondido) com o interruptor desligado; `save('shipping')` chama `freeShippingRefusal` antes do
  upsert e aborta com toast quando há motivo.
- `AdminSettingsPage.test.tsx`: alternar e salvar preserva o threshold; ligado com faixa zero recusa
  **e não chama o upsert**.

**Done when**: a recusa é provada pela **ausência** de chamada de escrita, não só pelo toast.

---

### T08 — O guarda do dono único, e o gate

**Requisitos**: `FRG-09` · **AC**: 19

- `apps/store/src/shared/lib/__tests__/freeShippingSingleOwner.test.ts`: recusa
  `free_shipping_threshold` em `apps/**` fora do allowlist de **um** arquivo escrito literalmente;
  recusa o nome `freeShippingProgress`; recusa copy com valor cravado. **Âncora dupla** (arquivos
  varridos **e** ocorrências legítimas), e sensor por mutação para cada asserção.
- Gate, **um workspace por vez**, com exit code capturado: `store`, `backoffice`, `core`.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` e o do backoffice.
- `pnpm lint` contra a baseline 27/5.
- `git diff --name-only` provando `packages/core/src/payment/**` e `supabase/functions/**` intocados.
- Navegador real: **390px primeiro**, depois 1440, com o interruptor nos dois estados.
- Atualizar `CLAUDE.md` (baselines + o passo de operação "ligar o frete grátis"),
  `apps/store/CLAUDE.md`, `apps/backoffice/CLAUDE.md`, `.specs/STATE.md` (handoff + decisão).

**Done when**: os três workspaces passam isolados, tipos em 0, lint sem regressão, e o navegador
confirma os dois estados em 390px.

---

## Rastreabilidade

| Task | Requisitos | AC |
| --- | --- | --- |
| T01 | `FRG-01`, `FRG-10`, `FRG-11` | 4, 21, 22, 23 |
| T02 | `FRG-03` | 16, 17, 18, 20 |
| T03 | `FRG-03`, `FRG-07` | 16 |
| T04 | `FRG-04`, `FRG-13` | 5, 6, 7, 10, 11 |
| T05 | `FRG-05`, `FRG-03` | 8 |
| T06 | `FRG-06`, `FRG-07`, `FRG-08` | 9, 12, 14, 15 |
| T07 | `FRG-02`, `FRG-12` | 1, 2, 3, 24, 25 |
| T08 | `FRG-09` | 19 |

Toda AC de 1 a 25 tem task. Nenhuma task existe sem AC.
