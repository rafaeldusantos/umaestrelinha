# 68 — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** **Exceção do projeto (CLAUDE.md, `BL-012`, sobrepõe a skill): NENHUM commit
por task e nenhum commit no fim — só quando o usuário pedir. Sub-agentes nunca usam `git stash`.**

**Design**: `.specs/features/68-seo-por-variacao/design.md` · **Decisão**: `AD-052`
**Status**: Approved — em execução desde 2026-10-19

---

## Test Coverage Matrix

> Guidelines found: `CLAUDE.md` (raiz: guardas lidos do disco com âncora e sensor, régua nunca
> afrouxada, prova em navegador para layout), `packages/core/CLAUDE.md`, `supabase/CLAUDE.md`
> (`AD-004`: lógica em `handlers.ts`, `index.ts` só wiring), `apps/store/CLAUDE.md`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura em `core` (`seo/variant.ts`, `shopping`, `sitemap`) | unit | 1:1 com SVR-01..11, 24..33; todo edge case da spec; fixture "Pingente Pata" | `packages/core/src/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Alcance Deno de `core` | guarda de fonte | grafo transitivo com `.ts` explícito, âncora subida ao número medido | `packages/core/src/{seo,shopping}/__tests__/denoReach.test.ts` | idem |
| Edge function (`handlers.ts`) | unit com deps injetadas | caminho feliz + cada falha (SVR-21, SVR-26) + escape; `index.ts` coberto por `wiringResolve` | `supabase/functions/*/__tests__/*.test.ts` | `pnpm --filter @estrelinha/functions test` |
| Página/componente da loja | component (RTL) | SVR-08..16 renderizando a **página real** com o client dublado (nunca recriando a composição) | `apps/store/src/**/__tests__/*.test.tsx` | `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| Guarda de dono único / workflow | guarda de fonte | zero allowlist, âncora dupla, metade positiva, sensores CRLF/LF/glob e inverso | `apps/store/src/shared/lib/__tests__/*.test.ts` | idem |
| Painel (P3) | component (RTL) | SVR-37/38 pela seção real do formulário | `apps/backoffice/src/**/*.test.tsx` | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |
| Layout / HTML servido / `page_view` | prova em navegador e `curl` | SVR-14, SVR-23, Success Criteria 1–3 | `validation.md` | ver T13 |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | task de um workspace | a suíte do workspace tocado, exit code fora de pipe |
| Full | fim de fase | os workspaces tocados **e** a suíte da loja (os guardas dela varrem `apps/**` e `supabase/functions/**`) + `npx tsc --noEmit -p apps/<app>/tsconfig.app.json` |
| Build | T14 | os 5 workspaces um por vez + `pnpm lint` + `tsc` dos dois apps + `pnpm build` + `git diff --name-only -- packages/core/src/payment` vazio + `git diff --stat -- packages/core/src/shopping/__tests__/shoppingParity.test.ts` vazio |

---

## Execution Plan

```
Phase 1 (core):        T01 → T02 → T03 → T04 → T05
Phase 2 (functions):   T06 → T07
Phase 3 (loja):        T08 → T09
Phase 4 (guardas, P3): T10 → T11 → T12
Phase 5 (prova/fecho): T13 → T14
```

Fases 2, 3 e 4 dependem da 1. T10 depende de T06, T07 e T09 (a metade positiva lê os três). **Não
rodar fases em paralelo na mesma árvore**: duas suítes simultâneas produzem `Test timed out in 5000ms`
em guarda de disco (medido na `34`, `46`, `48`) — a edição isolaria, a medição não.

---

## Task Breakdown

### T01: `variantPath` — o construtor único de `?variant=` ✅
**What**: `variantPath(product, variant)` em `core/shopping/offer.ts`; `offerLink` passa a delegar.
**Where**: `packages/core/src/shopping/offer.ts`, `__tests__/offer.test.ts`
**Depends on**: —  **Requirement**: SVR-05, SVR-40
**Done when**:
- [ ] `offerLink` byte a byte igual ao de antes (caso com `nuvemshop_id` e com UUID)
- [ ] `shoppingParity.test.ts` sem linha alterada; `shopping/denoReach` verde
**Tests**: unit · **Gate**: quick (core)

### T02: `indexableOptions`, `resolveVariantPage`, `publicOptionMarks` ✅
**What**: `core/seo/variant.ts` com a regra SVR-01..07 e a réplica da RLS (SVR-20); `optionRepresentative` com nome próprio.
**Where**: `packages/core/src/seo/variant.ts`, `seo/index.ts`, `seo/__tests__/variant.test.ts`
**Depends on**: T01  **Requirement**: SVR-01..07, SVR-20
**Done when**:
- [ ] Fixture "Pingente Pata" (spec, Independent Test): duas opções em `Cor`, zero em `Tamanho`, caminho == `resolveOffer(...).link` sem origem
- [ ] Cada ramo de SVR-06/07 e cada edge case da spec (mesmo valor em dois textos; texto só em inativa; representante desativada; UUID com `nuvemshop_id`; `?variant=` repetido via `URLSearchParams`)
- [ ] Representante ignora estoque (caso em que `representativeVariant` escolhe outra) e desempata por `publicVariantId`
- [ ] Ordem dos textos medida no banco local: os textos de `option_values` estão sempre em `options[].values`? Registrar o número; a regra segue o design
**Tests**: unit · **Gate**: quick (core)

### T03: `productHead` — título, descrição e canônica ✅
**What**: a régua única de SVR-08..11.
**Where**: `seo/variant.ts`, `seo/__tests__/seo.test.ts` (ganha casos), `seo/__tests__/denoReach.test.ts` (âncora sobe)
**Depends on**: T02  **Requirement**: SVR-08..11, SVR-39
**Done when**:
- [ ] Marca só com ≤ 60 (casos em 60 e 61, code points), nunca cortado, marca nunca em dobro; descrição ≤ 160, nunca vazia, começa pelo texto
- [ ] `product` ⇒ `productPageMeta` idêntico (`toEqual`) e caminho sem query
- [ ] Medido no banco local quantos `products.name` contêm a marca; caso trava o pressuposto
- [ ] `denoReach` de `seo` alcança `seo/variant.ts` e `shopping/{identity,eligibility,offer,pricing}.ts`, âncora = número medido
**Tests**: unit · **Gate**: quick (core)

### T04: JSON-LD — `withPageUrl`, `productGroupJsonLd`, `VARIES_BY` ✅
**Where**: `packages/core/src/shopping/jsonld.ts`, `__tests__/jsonld.test.ts`
**Depends on**: T03  **Requirement**: SVR-22, SVR-30..33
**Done when**:
- [ ] `productJsonLd` intocado; `withPageUrl` só acrescenta `url`/`inProductGroupWithID`
- [ ] `ProductGroup`: `productGroupID` == `publicProductId`, `variesBy`, um `hasVariant` por opção com `offers` de `resolveOffer` da representante; `Cor`/`cor`/`COR` casam, "Tipos de elo" não
**Tests**: unit · **Gate**: quick (core)

### T05: sitemap — `<loc>` de opção ✅
**Where**: `packages/core/src/sitemap/{urls,types}.ts`, `__tests__/{urls,render}.test.ts`
**Depends on**: T02  **Requirement**: SVR-24, 25, 27, 28, 29
**Done when**:
- [ ] `<loc>` de opção logo depois da peça, `lastmod` da peça; duplicata continua lançando
- [ ] Régua de SMP-07 reescrita para SVR-27, com sensores (`?utm=`, `?variant=` não indexável, `&` extra) e o inverso
- [ ] SVR-28 nos dois sentidos com `resolveVariantPage` e `indexableOptions` reais
- [ ] Sem `variants`/`optionMarks` na entrada ⇒ documento idêntico ao de hoje
**Tests**: unit · **Gate**: full (core + store)

### T06: `product-page` — `<head>` de opção e canônica servida ✅
**Where**: `supabase/functions/product-page/{handlers,index}.ts`, `__tests__/handlers.test.ts`
**Depends on**: T03, T04  **Requirement**: SVR-17..22, SVR-30, SVR-33
**Done when**:
- [ ] Exatamente uma `rel="canonical"` absoluta == `og:url`; origem relativa ⇒ nenhuma das duas
- [ ] Opção ⇒ `<title>`, description, og/twitter de `productHead`; grupo inativo ⇒ peça; marcações lançando ⇒ 200, peça, log `{fn:'product-page', erro:'marcacoes', slug}`
- [ ] JSON-LD na precedência do design; `offers.url` e `sku` iguais aos de hoje; `&`, `<`, aspas no texto escapados
**Tests**: unit · **Gate**: full (functions + store)

### T07: `sitemap` function — variações e marcações paginadas ✅
**Where**: `supabase/functions/sitemap/{handlers,index}.ts`, `__tests__/handlers.test.ts`
**Depends on**: T05  **Requirement**: SVR-26, SVR-29
**Done when**:
- [ ] Falha de variações, falha de marcações e leitura truncada (1001/1000) ⇒ 503 `text/plain` sem `<urlset>`
- [ ] Caminho feliz com duas cores marcadas ⇒ duas `<loc>` com `?variant=`
**Tests**: unit · **Gate**: full (functions + store)

### T08: o card usa `variantPath` ✅
**Where**: `apps/store/src/entities/product/ui/ProductCard.tsx` + teste existente
**Depends on**: T01  **Requirement**: SVR-40
**Done when**: link do card idêntico ao de antes (dígitos e UUID); suíte do card verde
**Tests**: component · **Gate**: quick (store)

### T09: `ProductPage` — `productHead`, canônica, SVR-16, slug antigo ✅
**Where**: `apps/store/src/pages/ProductPage.tsx`, `pages/__tests__/ProductPage*.test.tsx`
**Depends on**: T03, T08  **Requirement**: SVR-08..16
**Done when**:
- [ ] Página real renderizada: título e canônica de opção, de peça, de `?variant=` não marcado e inválido
- [ ] Trocar a cor no seletor não muda título nem canônica (SVR-12); navegar `?variant=A → B` reabre em B e troca o `<head>` (SVR-16)
- [ ] Sem `option_marks` ⇒ `<head>` da peça e a variação da URL aberta (SVR-15); antes da peça, nenhum título (SVR-13)
- [ ] Slug antigo preserva `?variant=`; `metaPorRota` e `marcacaoPorOpcaoComDonoUnico` verdes
**Tests**: component · **Gate**: full (store + tsc)

### T10: guarda `paginaDeOpcaoComDonoUnico.test.ts` ✅
**Where**: `apps/store/src/shared/lib/__tests__/`
**Depends on**: T06, T07, T09  **Requirement**: SVR-39, SVR-40
**Done when**: régua do design, zero allowlist, âncora dupla, metade positiva, sensores (CRLF, LF, glob, inverso); a montagem antiga do card reinjetada **reprova**
**Tests**: guarda · **Gate**: quick (store)

### T11: painel — "Tem página própria no Google" ✅
**Where**: `apps/backoffice/src/features/product-form/{model/optionRows.ts,ui/OptionMarkRow.tsx,ui/FilterValuesCard.tsx}` + testes
**Depends on**: T02  **Requirement**: SVR-37, SVR-38
**Done when**: pela seção real do formulário — texto nas linhas indexáveis, frase do segundo eixo, nada com grupo inativo; tom sem exclamação
**Tests**: component · **Gate**: full (backoffice + store + tsc)

### T12: `sitemap-check.yml` confere canônica e origem ✅
**Where**: `.github/workflows/sitemap-check.yml`, `apps/store/src/shared/lib/__tests__/sitemapCheckWorkflow.test.ts`
**Depends on**: T05  **Requirement**: SVR-34..36, SVR-41
**Done when**: o passo novo existe e é guardado (sem literal de domínio/slug/id, zero `?variant=` não falha, recorte por bloco que reprova); o script do passo rodado localmente contra o sitemap servido local
**Nota de execução (2026-10-19)**: o script do `run:` inteiro foi extraído do `.yml` e rodado contra um
servidor de prova que responde por caminho **e** query, em cinco cenários: `ok` e `sem-opcao` → exit 0
(o segundo imprime `0 <loc> de opção`); `origem-errada`, `opcao-errada` e `sem-canonica` → exit 1 com o
`::error::` de SVR-41, SVR-34 e SVR-18. Contra a function local **não** foi possível: o edge runtime local
responde `503 BOOT_ERROR` (`Module not found …/core/src/sitemap/index.ts`, arquivo que existe — o bind-mount
obsoleto que o `CLAUDE.md` documenta); fica para a T13, que recria o container. O default da `ORIGEM`
(literal da loja provisória, decisão da `33`) **continua no arquivo**: o guarda permite exatamente essa
URL e nenhuma outra, e o passo novo não tem literal nenhum. Removê-lo é decisão de operação (a variável
`STORE_PUBLIC_URL` do repositório não pôde ser conferida: `gh` sem login nesta máquina).
**Tests**: guarda · **Gate**: quick (store)

### T13: prova servida ✅ (local) · ⏳ (produção)
**Depends on**: T06, T07, T09, T12  **Requirement**: SVR-14, SVR-23, Success Criteria 1–3
**Done when**:
- [x] Local: `supabase start` + functions servidas + **três** cores marcadas no banco local; script sobre **todo** `<loc>` com `?variant=` ⇒ canônica servida igual (3/3, 0 falhas); `Content-Type` conferido
- [x] Feed gerado antes/depois sobre o mesmo catálogo: **idêntico byte a byte** (3.110 itens)
- [x] Navegador (390×844, build de produção): `page_view` com o título da opção e `?variant=` no `page_location`
- [ ] Produção (depois do deploy, quando o usuário publicar): tipo entregue, canônica da peça servida, zero `<loc>` com `?variant=`
**Evidência**: `prova-servida.md`. **Ocorrência**: um hit real saiu para o GA4 (registrado lá).
**Tests**: prova · **Gate**: —

### T14: fecho ✅ (gate, documentação e Verifier: rodada 2 PASS)
**Depends on**: T13
**Done when**: gate Build inteiro; baselines e `CLAUDE.md` (raiz, `supabase/`, `packages/core`, `apps/store`) atualizados; Verifier independente roda (`validation.md`)
**Resultado do gate** (2026-10-19, um workspace por vez, exit fora de pipe): core 3114/123 · functions
1010/22 · catalog-import 512/23 · store 5222/292 · backoffice 3493/198 = **13351/658**, todos exit 0;
lint **26/7** (= baseline) depois de dois consertos — `porOpcao` memorizado em `FilterValuesCard.tsx`
e `ProductPageOptionHead.test.tsx` movido de `pages/__tests__` para `app/__tests__` (ele importa o
`PageViewTracker` de `app/`); `tsc` 0 · 0 · 0; `pnpm build` verde; `payment/**` e
`shoppingParity.test.ts` sem diff.
**Tests**: — · **Gate**: build

---

## Validação pré-aprovação

| Task | Escopo | Granular | Deps no corpo == diagrama | Tests == matriz |
| --- | --- | --- | --- | --- |
| T01 | 1 função | ✅ | — ✅ | unit ✅ |
| T02 | 1 arquivo, 3 funções da mesma regra | ✅ coeso | T01 ✅ | unit ✅ |
| T03 | 1 função | ✅ | T02 ✅ | unit ✅ |
| T04 | 1 arquivo | ✅ | T03 ✅ | unit ✅ |
| T05 | 1 regra | ✅ | T02 (seta T04→T05 é ordem de fase, não dependência) ✅ | unit ✅ |
| T06 | 1 function | ✅ | T03, T04 ✅ | unit ✅ |
| T07 | 1 function | ✅ | T05 ✅ | unit ✅ |
| T08 | 1 componente | ✅ | T01 ✅ | component ✅ |
| T09 | 1 página | ✅ | T03, T08 ✅ | component ✅ |
| T10 | 1 guarda | ✅ | T06, T07, T09 ✅ | guarda ✅ |
| T11 | 1 seção | ✅ | T02 ✅ | component ✅ |
| T12 | 1 workflow + guarda | ✅ | T05 ✅ | guarda ✅ |
| T13 | prova | ✅ | T06, T07, T09, T12 ✅ | prova ✅ |
| T14 | fecho | ✅ | T13 ✅ | — ✅ |
