# 66 — Filtros de produto · Validation

**Date**: 2026-10-18
**Spec**: `.specs/features/66-filtros-de-produto/spec.md` (FLT-01..44)
**Diff range**: working tree inteira contra `HEAD = 7779c69` (a feature não tem commit). 31 arquivos
modificados (+1277/−142) e 22 entradas não rastreadas: `packages/core/src/filters/**`,
`supabase/migrations/20261018120000_66-filtros-de-produto.sql`, `packages/supabase/src/types/**`,
`apps/store/**`, `apps/backoffice/**`.
**Verifier**: sub-agente independente (autor ≠ verificador). Não escreveu código nem teste da `66`.

## Veredito: ❌ FAIL — um mutante de comportamento sobrevivente (C09) em código da feature

A cobertura é larga e quase toda discriminante: 52 mutantes distintos, 50 mortos, todos por
asserção (nenhum por compilação). Os dois sobreviventes são reais. Um deles (C09) é um buraco de
comportamento num AC P1 (FLT-29/FLT-32), e a regra do processo é que mutante sobrevivente vira fix
task antes de a feature fechar. O conserto é pequeno: um caso em `url.test.ts` e, de preferência, um
na página.

---

## Task Completion

| Task | Status | Notas |
| --- | --- | --- |
| 01–18 | ✅ | `tasks.md` as marca como feitas; T18 = `prova-navegador.md` |
| 19 `baselines-e-docs` | ⚠️ não marcada | Docs e baselines do `CLAUDE.md` ainda descrevem a `65`. Não é gate deste veredito, mas a tabela de baselines está velha (ver *Gate*) |

---

## Spec-Anchored Acceptance Criteria

Legenda: ✅ a asserção mira o resultado que a spec define · ⚠️ lacuna de precisão da spec ou desvio
· ❌ sem evidência. Caminhos curtos: `core/` = `packages/core/src/filters/__tests__/`,
`CPF` = `apps/store/src/pages/__tests__/CategoryPageFilters.test.tsx`,
`SPF` = `apps/store/src/pages/__tests__/SearchPageFilters.test.tsx`,
`AFP` = `apps/backoffice/src/pages/admin/AdminFiltersPage.test.tsx`,
`PFF` = `apps/backoffice/src/pages/admin/AdminProductFormPage.filtros.test.tsx`,
`SCH` = `apps/store/src/shared/lib/__tests__/productFiltersSchema.test.ts`.

### P1 — Grupos e valores no painel

| AC | Resultado definido pela spec | Evidência (`file:line` — asserção) | |
| --- | --- | --- | --- |
| FLT-01 | lista por `sort_order` com nome, nº de valores, **nº de produtos marcados** e interruptor | `AFP:102` — `linhas…textContent` `toEqual(['Acabamento3 valores · 335 marcações', …])` + `switch` `aria-checked`; ordem: `useAdminFilterCatalog.test.ts:147` | ⚠️ **desvio não declarado**: o total do grupo é **marcações** (soma dos valores), não produtos distintos. O motivo está em `features/filter-editor/model/copy.ts:8-12`, mas não há `SPEC_DEVIATION` e a spec não foi emendada |
| FLT-02 | slug derivado (kebab, sem acento), editável como "Endereço no filtro" | `AFP:148` (grupo novo deriva) e `AFP:167` (existente não deriva, avisa); `core/rules.test.ts:63` `filterSlug` | ✅ (E03 morto) |
| FLT-03 | vazio / >40 / nome repetido sem maiúscula e acento ⇒ recusa em texto antes de gravar | `core/rules.test.ts:83,87,92,96`; `AFP:181` (frase na tela, rascunho mantido, sem "Salvo") | ✅ (C05, C06, E04 mortos) |
| FLT-04 | reservado/repetido ⇒ "Este endereço já é usado pela loja"; banco recusa igual | `core/rules.test.ts:111,115,119`; banco: `SCH:215` (lista bidirecional), `SCH:245` (unique), `SCH:203` (formato) | ✅ painel e schema. ⚠️ o mapeamento `23514 → frase` em `useAdminFilterCatalog.ts:99` não tem caso (X01 sobreviveu); só `23505` é testado (`useAdminFilterCatalog.test.ts:250`) |
| FLT-05 | 12 grupos ⇒ "Novo grupo" desabilitado com motivo | `AFP:217` + sensor `AFP:224`; `core/rules.test.ts:142` | ✅ (E09 morto) |
| FLT-06 | as mesmas regras para o valor, slug único **no grupo**, teto 60 | `core/rules.test.ts:157-198`; `AFP:233,243,254,266,275`; `useAdminFilterCatalog.test.ts:323,336` | ✅ (E01 morto) |
| FLT-07 | valor com peças ⇒ confirmação com o número; remoção apaga marcações | `AFP:299` (frase literal), `AFP:329` (singular), `AFP:320` (sem peças, sem diálogo); cascata `SCH:260` | ✅ (E02 morto) |
| FLT-08 | grupo ⇒ confirmação com nº de valores e de marcações; apaga os dois | `AFP:338` (frase com os dois números); cascatas `SCH:260` | ✅ (E07, DB2 mortos) |
| FLT-09 | desligar some da loja, marcações ficam | `useAdminFilterCatalog.test.ts:262` (grava só `is_active`); loja: `SCH:329` (RLS do grupo), `core/facets.test.ts:82,109` | ✅ (DB1 morto) |
| FLT-10 | falha mantém o digitado, nada aparece salvo | `useAdminFilterCatalog.test.ts:388` (não relê), `:250`; `AFP:181` | ✅ (B12, E04 mortos) |

### P1 — Marcar no produto

| AC | Resultado definido | Evidência | |
| --- | --- | --- | --- |
| FLT-11 | bloco "Filtros da loja", grupo por linha, chips multi, ordem do painel | `PFF:129` (página real montada) | ✅ (E08 morto) |
| FLT-12 | sem grupo ⇒ diz e linka `/admin/filtros` | `PFF:141` | ✅ |
| FLT-13 | marcações gravadas no save; produto novo recebe **depois** de existir | `PFF:162` — diário `toEqual([delete eq product_id p1 in value_id [prata], upsert [{p1, ouro}]])`; `PFF:183` — `marcou > criou` e payload com o id devolvido; `persistProduct.test.ts:353,367,382` | ✅ (B01–B04 mortos) |
| FLT-14 | grupo desligado com selo "Desligado na loja", editável | `PFF:150` | ✅ (E06 morto) |

### P1 — Marcar em massa

