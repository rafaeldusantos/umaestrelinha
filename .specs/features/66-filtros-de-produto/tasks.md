# 66 — Tasks

Commits: **nenhum** durante a execução (`CLAUDE.md` + memória "commit só quando eu pedir"). O gate de
cada task é a suíte do(s) workspace(s) tocado(s), um por vez, exit code fora de pipe,
`--testTimeout=20000` nos apps. **Toda task que toca o painel roda também a suíte da loja** (os
guardas de lá varrem os dois apps).

**Baseline de entrada — medida em 2026-10-18 com a árvore parada, depois do commit da `65`
(`7779c69`):** store **4795/278** · backoffice **3206/176** · core **2826/116** · functions
**977/22** · catalog-import **512/23** = **12316/615**. Tipos 0 · 0. Lint do store 2/2. A tabela do
`CLAUDE.md` estava velha em core (+20/+1), functions (+3) e backoffice (+4) — o delta da `66` é contra
**este** número.

**Execução:** lote A (fase 1) sozinho; lotes B (fase 2, painel) e C (fase 3, loja) **em paralelo**
depois dele (autorizado pelo usuário em 2026-10-18); fase 4 pelo orquestrador.

## Gate Check Commands

Sempre da raiz, um workspace por vez, exit code capturado **fora** de pipe (`cmd > log; echo $?`).

