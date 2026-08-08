# Formulário de Produto v2 — Tasks

> **Feature 2 de 4** (`AD-009`).
>
> **PRÉ-CONDIÇÃO BLOQUEANTE:** [`07-product-catalog-admin`](../07-product-catalog-admin/tasks.md)
> **integralmente fechada** (T1–T20 + T27, as 4 fases). Dependência entre features **não tem gate
> automático** — confira antes de começar. As tasks daqui dependem de `T4`, `T6`, `T10`, `T17` e `T27`,
> todas lá.
>
> Roda **em paralelo** com [`13-product-bulk-ops`](../13-product-bulk-ops/tasks.md).
> É pré-condição de [`12-product-media-studio`](../12-product-media-studio/tasks.md), que precisa do
> esqueleto de 5 abas (T21/T25).
>
> **Numeração global preservada.** Os números `T1`–`T42` são os da spec original, distribuídos entre as
> quatro features **sem renumerar**: cada número aparece exatamente uma vez no programa. Aqui ficam
> **T21–T26 e T28–T32**. `T27` migrou para a `07` (`AD-010`) — por isso o buraco.

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
**Status**: **CONCLUÍDA** — 12/12 tasks (T21–T26, T28–T32 + T21b acrescentada no Execute).
**Total**: **11 tasks em 2 fases** (T21–T26, T28–T32)

---

## Test Coverage Matrix

> Gerada do codebase, das diretrizes do projeto e da spec — confirmar antes do Execute.
> **Diretrizes encontradas:** `CLAUDE.md` (convenções, FSD, estado conhecido de lint), `turbo.json`,
> `package.json` raiz, `apps/*/vitest.config.ts`.
> Nenhum threshold de cobertura configurado → **defaults fortes aplicados** para lógica de domínio.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Lógica pura do backoffice (`validateProduct`, `buildChecklist`, `normalizeTag`) | unit | Todas as branches; 1:1 com as ACs; todas as edge cases listadas | co-locado `apps/backoffice/src/**/*.test.ts` | `pnpm --filter @nanapin/backoffice test` |
| Componentes de UI do backoffice (`OptionsEditor`, `VariantsTable`, `CategoryMultiSelect`, `TagInput`, `SlugField`, `ProductFormHeader`, `PricingTab`) | unit (RTL) | Comportamento observável das ACs: render, interação de teclado, estados de erro. **Não** snapshot | co-locado `apps/backoffice/src/**/*.test.tsx` | `pnpm --filter @nanapin/backoffice test` |
| Hooks de estado (`useProductForm`, `useFormDraft`, `useSlugAvailability`) | unit | Happy path + toda edge case listada + caminhos de erro (storage indisponível, debounce) | co-locado `apps/backoffice/src/**/*.test.ts` | `pnpm --filter @nanapin/backoffice test` |
| Funções puras consumidas de `@nanapin/core` (`cartesian`, `diffGrid`, `priceRange`, máscaras) | none aqui | Já cobertas pela [`07`](../07-product-catalog-admin/tasks.md) (T8, T9, T10). Re-testar seria duplicar | — | — |
| Tipos, barrels, config, rotas | none | Build gate apenas | — | `pnpm build` |

**Baseline conhecida (`CLAUDE.md` § Estado conhecido):** `pnpm lint` já falha com **41 erros / 16 warnings**
pré-existentes (`no-explicit-any` em `entities/*/api/useAdmin*`). O gate é **"sem erros novos"**, não
"lint limpo". Fronteiras FSD em `warn`.

## Gate Check Commands

| Gate Level | Quando usar | Comando |
| ---------- | ----------- | ------- |
| **quick-bo** | Toda task desta feature (só tocam `apps/backoffice`) | `pnpm --filter @nanapin/backoffice test` |
| **full** | Tasks que cruzam workspaces (nenhuma prevista aqui) | `pnpm test` |
| **build** | Fim de fase | `pnpm build && pnpm test && pnpm lint` (lint comparado à baseline 41/16) |