| AC | Resultado definido | Evidência | |
| --- | --- | --- | --- |
| FLT-15 | busca com `dobrarTexto`, recorte por categoria, marcados / não marcados | `BulkAssignPanel.test.tsx:63,69,75`; `recorte.test.ts:14` | ✅ |
| FLT-16 | N marcações numa requisição; já marcado é no-op | `useValueMarks.test.ts:86` — `escritas()).toHaveLength(1)` + `options: { onConflict, ignoreDuplicates: true }` | ✅ (B05 morto). O no-op no banco está provado em navegador (`prova-navegador.md`, 183→185 duas vezes) |
| FLT-17 | remover N numa requisição | `useValueMarks.test.ts:105` (delete com `eq value_id` **e** `in product_id`) | ✅ (B06, B13 mortos) |
| FLT-18 | "Selecionar todos" só os visíveis, botão com o número | `BulkAssignPanel.test.tsx:91,105` | ✅ (B08 morto) |
| FLT-19 | falha: seleção fica, nada aparece marcado | `useValueMarks.test.ts:127`; `BulkAssignPanel.test.tsx:156` | ✅ (B07 morto) |
| FLT-20 | contagens do valor e do grupo atualizam sem recarregar | `useValueMarks.test.ts:118`; `AdminFilterValuePage.test.tsx:91` (relê o catálogo) e `:101` (falha não relê) | ✅ (B11 morto) |

### P1 — Filtros na categoria

| AC | Resultado definido | Evidência | |
| --- | --- | --- | --- |
| FLT-21 | um bloco por grupo ativo, não escondido, com valor presente, entre Preço e Disponibilidade | `CPF:195` (sidebar), `CPF:207` (sheet) — `legendas(...)).toEqual(['Faixa de preço', 'Para quem', 'Acabamento', 'Letra', 'Disponibilidade'])`; `core/facets.test.ts:96-129`; embed: `cardSelect.test.ts:318`, `useCategories.test.tsx:208` | ✅ (C03, S08, S09 mortos) |
| FLT-22 | só valores presentes, ordem do painel, contagem entre parênteses | `CPF:219,229`; `core/facets.test.ts:135,144` | ✅ (C01 morto) |
| FLT-23 | OU no grupo, E entre grupos, junto com o sistema | `CPF:246`; `core/facets.test.ts:50,54` + sensores `:58,71`; `filters.test.ts` "andam JUNTO com os filtros de sistema" | ✅ (C02, S12 mortos) |
| FLT-24 | zerado pela seleção ⇒ desabilitado com `(0)`, a menos que marcado | `CPF:264` — `getByRole('button', { name: 'Letra A (0)' })` `toBeDisabled()`; `CPF:272` (marcado nunca desabilitado) | ✅ (S03, S13 mortos) |
| FLT-25 | chip removível acima da grade por valor; "Limpar filtros" desmarca tudo | `CPF:283,303,312,320`; `filters.test.ts` (chip nomeia só o valor) | ✅ (S10, S11 mortos). ⚠️ no celular a fileira de chips não existe (`hidden md:flex`, anterior à `66`); o estado aparece como selo no botão (`CPF:297`). `prova-navegador.md` registra |
| FLT-26 | catálogo falha ⇒ filtros de sistema, sem erro | `CPF:331` (página real, supabase dublado no `from('filter_groups')`); `useFilterCatalog.test.tsx:81,88` | ✅ (S06, X02 mortos; S06 só pelo teste do hook) |
| FLT-27 | >8 valores no celular ⇒ 8 + "Ver todos (N)" | `CPF:343` (sheet), `:363` (sidebar sem "Ver todos"), `:370` | ✅ (S04 morto) |
| FLT-28 | chip ≥44px no sheet, nunca quebra linha | `CPF:382,390,398` (classe `h-11` e `whitespace-nowrap`, proxy de forma); medida real: `prova-navegador.md` (44px nos 11 chips, nenhum em duas linhas, 390/390) | ✅ (S05 morto) |

### P1 — Estado na URL

| AC | Resultado definido | Evidência | |
| --- | --- | --- | --- |
| FLT-29 | URL reflete o estado, com `replace` | `core/url.test.ts:57` (forma exata da spec); `CPF:429` (`url()).toBe('/pingentes?acabamento=prata-925%2Couro&estoque=1')`); `CPF:438` (voltar sai da categoria) | ⚠️ **C09 sobreviveu**: a preço movido de **um lado só** nunca é testado (ver *Lacunas*). `replace` ✅ (S02 morto) |
| FLT-30 | estado nasce da URL | `CPF:449`; `core/url.test.ts:76,80` | ✅ |
| FLT-31 | desconhecido / inexistente ignorados, preço recortado, sem 404 | `CPF:459,467`; `core/url.test.ts:90-132` | ✅ (C07 morto) |
| FLT-32 | estado padrão ⇒ sem parâmetro | `CPF:475`; `core/url.test.ts:138-151` | ✅ (C08 morto), com a mesma ressalva de C09 |
| FLT-33 | canônica sem query | `CPF:484` | ✅ |
| FLT-34 | `utm_*`, `gclid`, `fbclid` preservados | `CPF:492`; `core/url.test.ts:158,174` | ✅ (C10 morto) |

### P2 — Esconder por categoria

| AC | Resultado definido | Evidência | |
| --- | --- | --- | --- |
| FLT-35 | seção "Filtros nesta categoria", interruptor ligado por padrão | `AdminCategoriesPage.test.tsx:344`; `CategoryFilterGroups.test.tsx:33` | ✅ (E05 morto) |
| FLT-36 | desligar some **só** daquela categoria | painel: `AdminCategoriesPage.test.tsx:355`, `useCategoryHiddenGroups.test.ts:56,68`; loja: `CPF:407,414` (inclusive pela URL) | ✅ (B09, S01 mortos) |
| FLT-37 | grupo novo nasce visível | `useCategoryHiddenGroups.test.ts:51`; `CPF:421` (não herda) | ✅ |
| FLT-38 | grupo apagado leva o "escondido" | `SCH:260` (cascata em `category_hidden_filter_groups.group_id`) | ✅ (DB2 morto) |

### P2 — Busca

| AC | Resultado definido | Evidência | |
| --- | --- | --- | --- |
| FLT-39 | mesmos blocos, base = resultado, mesmo sheet | `SPF:151,157,169,181,189` | ✅ |
| FLT-40 | URL mantém `q` e acrescenta filtros | `SPF:206,215,222` | ✅ (S07 morto). Termo novo zera os filtros: `SPEC_DEVIATION` declarado em `tasks.md:79` |
| FLT-41 | sem esconder por categoria na busca | `SPF:235` | ✅ |

### P2 — Selecionar pela tag

| AC | Resultado definido | Evidência | |
| --- | --- | --- | --- |
| FLT-42 | recorte "Com a tag…" com contagem | `BulkAssignPanel.test.tsx:170`; `recorte.test.ts:29` | ✅ |
| FLT-43 | recorte só filtra, nada grava | `BulkAssignPanel.test.tsx:176` | ✅ |

