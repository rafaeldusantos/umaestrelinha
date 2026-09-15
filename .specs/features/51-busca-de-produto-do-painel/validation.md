# A busca de produto do painel — Validation

**Data**: 2026-09-15
**Spec**: `.specs/features/51-busca-de-produto-do-painel/spec.md`
**Superfície do diff**: a **working tree** (a feature ainda não foi commitada — `BL-012`), medida
contra `HEAD = 3d0ba14`. Escopo verificado: `apps/backoffice/**`,
`.specs/features/51-busca-de-produto-do-painel/**` e as partes de `CLAUDE.md` /
`apps/backoffice/CLAUDE.md` / `.specs/STATE.md` sobre a feature 51.
**Fora de escopo, e não verificado**: `apps/store/src/widgets/footer/**`,
`apps/store/public/pagamentos/` e as partes de `apps/store/CLAUDE.md` sobre bandeiras de pagamento —
são de outra sessão.

**Verifier**: sub-agente independente. **Autor ≠ verificador**: nada desta feature foi escrito por
quem assina este relatório, e a cobertura foi re-derivada a partir das ACs, não do `tasks.md`.

**Veredito: PASS ✅** — 27/27 ACs com evidência `file:line` e valor asserido batendo com a spec;
17 mutações injetadas, **16 mortas e 1 sobrevivente** (morta pelo `tsc`, e coberta transitivamente —
detalhe abaixo); gate medido pelo verificador bate **exatamente** com o reportado pelo autor,
**inclusive a baseline de entrada**.

---

## 1. Spec-anchored acceptance criteria

Legenda dos caminhos: `BO = apps/backoffice/src`.

### P1 · H1 — Uma busca só, e melhor

| Critério | Resultado que a spec define | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| `BUS-01` palavra a palavra, em qualquer ordem | `cinzas colar` **e** `colar cinzas` acham `Colar de Cinzas`; toda palavra tem de casar | `BO/entities/product/lib/__tests__/buscarProdutos.test.ts:43` — `expect(nomes(buscarProdutos(CATALOGO, 'cinzas colar'))).toEqual(['Colar de Cinzas'])`; `:49` — idem com `'colar cinzas'`; `:55` — `expect(buscarProdutos(CATALOGO, 'cinzas xyz').total).toBe(0)` | ✅ PASS |
| `BUS-02` dobra nos **dois** sentidos | `coracao` acha `Anel Coração` **e** `coração` acha `Anel Coracao`; caixa idem | `buscarProdutos.test.ts:67` — `toEqual(['Anel Coração'])` com termo `'coracao'`; `:74` — `expect(nomes(buscarProdutos(semAcento, 'coração'))).toEqual(['Anel Coracao'])`; `:78-79` caixa nos dois sentidos; `shared/lib/__tests__/texto.test.ts:46` — `expect(dobrarTexto('coracao')).toBe(dobrarTexto('Coração'))` | ✅ PASS |
| `BUS-03` prefixo antes de miolo | para `colar`: `Colar de Cinzas` → `Anel Colar Duplo` → `Bricolar peça` | `buscarProdutos.test.ts:105` — `expect(nomes(buscarProdutos(CATALOGO,'colar'))).toEqual(['Colar de Cinzas','Anel Colar Duplo','Bricolar peça'])`; `:117` e `:123` provam que a ordem **não** é alfabética (fixturas de alfabeto invertido) | ✅ PASS |
| `BUS-04` vazio / só espaço / só pontuação | devolve o pool **inteiro**, em ordem alfabética, sem erro | `buscarProdutos.test.ts:133` — `it.each(['', '   ', '---'])` → `toEqual(['Anel Colar Duplo','Anel Coração','Bricolar peça','Broche Pena','Colar de Cinzas'])`; `:143` — `expect(buscarProdutos(CATALOGO,'').total).toBe(CATALOGO.length)`; `texto.test.ts:72-75` — `palavrasDoTermo` devolve `[]` nas quatro grafias | ✅ PASS |
| `BUS-05` vazio explicado, lista **some** | diz o que aconteceu, cita o termo, e a `<ul>` desaparece | `BO/entities/product/ui/__tests__/ProductSearchField.test.tsx:151` — `expect(vazio).toHaveTextContent('Nenhuma peça com “bicicleta”')` + `:152` `/ignora acento e maiúscula/`; `:158` — `expect(screen.queryByTestId('pecas-encontradas')).toBeNull()` | ✅ PASS |
| `BUS-06` teto de 20 + contador + alcance | 20 linhas, aviso com o total, e mais termo alcança quem ficou fora | `buscarProdutos.test.ts:158` — `expect(r.itens).toHaveLength(RESULTADOS_VISIVEIS)` com `:163` `toBe(20)` e `:159` `total` = 30; `ProductSearchField.test.tsx:295` — `toHaveTextContent('Mostrando 20 de 30')`; `:302` o aviso **não** aparece cabendo; `:307` `buscar('Peça 27')` → `['Peça 27']` | ✅ PASS |
| `BUS-15` determinismo, empates inclusos | mesma ordem nas duas chamadas; homônimas desempatam estável | `buscarProdutos.test.ts:203` — `expect(a).toEqual(b)`; `:212-213` — `toEqual(['aaa','zzz'])` para o pool **nas duas ordens de chegada** | ✅ PASS |

