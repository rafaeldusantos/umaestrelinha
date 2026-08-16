# Detalhe do Produto — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path.

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

> ### ⚠️ Duas divergências deliberadas do padrão da Skill, mandadas pelo `CLAUDE.md`
>
> 1. **Commits NÃO são atômicos por task.** O `CLAUDE.md` do projeto sobrepõe a regra da Skill: as
>    tasks são implementadas até o fim e os commits completos saem **de uma vez**, no fecho. Isto é a
>    `BL-012`, fechada por decisão do usuário em 2026-08-15. O custo é conhecido e aceito: perde-se a
>    correspondência 1:1 entre commit e "done when".
> 2. **Sem sub-agentes.** São 12 tasks, o que dispararia a oferta de workers em lote. A sessão proíbe
>    despachar agentes sem pedido do usuário, então a execução é **inline**, e a validação final usa o
>    *standalone fallback* de `validate.md` (passe independente de olhos frescos após o último commit),
>    não um Verifier em sub-agente.

**Design**: `.specs/features/27-detalhe-do-produto/design.md`
**Status**: Done

---

## Test Coverage Matrix

> Gerada do codebase + guidelines do projeto. **Guidelines encontradas**: `CLAUDE.md` (seção
> "Os guardas — o que trava o quê", baselines de teste/lint/tipo), `apps/store/vitest.config.ts`
> (`environment: jsdom`), `packages/core/vitest.config.ts` (`environment: node`), `turbo.json`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura de dinheiro (`packages/core/src/payment/**`) | unit | Todos os ramos; 1:1 com as ACs; **e** a invariante "exibido = cobrado" contra `resolveOrderPricing` | `packages/core/src/payment/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Regra pura da loja (`shared/lib`, `entities/*/lib`) | unit | Todos os ramos; 1:1 com as ACs; todo edge case da spec; para o sanitizador, vetores hostis reais | `apps/store/src/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/store test` |
| Componente de UI (`entities/*/ui`, `widgets/*`, `pages/*`) | unit (RTL/jsdom) | Comportamento das ACs + a11y (`role`, `aria-*`) + **presença E ausência** (mover só é verificável se os dois lados forem asseridos) | `apps/store/src/**/__tests__/*.test.tsx` | `pnpm --filter @estrelinha/store test` |
| Guardas de fonte (`shared/lib/__tests__/*.test.ts`) | unit | **Não perdem asserção, só ganham** — nenhum se conserta afrouxando | idem | idem |
| Tipos / config / `package.json` | none | — (build gate) | — | build gate |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| **Quick** | Task que mexe só num workspace | `pnpm --filter @estrelinha/store test` **ou** `pnpm --filter @estrelinha/core test` |
| **Full** | Task que cruza workspaces | `pnpm --filter @estrelinha/core test && pnpm --filter @estrelinha/store test` |
| **Build** | Fecho de fase / gate final | `npx tsc --noEmit -p apps/store/tsconfig.app.json && pnpm lint && pnpm build` |

> **Cuidado registrado no `CLAUDE.md`**: nunca `pnpm test \| tail` — o código de saída que sai do pipe
> é o do `tail`. E `pnpm build` **não** faz typecheck; a régua de tipo é o `tsc --noEmit` acima.
>
> **Baselines a bater**: testes 4595/259 (store 1562/116 · core 1090/38) · lint 30 erros/8 warnings ·
> tipos store 0.

---

## Execution Plan

### Phase 1: Regras puras (fundação)

```
T1 → T2 → T3
```

### Phase 2: A descrição muda de lugar

```
T4 → T5 → T6
```

### Phase 3: O Pix aparece

```
T7 → T8 → T9
```

### Phase 4: A variação vira foto

```
T10 → T11
```

### Phase 5: Gate

```
T12
```

---

## Task Breakdown

### T1: `pixPrice` em `@estrelinha/core/payment/pix`

**What**: Criar a função pura do preço com Pix, com a forma que o caixa cobra.
**Where**: `packages/core/src/payment/pix.ts` (novo) · `packages/core/src/payment/__tests__/pix.test.ts` (novo) · `packages/core/src/payment/__tests__/displayedEqualsCharged.test.ts` (modificar)
**Depends on**: None
**Reuses**: forma de `round2` (`pricing.ts:54`); `resolveOrderPricing` como oráculo
**Requirement**: PDP-14

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] `pixPrice(amount, percent)` devolve `round2(amount - round2(amount * percent/100))`
- [ ] Devolve `null` para `amount <= 0`, `percent <= 0`, `percent >= 100`, e para `NaN`
- [ ] `displayedEqualsCharged.test.ts` ganha caso provando que `pixPrice(a, 5)` é igual ao `total` de `resolveOrderPricing` para 1 unidade, sem cupom e sem frete, método `pix` — **incluindo** ao menos um dos 81 preços que divergiam (ex.: R$ 7,90 → R$ 7,50)
- [ ] `pricing.ts` e `installments.ts` **não** aparecem em `git diff --name-only`
- [ ] Gate quick (core) passa

**Tests**: unit · **Gate**: quick

---

### T2: `sanitizeHtml` — allowlist por árvore

**What**: Criar o sanitizador de HTML da descrição.
**Where**: `apps/store/src/shared/lib/sanitizeHtml.ts` (novo) · `apps/store/src/shared/lib/__tests__/sanitizeHtml.test.ts` (novo)
**Depends on**: None
**Reuses**: nada (código novo); `DOMParser` nativo
**Requirement**: PDP-03, PDP-04, PDP-05, PDP-06, PDP-07, PDP-08, PDP-09

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] Tag da allowlist sobrevive; tag fora dela **desembrulha** preservando o texto (PDP-04)
- [ ] `script`/`style`/`iframe`/`object`/`embed`/`noscript`/`template` somem **com o conteúdo** (PDP-05)
- [ ] Todo atributo é removido, exceto `href` em `<a>` (PDP-06)
- [ ] `href` com `javascript:`/`data:`/protocolo estranho é removido; `http`/`https`/`mailto`/relativo sobrevive (PDP-07)
- [ ] `<a>` sobrevivente ganha `rel="noopener noreferrer"` (PDP-08)
- [ ] `h1`/`h2`/`h3` saem como `h4` (PDP-09)
- [ ] `&ccedil;` vira `ç` no texto de saída (PDP-03)
- [ ] Vetores hostis reais no teste: `<img src=x onerror=alert(1)>`, `<a href="java&#9;script:…">`, `<svg onload>`, `<script>` aninhado em tag desconhecida
- [ ] Entrada vazia/só espaço ⇒ `''`; HTML malformado não lança
- [ ] Gate quick (store) passa

**Tests**: unit · **Gate**: quick

---

### T3: `axisPhotos` — a regra do eixo com foto

**What**: Acrescentar a regra pura que decide foto × pílula, e renomear `colorImage` → `valueImage`.
**Where**: `apps/store/src/entities/product/lib/variantSelection.ts` (modificar) · `apps/store/src/entities/product/lib/__tests__/variantSelection.test.ts` (modificar)
**Depends on**: None
**Reuses**: `colorImage` (renomeado), `orderedOptions`
**Requirement**: PDP-16, PDP-17, PDP-20

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] `axisPhotos(product, axis, selected)` devolve `AxisPhoto[]` quando **≥2 valores têm foto E as fotos presentes são todas distintas**; `null` caso contrário (PDP-16)
- [ ] Caso "todas as fotos iguais" devolve `null` — o caso `Com gravação`/`Com Base`/`Letra` (PDP-17)
- [ ] Caso "só 1 valor com foto" devolve `null`
- [ ] Valor sem foto sai com `imageUrl: null`, **nunca** a foto de outro valor nem a capa (PDP-20)
- [ ] `active` reflete `selected[axis.name]`
- [ ] `colorPreview` continua passando **sem uma asserção alterada** (a renomeação é interna)
- [ ] Gate quick (store) passa

**Tests**: unit · **Gate**: quick

---

### T4: `ProductDescription` — o leitor de HTML

**What**: Criar o componente que desenha a descrição sanitizada com a tipografia da loja.
**Where**: `apps/store/src/entities/product/ui/ProductDescription.tsx` (novo) · `apps/store/src/entities/product/ui/__tests__/ProductDescription.test.tsx` (novo)
**Depends on**: T2
**Reuses**: `sanitizeHtml`; tokens `estrelinha-ink`/`ink-soft`
**Requirement**: PDP-02, PDP-10

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] Renderiza o HTML sanitizado (parágrafo, lista, negrito e `h4` chegam ao DOM como elementos, não como texto)
- [ ] Devolve `null` quando o **sanitizado** é vazio — inclusive para entrada que só tinha `<script>` (PDP-10)
- [ ] Nenhuma cor fora dos tokens `estrelinha-*`; não usa `prose`
- [ ] Gate quick (store) passa

**Tests**: unit · **Gate**: quick

---

### T5: A descrição entra no acordeão

**What**: `ProductDetailsAccordion` passa a abrir com a descrição acima dos bullets de medida.
**Where**: `apps/store/src/entities/product/ui/ProductDetailsAccordion.tsx` (modificar) · `apps/store/src/entities/product/ui/__tests__/ProductDetailsAccordion.test.tsx` (novo)
**Depends on**: T4
**Reuses**: `ProductDescription`, `productSpecs`, `Accordion` do shadcn
**Requirement**: PDP-02, PDP-10

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] Com descrição: seção `Detalhes do Produto` existe, **aberta por padrão**, com a descrição **antes** dos bullets (asserido por ordem no DOM, não por presença) (PDP-02)
- [ ] Com descrição e **sem** medida: a seção existe e traz só a descrição
- [ ] Sem descrição e **com** medida: a seção existe e traz só os bullets
- [ ] Sem descrição e **sem** medida: a seção **não é montada** e a aberta é `Cuidados e Conservação` (PDP-10, preserva `PIN-05`)
- [ ] As outras três seções seguem intactas
- [ ] Gate quick (store) passa

**Tests**: unit · **Gate**: quick

---

### T6: A descrição sai da coluna de informação

**What**: Remover o `<p>` da descrição de `ProductInfo`.
**Where**: `apps/store/src/entities/product/ui/ProductInfo.tsx` (modificar) · `apps/store/src/pages/__tests__/ProductPage.test.tsx` (modificar)
**Depends on**: T5
**Reuses**: —
**Requirement**: PDP-01

**Tests**: unit · **Gate**: quick

**Done when**:
- [ ] `ProductInfo` não referencia `product.description` em lugar nenhum
- [ ] Teste assere a **ausência** na coluna de informação **e** a presença no acordeão — o par, senão "movida" não é verificável (PDP-01)
- [ ] Nenhum teste existente de `ProductPage` foi afrouxado para passar
- [ ] Gate quick (store) passa

---

### T7: A linha do Pix na página do produto

**What**: `ProductInfo` mostra o preço com Pix entre o preço e as parcelas.
**Where**: `apps/store/src/entities/product/ui/ProductInfo.tsx` (modificar) · `apps/store/src/entities/product/ui/__tests__/ProductInfoPix.test.tsx` (novo)
**Depends on**: T1, T6
**Reuses**: `pixPrice`, `PixIcon`, `usePaymentSettings`
**Requirement**: PDP-11, PDP-12, PDP-13

**Done when**:
- [ ] Com `pix_enabled` e percentual > 0: a linha aparece **entre** o preço e as parcelas (ordem asserida no DOM) e traz o `PixIcon` (PDP-11)
- [ ] Com `pix_enabled: false` **ou** percentual ≤ 0: nada de Pix (PDP-12)
- [ ] Com grade, o valor sai de `purchase.price` — trocar de variação muda o número (PDP-13)
- [ ] O `PixIcon` é `aria-hidden` (o texto já diz "com Pix")
- [ ] Gate quick (store) passa

**Tests**: unit · **Gate**: quick

---

### T8: O card passa a consumir `pixPrice`

**What**: Trocar a expressão inline do `ProductCard` pela função de `core`.
**Where**: `apps/store/src/entities/product/ui/ProductCard.tsx` (modificar) · `apps/store/src/entities/product/ui/__tests__/ProductCardSurface.test.tsx` (modificar)
**Depends on**: T1
**Reuses**: `pixPrice`
**Requirement**: PDP-15

**Done when**:
- [ ] A expressão `Math.round(selectedPrice * (1 - pix_discount_percent / 100) * 100) / 100` **não existe mais** no fonte
- [ ] Teste assere o valor **novo** para um preço que divergia (R$ 7,90 a 5% ⇒ R$ 7,50), com comentário dizendo que é o valor que o caixa cobra (PDP-15)
- [ ] O Pix continua seguindo a variação escolhida (`COR-12` intacto)
- [ ] Gate full passa (a mudança cruza core e store)

**Tests**: unit · **Gate**: full

---

### T9: A página de políticas lê a setting

**What**: Tirar o literal `5` de `PoliciesPage`.
**Where**: `apps/store/src/pages/PoliciesPage.tsx` (modificar) · `apps/store/src/pages/__tests__/copyInstitucional.test.tsx` (modificar)
**Depends on**: None
**Reuses**: `usePaymentSettings`
**Requirement**: PDP-24

**Done when**:
- [ ] O percentual vem de `pix_discount_percent`
- [ ] Com Pix desligado ou percentual ≤ 0, a menção não aparece
- [ ] Gate quick (store) passa

**Tests**: unit · **Gate**: quick

---

### T10: `VariantPicker` desenha as fotos

**What**: Renderizar eixo qualificado como fotos na superfície `page`.
**Where**: `apps/store/src/entities/product/ui/VariantPicker.tsx` (modificar) · `apps/store/src/entities/product/ui/__tests__/VariantSurfaces.test.tsx` (modificar) · `apps/store/src/entities/product/ui/__tests__/VariantPhotoAxis.test.tsx` (novo)
**Depends on**: T3
**Reuses**: `axisPhotos`, gramática visual de `ColorPreview`
**Requirement**: PDP-16..PDP-23

**Done when**:
- [ ] Eixo qualificado sai como fotos; eixo reprovado sai como pílula, **inalterado** (PDP-16, PDP-17)
- [ ] Cabeçalho mostra `<eixo>: <valor escolhido>`; sem escolha, só o eixo (PDP-18)
- [ ] Cada vaga é `role="radio"` com `aria-label` = valor e `aria-checked` correto (PDP-19)
- [ ] Valor sem foto: caixa vazia, **sem `<img>`** (PDP-20)
- [ ] Valor indisponível: `disabled` e **presente** no DOM (PDP-21)
- [ ] Acionar a vaga chama `onChange` com o valor (PDP-22)
- [ ] Vaga tem 56px e a escolhida usa `border-2 border-estrelinha-ink` sem mudar a caixa (PDP-23)
- [ ] `surface="card"` e `surface="sheet"` continuam em pílula — asserido
- [ ] Gate quick (store) passa

**Tests**: unit · **Gate**: quick

---

### T11: Prova em viewport móvel (390×844)

**What**: Auditar a página do produto em 390×844 e 1024×768 com a loja rodando de verdade.
**Where**: evidência em `.specs/features/27-detalhe-do-produto/validation.md`
**Depends on**: T10
**Reuses**: `pnpm dev:store` + navegador headless
**Requirement**: PDP-02, PDP-11, PDP-16, PDP-23 (as ACs visuais)

**Done when**:
- [ ] Sem scroll horizontal do `body` em 390px, com descrição longa aberta e eixo de 8 valores
- [ ] Linha do Pix legível e na ordem certa
- [ ] Vagas de foto quebram linha sem estourar a coluna
- [ ] Evidência registrada (medida ou captura). **Se o navegador headless não estiver disponível no ambiente, a limitação é declarada no `validation.md` em vez de a task ser dada como feita**

**Tests**: none (auditoria) · **Gate**: build

---

### T12: Gate final e documentação

**What**: Rodar as réguas, provar que o código de dinheiro está intacto e atualizar a documentação.
**Where**: `CLAUDE.md` · `.specs/STATE.md` (Handoff) · `.specs/features/27-detalhe-do-produto/validation.md`
**Depends on**: T11
**Reuses**: —
**Requirement**: todos

**Done when**:
- [ ] `npx tsc --noEmit -p apps/store/tsconfig.app.json` ⇒ 0 erros
- [ ] `pnpm lint` ⇒ sem erro **novo** contra a baseline 30/8
- [ ] Testes por workspace ⇒ sem queda não explicada contra 4595/259
- [ ] `git diff --name-only` ⇒ `packages/core/src/payment/pricing.ts` e `installments.ts` **ausentes**
- [ ] `CLAUDE.md` ganha o que a feature institui; baselines atualizadas com os números medidos
- [ ] Commits completos gerados **de uma vez** (regra do `CLAUDE.md`, não um por task)

**Tests**: none · **Gate**: build

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 ──→ T2 ──→ T3
Phase 2:  T4 ──→ T5 ──→ T6
Phase 3:  T7 ──→ T8 ──→ T9
Phase 4:  T10 ──→ T11
Phase 5:  T12
```

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T1 | 1 função + testes | ✅ Granular |
| T2 | 1 função + testes | ✅ Granular |
| T3 | 1 função + 1 renomeação interna no mesmo arquivo | ✅ Granular (coeso) |
| T4 | 1 componente | ✅ Granular |
| T5 | 1 componente (modificar) | ✅ Granular |
| T6 | 1 remoção em 1 componente | ✅ Granular |
| T7 | 1 bloco em 1 componente | ✅ Granular |
| T8 | 1 substituição em 1 componente | ✅ Granular |
| T9 | 1 literal em 1 página | ✅ Granular |
| T10 | 1 componente (modificar) | ✅ Granular |
| T11 | 1 auditoria | ✅ Granular |
| T12 | 1 gate + doc | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama mostra | Status |
| --- | --- | --- | --- |
| T1 | None | início da Phase 1 | ✅ Match |
| T2 | None | T1 → T2 (ordem, não dependência de dado) | ✅ Match |
| T3 | None | T2 → T3 (ordem) | ✅ Match |
| T4 | T2 | Phase 2 depois da Phase 1 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T1, T6 | Phase 3 depois de 1 e 2 | ✅ Match |
| T8 | T1 | Phase 3 depois da Phase 1 | ✅ Match |
| T9 | None | dentro da Phase 3 | ✅ Match |
| T10 | T3 | Phase 4 depois da Phase 1 | ✅ Match |
| T11 | T10 | T10 → T11 | ✅ Match |
| T12 | T11 | Phase 5 depois da Phase 4 | ✅ Match |

Nenhuma task depende de task em fase posterior. As setas dentro da Phase 1 são **ordem de execução**,
não dependência de dado — T1, T2 e T3 são independentes entre si e por isso podem ser feitas em
qualquer ordem dentro da fase.

---

## Test Co-location Validation

| Task | Camada criada/modificada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T1 | Regra pura de dinheiro (`core/payment`) | unit | unit | ✅ OK |
| T2 | Regra pura da loja (`shared/lib`) | unit | unit | ✅ OK |
| T3 | Regra pura da loja (`entities/product/lib`) | unit | unit | ✅ OK |
| T4 | Componente de UI | unit | unit | ✅ OK |
| T5 | Componente de UI | unit | unit | ✅ OK |
| T6 | Componente de UI | unit | unit | ✅ OK |
| T7 | Componente de UI | unit | unit | ✅ OK |
| T8 | Componente de UI (consome core) | unit | unit | ✅ OK |
| T9 | Componente de UI (página) | unit | unit | ✅ OK |
| T10 | Componente de UI | unit | unit | ✅ OK |
| T11 | Auditoria — nenhuma camada de código | none | none | ✅ OK |
| T12 | Documentação / gate — nenhuma camada de código | none | none | ✅ OK |

Nenhuma task produz código não verificado. T11 e T12 não criam código.

---

## Requirement Traceability (spec → task)

| Requisito | Task |
| --- | --- |
| PDP-01 | T6 |
| PDP-02 | T4, T5 |
| PDP-03..PDP-09 | T2 |
| PDP-10 | T4, T5 |
| PDP-11, PDP-12, PDP-13 | T7 |
| PDP-14 | T1 |
| PDP-15 | T8 |
| PDP-16, PDP-17 | T3, T10 |
| PDP-18, PDP-19, PDP-21, PDP-22, PDP-23 | T10 |
| PDP-20 | T3, T10 |
| PDP-24 | T9 |

**Coverage:** 24 requisitos · 24 mapeados · **0 sem dono** ✅