### Meta

| AC | Resultado definido | Evidência | |
| --- | --- | --- | --- |
| FLT-44 | nenhuma superfície da loja exibe `tags` como filtro | `filtroSemTag.test.ts:107` (`infratores` `toEqual([])`), âncoras `:83,99`, sensores `:116-152` | ✅ (X03 morto) |

**Edge cases**: produto apagado ⇒ cascata (`SCH:260`) ✅ · produto inativo não conta (RLS `p.is_active`,
`SCH:344` + sensor `:350`) ✅ · troca de slug avisa no campo (`AFP:167`, `AFP:254`) ✅ · "Ouro" em dois
grupos = dois chips que nomeiam só o valor (`filters.test.ts`) ✅ · categoria com um produto: sem caso
especial no código, sem teste dedicado (aceitável) · sheet fechado sem aplicar: o sheet aplica ao vivo,
o CTA é "Ver N produtos" (`SPEC_DEVIATION` de copy em `tasks.md:79`).

**Status**: 44/44 com evidência; 1 AC com mutante sobrevivente (FLT-29/32); 3 ⚠️ (FLT-01 desvio não
declarado, FLT-04 o ramo `23514` sem caso, FLT-25 no celular).

---

## Discrimination Sensor (expandido)

Método: cada mutação **editou o arquivo real**, rodou só o(s) teste(s) relevante(s) com
`pnpm --filter @estrelinha/<w> exec vitest run <arquivos> --testTimeout=20000` e **restaurou o
original**, conferindo o SHA-256 antes e depois (arnês em
`/private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/4549cdc3-a0a7-4d6e-b3a8-9a1b83664990/scratchpad/verif/mutar.mjs`;
ele lança se o trecho não aparecer **exatamente uma vez** ou se a mutação não mudar nada). Nada de
`git stash`, `checkout` ou `reset`. A morte foi classificada pelo resumo do vitest (`N failed`) e pela
ausência de erro de transformação ou parse no log. **Nenhuma morte foi por compilação.**

Fechamento: `git diff --stat`, `git status --short` e o SHA-256 dos 80 arquivos da superfície
saíram **idênticos** aos do começo.

| # | Arquivo | Mutação | Resultado | Teste que matou |
| --- | --- | --- | --- | --- |
| C01 | core `facets.ts:100` | `falhos.length > 1` → `> 0` (faceta conjuntiva) | morto (asserção) | `facets.test.ts` faceta disjuntiva (3) |
| C02 | core `facets.ts:41` | `.some` → `.every` (E dentro do grupo) | morto | `passesSelection` OU/E (8) |
| C03 | core `facets.ts:69` | ignora `hiddenGroupIds` | morto | `visibleGroups` grupo escondido |
| C04 | core `rules.ts:45` | sem o prefixo `utm_` | morto | `isReservedFilterKey`, `utm_x` |
| C05 | core `rules.ts:85` | `> 40` → `>= 40` | morto | 41 recusa / 40 passa |
| C06 | core `rules.ts:109` | nome repetido comparado cru | morto | nome repetido sem maiúscula e acento |
| C07 | core `url.ts:63` | preço sem recorte | morto | preço recortado à faixa |
| C08 | core `url.ts:112` | a escrita não apaga as chaves de grupo | morto | FLT-32/34 (3) |
| **C09** | core `url.ts:54` | `priceUntouched`: `&&` → `\|\|` | **SOBREVIVEU** (core 24/24) | — |
| **C09b** | o mesmo, medido na loja | idem, contra `CPF`, `SPF` e `filters.test.ts` | **SOBREVIVEU** (85/85) | — |
| C10 | core `url.ts:110` | a escrita parte de params vazios | morto | FLT-34 (2) |
| DB1 | migration, policy de `filter_values` | sem `g.is_active = true` | morto | `SCH` valor: só de grupo ativo |
| DB2 | migration, `category_hidden…group_id` | sem `on delete cascade` | morto | `SCH` cascatas |
| DB3 | migration, leitura do escondido | `to anon, authenticated` → `to authenticated` | morto | `SCH` escondido lido por anon |
| B01 | `persistProduct.ts` | delete sem `.eq('product_id')` | morto | `persistProduct.test.ts`, `PFF:162` |
| B02 | `persistProduct.ts` | `toDelete: []` (o diff não apaga) | morto | `planFilterValues`, `PFF:162` |
| B03 | `AdminProductFormPage.tsx` | snapshot = estado atual (o diff some) | morto | `PFF:162`, `PFF:183` |
| B04 | `AdminProductFormPage.tsx` | não passa `filterValueIds` | morto | `PFF:162`, `PFF:183` |
| B05 | `useValueMarks.ts` | sem `ignoreDuplicates` | morto | `useValueMarks.test.ts:86` |
| B06 | `useValueMarks.ts` | `unmark` sem `.eq('value_id')` | morto | `useValueMarks.test.ts:105` |
| B07 | `useValueMarks.ts` | relê antes de checar o erro | morto | `useValueMarks.test.ts:127` |
| B08 | `BulkAssignPanel.tsx` | "Selecionar todos" pega o catálogo inteiro | morto | `BulkAssignPanel.test.tsx:91,105` |
| B09 | `useCategoryHiddenGroups.ts` | ternário de visível invertido | morto | hook `:56,68` |
| B10 | `useAdminFilterCatalog.ts` | a revalidação que falha esvazia a lista | morto | revalidar não volta ao esqueleto |
| B11 | `AdminFilterValuePage.tsx` | sucesso não relê o catálogo | morto | `:91` (FLT-20) |
| B12 | `useAdminFilterCatalog.ts` | `createGroup` relê antes do erro | morto | 23505 não relê |
| B13 | `recorte.ts` | remover leva a seleção inteira | morto | `dividirSelecao`, painel (3) |
| E01 | `ValueList.tsx` | limpa o campo mesmo com recusa | morto | `AFP:243` |
| E02 | `ValueList.tsx` | confirmação só acima de 1 peça | morto | `AFP:329` singular |
| E03 | `GroupForm.tsx` | o endereço não acompanha o nome | morto | `AFP:148` |
| E04 | `GroupForm.tsx` | "Salvo" mesmo com recusa | morto | `AFP:181` (4) |
| E05 | `CategoryFilterGroups.tsx` | interruptor sempre ligado | morto | `AdminCategoriesPage.test.tsx` (2) |
| E06 | `FilterValuesCard.tsx` | sem o selo "Desligado na loja" | morto | `PFF:150` |
| E07 | `AdminFiltersPage.tsx` | confirmação do grupo com 0 marcações | morto | `AFP:338` |
| E08 | `useProductForm.ts` | a carga ignora o embed das marcações | morto | `useProductForm.test.ts`, `PFF` (4) |
| E09 | `AdminFiltersPage.tsx` | "Novo grupo" nunca desabilita | morto | `AFP:217` |
| S01 | `CategoryPage.tsx` | `catalogWithout(…, [])` (ignora o escondido) | morto | `CPF:407,414` |
| S02 | `useFilterUrlState.ts` | sem `replace` | morto | `CPF:438` |
| S03 | `filters.ts` | o marcado também desabilita | morto | `filters.test.ts`, `CPF:272` |
| S04 | `CategoryFiltersPanel.tsx` | nunca recolhe (sem "Ver todos") | morto | `CPF:343,398` |
| S05 | `CategoryFiltersPanel.tsx` | sem `whitespace-nowrap` | morto | `CPF:382,390` |
| S06 | `useFilterCatalog.ts` | a falha vira catálogo vazio de sucesso | morto | `useFilterCatalog.test.tsx:88` (só o hook; a página não distingue) |
| S07 | `SearchPage.tsx` | termo novo descarta `utm_*` e a ordem | morto | `SPF:222` |
| S08 | `mapProduct.ts` | `PRODUCT_SELECT` sem o embed | morto | `cardSelect.test.ts:318` |
| S09 | `useCategories.ts` | a árvore sem o embed do escondido | morto | `useCategories.test.tsx:208` |
| S10 | `filters.ts` | o chip nomeia "Grupo: valor" | morto | chips (3) |
| S11 | `filters.ts` | "Limpar" mantém a seleção | morto | `filters.test.ts`, `CPF` (4) |
| S12 | `filters.ts` | `filterProducts` ignora a seleção | morto | 16 casos |
| S13 | `filters.ts` | contagem sem os filtros de sistema | morto | "até R$ 12" |
| X01 | `useAdminFilterCatalog.ts:99` | `23514` deixa de virar a frase do endereço | **SOBREVIVEU** (56/56) | — |
| X02 | `useFilterCatalog.ts:88` | devolve `undefined` enquanto carrega | morto | hook (34) |
| X03 | `filters.ts` | lê `p.tags` no filtro | morto | `filtroSemTag.test.ts:107` |
| X04 | store `filters.ts` `priceUntouched` | `&&` → `\|\|` | morto | `hasActiveFilters` encolher a faixa |

