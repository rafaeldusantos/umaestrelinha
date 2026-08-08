# Listagem v2 e Operações em Lote — Tasks

> **Feature 4 de 4** (`AD-009`).
>
> **PRÉ-CONDIÇÃO BLOQUEANTE:** [`07-product-catalog-admin`](../07-product-catalog-admin/tasks.md)
> **integralmente fechada**. Dependência entre features **não tem gate automático** — confira antes de
> começar. As tasks daqui dependem de `T6`, `T10` e `T27`, todas lá.
>
> Roda **em paralelo** com [`11-product-form-v2`](../11-product-form-v2/tasks.md). Não depende da `11`
> nem da `12`… **exceto T42**, ver abaixo.
>
> ## ⚠️ T42 é a única task do programa com pré-condição sobre features paralelas
>
> `T42` remove `products.variants`, `sizes` e `finishes`. **Só pode rodar quando `07`, `11` e `12`
> estiverem TODAS fechadas** (A25). O campo `Depends on: T41` é a dependência **técnica**; não é
> suficiente. Rodar T42 com a `11` ainda em curso remove colunas que o formulário ainda lê.
>
> Se a `11` ou a `12` não estiverem fechadas quando a Fase 1 daqui terminar: **feche a Fase 1, pare, e
> deixe T42 pendente** com o motivo no `STATE.md`. Não force.
>
> **Numeração global preservada.** Aqui ficam **T38–T42**.

## Execution Protocol (MANDATORY — do not skip)

Implemente estas tarefas com a Skill `tlc-spec-driven`: **ative-a pelo nome e siga o fluxo Execute e as
Critical Rules dela.** Não procure os arquivos da Skill por caminho de filesystem. A Skill é a fonte de
verdade do fluxo completo (ciclo por task, delegação a sub-agentes, Verifier, sensor de discriminação).

**Se a Skill não puder ser ativada, PARE e avise o usuário — não prossiga sem ela.**

> **Convenção do projeto (`CLAUDE.md`):** **não** criar commits atômicos em pequenos pedaços durante a
> implementação. Aguardar a conclusão e gerar os commits completos de uma vez. Isso **sobrepõe** o
> comportamento padrão de commit-por-task da Skill. Os `Commit:` de cada task abaixo são a **mensagem
> planejada** para o commit final agrupado por fase.

---

**Spec**: [`spec.md`](./spec.md) · **Design**: [`design.md`](./design.md) · **Contexto**: [`../07-product-catalog-admin/context.md`](../07-product-catalog-admin/context.md)
**Status**: Concluída (5/5 tasks) — 2026-08-01
**Total**: **5 tasks em 2 fases** (T38–T42)

---

## Test Coverage Matrix

> Gerada do codebase, das diretrizes do projeto e da spec — confirmar antes do Execute.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Lógica pura (`buildBulkPatch`, `parseClipboardGrid`, `validateRow`, `buildInsertBatch`) | unit | Todas as branches; 1:1 com as ACs; todas as edge cases listadas. **É onde mora a prova da aritmética de reajuste** | co-locado `apps/backoffice/src/**/*.test.ts` | `pnpm --filter @nanapin/backoffice test` |
| Camada de dados (`useAdminProducts` estendido) | unit | Asserção **sobre o mock do supabase**: que `range`/`count` são usados e que o lote faz 1 insert + 1 refetch | co-locado `apps/backoffice/src/**/*.test.ts` | `pnpm --filter @nanapin/backoffice test` |
| Componentes de UI (`AdminProductsPage` v2, `BulkEditPanel`, `AdminQuickGridPage`) | unit (RTL) | Comportamento observável das ACs: teclado da edição inline, chips, estados desabilitados, rodapé de contagem. **Não** snapshot | co-locado `apps/backoffice/src/**/*.test.tsx` | `pnpm --filter @nanapin/backoffice test` |
| Funções puras consumidas de `@nanapin/core` (`cartesian`, `priceRange`, máscaras) | none aqui | Já cobertas pela [`07`](../07-product-catalog-admin/tasks.md) (T8, T9, T10) | — | — |
| Migration de limpeza (T42) | none (gate manual) | Sem runner de SQL no projeto. Verificação: `supabase db reset` + `grep` declarado na task | — | gate manual + `pnpm build` |

**Baseline conhecida (`CLAUDE.md` § Estado conhecido):** `pnpm lint` já falha com **41 erros / 16 warnings**
pré-existentes (`no-explicit-any` em `entities/*/api/useAdmin*` — **inclui `useAdminProducts.ts`, que
T38 reescreve**). O gate é **"sem erros novos"**; se T38 reduzir a contagem, ótimo, mas não é requisito.

## Gate Check Commands

| Gate Level | Quando usar | Comando |
| ---------- | ----------- | ------- |
| **quick-bo** | T38, T39, T40, T41 | `pnpm --filter @nanapin/backoffice test` |
| **build** | T42 e fim de fase | `pnpm build && pnpm test && pnpm lint` (lint comparado à baseline 41/16) |
| **sql** | T42 | `supabase db reset` + o `grep` de conferência da task |