---

## Execution Plan

### Fase 1 — Esqueleto e integridade (5 tasks)
```
T21 → T22 → T23 → T24 → T25
```
O estado sai da página **antes** de qualquer aba ser reescrita. A validação precisa de um lugar que não
dependa de aba montada — é isso que resolve PFM-11.

### Fase 2 — Opções, grade, taxonomia e URL (6 tasks + T21b)
```
T21b → T26 → T28 → T29 → T30 → T31 → T32
```

> **T21b foi ACRESCENTADA durante o Execute (2026-08-01) — buraco de rastreabilidade, não escopo novo.**
>
> Nenhuma das 11 tasks originais **grava** o modelo novo. Os editores existem — T26 escreve
> `form.options`, T28/T29 a grade, T30 `stock_policy`/`production_lead_days`, T31 `category_ids` — e
> nada persiste. A spec, porém, exige: `P1.4 AC 4` diz *"as categorias SHALL persistir em
> `product_categories` com `position` = ordem de seleção"*, `P1.3 AC 5` diz *"a ordem SHALL persistir
> em `products.options[].position`"*, e o Independent Test da P1.4 é *"salvar, recarregar e conferir
> que as 3 voltaram na mesma ordem"*. Sem esta task a `11` entregaria um formulário que edita e não
> salva.
>
> O número é **T21b** e não T43 porque `T1`–`T42` estão todos alocados (07: T1–T20+T27 · 11: T21–T26,
> T28–T32 · 12: T33–T37 · 13: T38–T42) e a numeração global é imutável por `AD-009`. A subletra segue
> o recurso que o programa já usa em `P1.1b` e `AC 9a`.

---

## Task Breakdown

### Fase 1 — Formulário: esqueleto e integridade

#### T21: `useProductForm` — estado e carga

**What**: Extrair o estado do `AdminProductFormPage` para um hook no slice, carregando produto,
variações e categorias do modelo novo; `setField`, `isDirty`.
**Where**: `apps/backoffice/src/features/product-form/model/useProductForm.ts`
**Depends on**: T6, T17 *(ambas na [`07`](../07-product-catalog-admin/tasks.md))*
**Reuses**: `useAdminProducts`, `useAdminCategories`
**Requirement**: PFM-01 (parcial)

**Tests**: unit · **Gate**: quick-bo
**Done when**:
- [x] Carrega produto existente com `options`, `variants` (tabela) e `category_ids`
- [x] Produto novo nasce com defaults do desenho; `isDirty` só vira true após edição real
- [x] A página atual segue funcionando com o hook (sem mudança visual ainda)
- [x] Test count: ≥ 8 testes passam

**Commit**: `refactor(backoffice): estado do formulário de produto extraído para useProductForm`

---

#### T22: `validateProduct` + badge de pendência por aba

**What**: Função pura de validação sobre o estado inteiro, agregada por aba; `errorsByTab`; save
bloqueado a partir dela — nunca do `required` do input.
**Where**: `features/product-form/model/validateProduct.ts` + `.test.ts`
**Depends on**: T21
**Reuses**: —
**Requirement**: PFM-11

**Tests**: unit · **Gate**: quick-bo
**Done when**:
- [x] Preço inválido é detectado com a aba Preços **fechada** (teste direto na função pura)
- [x] `errorsByTab` conta por aba; aba sem erro fica em 0
- [x] Variação ativa sem preço vira erro; variação pausada sem preço, não
- [x] SKU duplicado entre linhas vira erro apontando as duas
- [x] Preço "de" ≤ preço de venda vira aviso, não erro
- [x] Test count: ≥ 15 testes passam

**Commit**: `feat(backoffice): validação do produto no submit com pendência por aba`

---

#### T23: Checklist "Pronto para publicar" e cálculo de margem