**Profundidade**: expandida (banco, URL e regra compartilhada). **Resultado: 52 mutantes distintos,
50 mortos (todos por asserção), 2 sobreviventes (C09, X01)** — ❌ FAIL.

O contraste X04 × C09 é a lição: a loja tem **duas** escritas de "o preço está intocado?" (`filters.ts`
para `hasActiveFilters`, `core/filters/url.ts` para a URL). A da loja tem um caso de um lado só
("encolher a faixa conta"). A de `core`, que é a que decide se o filtro existe, não tem.

---

## Gate Check

Medido por este verificador em 2026-10-18, um workspace por vez, exit code capturado fora de pipe,
**antes** de qualquer mutação:

| Medida | Resultado | Esperado pelo orquestrador |
| --- | --- | --- |
| core `pnpm --filter @estrelinha/core test` | **2927/120**, exit 0 | 2927/120 ✅ |
| store `… test --testTimeout=20000` | **4942/283**, exit 0 | 4942/283 ✅ |
| backoffice `… test --testTimeout=20000` | **3318/185**, exit 0 | 3318/185 ✅ |
| `tsc` store · backoffice (`tsconfig.app.json`) | **0 · 0** | 0 · 0 ✅ |
| functions · catalog-import | não remedidos aqui (fora da superfície) | 977/22 · 512/23 |

Delta contra a entrada de `tasks.md` (core 2826/116 · store 4795/278 · backoffice 3206/176): **core
+101/+4 · store +147/+5 · backoffice +112/+9**. Nenhuma queda. Lint não remedido (fora do pedido).
A tabela de baselines do `CLAUDE.md` ainda não foi atualizada (T19).

---

## Code Quality (amostragem)

| Princípio | Status |
| --- | --- |
| Mínimo / sem scope creep | ✅. `SearchPage` cresceu bastante, mas é o que FLT-39 pede |
| Mudanças cirúrgicas | ✅. `CategoryInspector` ganhou só um slot `children` |
| Segue os padrões | ✅ `fetchX(modo)`, `string \| null`, `.ts` explícito em `core/filters`, `catalogWithout` em vez de um segundo dono |
| Asserção mira o resultado da spec | ✅, com as ressalvas acima |
| Fiação provada pela página real | ✅ `CPF`/`SPF` montam `CategoryPage`/`SearchPage` com o hook real e o supabase dublado; `PFF` monta `AdminProductFormPage`; `AdminCategoriesPage.test.tsx` monta o inspetor real |
| Dublê que enxerga o filtro | ✅ `useValueMarks`, `persistProduct` e o diário de `PFF` registram `eq`/`in` |
| Diretrizes | raiz `CLAUDE.md` (guardas, armadilhas de medição), memórias do projeto citadas em `tasks.md` |

---

## Lacunas ranqueadas (fix tasks)

1. **Preço movido de um lado só não tem régua — FLT-29 / FLT-32** — `packages/core/src/filters/url.ts:53-54`
   (sem caso em `core/url.test.ts`, `CPF` ou `SPF`). Com `&&` trocado por `||`, mexer só no máximo
   (ou só no mínimo) **não escreve `preco`**. Como o estado mora na URL, `setFilters` sai cedo e o
   filtro de preço simplesmente não acontece. As três suítes ficam verdes (C09/C09b). Fix: em
   `url.test.ts`, `escrever({ ...padrão, priceRange: [5, 80] })` com faixa `[5, 120]` tem de dar
   `preco=5-80`, mais o espelho `[10, 120]`. De preferência também um caso de página que mexe só no
   "Preço máximo" e lê `url()`.
2. **Desvio não declarado em FLT-01** — a spec pede "quantidade de produtos marcados" e a lista mostra
   "N marcações" (soma por valor) — `apps/backoffice/src/pages/admin/AdminFiltersPage.tsx:42`,
   `features/filter-editor/model/copy.ts:8-13`. A justificativa é razoável. Fix: registrar como
   `SPEC_DEVIATION` (ou emendar a AC na spec) para a próxima leitura não tomar a diferença por defeito.
3. **O ramo `23514` do erro do banco não tem caso — FLT-04** — `useAdminFilterCatalog.ts:99` (X01
   sobreviveu). Hoje ele só é alcançável se `core` e o `check` divergirem, e o guarda `SCH` impede
   isso. Mesmo assim, é um ramo escrito de propósito e sem régua. Fix: um caso com `code: '23514'` em
   `useAdminFilterCatalog.test.ts`.