### P1 · H2 — O componente compartilhado, nas cinco telas

| Critério | Resultado que a spec define | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| `BUS-07` as **cinco** renderizam `ProductSearchField`, nenhuma mantém lista/filtro/consulta própria | as cinco delegam | (1) `BO/features/home-composition/ui/ProductPicker.test.tsx:114` — `expect(screen.getByTestId('seletor-de-pecas')).toBeInTheDocument()`; (2) `BO/features/home-composition/ui/DestinoDoItem.test.tsx:131` — `expect(screen.getByLabelText('Leva para · qual peça')).toBeInTheDocument()`; (3) `BO/features/product-form/ui/RelatedProductsSelect.test.tsx:47` — `screen.getByLabelText('Produtos relacionados')` alimenta os 5 casos; (4) `BO/features/settings/ui/CheckoutSettingsCard.test.tsx:105` — `expect(screen.getByLabelText('Produto da oferta')).toBeInTheDocument()`; (5) `BO/features/store-menu/ui/MenuBannerEditor.test.tsx:314` — `screen.getByLabelText('Peça de destino do banner 1')`. **Metade estrutural**: `ProductPicker.test.tsx:139-144` lê o fonte do disco e recusa `normalize('NFD')`, `<Input`, `useMemo` e `useState`; e o guarda `BO/shared/lib/__tests__/buscaDeProdutoComDonoUnico.test.ts:379/427/524` recusa consulta por nome, dobra e `<option>` fora do dono | ✅ PASS |
| `BUS-08` já escolhida **desabilitada**, dizendo por quê | `disabled` + rótulo, e clicar não emite | `ProductSearchField.test.tsx:184` — `expect(screen.getByTestId('peca-p2')).toBeDisabled()` + `:185` `toHaveTextContent('já está no bloco')`; `:200` — `expect(onEscolher).not.toHaveBeenCalled()`; par em `:206` (as outras **não** são desabilitadas) | ✅ PASS |
| `BUS-09` modo único nomeia, limpa e substitui | nome na tela, controle de limpar, troca substitui | `ProductSearchField.test.tsx:230` — `toHaveTextContent('Colar de Cinzas')`; `:236` — `expect(onLimpar).toHaveBeenCalledTimes(1)`; `:243-244` — escolher outra chama `onEscolher` **uma** vez com `{id:'p2'}`; par negativo em `:249` | ✅ PASS |
| `BUS-10` fora do ar **marcada e escolhível** | a marca informa, não bloqueia | `ProductSearchField.test.tsx:269` — `toHaveTextContent('fora do ar')`; `:275-277` — `not.toBeDisabled()` **e** o clique emite `{id:'p5'}`; `:282` — peça no ar **não** ganha a marca | ✅ PASS |
| `BUS-17` sem `<img>`, `<ul>`/`<li>`, nunca grade | zero imagem; lista de verdade | `ProductSearchField.test.tsx:421` — `expect(container.querySelectorAll('img')).toHaveLength(0)`; `:427` — `expect(lista.tagName).toBe('UL')`; `:428` — `not.toMatch(/grid-cols/)`; `:434` — cada botão é filho de `LI` | ✅ PASS |
| `BUS-18` 44px na linha clicável | ≥ 44px | `ProductSearchField.test.tsx:444` — `toMatch(/(?:^|\s)min-h-11(?![-\w])/)` em três linhas (token exato, `L-034`); `:450-451` o limpar (`h-11`/`w-11`); `:462` o "tentar de novo" | ✅ PASS |
| `BUS-14` sem duplicata em modo múltiplo | a lista de quem chama fica com uma ocorrência | `ProductSearchField.test.tsx:199-200` — clique na desabilitada **não** emite; `RelatedProductsSelect.test.tsx:86-97` — o id já escolhido aparece desabilitado e o `onChange` não é chamado | ✅ PASS |
| `BUS-19` `DestinoDoItem` congela `product_slug` + `label_snapshot`, e os outros destinos ficam | congelamento + coleção + endereço livre | `DestinoDoItem.test.tsx:143-158` — `onChange` recebe `{category_id:null, product_id:'p1', product_slug:'colar-de-cinzas', href:null, label_snapshot:'Colar de Cinzas'}`; `:79-83` — o `<select>` ainda tem `Coleção · …`, `Produto…` e `Outro endereço da loja…`; `:86-96` — **nenhuma** `<option>` de peça sobrou; `:176-181` — peça apagada segue mostrando o `label_snapshot` | ✅ PASS |