**What**: `buildChecklist(form)` puro com os 6 itens e `focusField`; margem só com `price > 0`.
**Where**: `features/product-form/model/checklist.ts` + `.test.ts`; `ui/PublishChecklist.tsx`
**Depends on**: T22
**Reuses**: `FormCard`, `formatPrice`
**Requirement**: PFM-12, PFM-14

**Tests**: unit · **Gate**: quick-bo
**Done when**:
- [x] Os 6 itens avaliam nome, categoria, imagem, peso, variação sem preço e SEO
- [x] `price = 0` com `cost > 0` → margem **não** renderizada (nada de `-Infinity`)
- [x] `price = 20`, `cost = 8` → `60.0%` e lucro `R$ 12,00`
- [x] Item pendente bloqueia *Salvar e publicar* e libera *Salvar rascunho*
- [x] Test count: ≥ 12 testes passam

**Commit**: `feat(backoffice): checklist de publicação e margem à prova de divisão por zero`

---

#### T24: Rascunho automático e guarda de saída

**What**: `useFormDraft(productId)` gravando em `sessionStorage` com debounce, oferta de restauração,
descarte no save e `beforeunload` + bloqueio de navegação interna.
**Where**: `features/product-form/model/useFormDraft.ts` + `.test.ts`
**Depends on**: T21
**Reuses**: padrão decidido em `06-mockup-editor-ia` (T3 de lá)
**Requirement**: PFM-13

**Tests**: unit · **Gate**: quick-bo
**Done when**:
- [x] Rascunho é gravado por produto (chaves distintas) e restaurado ao reabrir
- [x] Save bem-sucedido descarta o rascunho daquele produto
- [x] `sessionStorage` indisponível/cheio → falha em silêncio, formulário segue (teste com mock que lança)
- [x] Guarda dispara só com `isDirty`
- [x] Test count: ≥ 8 testes passam

**Commit**: `feat(backoffice): rascunho automático do formulário e guarda de saída`

---

#### T25: Cabeçalho fixo e abas de 6 → 5

**What**: Cabeçalho com breadcrumb, nome, badge de status, badge "Alterações não salvas", ações
Descartar / Salvar rascunho / Salvar e publicar, `⌘S`; `TabsList` passa a 5 abas com os badges de T22.
**Where**: `pages/admin/AdminProductFormPage.tsx`, `features/product-form/ui/ProductFormHeader.tsx`
**Depends on**: T22, T23, T24
**Reuses**: `PageHeader`
**Requirement**: PFM-01, PFM-16

**Tests**: unit (RTL) · **Gate**: quick-bo
**Done when**:
- [x] Exatamente 5 abas; a aba `Variações` não existe
- [x] Badge de pendência aparece na aba com erro e o clique foca o primeiro campo inválido
- [x] `⌘S`/`Ctrl+S` aciona o save e não deixa o navegador salvar a página
- [x] Badge "Alterações não salvas" aparece só com `isDirty`
- [x] A aba **Mídia** existe como slot com o conteúdo atual — a reforma dela é a [`12`](../12-product-media-studio/tasks.md)
- [x] Test count: ≥ 8 testes passam

**Commit**: `feat(backoffice): cabeçalho fixo e reorganização em 5 abas`

---

### Fase 2 — Formulário: opções, grade, taxonomia e URL

#### T21b: Persistência do modelo novo no save

**What**: O save do formulário passa a gravar `products.options`, `stock_policy`,
`production_lead_days`, os vínculos em `product_categories` (`position` = ordem de seleção) e a grade
em `product_variants` (insert/update/delete por diff, preservando `id` das linhas já vendidas).
**Where**: `features/product-form/model/useProductForm.ts` (`save`), `pages/admin/AdminProductFormPage.tsx`
**Depends on**: T21
**Reuses**: `diffGrid` de `@nanapin/core/pricing` (07/T10)
**Requirement**: PFM-05 (AC 4), PFM-07 (AC 5), PFM-08 (persistência), PFM-09 (persistência)