4. **FLT-26 só é discriminado no hook** — `CPF:331` passa com a falha engolida como sucesso vazio
   (S06 morreu só por `useFilterCatalog.test.tsx:88`). A UX é a mesma nos dois mundos, então é
   lacuna de baixo risco. Fica registrada porque a diferença (repetir × guardar `[]` por 10 min) só o
   cache mostra.
5. **FLT-25 no celular** — a fileira de chips acima da grade não existe abaixo de `md` (antes da
   `66`). A spec diz "como os de sistema", o que absolve, mas o texto "acima da grade" não vale no
   celular. Decisão de spec, não de código.

## Fora da medição (herdado de `prova-navegador.md`)

Arrastar para reordenar, leitor de tela, o slider de preço **arrastado** (o que torna a lacuna 1 mais
relevante: a única prova de URL com preço em navegador não existe), o voltar do Android, e LCP/CLS
com o embed novo. Lembrete de deploy: a migration vai **antes** do bundle (o embed em `products` e
`categories` falha sem as tabelas).

## Requirement Traceability

FLT-02..28, FLT-30, FLT-31, FLT-33..44: ✅ Verified · FLT-29, FLT-32: ❌ Needs fix (lacuna 1) ·
FLT-01: ⚠️ desvio a declarar · FLT-04: ✅ com a lacuna 3 · FLT-25: ⚠️ celular.

## Lições candidatas (não registradas: `scripts/lessons.py` apaga lições neste projeto)

- **Regra escrita duas vezes, testada uma vez.** "A faixa de preço está intocada?" existe na loja e
  em `core`. O caso de um lado só foi escrito para a cópia que **não** decide o dado persistido.
  Quando a regra tem duas escritas, o caso de borda vai nas duas, ou a cópia sai.
- **Fixture "cheia" esconde a borda de conjunção.** `CHEIO` move os dois lados do preço, então todo
  `&&` ↔ `||` entre os dois limites passa. Para cada conjunção de limites, um caso com só um lado
  movido.
- **Mapeamento defensivo de erro do banco é ramo, e ramo sem caso é afirmação** (X01). Ou o ramo tem
  caso, ou ele sai.

---

# Rodada 2

**Date**: 2026-10-18
**Verifier**: sub-agente independente novo (não escreveu a `66` nem a rodada 1).
**Escopo**: confirmar os fechamentos da rodada 1 por mutação nos arquivos reais e procurar, em cada
camada, outra asserção verdadeira nos dois mundos.

## Veredito: ❌ FAIL — os três fechamentos se confirmam, e a varredura nova achou 5 sobreviventes

Os três fechamentos são reais: C09 morre agora nas **duas** suítes, e X01 morre. Mas, dos 20
mutantes novos, 5 sobreviveram, em duas classes, as duas no painel:

1. **O token de sequência não tem régua em NENHUM dos três hooks que o declaram** (P02, P05, P06).
   O `design.md:140` amarra `useAdminFilterCatalog` ao contrato `fetchX(modo)` da `50`, cujo terceiro
   item é exatamente o token ("vale para os DOIS modos"). O dublê de `useAdminFilterCatalog.test.ts`
   já tem `segurarLeituras`/`pendentes`, mas nenhum caso resolve duas leituras **fora de ordem**.
   P06 tem a consequência mais concreta: `CategoryFilterGroups` é montado em
   `AdminCategoriesPage.tsx:306` **sem `key`**, então trocar de categoria reaproveita a instância. A
   leitura da categoria A respondendo depois da de B faz os interruptores de B mostrarem o
   "escondido" de A (FLT-35/36 exibidos errado), sem nada na tela dizer por quê.
2. **Renomear não apara mais** (P04 `updateValue`, P07 `updateGroup`). Criar está provado
   (`useAdminFilterCatalog.test.ts`, "cria no fim da lista com o payload exato", com `'  Ocasião '`).
   Renomear não está. Como `comprimento` conta **sem aparar** (`rules.ts:63`), o efeito é gravar
   `" Ouro "` com espaço e mostrar o chip assim na loja. É cosmético, mas é um ramo escrito e sem
   régua.

Pela regra do processo, sobrevivente em código da feature vira fix task. A classe 1 é a que pesa.

## Fechamentos da rodada 1, confirmados por mutação

| # | Mutação | Resultado | Quem matou |
| --- | --- | --- | --- |
| R01 | `url.ts` `priceUntouched` `&&` → `\|\|`, suíte de `core` | **morto** (asserção), 2 falhas | `url.test.ts` "mexer só no máximo / só no mínimo vira parâmetro" |
| R01b | o mesmo, suítes da loja (`CPF`, `SPF`, `filters.test.ts`) | **morto** (asserção), 1 falha | `CPF` "mexer só no preço máximo filtra e vai para a URL (FLT-29)" |
| R02 | `useAdminFilterCatalog.ts:99` sem o ramo `23514` | **morto** (asserção), 1 falha | `useAdminFilterCatalog.test.ts` "o banco recusando pelo check (23514) também devolve a frase da régua, e não relê (FLT-04)" |

FLT-01: o `SPEC_DEVIATION` está em `features/filter-editor/model/copy.ts:13`, e a AC 1 de "Grupos e
valores" foi emendada (`spec.md:82`, "quantidade de **marcações** (soma por valor)"). ✅ Fechado.
FLT-25 (celular sem fileira) e FLT-26 (só o hook discrimina) continuam **declarados**, como a rodada
1 os deixou. Não reabro.

## Discrimination Sensor — rodada 2

Mesmo método da rodada 1, com uma cópia própria do arnês
(`/private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/4549cdc3-a0a7-4d6e-b3a8-9a1b83664990/scratchpad/verif2/mutar.mjs`):
edita o arquivo real, **lança** se o trecho não aparecer exatamente uma vez ou se a mutação não mudar
nada, roda só os testes relevantes com `--testTimeout=20000`, restaura e confere o SHA-256. Nada de
`stash`/`checkout`/`reset`. A morte é classificada pelo resumo do vitest e pela ausência de erro de
transformação no log. **Nenhuma morte foi por compilação.**