### P1 · H3 — Uma leitura, e ela não mente

| Critério | Resultado que a spec define | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| `BUS-11` projeção sem `description` | exatamente `id, name, slug, is_active, base_price` | `BO/entities/product/api/__tests__/useProductPool.test.ts:135` — `expect(PRODUCT_POOL_COLUMNS).toBe('id, name, slug, is_active, base_price')`; `:134` — o dublê **registrou** essa string no `select`; `:140` — `not.toContain('description')`; `:144-145` — nem `*` nem `categories` | ✅ PASS |
| `BUS-13` truncada **falha** | lança, e não devolve o parcial | `useProductPool.test.ts:197` — `rejects.toThrow(/1 de 3/)`; `:202` — `rejects.toThrow(/nenhuma peça com/)`; `:211` — `expect(resultado.ok).toBe(false)` (prova que **rejeita** em vez de resolver com uma linha) | ✅ PASS |
| `BUS-12` falha de rede vira texto + tentar de novo; o campo não diz "vazio" | erro em tela, retry, e nenhuma sugestão de catálogo vazio | `useProductPool.test.ts:272-273` — `erro` contém `'permission denied'` **e** `produtos` é `[]` (estados distinguíveis), com o par em `:282-283` (caminho feliz sem erro); `ProductSearchField.test.tsx:343` — `'Não foi possível carregar o catálogo.'`; `:360-361` — `busca-sem-resultado` e `pecas-encontradas` **ausentes**; `:377-379` — o clique em "Tentar de novo" relê e o erro some | ✅ PASS |
| `BUS-16` gravação invalida o pool | criar, alterar e apagar invalidam | `BO/entities/product/api/useAdminProducts.test.ts:493` — `expect(chaves).toEqual([PRODUCT_POOL_KEY, PRODUCT_POOL_KEY, PRODUCT_POOL_KEY])` (as três escritas); `:505` — escrita que **falha** não invalida; `useProductPool.test.ts:304` — `toHaveBeenCalledWith({ queryKey: PRODUCT_POOL_KEY })`; `:321-322` — a leitura seguinte enxerga a peça nova (o dublê muda o catálogo **entre** as duas leituras) | ✅ PASS ⚠️ *(ver spec-precision, abaixo)* |
| `BUS-20` uma leitura para duas telas | uma requisição, cache por chave | `useProductPool.test.ts:245` — `expect(client.getQueryCache().getAll()).toHaveLength(1)`; `:246-247` — `contagens` e `paginas` valem 1 depois de **duas** montagens; `:257` — a chave é a exportada | ✅ PASS |

### P1 · H4 — O guarda

| Critério | Resultado que a spec define | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| `BUS-21` consulta por nome só no dono | reprova fora de `entities/product/api/**` | `buscaDeProdutoComDonoUnico.test.ts:379-385` — `expect(fora.map(o => \`${o.arquivo}:${o.linha} — ${o.texto}\`)).toEqual([])`. A régua casa **as duas** formas (`:125-126`), com sensores em `:387` (método, 3 operadores), `:395` (string do `.or()`, 3 formas) e inversos em `:403` (`customer_name`, `sku`, acesso a propriedade) | ✅ PASS |
| `BUS-22` dobra só em `shared/lib/texto.ts`, procurando **declaração** | reprova declaração, nunca menção | `:427-433` — `toEqual([])` para tudo fora de `DONO_DA_DOBRA`. A régua **caminha a cadeia** (`:171-199`) e só acusa quem **termina** no acento; sensores em `:436` (três grafias), `:447` (quebrada em linhas), `:459` (slug/tag **não** acusados), `:485` (slug que perde o hífen **volta** a ser acusado) e `:495` (prosa, LF **e** CRLF, **não** acusada) | ✅ PASS |
| `BUS-23` catálogo em `<option>`/`<SelectItem>` só no dono | reprova fora de `entities/product/**` | `:524-530` — `toEqual([])`; sensores em `:532` (as duas formas apagadas + a forma com `.filter()` no meio), `:553` (listas de categoria/coleção/constantes **não** acusadas), `:565` (catálogo em `<li>` **não** acusado) e `:575` (menção em prosa **não** acusada) | ✅ PASS |
| `BUS-24` âncora dupla + comentário linha/bloco na **mesma** varredura, CRLF **e** LF | a régua prova que leu e que acha | `:299-300` — `varridos > 350` **e** `producao > 200`; `:313` — a régua 1 acha ≥ 1 no dono; `:316` — a régua 2 acha exatamente 1 no dono; `:324` — a régua 3 é ancorada no extrator de JSX (≥ 10 arquivos com `<option>`/`<SelectItem>`), **com a razão escrita** (o dono é `<ul>` por `BUS-17`, então âncora no dono seria falsa); `:327-350` — remoção de comentário provada com CRLF, LF e bloco, **e** a numeração de linha intacta; `:353` — o glob de dois asteriscos (`BL-027`) não cega o código abaixo. O removedor é **uma** passada por alternação (`:66-67`) | ✅ PASS |