**Tests**: unit · **Gate**: quick-bo
**Done when**:
- [x] `options` é gravada com o `position` de cada eixo
- [x] `category_ids` viram linhas de `product_categories` com `position` = ordem de seleção; vínculo removido na UI é apagado
- [x] Grade: linha nova é inserida, existente é atualizada por `id`, removida é apagada — e `id` de linha já vendida nunca é recriado
- [x] `stock_policy` e `production_lead_days` persistem
- [x] Falha parcial não deixa o produto salvo e a grade não — o erro é reportado nomeando o que falhou
- [x] Test count: ≥ 12 testes passam

**Commit**: `feat(backoffice): save do formulário persiste opções, grade e categorias N:N`

---

#### T26: `OptionsEditor`

**What**: Editor de até 3 eixos com presets, chips de valor, colar-por-vírgula, arraste para reordenar e
cabeçalho com a conta do cruzamento.
**Where**: `features/product-form/ui/OptionsEditor.tsx` + `.test.tsx`
**Depends on**: T10 *([`07`](../07-product-catalog-admin/tasks.md))*, T25
**Reuses**: `@dnd-kit` (já no projeto), `Command`/`Popover` do `@nanapin/ui`
**Requirement**: PFM-07

**Tests**: unit (RTL) · **Gate**: quick-bo
**Done when**:
- [x] Adicionar o 4º eixo fica desabilitado
- [x] Colar `3,5 cm, 4,5 cm, 5,5 cm` cria 3 chips, sem duplicado e sem vazio
- [x] Cabeçalho mostra `2 de 3 eixos · 3 × 2 = 6 variações`
- [x] Reordenar atualiza `position`
- [x] Test count: ≥ 10 testes passam

**Commit**: `feat(backoffice): editor de opções com até 3 eixos genéricos`

---

#### T28: `VariantsTable` reescrita — grade com preço absoluto

**What**: Colunas do artboard, agrupamento pelo 1º eixo com subtotal, linha sem preço em erro, rodapé
com faixa, pausar variação, exclusão bloqueada para variação já vendida.
**Where**: `features/product-form/ui/VariantsTable.tsx` + `.test.tsx`
**Depends on**: T26, T27 *([`07`](../07-product-catalog-admin/tasks.md))*
**Reuses**: `@nanapin/core/pricing` (`priceRange`, `variantLabel`), inputs de T27 em `shared/ui/inputs`
**Requirement**: PFM-08 (AC 1–3, 7, 8, 11–13), PFM-15

**Tests**: unit (RTL) · **Gate**: quick-bo
**Done when**:
- [x] 6 variações em 2 grupos, cada grupo com contagem e soma de estoque
- [x] Linha ativa sem preço tem borda de erro + mensagem inline
- [x] Rodapé mostra `N variações · faixa R$ X – Y · Z un.`, ignorando pausadas
- [x] Pausar tira da loja sem apagar a linha
- [x] Excluir variação com pedido é recusado, nomeando a contagem e oferecendo Pausar
- [x] Coluna Estoque desabilitada quando `stock_policy = 'none'`
- [x] Test count: ≥ 14 testes passam

**Commit**: `feat(backoffice): grade de variações com preço absoluto por linha`

---

#### T29: Ações da grade — massa, preencher coluna e regerar com diff

**What**: Seleção de linhas com `Definir preço/estoque`, `Gerar SKU`, `Pausar`, `Excluir`; menu
**Preencher coluna** (todas / só vazias / `+N%` / copiar de outro grupo); **Regerar** exibindo o diff
antes de aplicar.
**Where**: `features/product-form/ui/VariantsTable.tsx`, `ui/RegenerateGridDialog.tsx`
**Depends on**: T28
**Reuses**: `diffGrid`, `cartesian`, `skuFromParts` de T10 *([`07`](../07-product-catalog-admin/tasks.md))*
**Requirement**: PFM-08 (AC 6, 9, 10, 14)