| # | Camada · arquivo | Mutação | Resultado | Quem matou |
| --- | --- | --- | --- | --- |
| N01 | core `url.ts` | sem desvirar `preco=80-10` | morto | "preço invertido é desvirado" |
| N02 | core `url.ts` | a escrita usa a ordem de clique | morto | "valores saem na ordem do painel, não na de clique" |
| N03 | core `facets.ts` | `resolverSelecao` sem `g.is_active` | morto | "grupo inativo não filtra (FLT-09)" |
| N04 | core `url.ts` | `estoque` vale com qualquer valor | morto | "interruptor só com 1" |
| N05 | core `url.ts` | faixa só recusada pelo lado de baixo | morto | "preço malformado ou fora da faixa inteira: ignorado" |
| M01 | migration | `unique (group_id, slug)` → `unique (slug)` | morto (2) | `SCH` unicidade + o sensor dela |
| M02 | migration | leitura pública do grupo `using (true)` | morto (2) | `SCH` "grupo: só is_active" + sensor |
| M03 | migration | `fbclid` sai da lista reservada | morto (2) | `SCH` lista igual a `RESERVED_FILTER_KEYS` nos dois sentidos |
| M04 | migration | `product_filter_values.product_id` sem `on delete cascade` | morto | `SCH` cascatas |
| M05 | migration | `with check (true)` na escrita admin das marcações | morto | `SCH` "has_role no using E no with check" |
| P01 | painel `useAdminFilterCatalog.ts` | `contagemDe` lê o array cru (`count` vira 0) | morto | "o agregado vira número" |
| **P02** | painel `useAdminFilterCatalog.ts:137` | sem `if (meu !== pedido.current) return` | **SOBREVIVEU** (62/62) | — |
| P03 | painel `useAdminFilterCatalog.ts` | grupo novo com `sort_order` repetido | morto | "cria no fim da lista com o payload exato" |
| **P04** | painel `useAdminFilterCatalog.ts` | `updateValue` sem `.trim()` | **SOBREVIVEU** (62/62) | — |
| **P05** | painel `useValueMarks.ts:68` | sem o token depois da leitura | **SOBREVIVEU** (30/30) | — |
| **P06** | painel `useCategoryHiddenGroups.ts:31` | sem o token | **SOBREVIVEU** (39/39, incluindo `AdminCategoriesPage.test.tsx`) | — |
| **P07** | painel `useAdminFilterCatalog.ts` | `updateGroup` sem aparar o nome | **SOBREVIVEU** (62/62) | — |
| L01 | loja `filters.ts` | "Limpar" zera também a ordem | morto (3) | `filters.test.ts`, `CPF`, `SPF` |
| L02 | loja `filters.ts` | teto do preço exclusivo (`>=`) | morto (19) | "a faixa de preço corta pelas duas pontas, inclusiva" |
| L03 | loja `filters.ts` | `priceBounds` arredonda o máximo para baixo | morto | "arredonda para fora…" |

**Total da rodada 2: 23 injetados (3 de fechamento + 20 novos), 18 mortos, todos por asserção,
5 sobreviventes (P02, P04, P05, P06, P07).** O banco (5/5), `core` (5/5) e a loja (3/3) não deixaram
nada passar. Os cinco sobreviventes são todos do painel, em código de **leitura concorrente** e de
**renomear**: são os dois caminhos que o dublê já sabe simular e que nenhum caso usa.

Fechamento: `git diff --stat` e `git status --porcelain` saíram **idênticos** aos do começo da
rodada. O arnês conferiu o SHA-256 de cada restauração (ele lança se divergir, e não lançou).

## Gate (remedido nesta rodada, um por vez, exit code fora de pipe)

| Medida | Resultado | Esperado |
| --- | --- | --- |
| core `pnpm --filter @estrelinha/core test` | **2929/120**, exit 0 | 2929/120 ✅ |
| store `… test --testTimeout=20000` | **4943/283**, exit 0 | 4943/283 ✅ |
| backoffice `… test --testTimeout=20000` | **3319/185**, exit 0 | 3319/185 ✅ |
| `tsc` store · backoffice (`tsconfig.app.json`) | **0 · 0** | 0 · 0 ✅ |

Contra a rodada 1: core +2, store +1, backoffice +1, exatamente os quatro casos dos fechamentos.

## Lacunas restantes, ranqueadas (fix tasks)

1. **Token de sequência sem régua nos três hooks** (P02, P05, P06):
   `apps/backoffice/src/entities/filter/api/useAdminFilterCatalog.ts:137`,
   `useValueMarks.ts:68`, `useCategoryHiddenGroups.ts:31`. Fix: um caso por hook que segura duas
   leituras e resolve a **segunda primeiro**. A tela tem de ficar com a resposta da última pedida.
   Em `useCategoryHiddenGroups` o caso certo é trocar `categoryId` de A para B com a leitura de A
   presa, soltar B e depois A, e asserir o `hidden` de B. O dublê `segurarLeituras`/`pendentes` de
   `useAdminFilterCatalog.test.ts` é o molde.
2. **Renomear sem aparar não tem régua** (P04, P07) — `useAdminFilterCatalog.ts`, `updateGroup` e
   `updateValue`. Fix: espelhar o caso de criação, `updateValue('v', { name: '  Ouro ' })` e
   `updateGroup('a', { name: ' Acabamento ' })` com o payload em igualdade exata.
3. *(herdadas, declaradas, não reabertas)* FLT-26 só discriminado no hook; FLT-25 sem fileira de
   chips no celular.

## Lição candidata (não registrada: `scripts/lessons.py` apaga lições neste projeto)

- **Dublê que já sabe segurar leituras e não tem caso fora de ordem.** `segurarLeituras` existe para
  provar o `revalidar` (VIV-02/07), e a mesma ferramenta prova o token (VIV-08) com um caso a mais.
  Quando um contrato tem três cláusulas (`fetchX(modo)`: sem esqueleto, sem esvaziar, token), cada
  hook que o declara precisa de um caso por cláusula. A rodada 1 mediu duas e não a terceira.

---

# Rodada 3 (a última)

**Date**: 2026-10-18
**Verifier**: sub-agente independente novo (não escreveu a `66` nem as rodadas 1 e 2).
**Escopo**: (1) confirmar os 5 fechamentos da rodada 2 por mutação nos arquivos reais; (2) varredura
final de mutantes NOVOS nas camadas que nenhuma rodada tocou: os componentes do painel (`GroupForm`,
`ValueList`, `ordem.ts`, `BulkAssignPanel`, `FilterValuesCard`, `CategoryFilterGroups`,
`AdminFiltersPage`, `AdminFilterValuePage`) e da loja (`useFilterUrlState`, `CategoryFiltersPanel`,
`CategoryFiltersSheet`, `SearchPage`, `CategoryPage`).

## VEREDITO FINAL: ❌ FAIL — dois sobreviventes de comportamento em AC P1 (V4 → FLT-10, S5 → FLT-27)

Os cinco fechamentos da rodada 2 são reais: os cinco mutantes morrem agora, por asserção, cada um
pelo caso novo que o nomeia. A varredura nova injetou **32 mutantes, e 28 morreram**, todos por
asserção. Dos 4 sobreviventes, **dois afetam comportamento em AC P1**, e o critério de PASS desta
rodada ("nenhum sobrevivente em P1 que afete comportamento") não se cumpre. Esta é a terceira
iteração fix → re-verify, então pela regra do processo **a decisão sobe para o usuário**: os dois
consertos são de um caso de teste cada e não tocam código de produto.

