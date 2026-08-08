# Mídia do Produto e Estúdio de Mockup — Tasks

> **Feature 3 de 4** (`AD-009`).
>
> **PRÉ-CONDIÇÕES BLOQUEANTES** — dependência entre features **não tem gate automático**, confira antes
> de começar:
> 1. [`07-product-catalog-admin`](../07-product-catalog-admin/tasks.md) fechada — precisa de `T17`
>    (leitores de `images` no helper) e `T18` (loja lendo eixos).
> 2. [`11-product-form-v2`](../11-product-form-v2/tasks.md) fechada — precisa de `T25` (esqueleto de 5
>    abas, onde a aba Mídia encaixa) e `T28` (grade de variações, à qual T37 se liga).
>
> **Numeração global preservada.** Aqui ficam **T33–T37**.

## Execution Protocol (MANDATORY — do not skip)

Implemente estas tarefas com a Skill `tlc-spec-driven`: **ative-a pelo nome e siga o fluxo Execute e as
Critical Rules dela.** Não procure os arquivos da Skill por caminho de filesystem. A Skill é a fonte de
verdade do fluxo completo (ciclo por task, delegação a sub-agentes, Verifier, sensor de discriminação).

**Se a Skill não puder ser ativada, PARE e avise o usuário — não prossiga sem ela.**

> **Convenção do projeto (`CLAUDE.md`):** **não** criar commits atômicos em pequenos pedaços durante a
> implementação. Aguardar a conclusão e gerar os commits completos de uma vez. Isso **sobrepõe** o
> comportamento padrão de commit-por-task da Skill. Os `Commit:` de cada task abaixo são a **mensagem
> planejada** para o commit final agrupado.

---

**Spec**: [`spec.md`](./spec.md) · **Design**: [`design.md`](./design.md) · **Contexto**: [`../07-product-catalog-admin/context.md`](../07-product-catalog-admin/context.md)
**Status**: Concluída (5/5 tasks) — 2026-08-01
**Total**: **5 tasks em 1 fase** (T33–T37)

---

## Test Coverage Matrix

> Gerada do codebase, das diretrizes do projeto e da spec — confirmar antes do Execute.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Lógica pura (`buildAltText`, `applyPlan`, validação de upload) | unit | Todas as branches; 1:1 com as ACs; todas as edge cases listadas | co-locado `apps/backoffice/src/**/*.test.ts` | `pnpm --filter @nanapin/backoffice test` |
| Componentes de UI (`ImageGallery`, `MockupStudioDialog`, `VariantImageCard`, `StorefrontPreview`) | unit (RTL) | Comportamento observável das ACs: estados de alt-text, selo de origem, progresso, colar. **Não** snapshot | co-locado `apps/backoffice/src/**/*.test.tsx` | `pnpm --filter @nanapin/backoffice test` |
| Loja (`ProductPage` — troca de imagem por variação) | unit (RTL) | Happy path + variação sem imagem própria | `apps/store/src/**/__tests__/*.test.tsx` | `pnpm --filter @nanapin/store test` |
| Engine de composição (`@nanapin/core/mockup`, `renderPlan`) | **regressão** | Os 9 testes existentes SHALL continuar verdes — a engine **não** é tocada | `packages/core/src/**/__tests__/` | `pnpm --filter @nanapin/core test` |
| Qualidade visual do render composto | **none (UAT manual)** | Canvas real não roda em node — mesma lição de `05-mockup-generator` (A12). Declarado, não fingido | — | roteiro manual |

**Baseline conhecida (`CLAUDE.md` § Estado conhecido):** `pnpm lint` já falha com **41 erros / 16 warnings**
pré-existentes. O gate é **"sem erros novos"**, não "lint limpo".

## Gate Check Commands

| Gate Level | Quando usar | Comando |
| ---------- | ----------- | ------- |
| **quick-bo** | T33, T34, T35, T36 | `pnpm --filter @nanapin/backoffice test` |
| **full** | T37 (toca backoffice **e** store) | `pnpm test` |
| **build** | Fim da fase | `pnpm build && pnpm test && pnpm lint` (lint comparado à baseline 41/16) |

---

## Execution Plan

### Fase 1 — Mídia e estúdio (5 tasks)
```
T33 → T34 → T35 → T36 → T37
```
Cadeia linear: a galeria depende do upload corrigido; o estúdio grava na galeria; a imagem por variação
liga galeria e grade.

