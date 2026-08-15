# 24 · Home gerenciável — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path.

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: [`design.md`](./design.md) · **Spec**: [`spec.md`](./spec.md) · **Validação**: [`validation.md`](./validation.md)
**Status**: ✅ **Done** — 35/35 tasks, 6 fases, Verifier **PASS** na iteração 2 (2026-08-15)

| Fecho | Medido |
| --- | --- |
| Testes | **4498 / 251** (baseline de abertura 4019/225 — **+479**) |
| Tipos | **0** · store · backoffice · catalog-import |
| Lint | **30 / 8** — a baseline exata, zero erro novo |
| `packages/core/src/payment/**` | **0 arquivos alterados** na feature inteira |
| Guarda da T1 (`HOME-04`) | **302 linhas adicionadas, 0 removidas** |
| Sensor de discriminação | **20 mutações, 20 mortas, 0 sobreviventes** |
| Rastreabilidade | **44/44 ACs** (P1+P2) · `HOME-45..47` deferidos de propósito |

### Pré-condições

- [x] **O trabalho pendente no disco foi commitado** (2026-08-15, 5 commits: `226ddb1` ícones ·
      `4152b18` material · `1770560` home · `8754d05` specs · `e22f368` chore). A faixa de diff da 24
      nasce isolada — sem isso o Verifier mediria 103 arquivos que não são desta feature.
- [x] **Gate medido antes da primeira task**: `pnpm test` exit 0 — **4019 testes / 225 arquivos**
      (store 1401/108 · backoffice 1145/70 · core 918/28 · functions 279/4 · catalog-import 276/15).
      Igual à baseline do `CLAUDE.md`, sem deriva.
- [ ] **`supabase start` de pé** para as tasks que tocam banco (T7–T11, T21). A instância local roda
      em 54341–54349. **Nunca `supabase stop --all`** — derruba as instâncias dos outros projetos.

---

## Test Coverage Matrix

> Gerada do código, das diretrizes do projeto e da spec — confirmar antes do Execute.
> **Diretrizes encontradas**: `CLAUDE.md` (seção *Os guardas*, baselines de lint/tipo/teste, e a
> regra de gate "sem erros novos"), `vitest.config.ts` de cada workspace, `turbo.json`.

