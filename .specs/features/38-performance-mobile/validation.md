# Performance da loja no celular — Validation

**Feature**: `.specs/features/38-performance-mobile/spec.md`
**Branch**: `feat/38-performance-mobile` · **Faixa**: `fd4d121..HEAD` (9 commits)

| Iteração | Data | Verificador | Veredito |
| --- | --- | --- | --- |
| 1 | 2026-09-05 | sub-agente independente (autor ≠ verificador) | ❌ **FAIL** — 3 lacunas de discriminação + 1 regressão de comportamento |
| **2** | **2026-09-05** | **sub-agente independente, outro** — não escreveu uma linha desta feature nem do commit de correção | ❌ **FAIL** — as 3 lacunas da iteração 1 estão **fechadas e provadas**; **1 sobrevivente novo** e **2 defeitos de bookkeeping** ficam de pé |

---

## O que este relatório NÃO conseguiu verificar

Declarado antes de qualquer número, porque o que falta aqui pesa mais do que o que passou. Vale para
as duas iterações — nada nesta lista mudou entre elas.

1. **Nenhum teste desta feature prova comportamento visual em navegador real.** jsdom devolve **0
   para toda medida de layout** — `getBoundingClientRect`, `scrollWidth`, `offsetHeight`, tudo zero.
   Consequências que continuam de pé:
   - `PRF-10` AC 1 — "`Suspense` cujo fallback SHALL NOT causar deslocamento de layout" — é asserido
     como **a classe `min-h-[60vh]` estar presente** (`RouteFallback.test.tsx:18`), não como ausência
     de CLS. A classe certa não prova o deslocamento ausente.
   - `PRF-02` e `PRF-03` estão provados no **atributo do DOM**, nunca no **byte que a rede
     entregou**. Que o `<img>` declare `srcset` não prova que o navegador escolheu o candidato de
     360 px, nem que o Supabase respondeu `image/webp` naquela largura.
   - O `sizes` de cada superfície continua asserido como **string**. Se ele descrever a vaga errada,
     o `srcset` inteiro vira decoração, e nenhum teste desta suíte tem como notar.
2. **Nenhum Lighthouse foi rodado por mim.** LCP, FCP, peso da primeira visita e a soma das fileiras
   da home exigem o deploy e um navegador em 390×844, aba anônima. Os números do `tasks.md` (214 KB
   de catálogo, 50 KB de categoria, 117,2 KB de chunk de entrada) são **medições do autor**. A
   iteração 1 reproduziu **só** o do chunk de entrada, por build real; **a iteração 2 não repetiu o
   build** — nada em `a1d465d` toca `vite.config`, roteamento ou `manualChunks`, então aquela medida
   segue valendo, mas ela é dela, não minha.
3. **O ganho que a correção alega — "214 KB a menos por página" ao ligar o `enabled` da busca — não
   foi medido por mim.** Provei que a opção é **passada** (M5, M6) e que o `SearchDropdown` sai da
   montagem desligado; não provei que o hook a **honra** (é o achado L-01, abaixo), nem medi bytes.
4. **Não houve UAT interativa.** Sexta feature seguida em que autor e verificador conferem sem um par
   de olhos humanos sobre a tela — e esta acrescenta um interruptor cujo efeito observável é
   **presença de requisição**, que jsdom só enxerga por dublê.
5. **`PRF-05` AC 3 segue sem implementação** — agora **declarada adiada** na spec, com razão medida e
   confirmada por mim (abaixo).

---

## Iteração 1 — o que foi achado, e como foi fechado

Preservado porque é o histórico que dá sentido ao critério da iteração 2.

A iteração 1 mediu **13 mutações**, matou 9 e deixou **4 sobreviventes**, agrupados em **3 lacunas
distintas** — todas de **prova ausente**, nenhuma de código de produção defeituoso:

| # da it. 1 | Lacuna | AC |
| --- | --- | --- |
| 7 e 7b | O `href` do `<link rel="preload">` **nunca era asserido**: os quatro `toContain` miravam a string do elemento inteiro, e o `imagesrcset` do mesmo `<link>` — que carrega as três rendições — satisfazia todos. `href` apontando para a URL original **ou** para a rendição de 360 passava | `PRF-06` AC 5 |
| 10 | **Ninguém provava que a `CategoryPage` passa `index`** ao `ProductCard`. Apagar `index={i}` passava nos 2234 testes do store — e sem o índice `imagePriority(undefined)` devolve `lazy` + `animateIn`, os três mecanismos que a feature existe para remover, na listagem que mediu **LCP de 15,6 s** | `PRF-03` AC 1 |
| 13 | **Nada ligava a página do produto ao select completo.** Trocar `PRODUCT_SELECT` por `PRODUCT_CARD_SELECT` em `useProduct.ts` passava nos 2234 testes, e o efeito real seria a descrição de **todo** produto sumir da loja | `PRF-08` AC 2 |

