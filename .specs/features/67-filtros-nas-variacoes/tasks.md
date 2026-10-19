# 67 — Tasks

Commits: **nenhum** durante a execução (`CLAUDE.md` e a memória "commit só quando eu pedir").
Sub-agentes **sem `git stash`**. O gate de cada task é a suíte do(s) workspace(s) tocado(s), um por
vez, com exit code fora de pipe e `--testTimeout=20000` nos apps. **Toda task que toca `core` ou o
painel roda também a suíte da loja**, porque os guardas de lá varrem `apps/**`, `packages/**` e
`supabase/**`.

**Baseline de entrada**: medir na T00 com a árvore parada. A tabela do `CLAUDE.md` diz 12689/634
(store 4946/284 · backoffice 3325/185 · core 2929/120 · functions 977/22 · catalog-import 512/23),
e o delta da `67` é contra o **medido**, nunca contra a tabela.

> **Medida na T00 (2026-10-18, árvore parada, um workspace por vez, exit code fora de pipe)**: store
> **4946/284** · backoffice **3325/185** · core **2929/120** · functions **977/22** · catalog-import
> **512/23** = **12689/634**, os cinco com exit 0. Lint **26/7** (backoffice 24/5 · store 2/2), tipos
> **0 · 0**. **Bate exatamente a tabela do `CLAUDE.md`** — nada a anotar como divergência.

**Execução proposta** (feature com 18 tasks, então a oferta de sub-agentes vale):

| Lote | Fases | Tasks | Quando |
| --- | --- | --- | --- |
| A | 1 (dados + `core`) | T00–T04 | sozinho, primeiro |
| B | 2 (painel) | T05–T11 | **em paralelo** com C, depois de A |
| C | 3 (loja) | T12–T15 | **em paralelo** com B, depois de A |
| D | 4 (prova + fecho) | T16–T17 | orquestrador, depois de B e C |
| — | Verifier independente | — | automático, depois de D |

B e C têm propriedade de arquivo **disjunta** (`apps/backoffice/**` × `apps/store/**`). A única
âncora compartilhada é a suíte da loja, que os dois rodam como gate: um lote que vir reprovação num
arquivo do outro **registra** e não conserta.

## Gate Check Commands

Sempre da raiz.