### P2 · H5 — O catálogo para de descer inteiro

| Critério | Resultado que a spec define | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| `BUS-25` `/admin/home` não chama `useAdminProducts`, e `useAdminResolvedHome` recebe o pool | zero chamada; as peças vêm do pool | `BO/pages/admin/AdminHomePage.test.tsx:246` e `:250` — `expect(useAdminProductsEspiao).not.toHaveBeenCalled()` **nas duas rotas**; `:270` — `expect(screen.getByTestId('contador-encontrados')).toHaveTextContent('3 no catálogo')` com o espião devolvendo `[]` de propósito (o par que impede a asserção de ser verdadeira por acidente) | ✅ PASS |
| `BUS-26` o formulário não usa o `products` de `useAdminProducts` | os dois seletores não leem a lista do hook | `BO/pages/admin/AdminProductFormPage.test.tsx:28-32` — o dublê de `useAdminProducts` **não devolve `products`**; `BO/features/product-form/ui/RelatedProductsSelect.tsx:18-24` — a prop `products` **deixou de existir** no tipo; `BO/pages/admin/AdminProductFormPage.tsx:78` lê só `{ createProduct, updateProduct }` | ⚠️ **PASS com ressalva** — coberto por **tipo** e transitivamente por `BUS-27`, **não** por asserção de teste (mutação 16, abaixo) |
| `BUS-27` o hook parou de carregar o catálogo; `getProduct` segue pela consulta de uma linha | montar não consulta `products`; `getProduct` por `id` + `.single()` | `useAdminProducts.test.ts:439` — `expect(calls).toEqual([])`; `:441` — `expect(productsCall()).toHaveLength(0)`; `:448-453` — a superfície do hook é exatamente `['createProduct','deleteProduct','getProduct','updateProduct']`; `:474-476` — `getProduct` usa `select('*, categories(name)')` filtrado por `['id','p1']` e **sem `range`** | ✅ PASS |

**Status: 27/27 com evidência.** Uma ressalva de cobertura (`BUS-26`) e duas de precisão de spec
(abaixo). Nenhuma AC sem `file:line`.

---

## 2. Spec-precision gaps (não bloqueiam, mas ficam registrados)

1. **`BUS-16` diz "criado, alterado ou apagado **pelo painel**"; o que está provado é
   `createProduct`/`updateProduct`/`deleteProduct`.** As escritas em **lote** de
   `useAdminProductList` — `createProductsBatch` (`useAdminProducts.ts:333`),
   `updateProductsBatch` (`:361`) e `deleteProductsBatch` (`:379`), que são o caminho da importação
   de CSV, da edição em massa e da grade rápida — **não** invalidam o pool. Elas chamam `refetch()`
   da listagem, que é outro cache. A consequência real é pequena e limitada: depois de um lote, o
   seletor de peças pode ficar até **5 minutos** (`PRODUCT_POOL_STALE_TIME`) sem enxergar as peças
   novas. **Não é regressão** — o estado anterior (`useAdminProducts` sem cache e sem invalidação)
   também não enxergava —, e a `A-08` da spec restringe a promessa às três funções por escrito. Mas
   a **AC** é mais larga que a **assunção**, e quem ler só a AC vai concluir coisa diferente do que
   o código faz.
2. **O Success Criterion "«coracao» e «coração» devolvem o mesmo conjunto nas **cinco** telas"
   está provado em três delas, num sentido cada.** `DestinoDoItem.test.tsx:134`,
   `RelatedProductsSelect.test.tsx:52` e `MenuBannerEditor.test.tsx:317` têm o caso `coracao`;
   `CheckoutSettingsCard.test.tsx` não tem peça acentuada na fixtura e `ProductPicker.test.tsx`
   delega sem caso de busca. **Os dois sentidos** só são provados no dono
   (`ProductSearchField.test.tsx:110` e `:116`) e na unidade (`buscarProdutos.test.ts:67` e `:74`).
   Com o componente sendo dono único isso é defensável — e a mutação 8 confirma que a régua é
   compartilhada de verdade —, mas a frase da spec promete mais do que as telas asseveram.