**5 tasks cabem em um único batch (~7)** — a oferta de sub-agentes **não** é obrigatória aqui; execução
inline é o caminho previsto.

---

## Task Breakdown

### Fase 1 — Mídia e estúdio

#### T33: `uploadProductImage` — validar antes de comprimir, 1600 px

**What**: Validação de tipo e tamanho (8 MB) **antes** da compressão; `MAX_DIMENSION = 1600`; erro
tipado nomeando arquivo e motivo. Assinatura `uploadImageBlob(blob)` preservada para o `mockup-studio`.
**Where**: `features/product-form/lib/uploadProductImage.ts` + `.test.ts`
**Depends on**: T17 *([`07`](../07-product-catalog-admin/tasks.md))*
**Reuses**: a função atual
**Requirement**: PMD-02

**Tests**: unit · **Gate**: quick-bo
**Done when**:
- [x] Arquivo > 8 MB é rejeitado **sem** entrar no canvas
- [x] Tipo fora de PNG/JPG/WebP é rejeitado com motivo
- [x] `MAX_DIMENSION` é 1600
- [x] `uploadImageBlob` segue aceitando `Blob` (o `mockup-studio` não quebra)
- [x] Lote com 6 arquivos e 2 inválidos sobe os 4 válidos e nomeia os 2 (falha parcial não cancela)
- [x] Test count: ≥ 8 testes passam

**Commit**: `fix(backoffice): upload valida tipo e tamanho antes de comprimir, teto de 1600 px`

---

#### T34: `ImageGallery` — alt-text, origem e progresso

**What**: Tiles de 196 px com badge `Principal`, alt-text por imagem com estados, selo `Mockup` por
`source`, progresso por arquivo, colar `⌘V`, reordenar; copy verdadeira na dropzone. Inclui
`buildAltText` — a função **pura** de template que a ação `Gerar` usa (A20).
**Where**: `features/product-form/ui/ImageGallery.tsx` + `.test.tsx`,
`features/product-form/lib/buildAltText.ts` + `.test.ts`
**Depends on**: T33
**Reuses**: handlers de arraste da página atual, slot da aba Mídia criado em T25 (`11`)
**Requirement**: PMD-01, PMD-03, PMD-04

**Tests**: unit (RTL + puro) · **Gate**: quick-bo
**Done when**:
- [x] Alt-text vazio mostra `faltando` com ação `Gerar`; preenchido pela ação mostra `gerado automaticamente`
- [x] `buildAltText('Botton Sailor Moon — Lua Prateada', 'Na mão')` → string determinística; **nenhuma** chamada de rede no caminho (assert com `fetch` mockado que falha se chamado)
- [x] Produto sem nome → `Gerar` desabilitado, nunca string vazia
- [x] Imagem com `source: 'mockup'` mostra o selo
- [x] Copy da dropzone diz `até 8 MB` e `WebP 1600 px` (bate com T33)
- [x] Reordenar troca a principal e persiste no `jsonb`
- [x] Colar imagem do clipboard dispara o mesmo caminho do arraste
- [x] Test count: ≥ 12 testes passam

**Commit**: `feat(backoffice): galeria com alt-text, origem da imagem e progresso por arquivo`

---

#### T35: Estúdio de mockup ampliado — layout de 3 colunas

**What**: Dialog de ~1360 × 886 px em 3 colunas (origem/mockups 264 px, palco 452 px, ajustes/saída
300 px), com filmstrip e estado do relevo.
**Where**: `features/mockup-studio/ui/MockupStudioDialog.tsx`
**Depends on**: T34
**Reuses**: engine `@nanapin/core/mockup` e `renderPlan` **sem alteração**
**Requirement**: PMD-05 (AC 1–3)

**Tests**: unit (RTL) · **Gate**: quick-bo
**Done when**:
- [x] `max-w-3xl` não existe mais; o painel usa a largura do desenho
- [x] As 3 colunas renderizam com os blocos do artboard
- [x] Template sem relevo medido mostra `relevo não medido — sai chapado` **e** segue renderizável
- [x] Os 9 testes de `renderPlan` seguem verdes
- [x] Test count: ≥ 6 testes novos passam

**Commit**: `feat(backoffice): estúdio de mockup em painel de 1360 px com três colunas`

---

#### T36: Estúdio — ajustes, saída e "ao aplicar"