| Nível | Comando |
| --- | --- |
| core | `pnpm --filter @estrelinha/core test` |
| store | `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| backoffice | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |
| um arquivo | `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000` |
| tipos | `npx tsc --noEmit -p apps/store/tsconfig.app.json` e `… apps/backoffice/tsconfig.app.json` (0 · 0) |
| lint | `pnpm lint` (baseline 26/7 — sem regressão) |
| banco local | `supabase migration up` (ou `db reset` **só** se o usuário autorizar) + probe por `psql -h 127.0.0.1 -p 54442 -U postgres` e HTTP em `:54441` |
| build (fecho de fase) | `pnpm build` |

**Regra do projeto:** toda task que toca `packages/core` ou o painel roda **também** a suíte da loja
(os guardas de lá varrem `apps/**`, `packages/**` e `supabase/**`).

## Test Coverage Matrix

| Camada | Onde | Expectativa |
| --- | --- | --- |
| Regra pura (`core/filters`) | `packages/core/src/filters/__tests__` | 1 asserção por AC; todo edge case com caso próprio; fixtures que divergem (`L-013`); sensor embutido onde a regra tem um "jeito ingênuo" (ex.: E dentro do grupo) |
| Migration | store `shared/lib/__tests__/productFiltersSchema.test.ts` | molde de `categoryListSchema.test.ts`: âncora dupla, `mutar()` que lança, um sensor por asserção, números **importados** de `core` |
| Hooks de dados | ao lado do hook | estado do cache / chamada **com a chave e o filtro certos** (dublê que enxerga o filtro — memória "dublê que não enxerga") |
| Componentes | ao lado do componente | literal da copy (`L-036`), um caso por item de lista na AC (`L-010`), sidebar **e** sheet (`L-029`) |
| Fiação | página real montada (memória "teste não monta a árvore que prova") | a página renderiza o bloco; nunca recompor a árvore no teste |
| Guardas de fonte | `filtroSemTag.test.ts` | âncora dupla, CRLF/LF, sensor que chama o colhedor real |

## Fase 1 — Regra e banco

| # | Task | Reqs | Done when |
| --- | --- | --- | --- |
| 01 | ✅ `01-core-filters-rules` — `types.ts`, `rules.ts` (limites, reservadas, `filterSlug`, `groupRefusal`, `valueRefusal`) + `purity`/`denoReach` do módulo | FLT-03..06 | casos por recusa (vazio, 41 chars, nome repetido com acento/maiúscula, slug reservado, `utm_x`, slug repetido, 13º grupo, 61º valor) e o inverso que passa; core verde |
| 02 | ✅ `02-core-filters-facets` — `visibleGroups`, `passesSelection`, `facetCounts` | FLT-21..24, FLT-37, FLT-41 | fixture com dois grupos e valores que **divergem** (`L-013`): OU dentro, E entre, faceta disjuntiva, valor sem produto some, grupo inativo e escondido somem, `(0)` com seleção; sensor: a regra "E dentro do grupo" reprova |
| 03 | ✅ `03-core-filters-url` — `parseFilterParams` / `writeFilterParams` | FLT-29..34 | ida e volta; desconhecido ignorado; preço recortado; estado padrão ⇒ sem parâmetro; `q`/`utm_*`/`gclid` preservados |
| 04 | ✅ `04-migration-filtros` — a migration + `productFiltersSchema.test.ts` | FLT-04, FLT-07..09, FLT-35..38 | guarda verde com `mutar()` que lança; **probe SQL** local: anon lê só grupo ativo, anon não grava, admin grava, cascatas apagam |
| 05 | ✅ `05-tipos-db` — tipos em `@estrelinha/supabase/types` | — | `tsc` 0·0 |

## Fase 2 — Painel

| # | Task | Reqs | Done when |
| --- | --- | --- | --- |
| 06 | ✅ `06-entity-filter-admin` — `useAdminFilterCatalog` + mutações (grupo, valor, ordem) com `fetchX(modo)` | FLT-01, FLT-10 | revalidar não volta ao esqueleto; falha mantém rascunho; **probe HTTP** do agregado de contagem |
| 07 | ✅ `07-rota-e-nav` — rota, item no grupo Catálogo | FLT-01 | `rotasSobGuarda`, `navItems`, `focusRoutes`, `NavRail` verdes |
| 08 | ✅ `08-admin-filters-page` — lista de grupos + editor (`GroupForm`, `ValueList`) | FLT-01..10 | um caso por AC; confirmação com contagem nas duas remoções (literal da frase, `L-036`); 390 e 1440 em navegador |
| 09 | ✅ `09-bulk-assign` — `BulkAssignPanel` | FLT-15..20 | uma chamada por lote (assere a chamada, não só o resultado); "selecionar todos" só os visíveis; falha não marca nada; contagem atualiza |
| 10 | ✅ `10-bloco-no-produto` — `FilterValuesCard` + `useProductForm` + `persistProduct` | FLT-11..14 | produto novo recebe a marcação **depois** de existir (ordem de chamada); diff apaga as que saíram; **gravação provada pelo painel** contra o banco local (`AD-012`) |
| 11 | ✅ `11-esconder-por-categoria` — `CategoryFilterGroups` | FLT-35..38 | desligar grava a linha, religar apaga; grupo novo nasce visível |
| 12 | ✅ `12-selecionar-pela-tag` — recorte "Com a tag…" no bulk | FLT-42..43 | recorte não grava nada sozinho |

## Fase 3 — Loja

| # | Task | Reqs | Done when |
| --- | --- | --- | --- |
| 13 | ✅ `13-catalogo-na-loja` — `useFilterCatalog`, embed `product_filter_values(value_id)` nos dois `select`, `filter_value_ids` no mapper, escondidos via `useCategories` | FLT-21, FLT-26 | `cardSelect`, `categoryTreeSingleOwner` verdes; falha ⇒ catálogo vazio; probe HTTP com grupo inativo devolve `[]` |
| 14 | ✅ `14-modelo-sem-tag` — `CategoryFilters.selection`, `filterProducts` delega a `core`, chips de valor, `collectTags`/`toggleTag` apagados + `filtroSemTag.test.ts` | FLT-23, FLT-25, FLT-44 | chip de valor removível; "Limpar" zera seleção; guarda com âncora dupla e sensores |
| 15 | ✅ `15-blocos-no-painel` — `CategoryFiltersPanel` com um bloco por grupo, contagem, desabilitado, "Ver todos (N)" | FLT-21..22, FLT-24, FLT-27..28 | um caso por AC com asserção positiva na sidebar **e** no sheet (`L-029`); `touchTarget` verde |
| 16 | ✅ `16-url-na-categoria` — `useFilterUrlState` na `CategoryPage` | FLT-29..34 | F5 mantém; voltar não empilha; canônica sem query |
| 17 | ✅ `17-filtros-na-busca` — `SearchPage` com sidebar/sheet | FLT-39..41 | `q` preservado; sem esconder por categoria |

**Lote C fechado (2026-10-18):** store 4849/279 → **4942/283**; tsc 0; lint 2/2; 12 mutantes, 12
mortos por asserção. Decisões registradas como `SPEC_DEVIATION`: termo novo na busca zera os filtros
(mantém ordem e `utm_*`); "Limpar" preserva a ordem; o CTA do sheet segue "Ver N produtos"; chip do
sheet com `h-11` próprio (não `TAP_44`, que invadiria o vizinho); desabilitado sem opacidade.
⚠️ **Ordem de deploy:** a migration tem de ir antes do bundle — o embed novo em `products` e
`categories` falha sem as tabelas.

## Fase 4 — Fecho

| # | Task | Done when |
| --- | --- | --- |
| 18 | ✅ `18-prova-em-navegador` — banco local com 3 grupos curados; 390×844 e 1440: categoria, sheet, URL colada em aba anônima, busca; painel: criar, marcar em massa, bloco do produto | medidas no `validation.md`; zero rolagem horizontal; nenhum chip em duas linhas |
| 19 | ✅ `19-baselines-e-docs` — baselines no `CLAUDE.md`, `apps/store/CLAUDE.md`, `apps/backoffice/CLAUDE.md`, linha nova em *O que espera decisão da dona* (montar os grupos), `AD-050` no `STATE.md` | números medidos, não somados |

Depois da T19: **Verifier independente** (autor ≠ verificador) com sensor de mutação nos arquivos
reais, distinguindo morte por asserção de morte por compilação.

## Lotes (sub-agentes)

19 tasks ⇒ 3 lotes de fases inteiras (fase nunca se divide): **A** = Fase 1 (5),
**B** = Fase 2 (7), **C** = Fases 3 + 4 (7). Sem `git stash` nos sub-agentes.