---

## 3. Discrimination sensor

Sensor **expandido** (cinco telas + um guarda). Toda mutação viveu em estado descartável (cópia em
`scratchpad`, restaurada em seguida) e a árvore real foi conferida no fim: `git diff --stat` voltou a
**35 arquivos, 1394 inserções, 989 remoções** — idêntico ao instantâneo de abertura.

| # | Mutação | Onde | Morta? |
| --- | --- | --- | --- |
| 1 | **Apagar `<ProductSearchField>` do `ProductPicker`** (import trocado por um stub que renderiza `null`) | `features/home-composition/ui/ProductPicker.tsx:14` | ✅ **15 falhas** em 3 arquivos (`ProductPicker`, `FeaturedProductsEditor`, `AdminHomePage`) |
| 2 | Idem, `DestinoDoItem` | `features/home-composition/ui/DestinoDoItem.tsx:23` | ✅ **8 falhas** em 3 arquivos (`DestinoDoItem`, `BannerGridEditor`, `HeroCarouselEditor`) |
| 3 | Idem, `RelatedProductsSelect` | `features/product-form/ui/RelatedProductsSelect.tsx:16` | ✅ **5 falhas** |
| 4 | Idem, `CheckoutSettingsCard` | `features/settings/ui/CheckoutSettingsCard.tsx:16` | ✅ **6 falhas** |
| 5 | Idem, `MenuBannerEditor` | `features/store-menu/ui/MenuBannerEditor.tsx:48` | ✅ **5 falhas** |
| 6 | **`description` de volta na projeção do pool** | `entities/product/api/useProductPool.ts:26` | ✅ 2 falhas, as duas de `BUS-11` |
| 7 | **Leitura truncada devolve o parcial** (`readAllPages` trocado por uma página única com `range(0,999)`) | `useProductPool.ts:103-120` | ✅ 5 falhas — as **três** de `BUS-13` e duas vizinhas |
| 8 | **`normalize('NFD')` fora de `dobrarTexto`** | `shared/lib/texto.ts:36` | ✅ **11 falhas em 6 arquivos** — `texto`, `buscarProdutos`, `ProductSearchField`, `DestinoDoItem`, `RelatedProductsSelect`, `MenuBannerEditor` |
| 9 | **`product_slug` apagado dos DOIS congeladores** | `DestinoDoItem.tsx:138` **e** `ProductPicker.tsx:36` | ✅ 6 falhas em 5 arquivos, incluindo `BUS-19` e `DST-24` |
| 10 | **Guarda contra si mesmo**: `BUS-21` reduzida à forma de método (`.ilike('name'`), sem a forma `` `name.ilike.%…%` `` do `.or()` | `buscaDeProdutoComDonoUnico.test.ts:125` | ✅ **a ÂNCORA reprova** (`ÂNCORA: as três réguas ACHAM o que procuram (L-035)`) + 2 sensores. Uma régua que varresse zero **não** aprovaria em silêncio |
| 11a | **Injeção real**: `q.ilike('name', …)` acrescentado a um arquivo de produção | `features/store-menu/ui/MenuBannerEditor.tsx:497` | ✅ `BUS-21` reprova nomeando `arquivo:linha` |
| 11b | **Injeção real**: a dobra declarada de novo | `features/store-menu/ui/MenuIconPicker.tsx:183` | ✅ `BUS-22` reprova nomeando `arquivo:linha` |
| 11c | **Injeção real**: `products.map(… <SelectItem>)` | `features/settings/ui/CheckoutSettingsCard.tsx:166` | ✅ `BUS-23` reprova nomeando `arquivo:linha` |
| 12 | **`invalidarPoolDeProdutos` apagado de `updateProduct`** | `entities/product/api/useAdminProducts.ts:74` | ✅ 1 falha, a de `BUS-16` |
| 13 | **Chave do pool por componente** (`[...PRODUCT_POOL_KEY, Math.random()]`) | `useProductPool.ts:144` | ✅ 6 falhas, incluindo a de `BUS-20` |
| 14 | **Posto constante** (`postoDe` sempre devolve `PREFIXO_DO_NOME`) | `entities/product/lib/buscarProdutos.ts:63-68` | ✅ **6 falhas**, todas de `BUS-03` — a fixtura de alfabeto invertido segura a régua |
| 15 | **`disabled={jaEscolhida}` removido** | `entities/product/ui/ProductSearchField.tsx:225` | ✅ 4 falhas em 3 arquivos (`BUS-08`, `BUS-14`) |
| 16 | **A página do produto volta a ler `useAdminProducts().products`** e a passar aos dois seletores | `pages/admin/AdminProductFormPage.tsx:78` e `:642` | ❌ **SOBREVIVEU à suíte** — `AdminProductFormPage.test.tsx` fecha **14/14 verdes**. Morta pelo `tsc` (TS2339 + TS2322) |
| 17 | **`/admin/home` volta a chamar `useAdminProducts()`** | `pages/admin/AdminHomePage.tsx:65` | ✅ 2 falhas, as duas de `BUS-25` |