## Fechamentos da rodada 2, confirmados por mutação

| # | Mutação (a mesma da rodada 2) | Resultado | Quem matou |
| --- | --- | --- | --- |
| P02 | `useAdminFilterCatalog.ts` sem `if (meu !== pedido.current) return` | **morto** (asserção), 1 falha em 65 | `useAdminFilterCatalog.test.ts` "duas leituras fora de ordem: vale a mais nova, e a velha chegando depois é descartada" |
| P04 | `updateValue` sem `.trim()` | **morto** (asserção), 1/65 | "renomear o valor com espaço nas pontas grava o nome APARADO, payload exato" |
| P05 | `useValueMarks.ts` sem o token depois da leitura | **morto** (asserção), 1/31 | `useValueMarks.test.ts` "duas leituras fora de ordem…" |
| P06 | `useCategoryHiddenGroups.ts` sem o token | **morto** (asserção), 1/40 | `useCategoryHiddenGroups.test.ts` "trocar de categoria: a resposta da ANTERIOR chegando por último é descartada" |
| P07 | `updateGroup` sem aparar o nome | **morto** (asserção), 1/65 | "renomear com espaço nas pontas grava o nome APARADO, payload exato" |

## Discrimination Sensor — rodada 3

Mesmo arnês das rodadas anteriores, copiado para
`/private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/4549cdc3-a0a7-4d6e-b3a8-9a1b83664990/scratchpad/verif3/mutar.mjs`
(lista em `run3.py` e resultados em `resultados.tsv` na mesma pasta): ele edita o arquivo real,
**lança** se o trecho não aparece exatamente uma vez ou se a mutação não muda nada, roda só as suítes
relevantes com `--testTimeout=20000`, restaura e confere o SHA-256. Nenhum `stash`/`checkout`/`reset`.
Nenhum log tem erro de transformação. **Nenhuma morte foi por compilação.**

Suítes por camada: painel = `pages/admin/AdminFilter*`, `features/filter-bulk-assign`,
`features/category-form`, `pages/admin/AdminProductFormPage*`, `pages/admin/AdminCategoriesPage`,
`entities/filter` (154 casos). Loja = `pages/__tests__/CategoryPage*`, `SearchPage*`,
`features/category-filters`, `buscaMedida`, `listagensMedidas` (143 casos).

| # | Arquivo | Mutação | AC | Resultado |
| --- | --- | --- | --- | --- |
| G1 | `GroupForm.tsx` | o endereço acompanha o nome mesmo depois de tocado | FLT-02 | morto (2) |
| G2 | `GroupForm.tsx` | sem o aviso de endereço trocado | edge (troca de slug) | morto (1) |
| G3 | `GroupForm.tsx` | "Salvo" aparece mesmo com recusa | FLT-10 | morto (4) |
| V1 | `ValueList.tsx` | confirmação só com `marked_count > 1` | FLT-07 | morto (1) |
| V2 | `ValueList.tsx` | o campo do valor novo limpa mesmo na recusa | FLT-10 | morto (1) |
| V3 | `ValueList.tsx` | "Adicionar" não desabilita no teto | FLT-06 | morto (1) |
| **V4** | `ValueList.tsx:158` | renomear o valor fecha a linha **mesmo com recusa** (`setEditando(null)` sem `if (!motivo)`) | **FLT-10 (P1)** | **SOBREVIVEU** (154/154) |
| V5 | `ordem.ts` | arrastar solta uma posição depois | FLT-06 | morto (2) |
| B1 | `BulkAssignPanel.tsx` | a seleção é limpa mesmo quando a gravação falha | FLT-19 | morto (1) |
| **B2** | `BulkAssignPanel.tsx:221` | "Marcar N" sem `gravando` no `disabled` | — (nenhuma AC) | **SOBREVIVEU** (154/154) |
| B3 | `BulkAssignPanel.tsx` | "Marcada" otimista (lê a seleção) | FLT-19 | morto (1) |
| B4 | `BulkAssignPanel.tsx` | "Selecionar todos" pega o catálogo inteiro | FLT-18 | morto (2) |
| B5 | `BulkAssignPanel.tsx` | o número em "Selecionar todos (N)" é o do catálogo | FLT-18 | morto (1) |
| F1 | `FilterValuesCard.tsx` | grupo desligado some do bloco | FLT-14 | morto (2) |
| F2 | `FilterValuesCard.tsx` | sem o selo "Desligado na loja" | FLT-14 | morto (1) |
| C1 | `CategoryFilterGroups.tsx` | o rótulo nunca diz "Desligado na loja" | FLT-35 | morto (1) |
| A1 | `AdminFiltersPage.tsx` | "Novo grupo" não desabilita no teto de 12 | FLT-05 | morto (1) |
| A2 | `AdminFiltersPage.tsx` | marcações do grupo contam valores, não marcações | FLT-01 / FLT-08 | morto (2) |
| A3 | `AdminFiltersPage.tsx` | a página manda só o nome ao salvar o grupo (slug perdido) | FLT-02 (fiação) | morto (4) |
| AV1 | `AdminFilterValuePage.tsx` | sem a releitura do catálogo depois de gravar | FLT-20 | morto (1) |
| AV2 | `AdminFilterValuePage.tsx` | "Remover de N" chama `mark` | FLT-17 (fiação) | morto (1) |
| S1 | `useFilterUrlState.ts` | `setParams` sem `replace` | FLT-29 | morto (1) |
| S2 | `CategoryFiltersPanel.tsx` | valor marcado além do 8º não abre o bloco | FLT-27 | morto (1) |
| S3 | `CategoryFiltersPanel.tsx` | chip `(0)` não fica desabilitado | FLT-24 | morto (1) |
| S4 | `CategoryFiltersPanel.tsx` | chip sem a contagem | FLT-22 | morto (17) |
| **S5** | `CategoryFiltersPanel.tsx:150` | recolhe com `total >= 8` em vez de `> 8` | **FLT-27 (P1)** | **SOBREVIVEU** (143/143) |
| SH1 | `CategoryFiltersSheet.tsx:79` | CTA sempre no plural ("Ver 1 produtos") | — | **SOBREVIVEU**, mas a linha é **anterior à `66`** (fora do diff) |
| SH2 | `CategoryFiltersSheet.tsx` | o sheet não repassa os blocos ao painel | FLT-21 / FLT-39 | morto (9) |
| SP1 | `SearchPage.tsx` | termo novo mantém os filtros | FLT-40 | morto (1) |
| SP2 | `SearchPage.tsx` | o contador mostra o resultado sem filtro | FLT-39 | morto (1) |
| SP3 | `SearchPage.tsx` | o sheet da busca sem os blocos | FLT-39 | morto (1) |
| CP1 | `CategoryPage.tsx` | os grupos escondidos na categoria não são retirados do catálogo | FLT-36 | morto (2) |

