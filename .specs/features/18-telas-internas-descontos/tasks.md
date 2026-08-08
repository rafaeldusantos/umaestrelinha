# 18 — Tasks

**Design foi feito inline**: nenhuma decisão de arquitetura nova. Cada peça desta feature tem molde
já no repo — `AdminProductFormPage` (formulário em rota com `?from=`), `ProductFormHeader`
(cabeçalho fixo com `⌘S`), `AdminOrdersPage` (`Popover` + `Calendar`), `AdminPromotionsPage`
(listagem do grupo Descontos, com pausar/duplicar). O trabalho é mudar de moldura sem mexer em regra.

**Commit**: um único commit no fim da feature, conforme `CLAUDE.md` — nenhuma task commita.

---

## Fase 1 — A fundação compartilhada

Quatro peças que as duas telas usam. Vêm primeiro porque cada uma delas hoje existe **duplicada** ou
não existe.

### T1 · `shared/lib/dateOnly.ts` — o dia, sem fuso (DSC-05 AC 5)

Hoje há **dois** leitores do mesmo ISO: `AdminCouponsPage.toDateInput` corta a string
(`iso.slice(0,10)`, componentes UTC) e `promotion-form/model/schema.ts` usa os getters locais. Em
qualquer fuso negativo — todos os do Brasil — os dois concordam para o que o próprio admin gravou, e
divergem para o que veio de seed/SQL como meia-noite UTC.

- `dateOnlyFromIso(iso): 'YYYY-MM-DD' | ''` — componentes **UTC**.
- `isoFromDateOnly('YYYY-MM-DD'): string | null` — meia-noite **local** (convenção de gravação já
  vigente; mudá-la é `BL-004`, não esta task).
- `dateFromDateOnly` / `dateOnlyFromDate` — ponte com o `Date` que o `react-day-picker` exige.
- `formatDateOnly(iso): 'dd/MM/yyyy'` e `shortDateOnly(iso): 'dd/MM'`.

**Gate**: testes com ISO de meia-noite local e de meia-noite UTC devolvendo o MESMO dia.

### T2 · `shared/ui/DateField.tsx` (DSC-05 AC 1-4)

`Popover` + `Calendar` + `date-fns/locale/ptBR`, no molde de `AdminOrdersPage:90-112`. Props:
`label`, `value: 'YYYY-MM-DD' | ''`, `onChange`, `placeholder` (o texto de vazio), `emptyHint`.
Botão de limpar só aparece com data escolhida.

**Gate**: abre o calendário, escolhe dia, emite `YYYY-MM-DD`; limpar emite `''`; sem valor mostra o
placeholder.

### T3 · `shared/ui/FormPageHeader.tsx` (DSC-03)

Extração do que `ProductFormHeader` provou, sem o que é do produto (rascunho, publicar/descartar):
trilha de dois níveis clicável, título, selo `Alterações não salvas`, `Cancelar` + primário com
`⌘S`. O atalho vive aqui, com `preventDefault`.

**Gate**: selo aparece só com `isDirty`; `⌘S` chama `onSave` e não navega; `saving` desabilita os
dois botões.

### T4 · `shared/lib/vigencia.ts` (DSC-06 AC 1)

`validityLabel(valid_from, valid_until)` — hoje é função privada de `AdminPromotionsPage`. Sai de lá
inteira (mesmas quatro saídas) e passa a ser lida pelas duas listagens.

**Gate**: as quatro saídas; e a listagem de promoções segue passando sem mudança de asserção.

---

## Fase 2 — A promoção vira tela

### T5 · `AdminPromotionFormPage` (DSC-01, DSC-04)

Nova página em `pages/admin/`, rotas `/admin/promocoes/nova` e `/admin/promocoes/:id/editar`. O corpo
do `PromotionFormDialog` migra para os cards do board: `FormCard Identidade` / `ScopePicker` /
`TierRepeater` na coluna principal; `Vigência` (dois `DateField`), `Comportamento` (as três
`ToggleField`) e `Na loja vai aparecer` no aside. `useForm` + `promotionSchema` + `toWriteInput`
inalterados.

O registro em edição sai de `useAdminPromotions().find(id)` (A5). `id` ausente da lista **depois de
carregar** ⇒ estado "não encontrada" (AC 3).

### T6 · `PromotionShowcaseCard` — `Na loja vai aparecer` (DSC-04 AC 3)

A frase da última faixa válida, o preço por unidade e a economia. Reusa `tierPreview` (já testado em
`features/promotion-form/model/tierPreview.test.ts`); sem faixa ou sem escopo, diz o que falta.

### T7 · Listagem de promoções navega; a modal morre (DSC-01 AC 4-5)

`openEditor` vira `navigate`. `PromotionFormDialog.tsx` é **apagado**, e sua suíte de 35 testes migra
para `AdminPromotionFormPage.test.tsx` — asserção por asserção, com "fecha o dialog" virando "navega
para a listagem". O teste da listagem passa a montar em `MemoryRouter`.

**Gate**: nenhuma referência a `PromotionFormDialog` no repo; as ACs de PRM-02..PRM-08 seguem
provadas.

---

## Fase 3 — O cupom vira tela, e ganha as duas ações

### T8 · `features/coupon-form` (DSC-02)

`model/schema.ts` — o `zod` que hoje está solto dentro de `AdminCouponsPage`, mais
`emptyCouponForm`, `couponFormValues(coupon)`, `couponCopyValues(coupon)` (DSC-08: sem código, sem
uso, `active: false`) e `toWritePayload`.