**Profundidade**: expandida (17 mutações). **Resultado: 16/17 mortas pela suíte.**

### O sobrevivente, e por que ele não é bloqueante

A mutação 16 é a única que a suíte deixa passar. Três coisas a contêm, e é por isso que ela fica
registrada em vez de virar fix task:

1. **O `tsc` a mata** — `Property 'products' does not exist` nas duas linhas —, e o typecheck é
   comando de gate desta feature (`tasks.md`, *Gate Check Commands*) com baseline **0**.
2. **Ela é inalcançável sem desfazer `BUS-27` junto**: `useAdminProducts` não devolve mais `products`
   (asserção dura em `useAdminProducts.test.ts:448`), e o catálogo não desce mais dali
   (`:439`). Reintroduzir a leitura reprova dois casos.
3. `BUS-26` é **P2** e consequência de H1–H3, como a própria spec declara.

O que falta, para registro: **`AdminProductFormPage.test.tsx` não abre a aba *Relacionados***, então
o argumento do cabeçalho do dublê ("se a página voltar a ler o `products` daqui, ela recebe
`undefined` e os casos dos dois seletores caem no render") **não se realiza** — não há caso que
renderize os dois seletores nessa suíte. O comentário descreve uma proteção que o arquivo não exerce.

---

## 4. Gate

Medido pelo **verificador**, um workspace por vez, exit code capturado **fora de pipe**, com
`--testTimeout=20000` e **sem** o `--` que engole a flag.

| Medida | Reportado pelo autor | **Medido aqui** | Bate? |
| --- | --- | --- | --- |
| backoffice (saída) | 2704 / 148 | **2704 passed / 148 files, EXIT=0** | ✅ |
| backoffice (**entrada**, `HEAD = 3d0ba14`) | 2539 / 140 | **2539 passed / 140 files, EXIT=0** | ✅ |
| store | 3376 / 218 | **3376 passed / 218 files, EXIT=0** | ✅ |
| core | 2356 / 92 | não remedido (fora do diff; `git status` não acusa `packages/core`) | — |
| functions | 599 / 13 | não remedido (fora do diff; `supabase/**` intocado) | — |
| catalog-import | 512 / 23 | não remedido (fora do diff) | — |
| Lint | 26 erros / 6 warnings | **26 / 6** — backoffice **24/4**, store **2/2** | ✅ |
| Tipos | 0 | **0** no backoffice **e** 0 na loja | ✅ |
| `packages/core/src/payment/**` | zero linhas | `git diff --name-only -- packages/core/src/payment` → **vazio** | ✅ |

**A suíte do painel foi remedida DEPOIS do sensor**, para provar que as 17 mutações foram desfeitas
sem resíduo: **2704 / 148, EXIT=0**, com `git diff --stat` de volta a 35/1394/989 e
`git status --porcelain` com as mesmas 47 entradas da abertura.

**A baseline de ENTRADA foi verificada de forma independente**, e não aceita de palavra: um
`git worktree --detach` em `HEAD` (`3d0ba14`), com `node_modules` ligado por junction, rodou a suíte
do painel e devolveu **2539 em 140 arquivos**. Delta da feature: **+165 testes / +8 arquivos**, e os
8 arquivos novos são exatamente `texto`, `buscarProdutos`, `useProductPool`, `useProductsByIds`,
`ProductSearchField`, `DestinoDoItem`, `RelatedProductsSelect` e `buscaDeProdutoComDonoUnico` —
`140 + 8 = 148`, sem arquivo perdido. **Este é o primeiro fecho em seis features em que a baseline de
entrada escrita bateu com o disco.**

**Sem queda de contagem para justificar**: `useMenuProducts.ts` foi apagado, mas
`git ls-tree HEAD` confirma que **ele nunca teve arquivo de teste**, então nada desapareceu. O
`useProductsByIds.test.ts` (14 casos) é ganho, não realocação.

**Lint caiu de 27/6 para 26/6** (backoffice 25/4 → 24/4). Baseline que **melhora** também precisa ser
anotada, e está: `CLAUDE.md:425` já registra `26 erros / 6 warnings`.

**A tabela de baselines do `CLAUDE.md` foi conferida aritmeticamente**: `CLAUDE.md:427` diz
`9547 em 494` — `3376 + 2704 + 2356 + 599 + 512 = 9547` e `218 + 148 + 92 + 13 + 23 = 494`. ✅

---

## 5. Edge cases da spec

| Edge case | Evidência | OK? |
| --- | --- | --- |
| Pool vazio cai no vazio explicado, sem dizer que falhou | `ProductSearchField.test.tsx:163-166` — `busca-sem-resultado` presente **e** `busca-com-erro` ausente | ✅ |
| Pool carregando: campo utilizável, lista diz "carregando" | `ProductSearchField.test.tsx:326-328` — `'Carregando o catálogo'`, `busca-sem-resultado` ausente, `<input>` não desabilitado | ✅ |
| Peça apagada: modo único mostra o nome congelado | `ProductSearchField.test.tsx:257`; `DestinoDoItem.test.tsx:179-181`; `MenuBannerEditor.test.tsx:353` | ✅ |
| `colar colar` vale `colar` | `buscarProdutos.test.ts:59-61` — `toEqual(nomes(buscarProdutos(CATALOGO,'colar')))`. A implementação tem comentário medido explicando por que o "termo inteiro" é a junção das **palavras** (`buscarProdutos.ts:96-106`) — sem isso o edge case seria falso **pela ordem** | ✅ |
| Nomes idênticos: as duas aparecem, ordem estável | `buscarProdutos.test.ts:212-213` (as duas ordens de chegada) | ✅ |
| `ç` e `ñ`: `acai` acha `Açaí` | `buscarProdutos.test.ts:83`; `texto.test.ts:35-36` | ✅ |

**A fixtura `'Mañana' → 'Niño'` em `texto.test.ts:36` é legítima e desta feature.** `dobrarTexto('Mañana')`
é `'manana'`, e a string `manana` **contém** `nana`, que é uma das três alternativas de
`MARCA = /nanapin|nanita|nana/i` em `apps/store/src/shared/lib/__tests__/brandScan.test.ts:38` — cujo
escopo inclui `apps/`. A troca mantém exatamente a propriedade medida (o til é alcançado) e a
razão está escrita no próprio caso (`:31-34`). Verificado: a suíte da loja fecha **3376/218, exit 0**.

---

## 6. Code quality

| Princípio | Status | Nota |
| --- | --- | --- |
| Mínimo de código | ✅ | O `ProductPicker` virou 51 linhas de invólucro; `RelatedProductsSelect`, 71. `useMenuProducts.ts` foi **apagado**, não deixado exportado sem consumidor |
| Mudanças cirúrgicas | ✅ | 35 arquivos, dos quais 12 são teste e 6 documentação. Nenhum arquivo fora de `apps/backoffice/**` foi tocado pela feature |
| Sem escopo extra | ✅ | As três cópias de `slugify` ficaram **de fora por escrito** (`A-10`), e a régua do guarda é estrutural o bastante para não acusá-las — provado por sensor nos dois sentidos (`:459` e `:485`). A dívida está em `CLAUDE.md:1353` |
| Sem flexibilidade inventada | ✅ | `mostrarPreco` é **booleano**, não slot de renderização — e o arquivo escreve por que (`ProductSearchField.tsx:11-15`): um slot reabriria a porta da miniatura, que é o segundo desenho da Home voltando pela terceira vez |
| Casa com os padrões do repositório | ✅ | Dublê que **enxerga** o pedido (lição da `49`), âncora dupla no guarda (`L-035`), token exato com `(?![-\w])` (`L-034`), removedor de comentário numa passada com `[^\n\r]` (`L-031`/`BL-027`), `motion-reduce:` no movimento novo (o arquivo entrou em `animacaoRespeitaMovimento.test.ts:48` **na mesma task em que nasceu**, com as âncoras subindo de 8/4 para 14/7) |
| Asserção casa o valor da spec | ✅ | Conferido AC a AC na seção 1 |
| Cobertura por camada | ✅ | H1 é 1:1 com a função pura; H2 tem o dono **e** as cinco superfícies; H3 tem dublê que conta requisição e projeção; H4 tem 21 casos com 13 sensores |
| Todo teste mapeia a uma AC / edge case / done-when | ✅ | Nenhum teste órfão encontrado nos 8 arquivos novos |
| `AD-036` registrada | ✅ | `.specs/STATE.md:832`; guarda na tabela do `CLAUDE.md:387`; seção própria em `apps/backoffice/CLAUDE.md:292` |

---

## 7. Achados de bookkeeping (não bloqueiam o PASS)

1. **`tasks.md` está desatualizado: T06, T07, T08 e T09 não têm `✅` e nenhum dos seus 14
   "Done when" está marcado** — embora **todos os 14 estejam cumpridos e verificados aqui** (T06:
   `DestinoDoItem.test.tsx:143`, `:79`, `:86`, `:176`; T07: `RelatedProductsSelect.test.tsx:78`,
   `:99`, `:52`; T08: `CheckoutSettingsCard.test.tsx:105`, `:174`, `:142`, `:146`; T09:
   `MenuBannerEditor.test.tsx:317`, `:224`, o `D` de `useMenuProducts.ts` no `git status` e o grep
   de `MINIMO_PARA_BUSCAR`, que só sobrevive em comentário). Os 7 "Done when" da T12 também estão
   desmarcados, com o cabeçalho já em `✅`.
2. **A tabela *Requirement Traceability* de `spec.md:257-265` segue em `Design | Pending`** nas cinco
   linhas. Com este relatório, todas passam a `✅ Verified` — menos `BUS-26`, que fica
   `✅ Verified (coberto por tipo, não por teste)`.
3. **`MINIMO_PARA_BUSCAR` e `useMenuProducts` ainda aparecem no repositório, mas só em prosa** —
   5 menções, todas em comentário de teste ou de implementação explicando o que saiu. Nenhuma é
   código. Conferido por grep em `apps/` e `packages/`.

---

## 8. Requirement traceability

| Requisito | Status anterior | Novo status |
| --- | --- | --- |
| `BUS-01`..`BUS-06`, `BUS-15` | Design / Pending | ✅ Verified |
| `BUS-07`..`BUS-10`, `BUS-14`, `BUS-17`..`BUS-19` | Design / Pending | ✅ Verified |
| `BUS-11`, `BUS-12`, `BUS-13`, `BUS-20` | Design / Pending | ✅ Verified |
| `BUS-16` | Design / Pending | ✅ Verified — com *spec-precision gap* registrado (lote não invalida) |
| `BUS-21`..`BUS-24` | Design / Pending | ✅ Verified |
| `BUS-25`, `BUS-27` | Design / Pending | ✅ Verified |
| `BUS-26` | Design / Pending | ✅ Verified — coberto por **tipo** e transitivamente por `BUS-27`; mutante sobrevive à suíte |

---

## 9. O que NÃO foi verificado

- **Prova em navegador.** Não foi feita, e a feature declara isso como dívida. jsdom devolve 0 para
  toda medida de layout, então nenhuma asserção desta suíte encosta em largura, rolagem ou
  sobreposição. O que falta medir em 390×844 e 1440 está escrito em *O que só o navegador prova*, no
  `design.md`: o campo dentro da coluna de 440px do editor de seção, a lista de 20 linhas com nome
  de peça longo (`truncate` dentro do `min-w-0`), a gaveta do menu, e o alvo de 44px sob o dedo.
- **Integração contra o banco.** Não há migration nesta feature (`Goals`, confirmado: `git status`
  não acusa `supabase/**`), então não houve probe SQL. As duas leituras novas (`useProductPool`,
  `useProductsByIds`) foram provadas contra dublê que registra o pedido — o que audita a **projeção**
  e a **paginação**, não o PostgREST real.
- **Os três workspaces não tocados** (`core`, `functions`, `catalog-import`) — o autor os remediu e
  os declarou idênticos; este verificador conferiu apenas que o diff não os alcança.

---

## Summary

**Overall: ✅ Ready.**

**Spec-anchored**: 27/27 ACs com `file:line` e valor batendo · 2 spec-precision gaps registrados.
**Sensor**: 17 mutações, **16 mortas**, 1 sobrevivente (morta pelo `tsc`; `BUS-26`, P2).
**Gate**: backoffice **2704/148** (entrada **2539/140**, verificada em worktree), store **3376/218**,
lint **26/6**, tipos **0 · 0**, `payment/**` intocado. Todos os números do autor batem.

**O que funciona**: uma porta só para "qual peça?", com dobra de acento nos dois sentidos, casamento
por palavra em qualquer ordem e ranking por prefixo; as cinco superfícies delegando, **com o fio
provado por mutação em cada uma**; o pool enxuto, cacheado por chave, que **falha** em vez de
publicar catálogo truncado; e um guarda de três réguas com zero allowlist cuja âncora reprova quando
a régua para de achar o que procura.

**O que fica aberto**: a invalidação do pool não alcança as escritas em **lote** do painel (CSV,
edição em massa, grade rápida) — a AC é mais larga que a assunção `A-08`; `BUS-26` não tem asserção
de teste própria; `tasks.md` está com T06–T09 e os "Done when" da T12 por marcar; e a feature inteira
não tem prova em navegador.

**Próximo passo**: nenhum bloqueio. Se o time quiser fechar o gap de `BUS-26` com uma linha, o caso
é abrir a aba *Relacionados* em `AdminProductFormPage.test.tsx` e asserir que os dois
`ProductSearchField` renderizam — isso tornaria verdadeiro o comentário do dublê e mataria a
mutação 16 pela suíte, não só pelo `tsc`.
