# A busca de produto do painel — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source
of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier,
discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/51-busca-de-produto-do-painel/design.md`
**Status**: Draft

---

## Convenções deste repositório que valem em toda task

- **Um commit por FEATURE, não por task** (`CLAUDE.md`, decisão de 2026-08-15). O `BL-012` fechou
  justamente contra o commit atômico da Skill. As tasks rodam o gate cada uma; os commits saem no
  fim, completos.
- **Gate por workspace, um por vez, com exit code fora de pipe e `--testTimeout=20000` SEM o `--`**:
  `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`. O `--` antes da flag a **engole**,
  o teto volta a 5 s e um arquivo alheio reprova por timeout.
- **Baseline de entrada medida com a árvore parada em 2026-09-14**: backoffice **2539/140, exit 0**.
  Lint do painel **25 erros / 4 warnings**; tipos **0**.
- `packages/core/src/payment/**` fecha a feature sem uma linha alterada, conferido por
  `git diff --name-only -- packages/core/src/payment`.

---

## Test Coverage Matrix

| Requisito | Onde é provado | Tipo | Sensor de mutação |
| --- | --- | --- | --- |
| `BUS-01` palavras em qualquer ordem | `entities/product/lib/__tests__/buscarProdutos.test.ts` | unidade pura | trocar `every` por `some` nas palavras ⇒ `cinzas xyz` passaria a achar |
| `BUS-02` dobra nos dois sentidos | idem + `shared/lib/__tests__/texto.test.ts` | unidade pura | apagar `normalize('NFD')` ⇒ `coracao` não acha `Coração` |
| `BUS-03` prefixo antes de miolo | idem | unidade pura | devolver posto constante ⇒ a ordem vira alfabética pura |
| `BUS-04` termo vazio / só pontuação | idem | unidade pura | tratar `''` como termo ⇒ resultado vazio |
| `BUS-05` vazio explicado | `entities/product/ui/__tests__/ProductSearchField.test.tsx` | componente | apagar o literal ⇒ o caso cai (`L-036`) |
| `BUS-06` teto de 20 + contador | ambos | unidade + componente | subir o teto ⇒ o aviso some; o contador cravado ⇒ número errado |
| `BUS-07` as cinco delegam | `shared/lib/__tests__/buscaDeProdutoComDonoUnico.test.ts` + os 5 testes de tela | varredura + componente | reinjetar a lista local em cada tela |
| `BUS-08` já escolhida desabilitada | componente | componente | tirar `disabled` ⇒ o clique emite |
| `BUS-09` modo único mostra e limpa | componente | componente | apagar `onLimpar` ⇒ não dá para desescolher |
| `BUS-10` fora do ar marcada **e** escolhível | componente | componente | marcar **e** desabilitar ⇒ o par de casos reprova |
| `BUS-11` projeção sem `description` | `entities/product/api/__tests__/useProductPool.test.ts` | dublê que **enxerga** o `select` | acrescentar `description` ⇒ asserção de string cai |
| `BUS-12` erro de rede em tela | api + componente | componente | engolir o erro ⇒ o campo diria "nenhuma peça" |
| `BUS-13` truncada falha | api | dublê com contagem divergente | devolver o parcial ⇒ o caso cai |
| `BUS-14` sem duplicata | componente | componente | idem `BUS-08` |
| `BUS-15` determinismo | unidade pura | unidade | tirar o desempate por `id` ⇒ duas peças homônimas invertem |
| `BUS-16` invalidação | api | dublê de `QueryClient` | apagar o `invalidateQueries` ⇒ o caso cai |
| `BUS-17` sem `<img>`, `<ul>`/`<li>` | componente | componente | pôr um `<img>` ⇒ o caso cai |
| `BUS-18` 44px | componente | componente por token exato (`L-034`) | `h-11` é substring de `min-h-11` — régua com `(?![-\w])` |
| `BUS-19` destino congela slug e rótulo | `home-composition/ui/DestinoDoItem.test.tsx` | componente | apagar `product_slug` ⇒ a prévia trataria a peça como fora do ar |
| `BUS-20` uma leitura para duas telas | api | dublê contando requisições | chave por componente ⇒ duas requisições |
| `BUS-21..24` o guarda | `buscaDeProdutoComDonoUnico.test.ts` | varredura de disco | injeção real em arquivo real, uma por régua |
| `BUS-25..27` P2 | `AdminHomePage.test.tsx`, `useAdminProducts.test.ts` | componente + dublê | devolver `useAdminProducts()` ⇒ a contagem de colunas pedidas acusa |

## Gate Check Commands

```bash
# por task (o workspace tocado)
pnpm --filter @estrelinha/backoffice test --testTimeout=20000

# no fecho da feature — um por vez, exit code fora de pipe
npx tsc --noEmit -p apps/backoffice/tsconfig.app.json
pnpm lint
pnpm build
git diff --name-only -- packages/core/src/payment    # tem de sair vazio
```

---

## Execution Plan

```
Fase 1 (fundação)        T01 → T02 → T03
Fase 2 (o componente)    T04 → T05
Fase 3 (as superfícies)  T06 → T07 → T08 → T09
Fase 4 (guarda e peso)   T10 → T11 → T12
```

**12 tasks.** Fases 1+2 ≈ 5 tasks · Fase 3 ≈ 4 · Fase 4 ≈ 3.

---

## Task Breakdown

### T01: A dobra de busca ganha dono ✅

> Concluida em 2026-09-14. `dobrarTexto`/`palavrasDoTermo` em `shared/lib/texto.ts` (16 casos); `MenuIconPicker` e `categoryTree` passaram a consumir. As 7 ocorrencias de `normalize` fora de escopo (3 `slugify`, `normalizeTag`, `quickGrid`, `buildDuplicates`, `AdminLayout`) nao foram tocadas. Sensores: apagar o `normalize` derruba 7 casos.

**What**: `dobrarTexto` e `palavrasDoTermo` em `shared/lib/texto.ts`, e as **duas** cópias idênticas
de fora do produto passam a chamá-las.
**Where**: `apps/backoffice/src/shared/lib/texto.ts` *(novo)* ·
`shared/lib/__tests__/texto.test.ts` *(novo)* · `features/store-menu/ui/MenuIconPicker.tsx` ·
`features/category-list/model/categoryTree.ts`
**Depends on**: —
**Requirement**: `BUS-02`

**Done when**:
- [x] `dobrarTexto` usa `̀-ͯ`, não combinantes literais
- [x] `palavrasDoTermo` desduplica e descarta vazios
- [x] `MenuIconPicker` e `categoryTree` importam de `shared/lib/texto` e não declaram mais a dobra
- [x] `ç`/`ñ` cobertos (`acai` acha `Açaí`)
- [x] As três cópias de `slugify` **não** são tocadas — é outra função (spec, *Out of Scope*)
- [x] Gate do backoffice verde

### T02: A régua da busca ✅

> Concluida em 2026-09-14. `buscarProdutos` puro, 36 casos. **Dois achados**: (a) a fixtura original tinha ordem alfabetica coincidente com a de posto, e o mutante "posto constante" sobrevivia a 3 dos 4 casos de ranking — os nomes foram trocados para a ordem INVERSA, e um caso proprio separa posto 1 de posto 2; (b) `colar colar` ordenava DIFERENTE de `colar`, porque o prefixo do posto 0 usava o termo cru — passou a usar as palavras desduplicadas. Sensores: `every`→`some`, posto constante, posto 1 = posto 2, `total` depois do corte, sem desempate por `id` — todos derrubam pelo menos um caso.

**What**: `buscarProdutos` puro, com casamento por palavra e ordenação em três postos.
**Where**: `entities/product/lib/buscarProdutos.ts` *(novo)* ·
`entities/product/lib/__tests__/buscarProdutos.test.ts` *(novo)*
**Depends on**: T01
**Reuses**: `shared/lib/texto`
**Requirement**: `BUS-01`, `BUS-02`, `BUS-03`, `BUS-04`, `BUS-06`, `BUS-15`

**Done when**:
- [x] `cinzas colar` **e** `colar cinzas` acham `Colar de Cinzas`
- [x] `coracao` acha `Anel Coração` **e** `coração` acha `Anel Coracao` — as duas metades (`L-029`)
- [x] Posto 0/1/2 provados com um caso cada, e a ordem entre eles asserida
- [x] Desempate por `id` provado com **duas peças de nome idêntico**
- [x] Termo vazio, `'   '` e `'---'` devolvem o pool inteiro ordenado
- [x] `total` conta antes do corte; `itens` respeita o teto
- [x] `excluir` remove do resultado **e** do `total`
- [x] Sem import de React nem de Supabase no arquivo (asserção de pureza)

### T03: O pool, lido uma vez e sem mentir ✅

> Concluida em 2026-09-14. `useProductPool` (21 casos) e `useProductsByIds` (11). O duble registra `select`, `order` e `range`. Sensores: `description` de volta na projecao, `order` sem `id`, leitura sem `readAllPages` (parcial), erro engolido, chave errada no invalidate, chave POR COMPONENTE, sem recorte de uuid, chave nao ordenada — todos derrubam caso.

**What**: `useProductPool` (+ `lerPoolDeProdutos` com client injetável, `invalidarPoolDeProdutos`) e
`useProductsByIds`.
**Where**: `entities/product/api/useProductPool.ts`, `useProductsByIds.ts` *(novos)* e testes
**Depends on**: T02
**Reuses**: `readAllPages` de `@estrelinha/core/paging`; o recorte de UUID de `useMenuProducts`
**Requirement**: `BUS-11`, `BUS-12`, `BUS-13`, `BUS-16`, `BUS-20`

**Done when**:
- [x] O dublê **enxerga** as colunas pedidas, e há asserção de que `description` **não** está lá
- [x] Ordem `name` **e** `id` — asserção sobre os dois `order`
- [x] Contagem divergente do total lido ⇒ **lança**, e o caso assere a mensagem
- [x] Erro de rede vira `erro` legível, não array vazio
- [x] Duas montagens com a mesma chave ⇒ **uma** requisição (dublê contando)
- [x] `invalidarPoolDeProdutos` provada com dublê de `QueryClient`
- [x] `useProductsByIds` recorta não-uuid **antes** da consulta, com o comentário do `22P02`
- [x] Chave derivada dos ids ordenados e desduplicados

### T04: O componente compartilhado ✅

> Concluida em 2026-09-14. `ProductSearchField`, 43 casos — o contrato de 26 do `ProductPicker` migrado caso a caso, mais modo unico, carga, erro e preco. Entrou na lista de `animacaoRespeitaMovimento.test.ts` (8 → 9 arquivos), com as ancoras de contagem subidas de 8/4 para 14/7. Dez sensores, todos derrubando caso.

**What**: `ProductSearchField` com os dois modos.
**Where**: `entities/product/ui/ProductSearchField.tsx` *(novo)* e teste
**Depends on**: T03
**Requirement**: `BUS-05`, `BUS-06`, `BUS-08`, `BUS-09`, `BUS-10`, `BUS-12`, `BUS-14`, `BUS-17`,
`BUS-18`

**Done when**:
- [x] O contrato do `ProductPicker.test.tsx` migrado, caso a caso
- [x] `BUS-10` com **os dois** casos: marcada **e** ainda escolhível
- [x] `BUS-17`: nenhum `<img>` no DOM renderizado; `<ul>` de `<li>`
- [x] `BUS-18` por token exato, com `(?![-\w])` (`L-034`)
- [x] `mostrarPreco` desligado por padrão, com o par de casos (ligado mostra, desligado não)
- [x] `selecionados` desabilita e **aparece**; `excluir` some
- [x] Estados de carga e de erro com literal asserido (`L-036`)
- [x] `ProductSearchField.tsx` **entra** na lista de `animacaoRespeitaMovimento.test.ts` e a âncora
      de contagem é atualizada (R2 do design)

### T05: O `ProductPicker` delega ✅

> Concluida em 2026-09-14. `ProductPicker` virou involucro fino e PERDEU o prop `products` (o campo le o pool). **Queda declarada**: `ProductPicker.test.tsx` 26 → 7; os 19 reaparecem em `ProductSearchField.test.tsx`, que tem 43. **Tres arquivos alheios editados, e o porque (R6/`L-030`)**: `FeaturedProductsEditor.tsx` (perdeu o `products=` do picker), `FeaturedProductsEditor.test.tsx` e `AdminHomePage.test.tsx` ganharam `QueryClientProvider` com o pool SEMEADO — sem ele o render lanca "No QueryClient set", no render e nao na assercao. O `vi.mock` TOTAL de `@/entities/product` em `AdminHomePage.test.tsx` virou PARCIAL (`importOriginal`), senao `ProductSearchField` chegaria `undefined`. Nenhuma assercao foi enfraquecida; um caso foi RETARGETADO ("o seletor recebe a lista da pagina" → "o seletor e alimentado pelo pool"), porque a ligacao que ele nomeava deixou de existir.

**What**: Barrel de `entities/product` com os quatro novos; `ProductPicker` vira invólucro fino.
**Where**: `entities/product/index.ts` · `home-composition/ui/ProductPicker.tsx` + teste
**Depends on**: T04
**Requirement**: `BUS-07`

**Done when**:
- [x] `ProductPicker` não tem mais `dobrar`, `VISIVEIS`, `useMemo` de filtro nem `<Input>` próprio
- [x] A montagem do `DraftItem` **fica** no `ProductPicker` (`product_slug`, `label_snapshot`)
- [x] O teste que sobra prova a montagem, não a busca
- [x] `FeaturedProductsEditor.test.tsx` segue verde sem edição — ou a edição é justificada por
      escrito (R6/`L-030`: listar os `vi.mock` totais antes de afirmar)

### T06: O destino de item da Home ✅

**What**: O ramo *Produto* do `DestinoDoItem` vira busca; coleção e endereço livre ficam.
**Where**: `home-composition/ui/DestinoDoItem.tsx` + teste · conferir `BannerGridEditor` e
`HeroCarouselEditor`
**Depends on**: T05
**Requirement**: `BUS-07`, `BUS-09`, `BUS-19`

**Done when**:
- [x] `product_slug` e `label_snapshot` continuam congelados na escolha
- [x] Coleções e "Outro endereço da loja…" continuam escolhíveis
- [x] Nenhum `<option>` de produto sobra no arquivo
- [x] Peça apagada do catálogo segue mostrando o `label_snapshot`, não vazio

### T07: Produtos relacionados e compre junto ✅

**Where**: `product-form/ui/RelatedProductsSelect.tsx` + teste · `pages/admin/AdminProductFormPage.tsx`
**Depends on**: T06
**Requirement**: `BUS-07`, `BUS-08`, `BUS-14`

**Done when**:
- [x] `excluir={[id]}` — o produto não se relaciona consigo
- [x] Os chips de escolhidos continuam removíveis
- [x] Ganha a dobra de acento que não tinha, com caso que reprova na régua antiga

### T08: O order bump ✅

**Where**: `settings/ui/CheckoutSettingsCard.tsx` + teste
**Depends on**: T07
**Requirement**: `BUS-07`, `BUS-09`

**Done when**:
- [x] `aria-label="Produto da oferta"` preservado (R7)
- [x] "Nenhum produto" continua alcançável — é o `onLimpar`
- [x] `mostrarPreco` ligado, com asserção do preço formatado
- [x] Nenhum `<SelectItem>` de produto sobra

### T09: O banner do menu, e o fim de `useMenuProducts` ✅

**Where**: `store-menu/ui/MenuBannerEditor.tsx` + teste · **apagar**
`store-menu/model/useMenuProducts.ts` e seu teste
**Depends on**: T08
**Requirement**: `BUS-02`, `BUS-07`

**Done when**:
- [x] `coracao` acha as peças acentuadas nesta tela — o caso que **hoje reprovaria**
- [x] A `description` do alvo continua alimentando o placeholder do subtítulo, por `useProductsByIds`
- [x] `useMenuProducts.ts` não existe no disco; `MINIMO_PARA_BUSCAR` não existe em `apps/**`
- [x] Queda de contagem de testes **declarada**: o que sai de `useMenuProducts.test.ts` reaparece em
      `useProductsByIds` e no componente (regra de leitura de baseline do `CLAUDE.md`)

### T10: O guarda ✅

> Concluida em 2026-09-14. `buscaDeProdutoComDonoUnico.test.ts`, **21 casos**, zero allowlist.
> **BUS-23 FOI ESCRITA** — nao declarada nao escrita —, com o alcance dela (o NOME da variavel)
> declarado em prosa no arquivo: uma regua puramente estrutural acusaria as doze listas de categoria
> do painel, que tem forma identica. **Achado que mudou o desenho de `BUS-21`**: o filtro de nome do
> dono NAO tem a forma que a spec presumia — `useAdminProducts` monta `name.ilike.%…%` como STRING
> para o `.or()`, e o `.ilike()` literal do arquivo e sobre `sku` em `product_variants`. Uma regua so
> de metodo teria nascido **verde sobre nada** (`L-033`), e por isso a regua casa as DUAS formas, com
> sensor para cada. As quatro formas proibidas foram reinjetadas em **arquivos reais**
> (`MenuBannerEditor`, `MenuIconPicker`, `CheckoutSettingsCard`) e cada uma derrubou **so** o caso
> que a nomeia, apontando arquivo e linha; a restauracao foi conferida byte a byte.

**Where**: `shared/lib/__tests__/buscaDeProdutoComDonoUnico.test.ts` *(novo)*
**Depends on**: T09
**Requirement**: `BUS-21`, `BUS-22`, `BUS-23`, `BUS-24`

**Done when**:
- [x] Três réguas, **zero allowlist**
- [x] Âncora dupla: arquivos lidos **e** cada régua encontrada ao menos uma vez no dono (`L-035`) —
      com uma ressalva escrita no arquivo: `BUS-23` **não tem** ocorrência legítima no dono (ele é
      `<ul>` de `<li>` por `BUS-17`), então ela é ancorada no **extrator de JSX**, que precisa
      enxergar as listas de categoria do painel. Fingir uma ocorrência no dono seria âncora falsa
- [x] Remoção de comentário de linha **e** de bloco na **mesma** varredura, com sensor de CRLF **e**
      de LF (`L-031`, `BL-027`), mais o sensor do glob de dois asteriscos
- [x] Sensor por régua, por **injeção real no arquivo real**, mais o **inverso** provando que o dono
      legítimo não é acusado (e que a busca de pedido, o `slugify` e as listas de categoria também
      não são)
- [x] `BUS-23` escrita, com o alcance declarado — não afrouxada e não omitida (R8)

### T11: O catálogo para de descer inteiro *(P2)* ✅

> Concluida em 2026-09-14. **+7 casos**: 2 em `AdminHomePage.test.tsx` (`BUS-25`) e 5 em
> `useAdminProducts.test.ts` (`BUS-27`, `BUS-16`). O dublê de `useAdminProducts` no teste da Home
> virou **espiao** e passou a devolver lista VAZIA de proposito — sem isso, "a pagina nao o chama" e
> "as pecas aparecem" seriam verdadeiros nos dois mundos. `invalidarPoolDeProdutos` **ganhou
> consumidor**: ela existia desde a T03 exportada e sem ninguem a chamar, que e como `deleteSection`
> atravessou uma feature inteira. O dublê do hook ganhou `single`/`maybeSingle`/`delete`, sem os
> quais o caminho de UMA linha era inencenavel. Tres mutantes reinjetados nos arquivos reais (a
> pagina voltando a chamar o hook, o catalogo voltando a descer na montagem, e a invalidacao
> incondicional) derrubaram exatamente os casos que os nomeiam.
>
> **`AdminQuickGridPage.tsx:127` ficou FORA por decisao do orquestrador** — e foi registrado em
> *Estado conhecido* do `CLAUDE.md` com o modo de falha escrito (acima de 1.000 produtos a checagem
> de slug duplicado deixa de ver parte do catalogo e o import cria duplicata em silencio).

**Where**: `pages/admin/AdminHomePage.tsx` · `pages/admin/AdminProductFormPage.tsx` ·
`features/settings/ui/CheckoutSettingsCard.tsx` · `entities/product/api/useAdminProducts.ts`
**Depends on**: T10
**Requirement**: `BUS-25`, `BUS-26`, `BUS-27`

**Done when**:
- [x] Nenhuma das três chama `useAdminProducts()` para obter `products` — e os dois dublês que ainda
      o devolviam foram corrigidos junto, senão passariam a encenar uma forma que o hook não tem
- [x] `useAdminResolvedHome` recebe o pool, e o tipo `Peca` continua satisfeito sem cast (`tsc` 0)
- [x] `useAdminProducts` para de carregar o catálogo; `getProduct` segue devolvendo pela consulta de
      uma linha, com caso provando isso — e as três escritas passaram a **invalidar o pool**
      (`BUS-16`), com o par que prova que escrita FALHA não invalida
- [x] O risco R1 vai para *Estado conhecido* do `CLAUDE.md` assim mesmo: ele **saiu** deste hook e
      **permanece** em `AdminQuickGridPage` e `AdminProductsPage`, que esta feature não alcança

### T12: Baselines, documentação e decisão ✅

**Where**: `CLAUDE.md` (raiz) · `apps/backoffice/CLAUDE.md` · `.specs/STATE.md` (`AD-036` + handoff) ·
`.specs/BACKLOG.md`
**Depends on**: T11
**Requirement**: —

**Done when**:
- [x] Baseline do backoffice **remedida** e escrita com o delta, não somada de cabeça
- [x] Os outros quatro workspaces remedidos e declarados idênticos (ou o delta explicado)
- [x] Lint e tipos conferidos contra 25/4 e 0
- [x] `AD-036` registrada: *"a busca de produto do painel tem um dono, e ele é `entities/product`"*
- [x] O guarda novo entra na tabela *Os guardas* do `CLAUDE.md`
- [x] A dívida de `slugify` (três cópias) entra em *Estado conhecido*
- [x] Dívida declarada: **esta feature não tem prova em navegador** — a lista está em *O que só o
      navegador prova*, no `design.md`