**Gate**: `couponCopyValues` não leva `code` nem `used_count` e devolve `active: false`.

### T9 · `AdminCouponFormPage` (DSC-02, DSC-08 AC 1-3)

Rotas `/admin/cupons/novo`, `/admin/cupons/novo?from=<id>` e `/admin/cupons/:id/editar`. Cards do
board `IB5-0`, incluindo `A cliente vê` e a nota de que cupom e promoção não somam (`AD-015`).
`?from=` pré-preenche pela `couponCopyValues` e foca o código.

### T10 · `features/coupon-list/model/couponStatus.ts` (DSC-06 AC 3-5)

`couponStatus(coupon, now)` ⇒ `'active' | 'inactive' | 'expired' | 'exhausted'`, e
`couponStats(coupons)` para os três cartões. Precedência: `!active` vence tudo (é decisão explícita
da dona); depois expirado; depois esgotado.

### T11 · `AdminCouponsPage` padronizada (DSC-06, DSC-07)

Listagem: `Vigência` por `validityLabel`, os três `StatCard`, quatro estados de status com paleta
distinta, `Usos` em âmbar no teto, e a fila de quatro ações na ordem das promoções. O `Dialog` sai
inteiro; `Novo cupom`/`Editar`/`Duplicar` navegam. Pausar chama `useUpdateCoupon` com `{ id, active }`
e só.

### T12 · As quatro rotas em `App.tsx` (DSC-01 AC 1, DSC-02 AC 1)

Dentro dos blocos que já existem, na ordem da sidebar. O teste `navItems.test.ts` filtra as rotas
pelos destinos da sidebar, então as quatro novas não mexem naquela asserção — mas o teste roda no
gate para provar isso, não para supor.

---

## Fase 4 — Fecho

### T13 · Documentação e gates

`CLAUDE.md` (a moldura das telas de Descontos e o campo de data), `STATE.md` (handoff + AD se
couber), `BACKLOG.md` (`BL-004` — vigência que morre à meia-noite do dia prometido).

**Gate final**: `npx turbo test --force`, `pnpm lint` contra a baseline 30 err / 9 warn,
`npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` em 0.

---

## Matriz de cobertura

| AC | Onde é provado |
|---|---|
| DSC-01 AC 1-3, 6 | `AdminPromotionFormPage.test.tsx` |
| DSC-01 AC 4-5 | `AdminPromotionsPage.test.tsx` + `AdminPromotionFormPage.test.tsx` |
| DSC-02 | `AdminCouponFormPage.test.tsx` |
| DSC-03 | `FormPageHeader.test.tsx` (unidade) + as duas suítes de página |
| DSC-04 | `AdminPromotionFormPage.test.tsx` |
| DSC-05 | `dateOnly.test.ts` + `DateField.test.tsx` |
| DSC-06 | `couponStatus.test.ts` + `AdminCouponsPage.test.tsx` + `vigencia.test.ts` |
| DSC-07 | `AdminCouponsPage.test.tsx` |
| DSC-08 | `schema.test.ts` (`couponCopyValues`) + `AdminCouponFormPage.test.tsx` |

## Progresso

| Fase | Tasks | Estado |
|---|---|---|
| 1 · Fundação | T1–T4 | ✅ |
| 2 · Promoção | T5–T7 | ✅ |
| 3 · Cupom | T8–T12 | ✅ |
| 4 · Fecho | T13 | ✅ |

## Ajustes medidos durante a execução

Quatro divergências entre o planejado e o que a execução mostrou. Ficam registradas aqui porque cada
uma é uma correção de premissa, não uma mudança de escopo.

1. **`ScopePicker` e `TierRepeater` deixaram de ser painéis `bg-muted/40` e passaram a card branco.**
   No dialog eles eram painéis dentro de um formulário; na tela, escopo e faixas são decisões de
   primeira ordem, do mesmo peso do card `Identidade`. Nenhuma asserção mudou — os testes olham
   rótulos e papéis, não classes.
2. **`toDateInput`/`fromDateInput` de `promotion-form/model/schema.ts` passaram a delegar ao módulo
   compartilhado** em vez de serem reimplementados. Os nomes seguem exportados porque a suíte da 17 os
   cita — a T1 previa criar o módulo, não previa que a promoção já tinha uma cópia própria dele.
3. **A faixa da vitrine é a de maior quantidade, não a última linha** (emenda registrada na spec). O
   board mostra a faixa de 5 num conjunto 3/5/10, mas isso é valor ilustrativo; escolher pela posição
   dependeria da ordem de preenchimento, que o repetidor não impõe.
4. **`DSC-05 AC 5` foi reescrita durante a T1** (a emenda está na spec). Ela exigia preservar o dia
   "inclusive quando gravado como meia-noite UTC" — e não existe valor assim: nem seed nem migration
   escrevem vigência, e um `timestamptz` em `00:00Z` **é** 21:00 do dia anterior em São Paulo. O defeito
   real era a divergência entre os dois leitores, e é isso que a AC passou a exigir.

## Gate de fecho (medido)

`npx turbo test --force --concurrency=1`: core **759** · store **841** · backoffice **1102** ·
functions **251** = **2953**. `npx eslint .` no backoffice: **28 err / 7 warn** — baseline exata.
`npx tsc --noEmit -p apps/backoffice/tsconfig.app.json`: **0**.

Sensor de discriminação: **8 mutações, 8 mortas** (ver `validation.md`).