| Camada | Tipo de teste | Expectativa de cobertura | Onde | Comando |
| --- | --- | --- | --- | --- |
| Domínio puro (`packages/core/src/home/**`) | unit | **Todos os ramos; 1:1 com as ACs da spec; toda edge case listada tem teste.** É a camada onde a regra vive, então é onde a prova vive | `packages/core/src/home/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Guardas de arquivo (leem migration/`App.tsx` do disco) | unit | **Âncora de contagem obrigatória** — sem ela um caminho errado varre zero arquivo e passa em silêncio, que é a pior falha possível num teste desse tipo | `apps/store/src/shared/lib/__tests__/*.test.ts` | `pnpm --filter @estrelinha/store test` |
| Widget / página da loja | unit (RTL) | Estado ativo, estado inativo (**não renderiza nem moldura**), fonte vazia, imagem quebrada; e **390px** para toda superfície nova | `apps/store/src/**/__tests__/*.test.tsx` | `pnpm --filter @estrelinha/store test` |
| Tela / feature do backoffice | unit (RTL) | Caminho feliz + recusa + falha de gravação (formulário preservado) + falha de leitura (superfície de erro, nunca lista vazia) | `apps/backoffice/src/**/*.test.tsx` | `pnpm --filter @estrelinha/backoffice test` |
| Hook de dados (react-query) | unit | Sucesso, erro (**piso semeado**, nunca vazio), lista vazia | junto do hook | conforme o app |
| Migration SQL | **none direto** — provada por guarda de arquivo + probe HTTP | `AD-012`: tipo escrito à mão é afirmação, não verificação. **A prova de que uma tela grava é gravar** | — | `homeSections.test.ts` + probe (T11) |
| Tokens (`packages/ui/src/styles.css`) | none | gate de build; a mudança é visual e se confere em tela | — | gate de build |

**`packages/core/src/payment/**` não é tocado por nenhuma task.** É critério de sucesso da spec e se
confere por `git status` no gate final.

## Gate Check Commands

> Gerados do código — confirmar antes do Execute.

| Nível | Quando | Comando |
| --- | --- | --- |
| **Quick** | tasks com teste unitário num workspace só | `pnpm --filter @estrelinha/<ws> test` |
| **Full** | tasks que cruzam workspaces (core + loja, core + painel) | `pnpm --filter @estrelinha/core test && pnpm --filter @estrelinha/<app> test` |
| **Build** | fecho de fase, e toda task de migration ou de token | `pnpm test` **e** `npx tsc --noEmit -p apps/store/tsconfig.app.json` **e** `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` **e** `pnpm lint` |

**Três armadilhas de gate que este projeto já pagou, e que valem aqui:**

1. **`pnpm build` NÃO faz typecheck** — é `vite build` puro. Build verde não prova ausência de erro
   de tipo. Use `tsc --noEmit -p .../tsconfig.app.json` — note o **`tsconfig.app.json`**, porque o
   `tsconfig.json` de cada app é solution-style e compila **zero** arquivo.
2. **`pnpm test | tail` engole o código de saída** — o que sai do pipe é o do `tail`. Capture o de
   verdade.
3. **`pnpm test` roda os 4 workspaces em paralelo e já produziu flake de RTL sob carga.** Falha de
   timeout em suíte pesada que passa isolada não é regressão — rode por workspace antes de investigar.

**Baselines a respeitar (o gate é "sem erros novos", não "lint limpo"):**

| Métrica | Baseline | Regra |
| --- | --- | --- |
| lint | **30 erros / 8 warnings** (backoffice 28/7 · store 2/1) | zero erro **novo** |
| tipos | **0** (store · backoffice · catalog-import) | zero é a baseline: qualquer erro é novo |
| testes | **4019 / 225 arquivos** | só cresce; queda = deleção silenciosa |

---

## Execution Plan

Fases ordenadas e sequenciais. **35 tasks em 6 fases** — empacotadas em **6 lotes** de sub-agente.

> Nasceu com 34 em 5 lotes. A **`T35`** entrou depois do lote 4 (a Fase 4 revelou a derivação
> reescrita no painel), e a Fase 5 passou a ser lote próprio para nenhum lote estourar o orçamento
> de ~7 tasks.

### Fase 1 — Congelar a Home de hoje, depois o domínio (6 tasks) — ✅ **FECHADA** (2026-08-15)

```
T1 → T2 → T3 → T4 → T5 → T6
```

| Task | Commit | Entregou |
| --- | --- | --- |
| T1 | `e0c5a17` | congela a Home atual pelo **DOM renderizado** — sequência, literais, limites 3/4/12, as duas cores do título |
| T2 | `e4f0d2d` | catálogo: 10 tipos, 6 únicos, `sectionMeta`, `MAX_HOME_SECTIONS`, pureza asserida |
| T3 | `a277f04` | `DEFAULT_HOME_COMPOSITION` — 7 seções, comparadas com o fonte dos widgets |
| T4 | `17de2e3` | `orderSections` + `reorderSections`, idempotência asserida |
| T5 | `53c5eb6` | `resolveHomeSections` com `hiddenReason`, `droppedCount` e o aninhamento |
| T6 | `8dd62ce` | as cinco recusas, todas `string | null` |

**Verificado de forma independente pelo orquestrador** (não pelo relato do worker): core
**1014/33** (+96) · store **1410/109** (+9) · `tsc` store **0** · `payment/**` **0 arquivos
tocados** · árvore limpa.

**Duas correções do orquestrador sobre o entregue:**
1. A âncora de `catalog.test.ts` vinha com piso `>= 3` num módulo de **seis** arquivos — uma
   varredura que devolvesse metade passaria. Piso elevado a 6, com os seis nomeados. A forma que o
   worker escolheu (nomear em vez de fixar a lista, para arquivo novo entrar sozinho) foi preservada.
2. Três achados viraram **emendas de design** (`E1`, `E2`, `E3` em `design.md`), com as ACs de T14,
   T15, T18 e T23 reescritas — em vez de deixar um worker adiante improvisar.

> **T1 vem antes de tudo, e não é cerimônia.** O risco nº 1 desta feature é a Home mudar de cara
> numa refatoração de composição — e nada acusaria: build passa, `tsc` passa, teste de componente
> passa. Congelar o comportamento atual **antes** de tocar em qualquer widget é o que torna
> `HOME-04` verificável em vez de opinável.

### Fase 2 — Banco (5 tasks) — ✅ **FECHADA** (2026-08-15)

```
T7 → T8 → T9 → T10 → T11
```

| Task | Commit | Entregou |
| --- | --- | --- |
| T7 | `e5dbd10` | as duas tabelas, CHECK de 10 tipos, unique parcial dos 6 únicos, FK de destino em `SET NULL`, CHECK `num_nonnulls <= 1`, trigger do hero |
| T8 | `069c331` | RLS das duas tabelas + bucket `home-images` |
| T9 | `9408504` | semente das 7 seções, reexecutável (2ª execução: `INSERT 0 0`) |
| T10 | `6c8c2d5` | `homeSections.test.ts` — 54 testes, âncora em **todo** parser; **5 mutações injetadas no arquivo real derrubaram a suíte** |
| T11 | `e984577` | `DbHomeSection`/`DbHomeSectionItem`, derivados do `information_schema` |

**O probe da T11 provou as duas decisões estruturais de uma vez.** Apagar a categoria e o produto de
destino devolveu **204**, e os três itens **sobreviveram** com a arte intacta e o destino nulo — que é
`SET NULL` funcionando **e** a prova de que o CHECK precisava ser `<= 1`: com `= 1`, esse `DELETE`
teria falhado. Também conferidos: hero recusa `active=false` e `DELETE` (23514) enquanto a newsletter
desliga normalmente; `insert` anônimo 42501; `select` anônimo devolve 6 de 7 seções.

**Verificado pelo orquestrador**: store **1464/110** (+54) · `tsc` store 0 · backoffice 0 ·
`payment/**` **0 arquivos** · árvore limpa.

> **Dois achados que a T21 tem de respeitar** (medidos no probe, anotados em
> `packages/supabase/src/types/home.ts`):
> 1. **O upsert de reordenação precisa mandar `type` junto.** `{ id, position }` sozinho devolve
>    `23502 null value in column "type"` — o upsert do PostgREST é `insert … on conflict`, e `type` é
>    `not null` sem default. `{ id, type, position }` funciona e é idempotente.
> 2. **`insert` em lote exige as mesmas chaves em todos os objetos** (`PGRST102`). Item com destino de
>    categoria e item com destino de `href` precisam mandar as outras colunas como `null` explícito.

### Fase 3 — A loja passa a ler do banco (7 tasks) — ✅ **FECHADA** (2026-08-15)

```
T12 → T13 → T14 → T15 → T16 → T17 → T18
```

| Task | Commit | Entregou |
| --- | --- | --- |
| T12 | `ac1e6ef` | `useHomeSections` — erro, lista vazia **e o instante antes da resposta** caem no piso semeado |
| T13 | `2abde75` | hero com texto por prop e foto opcional na mesma vaga de proporção da arte |
| T14 | `79523f6` | faixa, chips e newsletter por prop; `link_label`/`link_href` na composição e na semente |
| T15 | `18b20e6` | `layoutSlots`/`layoutRatios` em `core/home` (**E3**) + os quatro arranjos |
| T16 | `6fb5482` | fileiras com lista resolvida e `interludeAfter` por prop |
| T17 | `3f37c99` | registro tipo → componente, aninhamento e o contexto com a derivação injetada |
| T18 | `0c9af43` | `HomePage` = hook → renderizador; nenhum nome de seção sobra no `.tsx` |

**`HOME-04` cumprido, e medido no diff — não no relato.** A T1 foi de **9 para 14 asserções**;
`git diff --numstat` da fase inteira sobre o arquivo dá **56 linhas adicionadas, 0 removidas**. A
regra da emenda E2 ("não perde asserção — só ganha") valeu na prática.

**Verificado pelo orquestrador**: `pnpm test` exit 0 — store **1530/115** · core **1029/34** ·
backoffice 1145/70 · functions 279/4 · catalog-import 276/15 = **4259/238**. `tsc` 0/0. Lint 30/8.
`payment/**` **0 arquivos**. Árvore limpa.

**Dois `SPEC_DEVIATION` novos, os dois aceitos:**
1. `useHomeSections` **não** ordena no PostgREST — virou a emenda **E4**, porque o worker tem razão:
   a ordem tem um dono (`orderSections`) e a do banco **não desempata**.
2. Destino de **produto** ainda não resolve na loja — virou a emenda **E5**, com dono na **T28** e a
   solução nomeada (embutir o slug pela relação).

**Correção do orquestrador na fase anterior que se confirmou útil**: a âncora de `catalog.test.ts`
subiu sozinha de 6 para 8 quando `layout.ts` entrou — que é exatamente o comportamento que o
comentário dela promete.

### Fase 4 — O painel: lista, ordem, liga/desliga, prévia (7 tasks) — ✅ **FECHADA** (2026-08-15)

```
T19 → T20 → T21 → T22 → T23 → T24 → T25
```

| Task | Commit | Entregou |
| --- | --- | --- |
| T19 | `0591271` | `--input` separado de `--border`: contorno a 3:1, divisórias intactas |
| T20 | `2f6cd53` | `Home` acima de `Menu da loja`; `navItems.test.ts` **ganhou** 3 casos |
| T21 | `9a540a1` | CRUD — nasce `active:false`, toggle manda só `{active}`, upsert leva `type` |
| T22 | `b585240` | lista arrastável: hero indelével, motivo na linha, faixa recuada, 44px por controle |
| T23 | `8544d19` | bandeja no rodapé + **E3** (`comingSoon` e `sectionCapRefusal` em `core/home`) |
| T24 | `a6cdfba` | prévia esquemática, com guarda de disco provando que nenhum token da loja atravessa |
| T25 | `a04fe7f` | `/admin/home` — erro com "Tentar de novo", abas em 390px |

**T19 conferido no diff**: só `--input` mudou, nos dois temas, com o contraste **medido** escrito no
comentário — `#9086B4` ⇒ `253 23% 62%`, 3,15:1 sobre o fundo e 3,29:1 sobre o card; par escuro
`253 20% 48%`, 3,03–3,57:1. `--border`, `--sidebar-border` e `--ring` intactos.

**Verificado pelo orquestrador**: `pnpm test` exit 0 — **4354/244** (+95/+6) · `tsc` 0 · lint 30/8 ·
`payment/**` **0 arquivos** · árvore limpa.

**Achado em tela, com dado real**: a grade de banners aparece como "não vai aparecer" porque
**nenhuma** categoria do catálogo real tem `banner_url` — `HOME-09` funcionando com dado de verdade,
não com fixture.

> **O desvio nº 1 do lote virou a task `T35`, não um comentário.** O backoffice não pode importar de
> `apps/store`, então a Fase 4 **reescreveu** as três derivações (~40 linhas). É o "defeito 01" no
> lugar mais caro: o trabalho do painel é dizer a verdade sobre o que a loja desenha.
>
> O desvio nº 2 (44px físicos em vez de `TAP_44`) foi **aceito**: o auxiliar mora no `shared/` do
> outro app, e copiá-lo criaria o segundo dono da medida que `touchTarget.test.ts` existe para impedir.

### Fase 5 — Editores de seção (5 tasks) — ✅ **FECHADA** (2026-08-15)

**Ordem executada** (a corrigida pelo cross-check, não a numérica):

```
T26 → T30 → T27 → T28 → T29
```

| Task | Commit | Entregou |
| --- | --- | --- |
| T26 | `ae9d3fd` | `uploadImageBlob` com `{bucket, folder}` — default asserido nos dois lados; `uploadHomeImage` mede a proporção **antes** de comprimir |
| T30 | `da41aba` | `/admin/home/:sectionId` no **mesmo** componente; `FormPageHeader` com trilha e `⌘S`; `SECTION_EDITORS` como registro |
| T27 | `66acea5` | `HeroEditor` — seis campos, `alt` obrigatório, destino validado, remover foto volta à arte |
| T28 | `f9f86c6` | `BannerGridEditor` — 4 arranjos, vagas de `layoutSlots`, `label_snapshot`, aviso que não bloqueia **+ a emenda E5 nas duas pontas** |
| T29 | `8d429ad` | `TextSectionEditor` para 4 tipos; `trust_bar` sem campo, apontando para Configurações |

**A emenda E5 fechou de verdade, e eu conferi no código** — não no relato:
`useHomeSections` e `useAdminHomeSections` embutem `product:products(slug)`;
`HomeRenderer.test.tsx:230` assere `href="/produtos/pingente-gota"` no DOM, e a linha 235 cobre o
produto despublicado saindo de cena. O `SPEC_DEVIATION` de `useResolvedHome.ts` **saiu** (grep = 0).

O worker fez **probe HTTP antes de escrever código**: produto publicado devolve
`{"product":{"slug":…}}` para anônimo; despublicado devolve `{"product":null}` com `product_id`
intacto — "saiu do ar" é **resposta da RLS**, não filtro do cliente. Banco restaurado ao estado
anterior.

**A prévia não remonta, e a prova é boa**: identidade do nó do DOM —
`const antes = getByTestId('previa-hero')` → navega → `expect(getByTestId('previa-hero')).toBe(antes)`.
Remontar criaria outro nó e a asserção cai.

**Verificado pelo orquestrador**: **4434/248** (+80/+4) · `tsc` 0 · lint 30/8 · `payment/**` **0
arquivos** · **guarda da T1 com ZERO linha no diff do lote** · árvore limpa.

**Desvios aceitos**: (1) o cartão "Arte" do hero ficou na coluna da esquerda, não onde o board o põe
— a decisão da T30 ("a rota troca só a coluna da lista") manda sobre a posição do board; (2) o teto
de banners é `layoutSlots(arranjo)`, e item excedente é **denunciado** em vez de descartado, porque a
grade da loja faz `.slice(0, vagas)` e o 4º sumiria em silêncio; (3) `HERO_ART_SLOT` **não** alimenta
`aspectRatioWarning` de propósito — a foto do hero é fotografia e aceita recorte; quem ganha aviso é
o banner de campanha, que tem texto dentro da arte.

### Fase 6 — P2: curadoria, destaque e fecho (5 tasks)

```
T31 → T32 → T33 → T35 → T34
```

> **`T35` entrou depois do lote 4**, quando a Fase 4 revelou a derivação reescrita no painel. Fica
> **antes** da T34 porque o fecho tem de medir a baseline com a duplicação já resolvida — e **depois**
> da T31, para não mexer em arquivo que a curadoria está usando.

**P3 (`HOME-45`..`HOME-47`) fica fora deste plano**, como a tabela de rastreabilidade da spec já
declara. Carrossel de produtos e grade de coleções entram como tipos no catálogo (T2) mas **sem
renderer nem editor** — ficam esmaecidos na bandeja com "em breve", que é honesto e não mente sobre
o que a lista oferece.

---

## Task Breakdown

### T1: Congelar a Home de hoje, string a string

**What**: Teste que renderiza a `HomePage` **atual** e assere a sequência das 7 seções mais os
literais de cada uma. **Nenhum código de produção muda nesta task.**
**Where**: `apps/store/src/pages/__tests__/homeComposition.test.tsx`
**Depends on**: None
**Reuses**: molde dos testes de página existentes (`CheckoutPage.test.tsx`)
**Requirement**: `HOME-04`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Assere a **ordem**: hero → vantagens → grade de banners → fileiras com a faixa institucional
      depois da 1ª → chips de tema → newsletter
- [ ] Assere os **literais**: eyebrow, as duas linhas do título, o parágrafo, rótulo e destino do CTA
      do hero; eyebrow/título/parágrafo/assinatura/link da faixa institucional; título e subtítulo
      dos chips e da newsletter; o rótulo do botão da newsletter
- [ ] Assere os **limites**: 3 vagas de banner, 4 fileiras, 12 chips
- [ ] Assere as **duas cores** do título do hero (`ink` na 1ª linha, `primary` na 2ª)
- [ ] Gate `pnpm --filter @estrelinha/store test` passa · **1401 + N testes**

**Tests**: unit · **Gate**: quick
**Commit**: `test(home): congela a composicao atual antes de move-la para o banco`

---

### T2: O catálogo de tipos de seção

**What**: `HomeSectionType`, `HOME_SECTION_TYPES` (10), `UNIQUE_SECTION_TYPES`, `sectionMeta`,
`MAX_HOME_SECTIONS = 30`, e os tipos `HomeSection` / `HomeSectionItem`.
**Where**: `packages/core/src/home/{types.ts,catalog.ts,index.ts}` + `packages/core/package.json`
(`"./home"` no `exports`)
**Depends on**: None
**Reuses**: forma de `@estrelinha/core/routes` — módulo **sem React e sem Supabase**, porque o guarda
que lê a migration do disco precisa importá-lo dentro de um teste de arquivo
**Requirement**: `HOME-06`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] 10 tipos; os 6 únicos declarados em `UNIQUE_SECTION_TYPES`
- [ ] **Nenhum tipo de contagem regressiva nem de prova social** — asserido pela ausência
- [ ] `sectionMeta` devolve rótulo, se é único, e a faixa aceita de `limit` por tipo
- [ ] Zero import de React/Supabase no módulo (asserido)
- [ ] Gate `pnpm --filter @estrelinha/core test` passa · **918 + N testes**

**Tests**: unit · **Gate**: quick
**Commit**: `feat(home): catalogo de tipos de secao em @estrelinha/core/home`

---

### T3: `DEFAULT_HOME_COMPOSITION` — o piso e a semente

**What**: A composição de hoje como dado: 7 seções, com os literais que a T1 congelou.
**Where**: `packages/core/src/home/defaults.ts`
**Depends on**: T2
**Reuses**: os literais lidos de `HeroBanner`, `BrandStatement`, `TrendingTags`, `NewsletterBanner`
**Requirement**: `HOME-04`, `HOME-07`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] 7 seções, `position` 1..7, todas `active: true` menos nenhuma
- [ ] A faixa institucional traz `interlude_after: 0`
- [ ] `banner_grid` traz `layout: 'hero_pair'`; `collection_rows` traz `limit: 4`; `trending_tags`
      traz `limit: 12`
- [ ] **Os literais batem com os do disco** — o teste importa os widgets e compara, para a constante
      não envelhecer em silêncio
- [ ] Gate quick · core **+N**

**Tests**: unit · **Gate**: quick
**Commit**: `feat(home): DEFAULT_HOME_COMPOSITION, a home de hoje como dado`

---

### T4: Ordem e reordenação

**What**: `orderSections` (position, depois id) e `reorderSections` (posições **absolutas**, só as
linhas que mudaram).
**Where**: `packages/core/src/home/order.ts`
**Depends on**: T2
**Reuses**: **molde** de `reorderWithinParent` (`backoffice/features/category-list/model/categoryTree.ts:370`)
— não import; ver Riscos do design
**Requirement**: `HOME-11`, `HOME-12`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Empate de `position` desempata por `id`, e **dois carregamentos dão a mesma ordem**
- [ ] `reorderSections` devolve **só** as linhas que mudaram de lugar
- [ ] **Repetir a mesma chamada dá o mesmo resultado** (idempotência asserida, não presumida)
- [ ] Mover para a própria posição devolve `[]`
- [ ] Gate quick · core **+N**

**Tests**: unit · **Gate**: quick
**Commit**: `feat(home): ordem deterministica e reordenacao idempotente`

---

### T5: `resolveHomeSections` — a leitura, para os dois lados

**What**: A função que decide o que renderiza, o que não renderiza **e por quê**, resolvendo
curadoria ⇄ derivação e o aninhamento da faixa institucional.
**Where**: `packages/core/src/home/resolve.ts`
**Depends on**: T2, T3, T4
**Reuses**: `pickHomeBanners`, `pickHomeCollections`, `pickTrendingCategories`, `browseCategories`,
`bySortOrder`, `categoryHref`
**Requirement**: `HOME-02`, `HOME-03`, `HOME-09`, `HOME-31`..`HOME-36`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Seção inativa **não produz nada** — nem moldura, nem espaçamento, nem título
- [ ] Sem itens ⇒ derivação de hoje; com itens ⇒ a lista da dona, na ordem dela, **sem completar vaga**
- [ ] Item despublicado **ou** órfão é pulado e entra em `droppedCount`
- [ ] Todos os escolhidos fora do ar ⇒ a seção não renderiza, com `hiddenReason`
- [ ] `hiddenReason` traz **o motivo legível**, não um booleano
- [ ] Faixa com `interlude_after` **sem `collection_rows` antes dela renderiza sozinha, no próprio
      lugar** — nunca some
- [ ] Catálogo vazio ⇒ as seções que dependem dele não renderizam, com motivo
- [ ] Gate quick · core **+N**

**Tests**: unit · **Gate**: quick
**Commit**: `feat(home): resolveHomeSections, a mesma regra para a loja e para o painel`

---

### T6: As recusas e o aviso de proporção

**What**: `uniqueTypeRefusal`, `destinationRefusal`, `ctaHrefRefusal`, `configRefusal`,
`aspectRatioWarning` — todas devolvendo `string | null`.
**Where**: `packages/core/src/home/refusals.ts`
**Depends on**: T2
**Reuses**: `reservedSlugRefusal` / `RESERVED_SLUGS` de `@estrelinha/core/routes` (fonte da `23`);
formato de `menuSlotRefusal`
**Requirement**: `HOME-20`, `HOME-22`, `HOME-23`, `HOME-27`, `HOME-42`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] **`string | null` em todas** — nunca união discriminada por literal booleano
      (`strictNullChecks: false` não estreita; seria TS2339)
- [ ] `ctaHrefRefusal` recusa caminho que a loja não serve **e** caminho reservado, usando
      `core/routes` como fonte
- [ ] `destinationRefusal` exige **exatamente um** destino para salvar, e distingue "ainda não
      escolhi" de "perdi o que tinha"
- [ ] `alt` só com espaço em branco é recusado como vazio
- [ ] `configRefusal` recusa `limit` fora da faixa do tipo
- [ ] `aspectRatioWarning` devolve a medida recomendada **em pixels** e **nunca bloqueia**
- [ ] Gate quick · core **+N**

**Tests**: unit · **Gate**: quick
**Commit**: `feat(home): recusas de destino, CTA, config e o aviso de proporcao`

---

### T7: Migration — tabelas, constraints e o trigger do hero

**What**: `home_sections` + `home_section_items`, com CHECK de tipo, unique parcial dos tipos únicos,
CHECK `num_nonnulls(...) <= 1`, índices, e o trigger que impede desligar/apagar o hero.
**Where**: `supabase/migrations/2026____________24-home-gerenciavel.sql`
**Depends on**: T2
**Reuses**: molde de `20260811120000_22-material-afetivo.sql` — comentários onde a decisão vale
**Requirement**: `HOME-01`, `HOME-08`, `HOME-23`, `HOME-30`

**Tools**: MCP: NONE (o MCP do Supabase **não está autorizado nesta sessão**) · Skill: `supabase`

**Done when**:
- [ ] `section_id` é **`ON DELETE CASCADE`**; `category_id` e `product_id` são **`ON DELETE SET NULL`**
- [ ] O CHECK de destino é **`<= 1`**, não `= 1` — e o comentário explica que `= 1` faria a
      **exclusão da categoria falhar**
- [ ] `comment on column` em `label_snapshot`, `interlude_after` e nas duas FK de destino
- [ ] Trigger recusa `active = false` e `delete` no hero
- [ ] `supabase db reset` roda limpo
- [ ] Gate **build**

**Tests**: none direto (guarda em T10 + probe em T11) · **Gate**: build
**Commit**: `feat(home): migration das secoes da home, com FK real e o hero indelevel`

---

### T8: Migration — RLS e o bucket `home-images`

**What**: RLS das duas tabelas (leitura pública só de ativa; escrita só admin) e o bucket próprio.
**Where**: mesma migration da T7
**Depends on**: T7
**Reuses**: policies de `20260415095816_create_product_images_bucket.sql`; `has_role`
**Requirement**: `HOME-05`

**Tools**: MCP: NONE · Skill: `supabase`

**Done when**:
- [ ] `select` público devolve **só** `active = true`; o item segue o estado da seção-mãe
- [ ] Escrita exige `has_role(auth.uid(), 'admin')` no `using` **e** no `with check`
- [ ] `anon` não alcança escrita em nada
- [ ] Bucket **`home-images`**, separado de `product-images` — o comentário diz por quê
- [ ] Gate **build**

**Tests**: none direto · **Gate**: build
**Commit**: `feat(home): RLS das secoes e bucket proprio para a arte da home`

---

### T9: Semente — a Home de hoje, no banco

**What**: O `insert` das 7 seções, derivado de `DEFAULT_HOME_COMPOSITION`.
**Where**: mesma migration da T7
**Depends on**: T3, T7
**Reuses**: o backfill seed-shaped de `20260803120000_16-store-menu.sql` (`and ... = false` para ser
reexecutável sem desfazer curadoria)
**Requirement**: `HOME-04`

**Tools**: MCP: NONE · Skill: `supabase`

**Done when**:
- [ ] 7 linhas, na ordem de hoje, com os mesmos textos e limites
- [ ] Reexecutável: rodar de novo **não** duplica nem desfaz curadoria já feita à mão
- [ ] Gate **build**

**Tests**: none direto · **Gate**: build
**Commit**: `feat(home): semeia a composicao atual, para a virada nao mudar nada`

---

### T10: O guarda que lê a migration do disco

**What**: `homeSections.test.ts` — catálogo TS × CHECK da migration, semente × `DEFAULT_HOME_COMPOSITION`,
RLS, trigger, tipos proibidos. **Com âncora de contagem.**
**Where**: `apps/store/src/shared/lib/__tests__/homeSections.test.ts`
**Depends on**: T7, T8, T9
**Reuses**: `materialTransitions.test.ts` — o molde exato
**Requirement**: `HOME-06`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] **Âncora de contagem**: derruba a suíte se o arquivo lido não render as N entradas esperadas —
      sem ela um caminho errado varre zero e passa em silêncio
- [ ] Derruba se: o catálogo TS divergir do CHECK; a semente divergir de `DEFAULT_HOME_COMPOSITION`;
      entrar tipo de contagem regressiva ou prova social; existir policy de escrita **sem** `has_role`;
      qualquer `grant` alcançar `anon`; o trigger do hero sumir; a FK de destino virar `cascade`
- [ ] Gate quick · store **+N**

**Tests**: unit · **Gate**: quick
**Commit**: `test(home): guarda que prende o catalogo, a semente e a RLS a migration`

---

### T11: Tipos do banco — **e a prova de que gravam**

**What**: `DbHomeSection` / `DbHomeSectionItem` em `@estrelinha/supabase/types`, **mais um probe HTTP
contra o banco local** que insere, lê, reordena e apaga.
**Where**: `packages/supabase/src/types/index.ts` + roteiro de probe registrado na task
**Depends on**: T7, T8
**Reuses**: —
**Requirement**: `HOME-01`

**Tools**: MCP: NONE (Supabase MCP sem autorização nesta sessão — usar `curl` contra `:54341`) · Skill: `supabase`

**Done when**:
- [ ] **`AD-012` cumprido**: o probe HTTP grava de verdade. `DbCategory` declarou três colunas
      inexistentes por meses e **toda gravação de categoria falhava com `PGRST204`** — o build não
      checa tipo, o `tsc` achava o código certo (o tipo mentia) e os testes mockavam o client.
      **Inspeção de tipo não é prova.**
- [ ] O probe cobre: `insert` de seção, `insert` de item, `upsert` de reordenação, `delete` em
      cascade, e a recusa de desligar o hero
- [ ] `tsc --noEmit` limpo nos dois apps
- [ ] Gate **build**

**Tests**: none (probe manual registrado) · **Gate**: build
**Commit**: `feat(home): tipos das tabelas da home, conferidos por probe contra o banco`

---

### T12: `useHomeSections` — com o piso semeado

**What**: O hook de leitura da loja, com `DEFAULT_HOME_COMPOSITION` como piso.
**Where**: `apps/store/src/entities/home/{api/useHomeSections.ts,index.ts}`
**Depends on**: T3, T11
**Reuses**: molde de `useCategories`; o instinto do `mapCategory` (default conservador)
**Requirement**: `HOME-07`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Uma consulta só, com a relação embutida (`*, items:home_section_items(*)`)
- [ ] **Erro de leitura ⇒ `DEFAULT_HOME_COMPOSITION`**, nunca `[]` e nunca página em branco
- [ ] Lista vazia ⇒ o mesmo piso
- [ ] Gate quick · store **+N**

**Tests**: unit · **Gate**: quick
**Commit**: `feat(home): leitura das secoes com a composicao semeada como piso`

---

### T13: `HeroBanner` recebe conteúdo, e aceita foto

**What**: O hero passa a receber texto por prop e a renderizar foto quando houver, caindo na arte da
marca quando não.
**Where**: `apps/store/src/widgets/hero-banner/ui/HeroBanner.tsx` (+ teste)
**Depends on**: T3
**Reuses**: `HeroArt` (o `EstrelinhaSymbol` sobre o palco `serenity`) — **fica**, como fallback
**Requirement**: `HOME-16`..`HOME-19`, `HOME-21`

**Tools**: MCP: `paper` (medidas exatas do board) · Skill: NONE

**Done when**:
- [ ] As duas linhas do título continuam saindo em `ink` e `primary`
- [ ] Sem foto ⇒ `HeroArt`; com foto ⇒ a foto; remover a foto **não deixa buraco**
- [ ] Em 390px a foto respeita a proporção reservada e **não empurra o CTA abaixo da dobra**
- [ ] **T1 continua verde**
- [ ] Gate quick · store **+N**

**Tests**: unit · **Gate**: quick
**Commit**: `feat(home): hero com texto e foto vindos do conteudo, arte da marca como fallback`

---

### T14: As três seções de texto recebem conteúdo

**What**: `BrandStatement`, `TrendingTags` e `NewsletterBanner` passam a receber texto por prop.
**Where**: os três widgets (+ testes)
**Depends on**: T3
**Reuses**: a marcação, as classes e os comentários de contraste **não mudam** — é troca de fonte do
texto, não redesenho
**Requirement**: `HOME-41`, `HOME-43`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] **PRIMEIRO**, antes de tocar em widget: estender `homeComposition.test.tsx` para congelar o
      link "Ver todos os temas" → `/busca` dos chips (**emenda E2** — a T1 não o congelou, e sem isso
      removê-lo não acusaria)
- [ ] `trending_tags.config` ganha `link_label` e `link_href` em `DEFAULT_HOME_COMPOSITION`
- [ ] Os três exigem o conteúdo por **prop obrigatória** — **sem fallback literal** (**emenda E1**:
      um fallback dentro do widget seria um segundo dono dos mesmos textos)
- [ ] A comparação com o disco em `defaults.test.ts` **se aposenta aqui**, com o motivo no arquivo:
      quem assume o papel é a T1, que assere o DOM ao fim do pipe inteiro
- [ ] `accentText.test.ts` e `contrast.test.ts` continuam verdes
- [ ] **T1 não perde asserção — só ganha**
- [ ] Gate quick · store **+N**

**Tests**: unit · **Gate**: quick
**Commit**: `feat(home): faixa institucional, chips e newsletter com texto editavel`

---

### T15: `HomeBannerGrid` — lista resolvida e os quatro arranjos

**What**: A grade passa a receber a lista já resolvida e a desenhar `single` / `pair` / `hero_pair` /
`quad`.
**Where**: `apps/store/src/widgets/home-banners/ui/HomeBannerGrid.tsx` (+ teste)
**Depends on**: T5
**Reuses**: `BannerLink` e `RATIOS` — `hero_pair` **é** a grade de hoje
**Requirement**: `HOME-22`, `HOME-25`, `HOME-26`, `HOME-29`

**Tools**: MCP: `paper` · Skill: NONE

**Done when**:
- [ ] **`layoutSlots(layout)` e `layoutRatios(layout)` nascem em `packages/core/src/home/`**, não no
      widget (**emenda E3**): a T28 lê as mesmas medidas, e "quantos banners cabem em `hero_pair`"
      respondido em dois lugares divergiria no primeiro ajuste
- [ ] Em 390px **todo** arranjo empilha em coluna de largura cheia, na ordem da fileira
- [ ] Imagem que não carrega mantém a proporção reservada e **nada abaixo se desloca**
- [ ] Banner órfão não é renderizado
- [ ] **T1 não perde asserção** (`hero_pair` idêntico ao de hoje)
- [ ] Gate quick · core **+N** · store **+N**

**Tests**: unit · **Gate**: quick
**Commit**: `feat(home): grade de banners com quatro arranjos e banner proprio`

---

### T16: `HomeCollections` — lista resolvida e limite

**What**: As fileiras passam a receber a lista resolvida e o `limit` do conteúdo.
**Where**: `apps/store/src/widgets/home-collections/ui/HomeCollections.tsx` (+ teste)
**Depends on**: T5
**Reuses**: `TONES`, `HomeCollectionRow`, e a regra do `interlude`
**Requirement**: `HOME-32`, `HOME-42`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] O chão continua alternando; o `interlude` continua entrando depois da 1ª fileira
- [ ] Catálogo vazio **não engole o `interlude`** (comportamento de hoje, preservado)
- [ ] Vaga que sobra fica vazia — **não completa com o automático**
- [ ] **T1 continua verde**
- [ ] Gate quick · store **+N**

**Tests**: unit · **Gate**: quick
**Commit**: `feat(home): fileiras de colecao com lista curada e limite editavel`

---

### T17: O registro tipo → componente

**What**: `HOME_SECTION_RENDERERS` e o `HomeRenderer` que caminha a lista resolvida e aplica o
aninhamento da faixa.
**Where**: `apps/store/src/widgets/home-renderer/`
**Depends on**: T13, T14, T15, T16
**Reuses**: os widgets acima
**Requirement**: `HOME-02`, `HOME-03`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Tipo sem renderer (os dois de P3) **não quebra a página** — é pulado
- [ ] Seção inativa não produz **nada**
- [ ] A faixa com `interlude_after` entra dentro da seção de fileiras anterior; **sem ela, renderiza
      sozinha**
- [ ] Gate quick · store **+N**

**Tests**: unit · **Gate**: quick
**Commit**: `feat(home): renderizador dirigido por tipo de secao`

---

### T18: `HomePage` monta do banco — **o gate de `HOME-04`**

**What**: A página encolhe para hook → resolve → render. **Nenhum nome de seção sobra no `.tsx`.**
**Where**: `apps/store/src/pages/HomePage.tsx`
**Depends on**: T12, T17
**Reuses**: —
**Requirement**: `HOME-02`, `HOME-04`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] **A T1 não perde asserção — só ganha** (**emenda E2**). Se uma asserção precisar ser removida
      ou afrouxada, a composição mudou — e isso é a falha que `HOME-04` existe para pegar.
      Acrescentar cobertura (como a T14 faz com o link dos chips) é legítimo
- [ ] Nenhum import de widget de seção sobra na página
- [ ] Gate **build** (fecho de fase) · **4019 + N testes**, zero erro de tipo novo, lint ≤ 30/8

**Tests**: unit · **Gate**: build
**Commit**: `feat(home): a home passa a ser montada a partir do banco`

---

### T19: Borda de campo do painel a 3:1

**What**: Escurecer **`--input`** (o token de contorno de controle), deixando `--border` (divisória)
intacto.
**Where**: `packages/ui/src/styles.css` (light **e** dark)
**Depends on**: None
**Reuses**: a divisão `field`/`line` que a loja já força via `fieldBorder.test.ts`
**Requirement**: decisão do usuário (2026-08-15) + a decisão nº 3 do Paper

**Tools**: MCP: `paper` (o valor do desenho) · Skill: NONE

**Done when**:
- [ ] **Só `--input` muda.** `--border`, `--sidebar-border` e `--ring` ficam como estão
- [ ] O novo valor mede **≥ 3:1** sobre o fundo de campo, medido — não estimado
- [ ] Varredura visual das telas de formulário existentes (produtos, cupons, promoções,
      configurações): nenhuma regressão
- [ ] Gate **build**

**Tests**: none (token) · **Gate**: build
**Commit**: `fix(painel): contorno de controle a 3:1, sem tocar nas divisorias`

---

### T20: `Home` na sidebar, acima de `Menu da loja`

**What**: Item novo em `navGroups`, rotas em `App.tsx` na mesma sequência, e o guarda atualizado.
**Where**: `apps/backoffice/src/widgets/admin-layout/model/navItems.ts` + `app/App.tsx` +
`__tests__/navItems.test.ts`
**Depends on**: None
**Reuses**: `navGroups`
**Requirement**: decisão nº 6 do Paper

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `Loja` vira `['/admin/home', '/admin/menu']` — a Home é a superfície maior e a mais curada; a
      barra do topo é ajuste pontual
- [ ] As rotas em `App.tsx` seguem a mesma sequência
- [ ] **O teste que hoje assere `['/admin/menu']` é atualizado, não afrouxado** — ele passa a asserir
      as duas, na ordem
- [ ] `/admin/home/:sectionId` **não** entra em `navGroups` (não é destino de primeiro nível — mesma
      régua da grade rápida)
- [ ] Gate quick · backoffice **+N**

**Tests**: unit · **Gate**: quick
**Commit**: `feat(admin): Home entra no grupo Loja, acima do Menu da loja`

---

### T21: `useAdminHomeSections` — o CRUD do painel

**What**: Leitura completa (inclusive inativas), criar, atualizar, apagar, reordenar e curar.
**Where**: `apps/backoffice/src/entities/home/api/useAdminHomeSections.ts`
**Depends on**: T11
**Reuses**: molde de `useAdminCategories`
**Requirement**: `HOME-10`, `HOME-11`, `HOME-14`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Criar nasce **`active: false`**
- [ ] Ligar/desligar manda **`{ id, active }` e nada mais** — molde do "pausar cupom": acrescentar
      campos reescreveria a seção com o cache da listagem, que pode estar velho
- [ ] Reordenar manda **posições absolutas só das linhas alteradas**
- [ ] Falha de gravação devolve o erro **tipado**, não engolido
- [ ] Gate quick · backoffice **+N**

**Tests**: unit · **Gate**: quick
**Commit**: `feat(admin): CRUD das secoes da home`

---

### T22: A lista de seções, arrastável

**What**: `HomeSectionList` + `HomeSectionRow` — arrastar, ligar/desligar, resumo, aviso de "não vai
aparecer", e a faixa institucional **recuada** sob as fileiras.
**Where**: `apps/backoffice/src/features/home-composition/ui/`
**Depends on**: T5, T21
**Reuses**: `MenuSlotList`
**Requirement**: `HOME-08`, `HOME-09`, `HOME-12`, `HOME-15`

**Tools**: MCP: `paper` · Skill: NONE

**Done when**:
- [ ] O hero aparece **sem controle de desligar nem de remover**
- [ ] Linha que não vai aparecer diz **o motivo**; ativá-la mesmo assim **é permitido**
- [ ] A faixa institucional aparece recuada, com "depois da 1ª fileira"
- [ ] Em 390px cada controle tem alvo próprio de **44px** (`TAP_44`), e a linha mostra nome + resumo
      em duas linhas
- [ ] Gate quick · backoffice **+N**

**Tests**: unit · **Gate**: quick
**Commit**: `feat(admin): lista de secoes da home, arrastavel e com o motivo de cada ausencia`

---

### T23: A bandeja de blocos

**What**: `HomeBlockTray` — no **rodapé do cartão da lista**, não num modal.
**Where**: `apps/backoffice/src/features/home-composition/ui/HomeBlockTray.tsx`
**Depends on**: T2, T21
**Reuses**: `uniqueTypeRefusal`
**Requirement**: `HOME-10`, edge case do teto e dos tipos únicos

**Tools**: MCP: `paper` · Skill: NONE

**Done when**:
- [ ] **`sectionMeta().comingSoon` e `sectionCapRefusal(sections)` nascem em `core/home`**, não na
      tela (**emenda E3**) — mesma régua de `menuEntries`
- [ ] Tipo único que já está na lista aparece **esmaecido, dizendo que já está** — responde a
      pergunta **antes** de a dona clicar e ser recusada
- [ ] Os dois tipos de P3 aparecem como "em breve", sem prometer o que não existe
- [ ] A 31ª seção é recusada, dizendo o teto
- [ ] Gate quick · core **+N** · backoffice **+N**

**Tests**: unit · **Gate**: quick
**Commit**: `feat(admin): bandeja de blocos no rodape da lista, com os unicos ja marcados`

---

### T24: A prévia esquemática

**What**: `HomePreview` — blocos empilhados na ordem real, com textos e imagens reais, e selo nas que
não vão aparecer.
**Where**: `apps/backoffice/src/features/home-composition/ui/HomePreview.tsx`
**Depends on**: T5, T21
**Reuses**: `MenuBarPreview`
**Requirement**: `HOME-13`

**Tools**: MCP: `paper` · Skill: NONE

**Done when**:
- [ ] **Tokens do painel, nunca `--estrelinha-*`** — render real dos widgets traria a paleta da loja
      para dentro do backoffice, e há teste guardando a separação
- [ ] Seção desligada aparece com selo e o motivo
- [ ] Gate quick · backoffice **+N**

**Tests**: unit · **Gate**: quick
**Commit**: `feat(admin): previa esquematica da home`

---

### T25: `/admin/home` — a tela

**What**: `AdminHomePage` juntando lista + bandeja + prévia, com superfície de erro explícita e as
abas `Seções | Prévia` em 390px.
**Where**: `apps/backoffice/src/pages/admin/AdminHomePage.tsx`
**Depends on**: T20, T22, T23, T24
**Reuses**: `PageHeader`, `TableSkeleton`, e a superfície de erro do `AdminMenuPage`
**Requirement**: `HOME-08`, `HOME-13`, `HOME-14`, `HOME-15`

**Tools**: MCP: `paper` · Skill: NONE

**Done when**:
- [ ] Falha de leitura é **superfície explícita com "Tentar de novo"** — nunca lista vazia (foi
      engolir esse erro que fez a tela de Coleções parecer "sem conteúdo" por meses)
- [ ] Em 390px alterna `Seções | Prévia`; não tenta as duas lado a lado
- [ ] Gate **build** (fecho de fase)

**Tests**: unit · **Gate**: build
**Commit**: `feat(admin): tela /admin/home com lista, bandeja e previa`

---

### T26: Upload por bucket + aviso de proporção

**What**: Generalizar `uploadImageBlob` para aceitar bucket/pasta e criar `uploadHomeImage`.
**Where**: `backoffice/features/product-form/lib/uploadProductImage.ts` (modificar) +
`features/home-composition/lib/uploadHomeImage.ts`
**Depends on**: T6, T8
**Reuses**: `compressImage` (1600px, WebP 0,82)
**Requirement**: `HOME-27`, `HOME-28`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `uploadImageBlob` ganha `{ bucket, folder }` com **`'product-images'`/`'products'` como
      default** — **nenhum chamador existente muda**, e isso é asserido
- [ ] `uploadHomeImage` grava em `home-images`
- [ ] Lê as dimensões naturais **antes** de comprimir e devolve o aviso de proporção
- [ ] **Falha de upload aborta antes do `update`** — nenhuma seção fica com banner pela metade
- [ ] Gate quick · backoffice **+N**

**Tests**: unit · **Gate**: quick
**Commit**: `feat(admin): upload por bucket e aviso de proporcao sem recorte silencioso`

---

### T27: Editor do hero

**What**: `HeroEditor` — os seis campos, o upload com `alt` obrigatório e a validação do destino.
**Where**: `apps/backoffice/src/features/home-composition/ui/HeroEditor.tsx`
**Depends on**: T26, T30
**Reuses**: `FormCard`, `ctaHrefRefusal`
**Requirement**: `HOME-16`..`HOME-20`

**Tools**: MCP: `paper` (board do editor do hero) · Skill: NONE

**Done when**:
- [ ] Sobretítulo, as duas linhas do título, parágrafo, rótulo e destino do CTA
- [ ] **`alt` é obrigatório para salvar** — numa loja em que a peça é a homenagem de alguém, imagem
      sem descrição é a página muda no leitor de tela
- [ ] Destino que a loja não serve é **recusado ao salvar**, dizendo qual é o problema
- [ ] Remover a foto volta à arte da marca
- [ ] Gate quick · backoffice **+N**

**Tests**: unit · **Gate**: quick
**Commit**: `feat(admin): editor do hero, com foto opcional e destino validado`

---

### T28: Editor da grade de banners

**What**: `BannerGridEditor` — arranjo, 1 a 4 banners, destino livre, e o estado de destino perdido.
**Where**: `apps/backoffice/src/features/home-composition/ui/BannerGridEditor.tsx`
**Depends on**: T26, T30
**Reuses**: `destinationRefusal`, `aspectRatioWarning`
**Requirement**: `HOME-22`..`HOME-24`, `HOME-27`, `HOME-30`

**Tools**: MCP: `paper` (board da grade) · Skill: NONE

**Done when**:
- [ ] 1 a 4 banners; cada um exige imagem, `alt` e destino **para salvar**
- [ ] Destino é coleção **ou** produto **ou** caminho da loja — exatamente um gravado
- [ ] **O banner de PRODUTO tem de RENDERIZAR NA LOJA** (**emenda E5**). A Fase 3 marcou
      `product_id` como "destino fora do ar" porque a linha guarda o id e o caminho canônico exige o
      **slug**. Entregar só o editor faria a dona gravar um banner que **nunca apareceria**, sem erro
      em lugar nenhum. Solução: embutir o slug na consulta de `useHomeSections` —
      `items:home_section_items(*, product:products(slug))`. Uma consulta, sem coluna redundante e
      sem baixar catálogo. **A T28 não fecha enquanto isso não renderizar**, e o `SPEC_DEVIATION` em
      `useResolvedHome.ts` sai junto
- [ ] Destino apagado mostra **qual** se perdeu (via `label_snapshot`) e a arte **continua guardada**
- [ ] Aviso de proporção mostra o tamanho recomendado em px e **não recorta**
- [ ] Sem banner próprio, o cartão explica que a grade cai na derivação por Categorias
- [ ] Gate quick · backoffice **+N**

**Tests**: unit · **Gate**: quick
**Commit**: `feat(admin): editor da grade de banners, com banner livre e destino perdido visivel`

---

### T29: Editor das seções de texto

**What**: `TextSectionEditor`, servindo `brand_statement`, `trending_tags` e `newsletter`.
**Where**: `apps/backoffice/src/features/home-composition/ui/TextSectionEditor.tsx`
**Depends on**: T30
**Reuses**: `configRefusal`
**Requirement**: `HOME-41`..`HOME-44`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Título, subtítulo, e o rótulo/destino do "ver todos" quando a seção tiver um
- [ ] Limite fora da faixa do tipo é **recusado na tela**
- [ ] **A faixa de vantagens não ganha campo de texto** — os números continuam saindo de
      `store_settings`, e a tela **diz isso** em vez de deixar a dona procurar
- [ ] Gate quick · backoffice **+N**

**Tests**: unit · **Gate**: quick
**Commit**: `feat(admin): editor das secoes de texto, com os numeros ainda vindo das settings`

---

### T30: A rota do editor, com a prévia preservada

**What**: `/admin/home/:sectionId` montando o **mesmo** `AdminHomePage`, trocando só a coluna
esquerda, com trilha, `Alterações não salvas`, `Cancelar` e `Salvar ⌘S`.
**Where**: `apps/backoffice/src/pages/admin/AdminHomePage.tsx` + `app/App.tsx`
**Depends on**: T25
**Reuses**: `FormPageHeader` (o molde dos Descontos)
**Requirement**: `HOME-13`, `HOME-14`, decisão nº 1 do Paper

**Tools**: MCP: `paper` · Skill: NONE

**Done when**:
- [ ] **A prévia não remonta ao entrar no editor** — asserido, porque é a razão de a rota existir
      neste formato
- [ ] O bloco em edição aparece contornado na prévia
- [ ] Sobrevive ao F5 e é compartilhável
- [ ] Falha de gravação **preserva o que foi preenchido**
- [ ] Gate **build** (fecho de fase)

**Tests**: unit · **Gate**: build
**Commit**: `feat(admin): editor de secao como rota, sem perder a previa`

---

### T31: Curadoria de coleções — automático ↔ eu escolho

**What**: `CollectionRowsEditor` com os dois modos, a lista arrastável, "voltar ao automático" e o
aviso de quem saiu do ar.
**Where**: `apps/backoffice/src/features/home-composition/ui/CollectionRowsEditor.tsx`
**Depends on**: T30
**Reuses**: `resolveHomeSections` (o `droppedCount` já vem dele)
**Requirement**: `HOME-31`..`HOME-36`

**Tools**: MCP: `paper` (board da curadoria) · Skill: NONE

**Done when**:
- [ ] "Voltar ao automático" **apaga os itens** — não grava uma flag
- [ ] Diz "N de M escolhidas saíram do ar", e a linha da que saiu está marcada
- [ ] A tela afirma, e o teste prova, que **reordenar aqui não mexe em `categories.sort_order`** —
      conferido em `/admin/menu` depois de reordenar
- [ ] Gate quick · backoffice **+N**

**Tests**: unit · **Gate**: quick
**Commit**: `feat(admin): curadoria de colecoes com volta ao automatico`

---

### T32: Destaque em coleção — a faixa na loja

**What**: O widget `CollectionFeature` e o renderer do tipo.
**Where**: `apps/store/src/widgets/collection-feature/`
**Depends on**: T17
**Reuses**: `categoryHref`
**Requirement**: `HOME-38`..`HOME-40`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Título e texto vazios caem no **nome e na descrição da própria coleção**
- [ ] Coleção inativa ou apagada ⇒ a seção **não renderiza**
- [ ] Em 390px imagem e texto empilham e o CTA mantém **44px** de alvo
- [ ] Gate quick · store **+N**

**Tests**: unit · **Gate**: quick
**Commit**: `feat(home): faixa de destaque de uma colecao`

---

### T33: Editor do destaque

**What**: `CollectionFeatureEditor`.
**Where**: `apps/backoffice/src/features/home-composition/ui/CollectionFeatureEditor.tsx`
**Depends on**: T30, T32
**Reuses**: `destinationRefusal`, `uploadHomeImage`
**Requirement**: `HOME-37`, `HOME-39`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] A coleção é **obrigatória**; imagem, `alt`, texto e rótulo do CTA
- [ ] Coleção fora do ar ⇒ o painel **avisa**
- [ ] Gate quick · backoffice **+N**

**Tests**: unit · **Gate**: quick
**Commit**: `feat(admin): editor do destaque em colecao`

---

### T35: A derivação tem UM dono — mover para `@estrelinha/core/home`

**What**: Mover `pickHomeCollections`, `pickHomeBanners` e `pickTrendingCategories` para
`packages/core/src/home/derive.ts`, e fazer a loja **e** o painel lerem de lá.
**Where**: `packages/core/src/home/derive.ts` (novo) · `apps/store/src/widgets/home-{banners,collections}/model/*` ·
`apps/store/src/features/search/lib/trendingCategories.ts` · os barrels ·
`apps/backoffice/src/features/home-composition/model/useAdminResolvedHome.ts`
**Depends on**: T31 (nada nesta fase depende dela; entra depois para não mexer em arquivo que a T31 usa)
**Reuses**: as três funções, movidas **sem reescrever a regra**
**Requirement**: critérios de sucesso da spec — *"toda seção que não vai aparecer está marcada no
painel com o motivo"*

**Tools**: MCP: NONE · Skill: NONE

**Por que isto virou task** (achado do lote 4, `useAdminResolvedHome.ts:55-75`): o backoffice **não
pode importar de `apps/store`**, então a Fase 4 **reescreveu as três derivações** — mesmos filtros,
mesma ordenação, mesmo `slice`, em ~40 linhas paralelas. É o "defeito 01" do projeto instalado no
lugar mais caro possível: o trabalho do painel é **dizer a verdade sobre o que a loja desenha**. Se as
duas cópias divergirem, o painel promete uma seção que a Home não renderiza — e é justamente o que
esta feature existe para eliminar. A deriva já começou: a cópia do painel usa `limit ?? 4` literal
onde a loja usa `HOME_COLLECTION_ROWS`.

**Done when**:
- [ ] As três funções vivem em `core/home`; loja e painel importam **a mesma**
- [ ] **A regra não é reescrita, é movida** — o diff mostra deslocamento, não redação nova
- [ ] `useAdminResolvedHome` perde as cópias e o comentário que as justificava
- [ ] Os testes que já existiam para as três **acompanham o movimento**, sem perder caso
- [ ] `HOME_COLLECTION_ROWS` e `HOME_BANNER_SLOTS` passam a ter um lugar só
- [ ] Nenhuma violação nova de fronteira FSD
- [ ] Gate **build**

**Tests**: unit · **Gate**: build
**Commit**: `refactor(home): a derivacao passa a ter um dono, em core/home`

---

### T34: Fecho — baselines, `CLAUDE.md` e `BACKLOG.md`

**What**: Medir de novo, registrar, e lançar as dívidas que o design levantou.
**Where**: `CLAUDE.md`, `.specs/BACKLOG.md`, `.specs/STATE.md`
**Depends on**: T31, T32, T33
**Reuses**: —
**Requirement**: critérios de sucesso da spec

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `CLAUDE.md` ganha a seção da Home gerenciável e os guardas novos na tabela
- [ ] Baselines **medidas**, não copiadas: lint, tipos, testes por workspace
- [ ] **`git status` prova que `packages/core/src/payment/**` fechou a feature sem uma linha
      alterada** — é critério de sucesso da spec
- [ ] `BACKLOG.md` recebe: (a) `SUPABASE_URL` com fallback hard-coded de outro projeto em
      `uploadProductImage.ts:4`; (b) consolidar `reorderWithinParent` e `reorderSections` num
      `reorderByIndex` genérico; (c) limpeza de imagem órfã no Storage (dívida declarada da spec)
- [ ] Gate **build**

**Tests**: none (documentação) · **Gate**: build
**Commit**: `docs(home): fecha a 24 com as baselines medidas e as dividas declaradas`

---

## Phase Execution Map

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6

Fase 1:  T1 → T2 → T3 → T4 → T5 → T6            (domínio; T1 congela antes de tudo)
Fase 2:  T7 → T8 → T9 → T10 → T11               (banco)
Fase 3:  T12 → T13 → T14 → T15 → T16 → T17 → T18 (loja lê do banco; T1 é o gate)
Fase 4:  T19 → T20 → T21 → T22 → T23 → T24 → T25 (painel)
Fase 5:  T26 → T27 → T28 → T29 → T30            (editores)
Fase 6:  T31 → T32 → T33 → T34                  (P2 e fecho)
```

Execução estritamente sequencial. **34 tasks → ~5 lotes** de sub-agente (~7 por lote, sempre em
fronteira de fase).

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T1 | 1 arquivo de teste | ✅ |
| T2, T3, T4, T5, T6 | 1 módulo/conceito cada em `core/home` | ✅ |
| T7, T8, T9 | 3 recortes coesos da **mesma** migration (DDL · RLS · semente) | ✅ — separados porque cada um tem um "done when" próprio e falham por motivos diferentes |
| T10, T11 | 1 guarda · 1 tipo + probe | ✅ |
| T12 | 1 hook | ✅ |
| T13, T15, T16 | 1 widget cada | ✅ |
| T14 | **3 widgets** | ⚠️ Aceito: é a mesma mudança mecânica (literal → prop) nos três, e separar daria três commits idênticos em forma |
| T17, T18 | 1 registro · 1 página | ✅ |
| T19, T20 | 1 token · 1 lista + rotas | ✅ |
| T21..T25 | 1 hook · 1 lista · 1 bandeja · 1 prévia · 1 página | ✅ |
| T26..T29 | 1 lib · 3 editores | ✅ |
| T30 | 1 rota + moldura | ✅ |
| T31..T33 | 1 editor · 1 widget · 1 editor | ✅ |
| T34 | documentação | ✅ |

---

## Diagram-Definition Cross-Check

| Task | `Depends on` (corpo) | Diagrama | Status |
| --- | --- | --- | --- |
| T1 | None | — | ✅ |
| T2 | None | — | ✅ |
| T3 | T2 | T2→T3 | ✅ |
| T4 | T2 | T3→T4 (mesma fase, T2 anterior) | ✅ |
| T5 | T2, T3, T4 | T4→T5 | ✅ |
| T6 | T2 | T5→T6 (mesma fase) | ✅ |
| T7 | T2 | Fase 1→2 | ✅ |
| T8 | T7 | T7→T8 | ✅ |
| T9 | T3, T7 | T8→T9 | ✅ |
| T10 | T7, T8, T9 | T9→T10 | ✅ |
| T11 | T7, T8 | T10→T11 | ✅ |
| T12 | T3, T11 | Fase 2→3 | ✅ |
| T13 | T3 | T12→T13 | ✅ |
| T14 | T3 | T13→T14 | ✅ |
| T15 | T5 | T14→T15 | ✅ |
| T16 | T5 | T15→T16 | ✅ |
| T17 | T13, T14, T15, T16 | T16→T17 | ✅ |
| T18 | T12, T17 | T17→T18 | ✅ |
| T19 | None | — | ✅ |
| T20 | None | — | ✅ |
| T21 | T11 | Fase 2→4 | ✅ |
| T22 | T5, T21 | T21→T22 | ✅ |
| T23 | T2, T21 | T22→T23 | ✅ |
| T24 | T5, T21 | T23→T24 | ✅ |
| T25 | T20, T22, T23, T24 | T24→T25 | ✅ |
| T26 | T6, T8 | Fase 4→5 | ✅ |
| T27 | T26, T30 | ⚠️ **T30 é posterior a T27 na fase 5** | ❌→✅ **corrigido**: ver nota |
| T28 | T26, T30 | idem | ❌→✅ **corrigido** |
| T29 | T30 | idem | ❌→✅ **corrigido** |
| T30 | T25 | T29→T30 | ✅ |
| T31 | T30 | Fase 5→6 | ✅ |
| T32 | T17 | Fase 3→6 | ✅ |
| T33 | T30, T32 | T32→T33 | ✅ |
| T34 | T31, T32, T33 | T33→T34 | ✅ |

> **Correção aplicada — a regra é "dependência aponta para trás, nunca para a frente".** A primeira
> versão pôs os três editores (T27, T28, T29) **antes** da moldura de rota (T30) de que eles dependem
> — dependência para a frente, que o cross-check existe para pegar. **A ordem da Fase 5 passa a ser
> `T26 → T30 → T27 → T28 → T29`**, com a moldura antes dos editores que a preenchem. Os números das
> tasks ficam como estão (o número é identidade, não posição), e o diagrama da Fase 5 acima deve ser
> lido nessa ordem.

**Fase 5 (ordem corrigida):**

```
T26 → T30 → T27 → T28 → T29
```

---

## Test Co-location Validation

| Task | Camada criada/alterada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T1 | teste de página | unit | unit | ✅ |
| T2–T6 | domínio puro (`core/home`) | unit (todos os ramos, 1:1 com ACs) | unit | ✅ |
| T7–T9 | migration SQL | none direto (guarda + probe) | none | ✅ |
| T10 | guarda de arquivo | unit **com âncora de contagem** | unit | ✅ |
| T11 | tipo + probe | none direto; **probe HTTP obrigatório** (`AD-012`) | none + probe | ✅ |
| T12 | hook de dados | unit (sucesso, erro→piso, vazio) | unit | ✅ |
| T13–T18 | widget/página da loja | unit RTL + 390px | unit | ✅ |
| T19 | token | none (gate de build) | none | ✅ |
| T20 | lista de navegação + guarda | unit | unit | ✅ |
| T21 | hook do backoffice | unit | unit | ✅ |
| T22–T25 | tela/feature do backoffice | unit RTL (feliz + recusa + falha de gravação + falha de leitura) | unit | ✅ |
| T26 | lib de upload | unit | unit | ✅ |
| T27–T29, T31, T33 | feature do backoffice | unit RTL | unit | ✅ |
| T30 | rota + moldura | unit RTL | unit | ✅ |
| T32 | widget da loja | unit RTL + 390px | unit | ✅ |
| T34 | documentação | none | none | ✅ |

**Nenhuma violação.** Nenhuma task difere seus testes para outra — o adiamento é justamente o
antipadrão que esta validação existe para impedir.

---

## Rastreabilidade

| Requisito | Tasks |
| --- | --- |
| `HOME-01` | T7, T11 |
| `HOME-02`, `HOME-03` | T5, T17, T18 |
| `HOME-04` | **T1**, T3, T9, T18 |
| `HOME-05` | T8 |
| `HOME-06` | T2, T10 |
| `HOME-07` | T3, T12 |
| `HOME-08` | T7, T22, T25 |
| `HOME-09` | T5, T22 |
| `HOME-10` | T21, T23 |
| `HOME-11`, `HOME-12` | T4, T21, T22 |
| `HOME-13` | T24, T25, T30 |
| `HOME-14` | T21, T25, T30 |
| `HOME-15` | T22, T25 |
| `HOME-16`..`HOME-21` | T6, T13, T27 |
| `HOME-22`..`HOME-30` | T6, T7, T15, T26, T28 |
| `HOME-31`..`HOME-36` | T5, T16, T31 |
| `HOME-37`..`HOME-40` | T32, T33 |
| `HOME-41`..`HOME-44` | T14, T16, T29 |
| `HOME-45`..`HOME-47` | **fora deste plano** (P3; tipos no catálogo, sem renderer nem editor) |

**44 dos 47 requisitos mapeados em tasks; 3 (P3) deferidos de forma explícita.**