**What**: Escala/X/Y/rotação com `Aplicar a todos`, seleção de resolução e formato, opções de
anexar × substituir / 1ª como principal / gerar alt-text, e o rodapé com a contagem.
**Where**: `features/mockup-studio/ui/`, `lib/applyPlan.ts` + `.test.ts`
**Depends on**: T35
**Reuses**: `renderPlan`, `buildAltText` de T34
**Requirement**: PMD-05 (AC 4–8)

**Tests**: unit · **Gate**: quick-bo
**Done when**:
- [x] `applyPlan` puro: `anexar` preserva as existentes; `substituir` troca; `1ª como principal` reordena
- [x] `gerar alt-text` usa o **mesmo** `buildAltText` de T34, com o rótulo do mockup
- [x] Fechar sem aplicar não grava nada (nem Storage nem `images`)
- [x] Rodapé informa `N renders em X px · ~Ys`
- [x] Test count: ≥ 8 testes passam

**Commit**: `feat(backoffice): ajustes, resolução de saída e política de aplicação do estúdio`

---

#### T37: Imagem por variação e prévia da vitrine

**What**: Card que liga cada linha da grade a uma imagem da galeria; troca da imagem em destaque na
página do produto; prévia do card no inspetor com "a partir de".
**Where**: `features/product-form/ui/VariantImageCard.tsx`, `ui/StorefrontPreview.tsx`,
`apps/store/src/pages/ProductPage.tsx`
**Depends on**: T34, T28 *([`11`](../11-product-form-v2/tasks.md))*, T18 *([`07`](../07-product-catalog-admin/tasks.md))*
**Reuses**: `ProductCard` da loja como referência visual (não como import — apps distintos)
**Requirement**: PMD-06, PFM-17

**Tests**: unit (RTL) · **Gate**: full
**Done when**:
- [x] Variação sem imagem própria usa a principal
- [x] Selecionar variação com imagem própria troca o destaque na página do produto
- [x] Remover da galeria uma imagem apontada por variação faz a variação voltar à principal, sem referência quebrada
- [x] Prévia mostra `a partir de R$ X` quando há variações e reflete edição sem salvar
- [x] Test count: ≥ 8 testes passam

**Commit**: `feat(backoffice,store): imagem por variação e prévia da vitrine no formulário`

---

## Phase Execution Map

```
Fase 1 (mídia):  T33 → T34 → T35 → T36 → T37
```

Execução estritamente sequencial.

**Dependências externas (as duas features fechadas antes do início):**

| Task daqui | Depende de | Feature | O que consome |
| ---------- | ---------- | ------- | ------------- |
| T33 | T17 | `07` | helper `normalizeImages` e os leitores já migrados |
| T34 | T25 | `11` | slot da aba Mídia no esqueleto de 5 abas |
| T37 | T28 | `11` | grade de variações à qual a imagem se liga |
| T37 | T18 | `07` | loja lendo eixos genéricos |

**Empacotamento previsto:** 5 tasks → **um batch**. Abaixo do limiar de ~7, então a oferta de
sub-agentes não é obrigatória; execução inline é o caminho previsto.

---

## Task Granularity Check

| Task | Escopo | Status |
| ---- | ------ | ------ |
| T33 | 1 arquivo de lib | ✅ Granular |
| T34 | 1 componente + 1 função pura irmã | ✅ Granular (coesos — a função só existe para o botão do componente) |
| T35 | 1 componente (layout) | ✅ Granular |
| T36 | 1 função pura + os controles do mesmo componente de T35 | ✅ Granular (coesa) |
| T37 | 2 componentes + 1 página da loja | ⚠️ OK — é uma feature ponta a ponta (admin liga, loja mostra); separar deixaria metade sem prova observável |

---

## Diagram-Definition Cross-Check

| Task | Depends on | Posição no fluxo | OK |
| ---- | ---------- | ---------------- | -- |
| T33 | T17 (**07**) | início da fase; dep em feature anterior | ✅ |
| T34 | T33 (+ T25 na **11**) | T33 → T34 | ✅ |
| T35 | T34 | T34 → T35 | ✅ |
| T36 | T35 | T35 → T36 | ✅ |
| T37 | T34, T28 (**11**), T18 (**07**) | T36 → T37 (T34 anterior na fase; as outras em features anteriores) | ✅ |

**Sem ciclos. Sem dependência para frente. Toda dependência externa aponta para `07` e `11`, que fecham antes.**