Mais uma **regressão de comportamento** confirmada por leitura (não por mutação): a busca deixou de
casar termo que só aparece na `description`, porque a coluna saiu do select enxuto que alimenta as
três superfícies de busca — contradizendo o critério "nenhuma mudança visível de comportamento" da
própria spec.

Os portões da iteração 1 estavam limpos (5 workspaces exit `0`, tipos `0·0·0`, lint 27/5) e o
Success Criterion do chunk de entrada foi reproduzido por build real: **117,5 KB brotli** contra o
teto de 220 KB.

**O commit `a1d465d`** diz ter fechado as três lacunas (mais um interruptor novo na busca, por
decisão do usuário) e ter tirado a contradição da spec. É isso que a iteração 2 mede.

---

## Iteração 2 — as quatro mutações da iteração 1, reinjetadas

**Este é o critério objetivo de re-verificação: as quatro têm de morrer.** Todas em estado
descartável, aplicadas por `perl`/`sed` sobre a árvore e desfeitas por `git checkout --`, com
`git status --porcelain` conferido **depois de cada uma** (os arquivos de conferência saíram com
**0 bytes** — árvore limpa a cada volta).

| # | `arquivo` | Mutação | Suíte | Resultado |
| --- | --- | --- | --- | --- |
| **M1** | `supabase/functions/product-page/handlers.ts:141` | `href="${escapeXml(renditionUrl(url, PALCO_PX))}"` → `href="${escapeXml(url)}"` (a URL original, `/object/public/…`) | functions | ✅ **MORTO — 2 testes** |
| **M2** | `handlers.ts:113` | `PALCO_PX = RENDITION_WIDTHS[RENDITION_WIDTHS.length - 1]` → `RENDITION_WIDTHS[0]` (rendição de **360**) | functions | ✅ **MORTO — 2 testes** |
| **M3** | `apps/store/src/pages/CategoryPage.tsx:408` | `<ProductCard key={p.id} product={p} index={i} />` → sem `index` | store | ✅ **MORTO — 1 teste** |
| **M4** | `apps/store/src/entities/product/api/useProduct.ts` | `PRODUCT_SELECT` → `PRODUCT_CARD_SELECT` (import + as duas leituras) | store | ✅ **MORTO — 4 testes** |

Quais testes morrem, nome a nome:

- **M1** — `handlers.test.ts`: *"produto com foto do Storage: o `href` do preload É a rendição de
  720"* e *"o `href` NÃO é a URL original — o sensor da lacuna que o Verifier achou"*.
- **M2** — `handlers.test.ts`: *"…o `href` do preload É a rendição de 720"* e *"o `href` NÃO é
  nenhuma das outras larguras do `imagesrcset`"*. **Os dois sensores discriminam alvos diferentes**,
  que é exatamente o que a lacuna pedia: um separa a rendição do original, o outro separa 720 de 360
  e 480 — e as três larguras convivem no **mesmo elemento**, que era a razão de o `toContain` antigo
  não distinguir nada.
- **M3** — `fiacaoDaVitrine.test.ts`: *"e passa `index` — sem isto, todo card volta a lazy e
  opacidade zero"*.
- **M4** — `fiacaoDaVitrine.test.ts`: *"`useProduct.ts` importa `PRODUCT_SELECT`"*, *"e NÃO usa
  nenhum dos selects enxutos"*, *"todo `.select(...)` do arquivo usa o completo"* e o sensor *"e o
  `useProduct` real casa a régua porque usa o nome NU"*.

**Veredito do critério objetivo: 4 de 4 mortas.** As três lacunas da iteração 1 estão fechadas, e
fechadas do jeito certo — a asserção do `href` passou a mirar **o campo**, por igualdade
(`expect(href).toBe(renditionUrl(STORAGE, 720)…)`), e a fiação que render não alcança virou guarda de
disco no molde de `reservedSlugs`/`previaUnica`, com âncora dupla e sensores embutidos.