**Total da rodada 3: 37 injetados (5 de fechamento + 32 novos), 33 mortos, todos por asserção,
4 sobreviventes (V4, S5, B2, SH1).** Somando as três rodadas: 112 injeções.

Fechamento: `git diff --stat` e `git status --porcelain` saíram **idênticos** aos do começo da
rodada (comparados por `diff` contra cópias tiradas antes da primeira mutação). O arnês conferiu o
SHA-256 de cada restauração, e lançaria se divergisse.

## Gate (remedido nesta rodada, um por vez, exit code fora de pipe)

| Medida | Resultado | Esperado |
| --- | --- | --- |
| core `pnpm --filter @estrelinha/core test` | **2929/120**, exit 0 | 2929/120 ✅ |
| store `… test --testTimeout=20000` | **4943/283**, exit 0 | 4943/283 ✅ |
| backoffice `… test --testTimeout=20000` | **3324/185**, exit 0 | 3324/185 ✅ (o declarado) |
| `tsc` store · backoffice (`tsconfig.app.json`) | **0 · 0** | 0 · 0 ✅ |

Contra a rodada 2: backoffice +5, exatamente os cinco casos dos fechamentos. Core e store idênticos.

## Lacunas ranqueadas

1. **V4 — renomear um VALOR recusado apaga o rascunho E a recusa (FLT-10, P1)** —
   `apps/backoffice/src/features/filter-editor/ui/ValueList.tsx:158`. Com o `if (!motivo)` removido,
   `setEditando(null)` desmonta `LinhaEmEdicao` antes de o `setRecusa` dela pintar: a dona digita um
   nome repetido, toca Salvar, a linha volta ao nome antigo e **nenhuma frase aparece**. É o oposto
   da letra de FLT-10 ("manter o que ela digitou e mostrar o erro"). A recusa existe de verdade (a
   régua de `core` recusa nome e slug repetidos no grupo, FLT-06). V2 e G3 provam FLT-10 no valor
   **novo** e no grupo; a **renomeação** do valor não tem caso de recusa. Fix: em
   `AdminFiltersPage.test.tsx`, renomear um valor para o nome de outro do mesmo grupo e asserir que
   o campo "Nome do valor" continua com o texto digitado e que o `role="alert"` traz a frase.
2. **S5 — a fronteira de "mais de 8" (FLT-27, P1)** — `CategoryFiltersPanel.tsx:150`. Com
   `>=`, um grupo com **exatamente 8** valores ganha um "Ver todos (8)" que não abre nada novo. Os
   casos existentes usam totais longe da fronteira. É um botão inútil, não um valor escondido, então
   pesa menos que V4, mas é uma régua da AC sem caso. Fix: um caso de sheet com 8 valores e
   asserção de **ausência** do "Ver todos", mais o par com 9.
3. *(menor, sem AC)* **B2 — "Marcar N" não trava durante a gravação** — `BulkAssignPanel.tsx:221`.
   Um duplo toque mandaria duas requisições. A spec declara concorrência N/A, e marcar duas vezes é
   no-op no banco (FLT-16). O irmão "Remover de N" tem a mesma trava, também sem caso. Lacuna
   registrada, não bloqueia.
4. *(fora do diff)* **SH1 — o singular de "Ver 1 produto"** — a linha é anterior à `66`
   (`git diff` do arquivo não a toca). Só registro.
5. *(herdadas, declaradas, não reabertas)* FLT-26 só discriminado no hook; FLT-25 sem fileira de
   chips no celular.

## Requirement Traceability (final)

FLT-01..09, FLT-11..26, FLT-28..44: ✅ Verified · **FLT-10: ❌ a renomeação de valor (lacuna 1)** ·
**FLT-27: ❌ a fronteira de 8 (lacuna 2)** · FLT-25 / FLT-26: ⚠️ declaradas.

## Lição candidata (não registrada: `scripts/lessons.py` apaga lições neste projeto)

- **AC de falha precisa de um caso por CAMINHO de gravação, não por tela.** FLT-10 está provada no
  grupo novo, no grupo existente e no valor novo; o quarto caminho (renomear o valor, numa linha que
  se desmonta ao salvar) é o único em que um `if` a menos apaga a frase do erro junto com o
  rascunho, e é exatamente o que não tem caso. Quando a recusa mora num componente que o sucesso
  desmonta, o sucesso e a falha divergem pela montagem, e só o caso de falha vê isso.

---

## Fecho (orquestrador, 2026-10-18) — decisão do usuário depois da rodada 3

As três rodadas de conserto → reverificação se esgotaram com 2 lacunas de **teste** em P1 (o código
estava certo nas duas). O usuário escolheu: escrever os 2 testes, provar cada um por mutante
reinjetado no arquivo real, e fechar **sem** uma 4ª rodada completa.

| Lacuna | Teste novo | Mutante reinjetado | Resultado |
| --- | --- | --- | --- |
| V4 — FLT-10 (renomear valor recusado) | `apps/backoffice/src/pages/admin/AdminFiltersPage.test.tsx` — "renomear recusado mantém a linha aberta, com o nome digitado e o motivo (FLT-10)" | `if (!motivo) setEditando(null)` → `setEditando(null)` em `ValueList.tsx` | **morto por asserção** (0 erros de transformação); SHA restaurado |
| S5 — FLT-27 (limite de 8) | `apps/store/src/features/category-filters/ui/__tests__/CategoryFiltersPanel.test.tsx` — 8 sem "Ver todos", 9 com "Ver todos (9)" | `total > SHEET_VALUES_PREVIEW` → `>=` | **morto por asserção**; SHA restaurado |

**Ficam declaradas, sem conserto (decisão do usuário):**
- **B2** — "Marcar N"/"Remover de N" não travam enquanto gravam. Marcar duas vezes é no-op no banco
  (PK composta + `ignoreDuplicates`); concorrência está declarada N/A na spec.
- **SH1** — o singular "Ver 1 produto" do sheet é anterior à `66`.
- **FLT-26** — a falha do catálogo só é distinguida no hook (a tela é idêntica nos dois mundos).
- **FLT-25** — no celular os chips ativos são selo no botão, como antes da `66`.

**Veredito final: PASS com lacunas menores declaradas.** Sensor total das três rodadas mais o fecho:
52 + 23 + 37 + 2 mutantes; todos os sobreviventes de comportamento em P1 foram mortos por asserção.
