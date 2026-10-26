# 81 — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Exceção do projeto (`CLAUDE.md` raiz e decisão do usuário): **NÃO criar
commits** — nem por task, nem no fim. O usuário pede o commit.

**Design**: `.specs/features/81-opcoes-e-variacoes-do-produto/design.md`
**Status**: Approved (orquestrado pelo Workflow `feature-81`)

---

## Test Coverage Matrix

> Guidelines found: `CLAUDE.md` (raiz: "Os guardas", "Baselines"), `apps/backoffice/CLAUDE.md`,
> `apps/backoffice/vitest.config.ts`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Model puro (`model/*.ts`, `entities/*/lib`) | unit | Todos os ramos; 1:1 com as ACs; todo edge case listado | `**/model/*.test.ts`, `**/lib/__tests__/*.test.ts` | `pnpm --filter @estrelinha/backoffice exec vitest run <arquivo> --testTimeout=20000` |
| Hook de leitura | unit (client injetado) | Projeção, conta+pagina, erro, chave sob o pool | `entities/product/api/__tests__/*.test.ts` | idem |
| Componente | RTL | Cada AC de UI + estados vazio/erro; literais exatos (L-009, L-036) | `**/ui/*.test.tsx` | idem |
| Página | RTL com a **página real** | Fiação (OPV-04, 08, 14..16) | `pages/admin/*.test.tsx` | idem |
| Layout (OPV-28) | navegador | 390×844 e 1440 | `prova-navegador.md` | Playwright |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Após cada task | vitest nos arquivos tocados |
| Full | Fim de cada fase | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` (exit code fora de pipe) |
| Build | Fim da feature | Full + `pnpm --filter @estrelinha/store test --testTimeout=20000` + `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` + `npx eslint .` em `apps/backoffice` (≤ baseline) + `pnpm --filter @estrelinha/backoffice build` |

Baseline de entrada: medir com a árvore parada **antes** da T01 e gravar em `baseline.md`.

---

## Execution Plan

```
Fase 1 (modelo puro)   T01 → T02 → T03 → T04
Fase 2 (componentes)   T05 → T06 → T07          (depende da Fase 1)
Fase 3 (fiação + docs) T08 → T09 → T10          (depende da Fase 2)
```

### Fase 1 — modelo

- ✅ **T01 `01-sync-grid`** (2026-10-26, 22 casos; `SPEC_DEVIATION` em `gridSync.ts`: refletido estrutural quando pula, e corte da chave em `removeOption` mesmo com conflito) — `features/product-form/model/gridSync.ts` + `gridSync.test.ts`.
  Depends on: —. Requisitos: OPV-01..03, 05..07, 09, 23, 24. Done when: um caso por AC/edge (incl.
  `toKeep` por identidade, `price=0 ⇒ null`, renomear vazio→novo nome mantém as linhas, duas opções
  homônimas pulam, `move` não muda a grade, mesma referência sem mudança) e quick gate verde.
- ✅ **T02 `02-orfas`** (2026-10-26, 7 casos; `orphanVerdict` + `applyOrphanChecks`) — `model/orphans.ts` + teste. Depends on: T01. OPV-04, 25. Done when: remover,
  pausar, id ausente ignorado, aplicação sobre grade editada depois.
- ✅ **T03 `03-biblioteca-de-opcoes`** (2026-10-26, 16 casos; inclui `suggestOptionNames`/`suggestOptionValues` para OPV-18/20) — `entities/product/lib/optionLibrary.ts` + teste. Depends on: —.
  OPV-18..20, A2, A3. Done when: fixture em que ordem alfabética e ordem do produto discordam (L-038);
  grafias agrupadas; contagem por produto.
- ✅ **T04 `04-leitura-da-biblioteca`** (2026-10-26, 9 casos; exportado pelo barrel de `entities/product`) — `entities/product/api/useOptionLibrary.ts` + teste. Depends on:
  T03. OPV-21, 22. Done when: dublê que enxerga `select`/`range`/`count` (memória "dublê que não
  enxerga"); erro ⇒ biblioteca vazia; chave começa por `PRODUCT_POOL_KEY`.

### Fase 2 — componentes

- ✅ **T05 `05-editor-de-opcoes`** (2026-10-26, `OptionsEditor.test.tsx` 24 → 53, +29; as 24 antigas reescritas para os literais novos de OPV-17 e passando a cobrar a mudança tipada — nenhuma afrouxada; `AdminProductFormPage.filtros.test.tsx` trocou o rótulo `'Eixo 1'` por `'Nome da opção'`; `SPEC_DEVIATION`: com um valor só o botão diz "Usar o valor") — `OptionsEditor.tsx` + `OptionsEditor.test.tsx`. Depends on: T03.
  OPV-17..20, 23. Done when: literais exatos; nenhum "eixo" no texto renderizado; `onChange` recebe a
  mudança tipada certa por operação; combobox navegável por teclado; "Usar os N valores".
- ✅ **T06 `06-imagem-da-variacao`** (2026-10-26, 17 casos; com falha no envio o modal fica aberto mostrando a frase de `uploadFailureMessage`) — `VariantImagePicker.tsx` + teste. Depends on: —. OPV-11..15, 26, 28.
  Done when: `h-12 w-12` por token exato; escolha/principal/fechar; envio com `uploadProductImages`
  dublado (sucesso, falha, `onUploadingChange` true→false).
- ✅ **T07 `07-grade-sem-regerar`** (2026-10-26, VariantsTable.test +7 casos (26 → 33); **queda declarada de 16**: `gridActions.test.ts` −10 (`buildRegeneratePlan` 4, `applyRegenerate` 6) e `GridActions.test.tsx` −6 (o `describe` do Regerar) — o que importava deles, `toKeep` pelo objeto e órfã nunca apagada às cegas, está em `gridSync.test.ts`; a página passou a entregar `images`/`onImagesAdded`/`onUploadingChange` à grade e perdeu `productId`, sem teste novo de página — a prova é da T08) — `VariantsTable.tsx`, `GridToolbar.tsx`, `gridActions.ts`; apagar
  `RegenerateGridDialog.tsx`. Depends on: T06. OPV-10, 11. Done when: picker na linha; nenhum texto
  "Regerar"; estado vazio literal; queda de testes declarada no relatório.

### Fase 3 — fiação

- ✅ **T08 `08-fiacao-do-formulario`** (2026-10-26, `AdminProductFormPage.variacoes.test.tsx` 13 casos pela página real; `VariantImageCard.tsx` + teste apagados — os 9 casos de `clearMissingVariantImages`/`StorefrontPreview` mudaram para `lib/variantImages.test.ts` e `ui/StorefrontPreview.test.tsx` sem alteração, queda líquida −5; 8 mutantes da fiação mortos) — `AdminProductFormPage.tsx`; apagar `VariantImageCard.tsx` (+teste).
  Depends on: T01, T02, T04, T05, T07. OPV-01, 02, 04, 08, 14..16, 27. Done when: teste pela **página
  real** — abrir produto não suja; acrescentar valor cria linha ativa com os padrões; remover valor de
  linha vendida a pausa e mostra o aviso; upload pelo modal entra em `images` e desabilita o salvar.
- ✅ **T09 `09-grade-rapida`** (2026-10-26, +3 casos 15 → 18; o helper ganhou o `QueryClientProvider` e o dublê do editor passou a registrar as props — nenhuma asserção antiga tocada; rótulo "Eixos de opção" → "Opções") — `AdminQuickGridPage.tsx` com a nova assinatura e a biblioteca. Depends
  on: T05. Done when: testes da grade rápida verdes sem afrouxar asserção.
- ✅ **T10 `10-documentacao`** (2026-10-26, Build gate verde: backoffice 3808/218, store 5754/314, `tsc` 0, lint 23/5, build verde; `baseline.md`, `CLAUDE.md` raiz e do painel, `STATE.md` `AD-063` + handoff) — `apps/backoffice/CLAUDE.md` (seção nova), `CLAUDE.md` raiz (feature 81,
  baselines medidas), `.specs/STATE.md` (`AD-063`, handoff). Depends on: T08, T09. Done when: Build
  gate verde e números medidos gravados.

## Diagram-Definition Cross-Check

| Task | Depends on | Diagram | ✓ |
| --- | --- | --- | --- |
| T01 | — | F1 | ✅ |
| T02 | T01 | F1 | ✅ |
| T03 | — | F1 | ✅ |
| T04 | T03 | F1 | ✅ |
| T05 | T03 | F2 | ✅ |
| T06 | — | F2 | ✅ |
| T07 | T06 | F2 | ✅ |
| T08 | T01,T02,T04,T05,T07 | F3 | ✅ |
| T09 | T05 | F3 | ✅ |
| T10 | T08,T09 | F3 | ✅ |

## Test Co-location Validation

| Task | Layer | Tests in task | ✓ |
| --- | --- | --- | --- |
| T01–T03 | model | unit | ✅ |
| T04 | hook | unit injetado | ✅ |
| T05–T07 | componente | RTL | ✅ |
| T08–T09 | página | RTL página real | ✅ |
| T10 | docs | build gate | ✅ |

## Depois das tasks (orquestração)

1. **Verifier independente** (author ≠ verifier): `validation.md`, sensor de mutação nos arquivos
   reais (mortes por asserção ≠ por compilação), até 3 rodadas de conserto.
2. **Prova em navegador** (`prova-navegador.md`): 390×844 e 1440 — grade sem rolagem do `body`, botão
   48px, modal, envio.
3. **QA**: skill `qa-report` (cenários em `docs/qa/`) → `qa-execution` (sessão real) → conserto com
   teste antes e reteste.