### Uma observação sobre a régua do `href`

`expect(href).toBe(renditionUrl(STORAGE, 720).replace(/&/g, '&amp;'))` usa **a mesma função de
produção** que o código sob teste chama — a régua é, em parte, o objeto medido. Isso sozinho seria
frágil: `renditionUrl` quebrada para emitir 360 satisfaria a igualdade. **Está mitigado**, e por
construção: as três `toContain` de literal (`width=720`, `quality=75`, o caminho `/render/image/`) e
os dois sensores negativos não passam por `renditionUrl` — e M2 provou a mitigação na prática, porque
matou o teste de igualdade **e** o sensor de largura. Fica registrado como propriedade a preservar,
não como defeito.

---

## Iteração 2 — mutações novas

Seis, sobre o que `a1d465d` acrescentou e sobre o que restou mais frágil. Mesmo protocolo.

| # | Alvo | Mutação | Suíte | Resultado |
| --- | --- | --- | --- | --- |
| **M5** | `SearchDropdown.tsx:50` | volta a `useAllProducts()` **sem `enabled`** — a regressão que o commit diz ter fechado | store | ✅ **MORTO — 6 testes** |
| **M6** | `SearchDropdown.tsx:50` | `useAllProducts({ enabled: true })` — liga sempre, o mesmo defeito disfarçado de opção | store | ✅ **MORTO — 3 testes** |
| **M7** | `fiacaoDaVitrine.test.ts` (a própria régua) | `CATEGORY_PAGE` aponta para `pages/CategoriaPage.tsx`, que não existe | store | ✅ **QUEBRA ALTO** |
| **M8** | `useProducts.ts:228` | `useAllProducts` **ignora a opção**: `enabled: options?.enabled ?? true` → `enabled: true` | store — **suíte inteira** | ❌ **SOBREVIVEU** |
| **M9** | `SearchDropdown.tsx:49` | o latch perde o `trim()`: `query.trim() !== ''` → `query !== ''` | store | ✅ **MORTO — 1 teste** |
| **M10** | `ProductCarousel.tsx:129` | o carrossel para de passar `index` (a superfície irmã da `CategoryPage`) | store | ✅ **MORTO — 4 testes** |

**M7 é o caso que mais importa depois do sobrevivente**, porque é o modo de falha que este projeto já
pagou caro: um guarda com caminho errado varre **zero** e passa em silêncio. Aqui não passa — `ler()`
usa `readFileSync`, que estoura no carregamento do módulo:

```
Error: ENOENT: no such file or directory, open '…\apps\store\src\pages\CategoriaPage.tsx'
 Test Files  1 failed (1)
      Tests  no tests
EXIT=1
```

`Tests  no tests` com `exit 1`: **o arquivo inteiro cai, antes de qualquer asserção.** É o
comportamento certo, e a âncora dupla do guarda (`categoria.length > 2000` mais
`toContain('CategoryPage')`) cobre o outro lado — arquivo que existe mas está vazio.

**M9 mata exatamente um teste** (*"espaço em branco não conta como digitar"*), que é o único que mede
o `trim()`. Discriminação mínima, mas real e nominal.

**M10 confirma o contraste que motivou o guarda novo**: a mesma remoção que na `CategoryPage` matava
zero antes de `a1d465d` sempre matou 4 no `ProductCarousel`, porque o carrossel é renderizável em
teste de componente e a página não é. As duas superfícies estão guardadas agora, por caminhos
diferentes e pelo motivo certo.

### M8 — o sobrevivente, e por que ele importa

Com `enabled: true` cravado em `useAllProducts`, a **suíte inteira do store passa: 2259 testes em 152
arquivos, exit `0`.** Nenhum teste do repositório prova que o hook **honra** o interruptor.

O que a correção provou e o que ficou de fora:

- **Provado** — o `SearchDropdown` **passa** `{ enabled: false }` na montagem, `{ enabled: true }` na
  primeira letra digitada, mantém ligado depois de apagar o texto, e nunca passa `undefined` (seis
  casos novos em `SearchDropdown.test.tsx`, todos mortos por M5/M6/M9).