**Tests**: unit (RTL) · **Gate**: quick-bo
**Done when**:
- [x] Ação em massa aplica **só** às linhas selecionadas
- [x] `+10%` em Preencher coluna arredonda a 2 casas e não toca em linhas sem preço quando o modo é "só às vazias"
- [x] Regerar mostra `N a criar · M a remover` **antes** de aplicar e preserva o que já existia
- [x] Cancelar o diff não muda nada
- [x] Test count: ≥ 10 testes passam

**Commit**: `feat(backoffice): ações em massa, preencher coluna e regerar grade com diff`

---

#### T30: Política de estoque em 3 modos e preço padrão

**What**: Segmentado `Controlar · Vender no negativo · Não controlar` substituindo os switches; card de
preço padrão com margem e a faixa de precedência da grade; alerta de estoque baixo por variação; prazo
de produção.
**Where**: `features/product-form/ui/tabs/PricingTab.tsx`
**Depends on**: T28
**Reuses**: `FormCard`, `FieldGroup`, inputs de T27 em `shared/ui/inputs`
**Requirement**: PFM-09, PFM-15

**Tests**: unit (RTL) · **Gate**: quick-bo
**Done when**:
- [x] Os 3 modos são mutuamente exclusivos; os switches antigos não existem mais
- [x] `Não controlar` desabilita a coluna Estoque da grade
- [x] Com variações, o aviso de precedência aparece com o "a partir de" correto e o atalho funciona
- [x] Sem variações, nenhum aviso e o preço padrão é o cobrado
- [x] Test count: ≥ 8 testes passam

**Commit**: `feat(backoffice): política de estoque em 3 modos e precedência da grade no preço`

---

#### T31: `CategoryMultiSelect` e `TagInput`

**What**: Combobox de categorias com chips, hierarquia, contagem e criar-inline; token input de tags com
autocomplete por uso, dedupe tolerante e teto de 15. Contagens vindas de uma view/RPC agregada (A19).
**Where**: `features/product-form/ui/CategoryMultiSelect.tsx`, `ui/TagInput.tsx`,
`model/normalizeTag.ts`, `entities/category/api/useCategoryUsage.ts` + testes
**Depends on**: T25
**Reuses**: `CategoryFormDialog` (sem alteração), `Command`/`Popover`
**Requirement**: PFM-05, PFM-06

**Tests**: unit (RTL + puro) · **Gate**: quick-bo
**Done when**:
- [x] Selecionar 3 categorias mostra `3 selecionadas` e persiste a ordem
- [x] Busca sem resultado oferece `Criar categoria "X"`; ao salvar, já vem marcada e o rascunho não se perde
- [x] `Enter`, `,` e `Tab` criam chip; `Backspace` remove o último
- [x] Colar `naruto, shonen, anos 90` cria 3 chips
- [x] `Naruto` com `naruto` existente gera aviso com o par Usar a existente / Manter (não substitui sozinho)
- [x] 15 tags bloqueia a 16ª; contador mostra `15 de 15`
- [x] `normalizeTag` cobre acento, caixa e espaço (teste puro)
- [x] As contagens vêm de **uma** consulta agregada — nenhum `select('*')` no catálogo (A19)
- [x] Test count: ≥ 18 testes passam

**Commit**: `feat(backoffice): categorias múltiplas com criação inline e tags como tokens`

---

#### T32: `SlugField` — URL personalizada, disponibilidade e 301

**What**: Slug vira leitura em Geral e campo em SEO; `useSlugAvailability` com debounce; rompimento do
vínculo com o nome após edição; aviso âmbar + toggle de 301; gravação em `product_redirects` no save.
**Where**: `features/product-form/ui/SlugField.tsx`, `ui/SlugReadonlyLine.tsx`,
`model/useSlugAvailability.ts`, `ui/SeoPreview.tsx` (estende)
**Depends on**: T25, T4 *([`07`](../07-product-catalog-admin/tasks.md))*
**Reuses**: `SeoPreview` atual, `slugify` da página
**Requirement**: PFM-02, PFM-03, PFM-04