---

## Execution Plan

### Fase 1 — Listagem e lote (4 tasks)
```
T38 → T39 → T40 → T41
```
Tudo depende de `useAdminProducts` paginar e contar no servidor primeiro.

### Fase 2 — Limpeza (1 task)
```
T42
```
**Bloqueada até `11` e `12` fecharem** (A25). Ver o aviso no topo deste arquivo.

---

## Task Breakdown

### Fase 1 — Listagem, lote

#### T38: `useAdminProducts` — paginação, filtro e lote no servidor

**What**: `fetchProducts({page,pageSize,search,filters,sort})` com `count: 'exact'` e `.range()`;
`createProductsBatch`, `updateProductsBatch`; variações e categorias no select.
**Where**: `entities/product/api/useAdminProducts.ts` + `.test.ts`
**Depends on**: T6 *([`07`](../07-product-catalog-admin/tasks.md))*
**Reuses**: o hook atual
**Requirement**: PLS-01, PLS-08

**Tests**: unit · **Gate**: quick-bo
**Done when**:
- [x] `select('*')` sem `range` não existe mais no caminho da listagem
- [x] `count` real é devolvido junto dos itens
- [x] `createProductsBatch(20)` faz **um** insert e **um** refetch (assert no mock do supabase)
- [x] Busca cobre nome, SKU de variação e tag
- [x] Test count: ≥ 10 testes passam

**Commit**: `perf(backoffice): listagem de produtos pagina e filtra no servidor`

> **Atrito de merge conhecido:** a `11` (T21) também toca este arquivo, mas só o **lê**. Esta task manda
> na assinatura; a `11` adapta a chamada. Registrado no `design.md` das duas.

---

#### T39: Listagem v2 — visões, filtros em chips, colunas e edição inline

**What**: Visões salvas (`localStorage`), chips de filtro, menu Colunas + densidade, colunas
Produto/Preço/Estoque/Status do artboard, edição inline com teclado e desfazer, menu `Novo produto ▾`.
**Where**: `pages/admin/AdminProductsPage.tsx`, `features/product-list/` + testes
**Depends on**: T38, T27 *([`07`](../07-product-catalog-admin/tasks.md))*
**Reuses**: `AdminTable`, `Pagination`, `EmptyState`, `Skeletons`, inputs de T27 em `shared/ui/inputs`
**Requirement**: PLS-02, PLS-03, PLS-04, PLS-09

**Tests**: unit (RTL) · **Gate**: quick-bo
**Done when**:
- [x] Rodapé mostra `1–25 de N` com o total do servidor
- [x] Produto com variações mostra a faixa + `N preços`, e a edição inline de preço fica desabilitada **com explicação**
- [x] `stock_policy: none` mostra `sempre disponível` e não é editável
- [x] Badge `grade incompleta` aparece para produto com variação ativa e `options` vazio (regra `PST-10`, da `07`)
- [x] `Enter` salva, `Tab` avança, `Esc` cancela; toast com desfazer restaura o valor
- [x] Test count: ≥ 14 testes passam

**Commit**: `feat(backoffice): listagem de produtos v2 com visões, filtros e edição inline`

---

#### T40: Edição em massa com prévia e desfazer

**What**: Seleção (inclusive "os N do filtro"), barra de massa, painel com campos ligáveis,
`buildBulkPatch` puro, prévia de impacto e desfazer de 30 s.
**Where**: `features/bulk-edit/` (`ui/BulkEditPanel.tsx`, `model/buildBulkPatch.ts`,
`model/useUndoBuffer.ts`) + testes
**Depends on**: T39
**Reuses**: `updateProductsBatch` de T38
**Requirement**: PLS-05, PLS-06

**Tests**: unit · **Gate**: quick-bo
**Done when**:
- [x] Campo desligado não entra no patch (teste na função pura)
- [x] `Aumentar 10%` sobre 3 preços conhecidos bate com o cálculo manual; `terminar em ,90` arredonda certo
- [x] Produtos com `stock_policy: none` são ignorados no campo Estoque e **contados** no aviso
- [x] Ids são os capturados na seleção, não o filtro reavaliado
- [x] Desfazer restaura os valores anteriores; após 30 s some; recarregar a página também o descarta
- [x] Falha parcial reporta `X alterados · Y falharam`, e o desfazer cobre só os alterados
- [x] Test count: ≥ 16 testes passam

**Commit**: `feat(backoffice): edição em massa com prévia de impacto e desfazer de 30s`

---

#### T41: Grade rápida — cadastro em massa