- **Não provado** — que passar `enabled: false` **impede a consulta**. Os testes do dropdown mockam
  `@/entities/product/api/useProducts`, então o dublê registra a opção e devolve dados de qualquer
  jeito. É a mesma família do defeito que o próprio commit descreve ao trocar o dublê ("um dublê que
  ignora as opções não consegue provar `PRF-09`") — só que **um nível acima**: agora quem pode
  ignorar a opção é o hook.

A linha mutada **não é nova**: `enabled: options?.enabled ?? true` já estava em `fd4d121`, servindo o
`SearchOverlay`. Então M8 não é buraco **aberto** por `a1d465d` — é buraco em que a correção passou a
se **apoiar**, e com muito mais peso: o `SearchDropdown` mora no `Header`, que mora no `StoreLayout`,
que está em **toda rota** (`Header.tsx:139`, montagem incondicional). Se alguém simplificar essa
linha, a loja volta a baixar 680 produtos em toda página, **em silêncio e com a suíte verde** — e é
justamente esse ganho que a spec oferece como contrapartida assinada da regressão da busca.

O conserto é barato e o molde já existe no mesmo arquivo: `useProducts.test.tsx:534-556` tem os três
casos de `enabled` para `useProducts` (`false` não dispara, `true` dispara, sem `options` continua
ligado). Faltam os mesmos três para `useAllProducts`.

**Placar do sensor da iteração 2**: **10 mutações · 9 mortas · 1 sobrevivente.**
Somando as reinjetadas, o que era **4 sobreviventes em 3 lacunas** virou **1 sobrevivente em 1
lacuna** — e a lacuna nova é de espécie diferente das três anteriores: vertical (um consumidor e o
hook que ele chama), não horizontal (uma superfície e a irmã dela).

---

## Auditoria do diff de `a1d465d` — alguma asserção foi afrouxada?

Lido linha a linha nos dois arquivos de teste alterados (`git show a1d465d -- <arquivo>`).
**Resposta: não. Nenhuma asserção foi removida ou enfraquecida.**

### `supabase/functions/product-page/__tests__/handlers.test.ts`

| Saiu | Entrou | Veredito |
| --- | --- | --- |
| `expect(link).toContain('/storage/v1/render/image/public/product-images/pulseira.webp')` | a mesma substring, **sobre `href`** | ✅ Mais forte — mesmo literal, alvo mais estreito |
| `expect(link).toContain('width=720')` | idem, sobre `href` | ✅ Mais forte |
| `expect(link).toContain('quality=75')` | idem, sobre `href` | ✅ Mais forte |
| — | `expect(href).toBe(renditionUrl(STORAGE, 720).replace(/&/g,'&amp;'))` | ✅ Novo — igualdade da URL inteira |
| — | 2 testes novos (sensor do original, sensor das outras larguras) | ✅ Novos |

`expect(link).toContain('as="image"')` **permanece** sobre o elemento, que é onde ele pertence. O
saldo é **+2 testes**, nenhum removido, e cada `toContain` antigo sobrevive com o alvo trocado de
elemento para campo. **Exatamente a correção que a iteração 1 prescreveu, e nada além dela.**

### `apps/store/src/features/search/ui/__tests__/SearchDropdown.test.tsx`

O dublê de `useAllProducts` mudou de forma — de `() => ({ data: [...] })` para uma função que empurra
`options` num array e devolve **os mesmos dois produtos, com os mesmos campos, na mesma ordem**
(`product('Pingente com cinzas', { image_url: STORAGE })` e `product('Pingente sem foto')`).
**Nenhum dado do dublê mudou**; ele só passou a registrar o argumento.

O `describe` pré-existente — *"SearchDropdown — a sugestão pede o tamanho da vaga (PRF-02 AC 5)"* —
está **intocado no diff**: nem uma linha de contexto alterada, e as duas asserções de `PRF-02` AC 5
(`width=160&quality=75`; `src` vazio para produto sem foto) continuam idênticas. O arquivo vai de
**2 para 8 testes**, e o `beforeEach` novo zera **só** o array de registro, que os testes antigos não
leem.

### Aritmética da contagem — nada sumiu

| Workspace | Antes de `a1d465d` | Depois | Delta | Origem |
| --- | --- | --- | --- | --- |
| store | 2234 / 151 | **2259 / 152** | **+25 / +1** | `fiacaoDaVitrine.test.ts` (**19**, arquivo novo) + `SearchDropdown.test.tsx` (**+6**) = 25 ✅ |
| functions | 368 / 7 | **370 / 7** | **+2 / 0** | os dois sensores de `href` ✅ |

**A conta fecha exatamente nos dois workspaces**, o que é a evidência mais limpa de que nenhum teste
foi apagado para acomodar a correção. Os outros três não foram tocados: o `--stat` do commit mostra
7 arquivos, e o **único de produção é `SearchDropdown.tsx`**.

---

## Coerência da spec

### As duas exceções declaradas descrevem o código de hoje? — **Sim, as duas.**

| Exceção da spec (`spec.md:325-339`) | Conferido contra o fonte | Veredito |
| --- | --- | --- |
| "a busca deixou de casar termo que só aparece na descrição; `searchProducts` pontua `description` como último desempate (**peso 5**)" | `features/search/lib/searchProducts.ts:55` — `description: 5`; `:76` — `if (description.includes(term)) return SCORE.description`; `:104` — `description: normalizeTerm(product.description ?? '')`. E `description` **não** está em `PRODUCT_CARD_SELECT` (`mapProduct.ts:82-107`), que é o select das três superfícies de busca | ✅ Verdadeiro |
| "o `SearchDropdown` — que fica no header, em toda rota — ganhou o `enabled` que o `SearchOverlay` já tinha" | `SearchDropdown.tsx:50` — `useAllProducts({ enabled: buscou })`; `SearchOverlay.tsx:52` — `useAllProducts({ enabled: open })`; `Header.tsx:139` — `<SearchDropdown />` montado incondicionalmente | ✅ Verdadeiro **na fiação** — mas ver **L-01**: que o hook honre o `enabled` não tem prova |
| "a lupa de passar o mouse no desktop amplia **720 px**, não 1024" | `ProductGallery.tsx:58` — `const PALCO_PX = 720`; `:107` — `<ImageZoom src={renditionUrl(active.url, PALCO_PX)} …>`, dentro do bloco `hidden … md:block` | ✅ Verdadeiro |
| "o original segue na tela cheia" | `ProductGallery.tsx:213` — o `<img>` do `Dialog` usa `src={active.url}`, sem rendição | ✅ Verdadeiro |

### `PRF-05` AC 3 está marcada como adiada, e a razão é verdadeira? — **Sim.**

`spec.md:152-159` risca a AC (`~~…~~`) e a marca **ADIADA**, com decisão do usuário datada. A razão
declarada — "o `@supabase/storage-js` **2.110.7 instalado** não tem `updateMetadata`" — foi **medida
por mim** no pacote instalado, não aceita de palavra:

```
node_modules/.pnpm/@supabase+storage-js@2.110.7/node_modules/@supabase/storage-js/dist/index.d.mts
  ocorrências de "updateMetadata" ......... 0
  métodos de nome próximo presentes ....... copy(…), update(…)
```

A versão bate com a citada, e a API não existe. **"Só metadados mudam" é de fato impossível** com
esta dependência — o passe exigiria `update()`, que reenvia bytes. A justificativa é honesta.

### O que **não** fecha

Dois defeitos de bookkeeping, ambos verificáveis, ambos criados ou perpetuados por `a1d465d`.

**(a) `BL-020` e `BL-021` já existem, e são outra coisa.** A spec apoia duas decisões em ponteiros
para o backlog, e os dois números estão **ocupados desde 2026-08-30**, pela auditoria de SEO da
feature `36`:

| Citado como | Onde | O que `BACKLOG.md` realmente tem |
| --- | --- | --- |
| "`BL-020`, que é busca no servidor" | `spec.md:43` e `:333`, `context.md:95`, `design.md:227`, `tasks.md`, e **no fonte de produção**: `entities/product/api/useProducts.ts:36` e `entities/product/lib/mapProduct.ts:77` ("registrada em `BL-020`") | `BL-020 — Curadoria de SEO das 35 categorias` (`BACKLOG.md:842`) |
| "o passe vira `BL-021`" | `spec.md:158` | `BL-021 — Image sitemap` (`BACKLOG.md:866`) |

Não existe **nenhuma** entrada de backlog sobre busca no servidor nem sobre o passe de
`cacheControl`. O próximo número livre é **`BL-023`** (`BL-022` é o peso do bundle). Isso não é
cosmético: a spec só aceita a regressão da busca **porque** "a busca por descrição volta com
`BL-020`", e `PRF-05` AC 3 só é adiável **porque** "o passe vira `BL-021`". As duas saídas de
emergência apontam para portas que já pertencem a outra coisa, e duas dessas citações estão em
comentário de código que vai para produção.

*De quebra*: `BL-022 — Peso do bundle da loja: 1,17 MB num chunk só` (`BACKLOG.md:886`) é
**exatamente** o que esta feature resolveu, e segue `Status: aberto`, sem uma linha de referência à
`38` em nenhum dos dois lados.

**(b) `tasks.md` contradiz a spec dentro do mesmo commit.** `a1d465d` reescreveu `tasks.md` e deixou
lá, como *"Decisões pendentes do usuário"*:

> 1. **A busca deixou de casar termo que só aparece na descrição.** […] o `SearchDropdown` fica no
>    header e **baixa o catálogo sem interruptor em qualquer rota**. Contradiz o critério "nenhuma
>    mudança visível de comportamento" da spec.

As duas afirmações **deixaram de ser verdade nesse mesmo commit**: o interruptor existe
(`SearchDropdown.tsx:50`) e a spec já não é contradita (a exceção está declarada e assinada). Junto,
o `tasks.md` fixa *"Baselines finais: store **2234/151** […] = **6127 em 351 arquivos**"* — número
que o próprio commit invalidou (é 2259/152).

E **`6127` é aritmeticamente errado, nas duas fontes que o carregam** (`tasks.md:39` e o relatório da
iteração 1): `2234 + 1524 + 368 + 512 + 1789 = **6427**`, não 6127. A soma correta hoje é **6454**.
`CLAUDE.md` está certo e coerente na baseline de **entrada** (`6139 em 334`, e a soma bate) — o erro
é só no total de **saída**, que é justamente o número que a próxima feature vai copiar para o gate
dela. É o defeito que o próprio `CLAUDE.md` já registrou: *"baseline anotada de memória […] mente sem
quebrar nada"*.

*Menor, sem consequência de gate*: `design.md` não menciona o interruptor da busca em lugar nenhum —
ele nasceu depois do design, e só existe na spec (como exceção), no código e nos testes.

---

## Portões — números medidos por mim

**Um workspace por vez, exit code capturado sem pipe** (`cmd > arquivo 2>&1; echo "EXIT=$?"`).

| Workspace | Medido na iteração 2 | Baseline a confirmar | Exit |
| --- | --- | --- | --- |
| `@estrelinha/store` | **2259 testes / 152 arquivos** | 2259 / 152 | `0` ✅ |
| `@estrelinha/core` | **1524 / 61** | 1524 / 61 | `0` ✅ |
| `@estrelinha/functions` | **370 / 7** | 370 / 7 | `0` ✅ |
| `@estrelinha/catalog-import` | **512 / 23** | 512 / 23 | `0` ✅ |
| `@estrelinha/backoffice` | **1789 / 109** | 1789 / 109 | `0` ✅ |
| **Total** | **6454 em 352 arquivos** | — | — |

**Os cinco batem a baseline declarada, item por item.** O total correto é **6454**, não o 6127 que os
documentos da feature repetem (ver acima).

**A flake de carga apareceu duas vezes, e é a documentada no `CLAUDE.md`.** Enquanto uma segunda
suíte rodava na máquina, o backoffice reprovou **1 teste** em cada uma de duas execuções — testes
**diferentes** a cada vez (`SlugField.test.tsx` a 5.310 ms, depois `CategoryInspector.test.tsx` a
12.194 ms), os dois guardas que **varrem disco**, os dois estourando o timeout de 5 s. Na execução
**isolada, com nada mais rodando**, os 1789 passam. O mesmo em `@estrelinha/functions`: 1 falha sob
carga, 370/370 sozinho. Nenhum dos testes envolvidos é tocado por esta feature — `a1d465d` não
encosta no backoffice. **Contam como flake, não como defeito, e os números da tabela são todos de
execução isolada.**

**Tipos** — `npx tsc --noEmit -p …`, medido por mim:

| Projeto | `error TS` | Exit |
| --- | --- | --- |
| `apps/store/tsconfig.app.json` | **0** | `0` ✅ |
| `apps/backoffice/tsconfig.app.json` | **0** | `0` ✅ |
| `tools/catalog-import/tsconfig.json` | **0** | `0` ✅ |

**Lint** — `pnpm lint`: **27 erros / 5 warnings** — backoffice **25/4**, store **2/1**. Idêntico à
baseline; nenhum problema novo, e em particular o `setState` durante render do latch novo
(`SearchDropdown.tsx:49`) não acrescentou nada. Exit `1`, que é o esperado enquanto a baseline não
for zerada.

**Build**: não repetido nesta iteração — `a1d465d` não toca `vite.config`, roteamento nem
`manualChunks`. Vale a medição da iteração 1 (chunk de entrada **117,5 KB brotli**, teto 220 KB),
com a ressalva de que ela é dela.

---

## Lacunas ranqueadas

### L-01 — `useAllProducts` pode ignorar o `enabled` e a suíte inteira fica verde — **Blocker**

- **Prova**: M8. `useProducts.ts:228`, `enabled: options?.enabled ?? true` → `enabled: true`. Store:
  **2259/152, exit 0**.
- **Causa raiz**: os seis casos novos de `PRF-09` provam que o `SearchDropdown` **passa** a opção;
  nenhum prova que o hook a **honra**. As três superfícies de busca mockam o módulo do hook, então a
  fiação e o efeito nunca se encontram. `useProducts.test.tsx` cobre `enabled` para `useProducts`
  (`:534-556`) e **não** para `useAllProducts`.
- **Consequência real**: o `SearchDropdown` está montado em toda rota da loja. Sem o interruptor
  honrado, toda visita a qualquer página volta a baixar o catálogo — e é esse ganho que a spec
  oferece como **contrapartida assinada** da regressão da busca por descrição. A troca deixaria de
  existir sem nada ficar vermelho.
- **Correção**: em `useProducts.test.tsx`, três casos para `useAllProducts` espelhando `:534-556` —
  `enabled: false` não chama o client (`expect(fromMock).not.toHaveBeenCalled()`, `fetchStatus`
  `idle`), `enabled: true` dispara, e sem `options` o padrão segue ligado.
- **Done when**: `enabled: options?.enabled ?? true` → `enabled: true` em `useProducts.ts:228`
  derruba a suíte do store.

### L-02 — os ponteiros de backlog da spec apontam para itens que já existem e são outra coisa — **Major**

- **Prova**: `BACKLOG.md:842` (`BL-020` = curadoria de SEO das 35 categorias) e `:866` (`BL-021` =
  image sitemap), ambos registrados em 2026-08-30 pela feature `36`. Não há entrada sobre busca no
  servidor nem sobre o passe de `cacheControl`. Próximo livre: **`BL-023`**.
- **Por que é Major e não cosmético**: as duas decisões que a spec pede ao usuário para assinar —
  aceitar a perda da busca por descrição, e adiar `PRF-05` AC 3 — são **condicionadas** a esses dois
  itens existirem. E duas das citações estão em **comentário de código de produção**
  (`useProducts.ts:36`, `mapProduct.ts:77`: "registrada em `BL-020`"), afirmando algo falso.
- **Correção**: abrir `BL-023` (busca no servidor) e `BL-024` (o passe de `cacheControl` sobre os
  3.618 objetos), e trocar as referências em `spec.md`, `context.md`, `design.md`, `tasks.md` e nos
  dois fontes. De passagem, fechar ou reduzir **`BL-022`**, que é o que esta feature resolveu.

### L-03 — `tasks.md` contradiz a spec e carrega um total errado — **Major**

- **Prova**: `tasks.md` (escrito por `a1d465d`) afirma que o `SearchDropdown` "baixa o catálogo sem
  interruptor em qualquer rota" e que a regressão "contradiz o critério" da spec — as duas coisas
  deixaram de valer **no mesmo commit**. E fixa "Baselines finais: store 2234/151 … = 6127 em 351",
  quando é 2259/152 e **6454 em 352** (o 6127 é ainda um erro de soma: o certo naquele momento era
  6427).
- **Por que importa**: é desse documento que sai a atualização da tabela de baselines do `CLAUDE.md`
  no fecho. Baseline errada faz o gate da feature seguinte comparar contra um número que nunca
  existiu — o modo de falha que o próprio `CLAUDE.md` registra.
- **Correção**: atualizar a tabela de execução e a linha de baselines do `tasks.md` com os números
  desta iteração, e substituir a seção "Decisões pendentes" pelo que de fato ficou pendente (só a
  T19 / `PRF-05` AC 3, agora adiada).

### L-04 — `PRF-05` AC 3 segue sem implementação — **Minor, decisão já tomada**

Adiada, com razão medida e confirmada por mim. Fica registrada só para não sumir do rastro: enquanto
o passe não roda, o cache de um ano vale para foto **nova**, e os 3.618 objetos existentes seguem em
uma hora.

---

## Rastreabilidade

| Requirement | Status na iteração 1 | Status na iteração 2 |
| --- | --- | --- |
| PRF-01 | ✅ Verificado | ✅ Verificado |
| PRF-02 | ✅ Verificado | ✅ Verificado |
| PRF-03 | ⚠️ fiação da `CategoryPage` sem guarda | ✅ **Verificado** — `fiacaoDaVitrine.test.ts`; M3 e M10 mortos |
| PRF-04 | ✅ Verificado | ✅ Verificado |
| PRF-05 | ⚠️ AC 3 sem implementação | ⚠️ AC 1-2 verificadas · **AC 3 adiada, razão medida e confirmada** |
| PRF-06 | ❌ AC 5 sem asserção de valor | ✅ **Verificado** — asserção por campo; M1 e M2 mortos |
| PRF-07 | ✅ Verificado | ✅ Verificado |
| PRF-08 | ❌ AC 2 sem evidência | ✅ **Verificado** — M4 morto (4 testes) |
| PRF-09 | ✅ Verificado | ⚠️ **AC 1-3 verificadas; o interruptor novo da busca está provado só do lado de quem passa a opção** (L-01) |
| PRF-10 | ⚠️ `lazy` verificado · "sem deslocamento" por proxy | ⚠️ inalterado — jsdom não mede |
| PRF-11 | ✅ Verificado | ✅ Verificado |
| PRF-12 | ✅ Verificado, inclusive no build real | ✅ Verificado (a medição do build é da iteração 1) |
| PRF-13 | ✅ Verificado | ✅ Verificado |
| PRF-14 | ✅ Verificado | ✅ Verificado |
| PRF-15 | ✅ Verificado | ✅ Verificado |
| PRF-16 | ✅ Verificado | ✅ Verificado |

---

## Resumo

**Overall**: ❌ **Not Ready** — mas por pouco, e por um motivo diferente do da iteração 1.

**O critério objetivo de re-verificação foi cumprido**: as quatro mutações que sobreviveram à
iteração 1 morrem agora, e morrem em testes nomeados, específicos e não sobrepostos — 2, 2, 1 e 4
falhas. As três lacunas estão fechadas do jeito certo: o `href` do preload é asserido **por campo e
por igualdade**, e a fiação que render não alcança virou guarda de disco com âncora dupla, sensores
embutidos e um removedor de comentário que já nasce provado em CRLF e LF. **Nenhuma asserção foi
removida ou enfraquecida** — a aritmética da contagem fecha exatamente nos dois workspaces tocados
(+25/+1 no store, +2 no functions), e o `describe` pré-existente do `SearchDropdown` está byte a byte
intocado.

**O que segura o fecho**: um sobrevivente novo (**L-01**) e dois defeitos de bookkeeping (**L-02**,
**L-03**).

O sobrevivente tem a mesma assinatura das três lacunas anteriores — *remover o comportamento e a
suíte inteira continua verde* — e cai justamente sobre o interruptor que a spec oferece como
contrapartida assinada da única regressão de comportamento que esta feature aceita. Ele **não** foi
aberto por `a1d465d` (a linha é anterior à feature), mas foi nele que a correção passou a se apoiar,
e o conserto é copiar três casos que já existem 300 linhas acima no mesmo arquivo.

Os dois de bookkeeping são baratos e mecânicos, e nenhum é opinião: `BL-020` e `BL-021` estão
ocupados por outros itens desde antes desta feature — inclusive em comentário de código de produção
—, e o `tasks.md` afirma, sobre o próprio commit que o escreveu, duas coisas que deixaram de ser
verdade nele.

**Portões, medidos por mim**: **6454 testes em 352 arquivos**, exit `0` nos cinco workspaces
(isolados) · tipos **0 · 0 · 0**, exit `0` nos três · lint **27/5**, idêntico à baseline.

**Próximo passo**: L-01 é o único que exige código (de teste). L-02 e L-03 são edição de documento e
de dois comentários. Depois disso, a re-verificação da iteração 3 é uma mutação só:
`enabled: options?.enabled ?? true` → `enabled: true` em `useProducts.ts:228` tem de derrubar a suíte
do store.

**O que continua sem verificação de ninguém**: navegador real em 390 e 1440, Lighthouse, e o peso
entregue pela rede. Sexta feature seguida sem um par de olhos humanos sobre a tela — e esta
acrescenta um interruptor cujo efeito observável é **presença de requisição**, que jsdom só enxerga
por dublê.