| Nível | Comando |
| --- | --- |
| core | `pnpm --filter @estrelinha/core test` |
| store | `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| backoffice | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |
| um arquivo | `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000` |
| tipos | `npx tsc --noEmit -p apps/store/tsconfig.app.json` e `… apps/backoffice/tsconfig.app.json` (0 · 0) |
| lint | `pnpm lint` (baseline 26/7, sem regressão) |
| banco local | `supabase migration up` + probe por `psql -h 127.0.0.1 -p 54442 -U postgres` e HTTP em `:54441` como `anon` e como admin |
| build (fecho de fase) | `pnpm build` |

## Test Coverage Matrix

> Guias: `CLAUDE.md` (raiz, *Os guardas* e *Baselines*), `apps/*/CLAUDE.md`, `.specs/LESSONS.md`.

| Camada | Onde | Expectativa |
| --- | --- | --- |
| Regra pura (`core/filters`: `match`, `facets`, `suggest`, `rules`) | `packages/core/src/filters/__tests__` | 1 asserção por AC (VFL-09..11, 15, 18..21, 35..37); todo edge case da spec com caso próprio; fixtures que **divergem** (preço da peça × da variação, `L-013`); **os casos da `66` intocados**; propriedade "sem `option_marks` ⇒ igual ao algoritmo antigo"; o `purity.test.ts` alcança os arquivos novos por construção |
| Migration | store `shared/lib/__tests__/variantFiltersSchema.test.ts` | molde de `productFiltersSchema`: âncora dupla, `mutar()` que lança, um sensor por asserção, números **importados** de `core`, uma régua por comando (`L-033`) |
| Leitura e escrita do painel (`entities/filter/api`, `persistProduct`) | `__tests__` ao lado | dublê que **enxerga** o filtro (`.eq`/`.in`/colunas) — sem isso a regra fica inauditável; falha ⇒ nada aparece salvo; a ordem da troca (opção antes de apagar a peça toda) provada **temporalmente** |
| UI do painel | `features/**/ui/__tests__`, `pages/**` | renderizar a **página real** (`teste-nao-monta-a-arvore-que-prova`); literais da copy do Paper asseridos inteiros (`L-009`, `L-036`); um caso por item de lista (`L-010`); alvo ≥ 44 (`TAP_44`/`SWITCH_TAP_44`) |
| Loja (`category-filters`, `ProductCard`, páginas) | `__tests__` ao lado | o card com `matchedVariant` e **sem** ela (VFL-13); categoria **e** busca (VFL-17); o link com `publicVariantId` usando `nuvemshop_id` **e** o UUID (edge case) |
| Guardas novos | store `shared/lib/__tests__` | âncora dupla, sensores CRLF/LF/glob, inverso |
| Navegador | `prova-navegador.md` | 390×844 e 1440×900, banco local com curadoria de prova |

---

## Fase 1 — dados e regra (lote A)

### T00 · `00-baseline-de-entrada` — ✅ concluída (2026-10-18)
Medir os cinco workspaces, lint e tipos com a árvore parada. Registrar no topo deste arquivo.
**Done when**: os números estão aqui, e o que divergir da tabela do `CLAUDE.md` está anotado.

### T01 · `01-migration-marcacao-por-opcao` — ✅ concluída (2026-10-18)
**Where**: `supabase/migrations/20261019120000_67-filtros-nas-variacoes.sql`, store
`shared/lib/__tests__/variantFiltersSchema.test.ts`, `packages/core/src/filters/rules.ts`
(`FILTER_SUGGEST_TERMS_MAX`, `FILTER_OPTION_TEXT_MAX = 120`).
**What**: as duas tabelas, a coluna `suggest_terms`, a função de validação e o RLS, como no
`design.md`.
**Done when**: o guarda passa com os sensores; `supabase migration up` aplica e **reaplica** sem erro;
o probe mostra que `anon` lê marcação por opção de grupo ativo e peça ativa, **não** lê a de grupo
inativo nem a de peça inativa, **não** lê recusa nenhuma e **não** escreve em nenhuma das duas; o
admin escreve; 11 termos e um termo de 41 caracteres dão `23514`. Covers VFL-01, 03, 21, 35 e os
edge cases de cascata.

### T02 · `02-core-match` — ✅ concluída (2026-10-18)
**Where**: `core/filters/types.ts`, `core/filters/match.ts`, `__tests__/match.test.ts`.
**What**: `matchProduct` e `variantCarries`, na regra do `design.md`.
**Done when**: casos para VFL-09 (peça toda **ou** opção; dois grupos pela **mesma** variação, e o
par Prata+Chaveiro em variações diferentes **não** passa), VFL-10 (preço da variação dentro e fora
da faixa, com a peça dentro; estoque), VFL-11 (menor `position`, preferindo estoque), VFL-13 (peça
toda ⇒ `variant: null`), "peça toda vence opção", variação inativa ignorada, eixo ausente em
`option_values`, mesmo texto em dois eixos. **Sensor**: a versão "basta a peça somar" reprova na
mesma régua.

### T03 · `03-core-facets-delega` — ✅ concluída (2026-10-18)
**Where**: `core/filters/facets.ts` e `__tests__/facets.test.ts` (só acréscimos).
**What**: `passesSelection` e `facetCounts` sobre `matchProduct`; `visibleGroups` com marcação por
opção de variação ativa.
**Done when**: **todos os casos da `66` passam sem uma linha alterada**; casos novos para a
contagem por peça (VFL-15: peça com 3 variações casando conta 1) e para a faceta disjuntiva com a
mesma variação; teste de propriedade em fixtures geradas: sem `option_marks`, o resultado é igual ao
do algoritmo antigo, guardado **só no teste** como referência.

### T04 · `04-core-suggest` — ✅ concluída (2026-10-18)
**Where**: `core/filters/suggest.ts`, `rules.ts` (`suggestTermRefusal`), `__tests__/suggest.test.ts`.
**What**: `foldTokens`, `termMatches`, `suggestMarks`, `groupSuggestions`, `suggestionReason`.
**Done when**: os exemplos medidos viram casos ("Prata 925 Folheado a Ouro Rose" sugere Prata 925
**e** Folheado a ouro rosé; tag `Prata925` casa "Prata 925"; "Aço inoxidavel natural" casa "Aço
inoxidável"; "Ouro" casa "Folheado a Ouro Branco"; "Prata" **não** casa "Prateado", por token
inteiro); variação inativa não sugere; sugestão já marcada e recusada some (VFL-22); a recusa da peça
toda cala as duas fontes de peça toda; o motivo literal de cada fonte (VFL-18); `suggestTermRefusal`
para vazio, repetido com ou sem acento e igual ao nome (VFL-37). Gate: core **e** store (o
`buscaDeProdutoComDonoUnico` não pode acusar).

> **Fecho do lote A (2026-10-18)**: core **2929/120 → 3011/122** (+82: `match.test.ts` 30,
> `suggest.test.ts` 37, `facets.test.ts` +15 só por acréscimo — `diff` contra o original: zero linha
> removida ou alterada); store **4946/284 → 4999/285** (+53, `variantFiltersSchema.test.ts`). Exit 0
> nos dois; tipos 0 · 0; lint do store 2/2 (igual). Migration aplicada por `supabase migration up` e
> **reaplicada** por `psql -f` sem erro. Probe: `anon` lê só a marcação por opção de grupo ativo E
> peça ativa (o embed `products?select=…,product_option_filter_values(…)` responde 200), lê `[]` em
> recusas, recebe 401 ao inserir nas duas e apaga 0 linhas; admin insere (201), relê as recusas, e a
> repetição com `ignore-duplicates` é no-op; 11 termos, termo de 41 e termo vazio dão `23514`; alvo
> pela metade, eixo vazio e texto de 121 dão `check`; as cascatas de valor e de peça apagam as duas
> tabelas. Dados de prova removidos. **26 mutantes nos arquivos reais (SHA conferido na
> restauração): 26 mortos por asserção, 0 por compilação** — dois sobreviveram na primeira rodada
> (prefixo e não-contíguo, porque "Prata"/"Prateado" e o exemplo de contiguidade não discriminavam)
> e morreram com os casos novos. Desvio declarado: `FILTER_SUGGEST_TERM_MAX` próprio em vez de
> `FILTER_NAME_MAX` (`// SPEC_DEVIATION` em `rules.ts`).

---

## Fase 2 — painel (lote B)

### T05 · `05-painel-leituras` — ✅ concluída (2026-10-18)
**Where**: `entities/filter/api/useOptionMarks.ts`, `useSuggestionDismissals.ts`,
`entities/product/api/useProductMarkingPool.ts` (colunas novas), testes.
**Done when**: o pool traz `options`, as variações (`option_values`, `is_active`), as duas
marcações e as recusas; a leitura truncada **falha** (`readAllPages`); o dublê enxerga as colunas e
os filtros; o probe HTTP como admin confirma o `select` contra o banco local (`AD-012`).

### T06 · `06-painel-persistencia-por-opcao` — ✅ concluída (2026-10-18)
**Where**: `features/product-form/model/optionMarks.ts`, `persistProduct.ts` (etapa
`'filtros-opcao'`), `useProductForm.ts` (estado `option_marks`), testes.
**Done when**: VFL-03 (grava depois do produto existir, inclusive no produto novo), VFL-05
(renomear eixo leva a marcação junto, detectado por posição), VFL-06 (remover texto ou eixo apaga),
VFL-08 (falha ⇒ `{ ok:false, step:'filtros-opcao' }` e o estado mantido); o diff apaga só as que
saíram e insere só as novas, com o dublê enxergando o filtro.

### T07 · `07-painel-bloco-pelas-variacoes` — ✅ concluída (2026-10-18)
**Where**: `features/product-form/ui/FilterValuesCard.tsx`, `OptionMarkRow.tsx`, `MarkPopover.tsx`,
`SuggestionStrip.tsx`, testes.
**Done when**: o desenho do artboard do produto. VFL-01 (um cartão por eixo e uma linha por texto,
na ordem de `options`; eixos sem marcação nem sugestão recolhidos), VFL-02 (sem eixo, sem seção),
VFL-04 ("Já vale para a peça toda" desabilitado, com o texto), VFL-07 ("Sem variação ativa"),
VFL-29..31 (sugestão tracejada com motivo; "Aceitar" só muda o estado; "Recusar" grava na hora; a
mesma função de `core`). Montado pela **página real** do produto em pelo menos um caso. Alvos ≥ 44.

### T08 · `08-painel-rota-e-fila` — ✅ concluída (2026-10-18)
**Where**: `app/App.tsx`, `pages/admin/AdminFilterSuggestionsPage.tsx`,
`features/filter-suggestions/{model,ui}`, testes.
**Done when**: o desenho dos dois artboards da fila. A rota é irmã auto-fechada dentro do
`RequireAdmin` e vence `:groupId` (caso com `MemoryRouter`); `rotasSobGuarda`, `navItems` e
`focusRoutes` verdes. VFL-18 (motivo, valor, alvo e contagem literais), VFL-19 (expandir, todas
selecionadas), VFL-25 (recortes por grupo, por fonte e pela busca com `dobrarTexto`) e VFL-26 (os
dois estados vazios com a copy literal).

### T09 · `09-painel-aprovar-recusar` — ✅ concluída (2026-10-18)
**Where**: `features/filter-suggestions/model/aprovar.ts`, a barra fixa, `AdminFiltersPage` (link
"Sugestões (N)"), a confirmação de remover valor da `66`, testes.
**Done when**: VFL-20 (uma chamada por tabela, repetição é no-op), VFL-21 (recusa grava e some),
VFL-23 (falha ⇒ seleção intacta e nada marcado), VFL-24 (a fila e as contagens atualizam sem
recarregar: a régua é a **chave** invalidada), VFL-27 (o aviso na linha **e** a ordem temporal:
grava a opção antes de apagar a peça toda, provado com o dublê perguntado de dentro da segunda
chamada), VFL-28 (o link com o total), e o edge case da confirmação somando as marcações por opção.

### T10 · `10-painel-massa-por-opcao` (P2) — ✅ concluída (2026-10-18)
**Where**: `features/filter-bulk-assign/**`.
**Done when**: VFL-32 (a coluna "Hoje" com as três formas), VFL-33 (o atalho para a fila recortada
pelo valor) e VFL-34 ("Remover de N" apaga as duas formas, com a confirmação dizendo isso).

### T11 · `11-painel-termos-de-sugestao` (P2) — ✅ concluída (2026-10-18)
**Where**: `features/filter-editor/**`, `entities/filter/api/useAdminFilterCatalog.ts` (grava
`suggest_terms`).
**Done when**: VFL-35..37. O campo, as recusas literais e o contador, e a fila passa a considerar o
termo sem recarregar (a chave invalidada). O probe confirma a gravação real.

> **Fecho do lote B (2026-10-18)**: backoffice **3325/185 → 3451/195** (+126/+10), exit 0; store
> **5070/288**, exit 0 (com o lote C já terminado — nenhuma reprovação). Tipos **0 · 0**; lint do painel
> **24/5** (igual). Probes como admin em `:54441`: o `upsert` por opção (`on_conflict` da quádrupla,
> `ignore-duplicates` e `merge-duplicates`) responde 201/200 e repete sem erro, o `delete` pelos quatro
> campos apaga a linha certa, o embed do formulário e o `(count)` do catálogo leem, a recusa grava e
> repete sem erro, `suggest_terms` grava e 11 termos dão `23514`; dados de prova removidos. Desvios
> (`// SPEC_DEVIATION`): a etapa nova do `persistProduct` chama-se `'marcações por variação'` (o passo
> vai para o toast), e a nota do motivo diz "as outras opções" no lugar de "as outras cores". Decisões
> sem AC: o "Remover de N" só pede confirmação quando a seleção leva marcação por opção (sem ela o
> fluxo da 66 fica igual); "Aprovar" no celular diz "Aprovar N nesta opção" (o artboard abrevia).

---

## Fase 3 — loja (lote C)

### T12 · `12-loja-leitura` — ✅ concluída (2026-10-18)
**Where**: `entities/product/lib/mapProduct.ts` (embed `product_option_filter_values` nos dois
`select`; `nuvemshop_id` nas variações do card), `cardSelect.test.ts`, os testes do mapper,
`@estrelinha/supabase/types` (`Product.option_marks`).
**Done when**: o mapper produz `option_marks: []` sem o embed; **probe HTTP como `anon`** contra o
banco local com a curadoria de prova: a vitrine volta **com** as marcações de grupo ativo e **sem**
as de grupo inativo, e nada responde `PGRST200`/`PGRST201`.

### T13 · `13-loja-regra-da-listagem` — ✅ concluída (2026-10-18)
**Where**: `features/category-filters/model/filters.ts` e testes.
**Done when**: `filterProducts` devolve `{ product, variant }` por `matchProduct`;
`passesSystemVariant` testa o preço (`price ?? preço da peça`), o estoque e o desconto **da
variação**, com fixtures em que os preços divergem (`L-013`); as contagens vêm de `facetCounts`;
`filtroSemTag` segue verde.

### T14 · `14-loja-card-na-variacao` — ✅ concluída (2026-10-18)
**Where**: `entities/product/ui/ProductCard.tsx`, `pages/CategoryPage.tsx`, `pages/SearchPage.tsx`,
`entities/product/lib/__tests__/fiacaoDaVitrine.test.ts`, testes.
**Done when**: VFL-11..13, VFL-16, VFL-17. O link com `?variant=` (os dois ramos de
`publicVariantId`), a foto da variação e o recuo para a da peça, o preço e o preço-de dela; sem
`matchedVariant` o card é idêntico; tirar o último filtro devolve o card de hoje; as **duas páginas
renderizadas** passam a prop (régua em `fiacaoDaVitrine`); a página do produto aberta com aquele
`?variant=` seleciona a variação (VFL-14), com `findVariantByPublicId` real.

### T15 · `15-loja-guarda-dono-unico` — ✅ concluída (2026-10-18)
**Where**: store `shared/lib/__tests__/marcacaoPorOpcaoComDonoUnico.test.ts`.
**Done when**: VFL-38. Zero allowlist além do mapper, âncora dupla e sensores (CRLF, LF, glob de dois
asteriscos, o inverso).

> **Fecho do lote C (2026-10-18)**: store **4999/285 → 5070/288** (+71/+3; entrada medida com a
> árvore parada, exit 0 nos dois); core remedido 3011/122 (idêntico); tipos **0 · 0** (store e
> backoffice, por `packages/supabase/src/types` ter ganho `Product.option_marks`, só acréscimo); lint
> do store 2/2 (igual, nenhum nos arquivos tocados). Backoffice **não** foi remedido em testes: o
> lote B o edita ao mesmo tempo. **Probe HTTP como `anon`** (:54441, os três `select` reais extraídos
> do `mapProduct.ts`): com uma marcação por opção de grupo ativo e outra de um grupo **inativo**
> criado só para a prova, os três respondem 200, entregam só a de grupo ativo e a variação chega com
> `nuvemshop_id`; a vitrine inteira (691 peças) responde 200 sem `PGRST200`/`PGRST201`. Dados de
> prova removidos (0 linhas na tabela nova). **21 mutantes nos arquivos reais (SHA conferido na
> restauração): 21 mortos por asserção, 0 por compilação.** Desvio declarado: os pares saem de
> `filterMatches`, e `filterProducts` segue devolvendo as peças como projeção dela, para os casos da
> 66 ficarem intocados (`// SPEC_DEVIATION` em `filters.ts`). `filtroSemTag` teve a metade positiva
> **reescrita** de `passesSelection(` para `matchProduct(` (mesma força, a lista passou a sair dela).

---

## Fase 4 — prova e fecho (lote D, orquestrador)

### T16 · `16-prova-em-navegador` — ✅ concluída (2026-10-18; 4 defeitos de UI achados e consertados, reprova em `prova-navegador.md`)
Banco local com curadoria de prova **por opção** (SQL), dev servers em :8082 e :8083, Chromium em
390×844 e 1440×900, e o bundle servido conferido. Registro em `prova-navegador.md`.
**Done when**: os itens de *O que só o navegador prova* do `design.md`, mais os dois Success
Criteria medidos (nenhum card de "Prata 925" abre em variação que não é Prata 925; Prata+Chaveiro).

### T17 · `17-fecho` — ✅ concluída (2026-10-19; 13140/654, verificação PASS na rodada 2 + endurecimento do guarda na 3)
Baselines remedidas e escritas no `CLAUDE.md` da raiz; o `CLAUDE.md` do painel e o da loja
atualizados; `AD-051` no `STATE.md`; handoff; a linha da `67` na seção de numeração; `payment/**`
com zero arquivos alterados.

---

## Requirement → Task

| Requisito | Task |
| --- | --- |
| VFL-01..08 | T01, T05, T06, T07 |
| VFL-09..17 | T02, T03, T12, T13, T14 |
| VFL-18..28 | T04, T08, T09 |
| VFL-29..31 | T04, T07 |
| VFL-32..34 | T10 |
| VFL-35..37 | T01, T04, T11 |
| VFL-38 | T15 |

**Coverage:** 38 de 38 mapeados.