**Tests**: unit (RTL) · **Gate**: quick-bo
**Done when**:
- [x] Aba Geral não tem input de slug — só a linha de leitura com link para SEO
- [x] Renomear o produto atualiza o slug **até** a primeira edição manual; depois, não
- [x] Slug ocupado mostra `Já existe` + sugestão e bloqueia o save
- [x] Produto publicado com slug alterado mostra o aviso e o toggle de 301 ligado por padrão
- [x] Toggle desligado não cria redirect
- [x] Slug que já está em `product_redirects` de outro produto tem o registro conflitante removido
- [x] Test count: ≥ 12 testes passam

**Commit**: `feat(backoffice): URL personalizada com disponibilidade e redirect 301`

---

## Phase Execution Map

```
Fase 1 → Fase 2

Fase 1 (esqueleto):  T21 → T22 → T23 → T24 → T25
Fase 2 (abas):       T26 → T28 → T29 → T30 → T31 → T32
```

Execução estritamente sequencial — sem paralelismo dentro da fase.

**Dependências externas (feature [`07`](../07-product-catalog-admin/tasks.md), toda fechada antes do início):**

| Task daqui | Depende de | O que consome |
| ---------- | ---------- | ------------- |
| T21 | T6, T17 | tipos do schema novo · helper `normalizeImages` |
| T26 | T10 | `cartesian`, `diffGrid` |
| T28 | T27 | `MoneyInput`, `WeightInput` em `shared/ui/inputs` |
| T29 | T10 | `diffGrid`, `cartesian`, `skuFromParts` |
| T30 | T27 | inputs mascarados |
| T32 | T4 | tabela `product_redirects` |

**Empacotamento previsto (~7 tasks por worker, fases inteiras):**

| Batch | Fases | Tasks |
| ----- | ----- | ----- |
| 1 | Fase 1 | 5 |
| 2 | Fase 2 | 6 |

11 tasks → o empacotamento real é decidido no Execute. **> 8 tasks ⇒ a oferta de sub-agentes é
obrigatória antes de começar.**

---

## Task Granularity Check

| Task | Escopo | Status |
| ---- | ------ | ------ |
| T21 | 1 hook | ✅ Granular |
| T22, T23, T24 | 1 função pura / 1 hook cada | ✅ Granular |
| T25 | 1 componente + a `TabsList` da página | ✅ Granular |
| T26 | 1 componente | ✅ Granular |
| T28 | 1 componente (reescrita) | ✅ Granular |
| T29 | ações da mesma tabela de T28 | ✅ Granular (coesa) |
| T30 | 1 aba | ✅ Granular |
| T31 | 2 componentes | ⚠️ OK — dividem `normalizeTag`/contagem agregada e são a mesma aba |
| T32 | 1 campo + hook | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends on | Posição no fluxo | OK |
| ---- | ---------- | ---------------- | -- |
| T21 | T6, T17 (**07**) | início da Fase 1; ambas em feature anterior | ✅ |
| T22 | T21 | T21 → T22 | ✅ |
| T23 | T22 | T22 → T23 | ✅ |
| T24 | T21 | T23 → T24 (T21 anterior na fase) | ✅ |
| T25 | T22, T23, T24 | T24 → T25 | ✅ |
| T26 | T10 (**07**), T25 | Fase 1 → Fase 2 → T26 | ✅ |
| T28 | T26, T27 (**07**) | T26 → T28 | ✅ |
| T29 | T28 | T28 → T29 | ✅ |
| T30 | T28 | T29 → T30 (T28 anterior na fase) | ✅ |
| T31 | T25 | T30 → T31 (fase anterior) | ✅ |
| T32 | T25, T4 (**07**) | T31 → T32 (ambas anteriores) | ✅ |

**Sem ciclos. Sem dependência para frente. Toda dependência externa aponta para a `07`, que fecha antes.**