**What**: Rota `/admin/produtos/grade-rapida`; padrões do lote; planilha com colar do Excel, `Tab`,
`⌥↓`; validação por linha; criar só as válidas como rascunho, gerando a grade dos padrões; teto de 200.
**Where**: `pages/admin/AdminQuickGridPage.tsx`, `features/quick-grid/` (`parseClipboardGrid`,
`validateRow`, `buildInsertBatch`) + testes; rota em `app/App.tsx`
**Depends on**: T38, T27, T10 *(T27 e T10 na [`07`](../07-product-catalog-admin/tasks.md))*
**Reuses**: `cartesian` de T10, máscaras de T8
**Requirement**: PLS-07

**Tests**: unit · **Gate**: quick-bo
**Done when**:
- [x] `parseClipboardGrid` converte TSV de 8 linhas em 8 linhas com as colunas certas
- [x] Linha sem preço vira erro embaixo dela; rodapé mostra `7 prontas · 1 com erro`
- [x] Colisão de slug nomeia a URL em conflito, não só "já existe"
- [x] Criar gera **só** as 7, como rascunho, com a grade dos padrões (`buildInsertBatch` testado puro)
- [x] Colar 500 linhas avisa e limita a 200
- [x] Um insert de produtos + um de variações + um refetch
- [x] Test count: ≥ 16 testes passam

**Commit**: `feat(backoffice): grade rápida para cadastro em massa de produtos`

---

### Fase 2 — Limpeza

#### T42: Limpeza — remover `products.variants`, `sizes` e `finishes`

> **NÃO EXECUTE** sem confirmar que [`11`](../11-product-form-v2/tasks.md) e
> [`12`](../12-product-media-studio/tasks.md) estão fechadas (A25). `Depends on: T41` é a dependência
> técnica; a pré-condição de programa é mais forte.

**What**: Migration removendo as colunas legadas depois que nada mais as lê; retirar os campos
`@deprecated` dos tipos e as últimas referências.
**Where**: `supabase/migrations/<ts>_drop-legacy-product-columns.sql`,
`packages/supabase/src/types/index.ts`, referências residuais
**Depends on**: T41 **+ features `11` e `12` fechadas**
**Reuses**: —
**Requirement**: VAR-13

**Tests**: none · **Gate**: build + sql
**Done when**:
- [x] **Pré-condição conferida e registrada**: `11` e `12` fechadas (anotar no `STATE.md` antes de rodar)
- [x] `grep -rn "\.variants\b\|\.sizes\b\|\.finishes\b" apps packages` não retorna leitura de produto
- [x] Migration remove as 3 colunas
- [x] Campos `@deprecated` saem de `@nanapin/supabase/types`
- [x] `pnpm build && pnpm test` verdes; lint na baseline (41 err / 16 warn, sem novos)
- [x] `supabase db reset` roda limpo de ponta a ponta

**Commit**: `chore(db,types): remove products.variants, sizes e finishes legados`

---

## Phase Execution Map

```
Fase 1 → [espera 11 e 12] → Fase 2

Fase 1 (listagem):  T38 → T39 → T40 → T41
Fase 2 (limpeza):   T42
```

**Dependências externas:**

| Task daqui | Depende de | Feature | O que consome |
| ---------- | ---------- | ------- | ------------- |
| T38 | T6 | `07` | tipos do schema novo |
| T39 | T27 | `07` | `MoneyInput` para a edição inline |
| T41 | T27, T10 | `07` | inputs mascarados · `cartesian` |
| T42 | **features `11` e `12` inteiras** | `11`, `12` | garantia de que ninguém mais lê o legado |

**Empacotamento previsto:**

| Batch | Fases | Tasks |
| ----- | ----- | ----- |
| 1 | Fase 1 | 4 |
| 2 | Fase 2 | 1 |

5 tasks → abaixo do limiar de ~7; a oferta de sub-agentes não é obrigatória. O corte entre os batches é
**a espera pelas features paralelas**, não o tamanho.

---

## Task Granularity Check

| Task | Escopo | Status |
| ---- | ------ | ------ |
| T38 | 1 hook | ✅ Granular |
| T39 | 1 página + 1 slice novo | ⚠️ OK — a listagem v2 é uma tela só; fatiar por coluna geraria commits sem comportamento observável |
| T40 | 1 feature (painel + 2 funções puras irmãs) | ✅ Granular (coesa) |
| T41 | 1 página + 3 funções puras | ⚠️ OK — as puras só existem para essa página e são testadas isoladamente |
| T42 | 1 migration + limpeza de tipos | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends on | Posição no fluxo | OK |
| ---- | ---------- | ---------------- | -- |
| T38 | T6 (**07**) | início da Fase 1; dep em feature anterior | ✅ |
| T39 | T38, T27 (**07**) | T38 → T39 | ✅ |
| T40 | T39 | T39 → T40 | ✅ |
| T41 | T38, T27 (**07**), T10 (**07**) | T40 → T41 (T38 anterior na fase) | ✅ |
| T42 | T41 + **`11` e `12` fechadas** | Fase 1 → espera → Fase 2 | ✅ (barreira explícita) |

**Sem ciclos. Sem dependência para frente. A única dependência não-linear do programa é a barreira de
T42, declarada em vez de implícita.**
