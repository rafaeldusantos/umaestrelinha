# 64 · Lista de categorias na Home — Validação

> **Seção do AUTOR** (T15 e T16). Autor = quem implementou; o Verifier independente (autor ≠
> verificador) escreve a seção dele abaixo, depois. Tudo o que está aqui foi **medido** em
> 2026-10-11/12, contra o Supabase **local** (faixa 54440–54449, de pé, 13 contêineres) e os dev
> servers da loja (:8082) e do painel (:8083). Nada foi executado contra o projeto hospedado.

## T15 · Probe no banco local (`AD-012`)

**Sem `db reset`**: o catálogo local só volta pelo importador, e só a migration da `64` estava
pendente (`supabase migration list --local`: as 59 anteriores com `local == remote`, a
`20261012120000` sem `remote`). Aplicada com `migration up`.

```
$ npx supabase migration up --local                                   # EXIT=0
Applying migration 20261012120000_64-lista-de-categorias.sql...
{"applied":["…\\supabase\\migrations\\20261012120000_64-lista-de-categorias.sql"],"message":"Migrations applied"}
```

**Reaplicar não falha** — o mesmo arquivo rodado de novo no `psql` do contêiner, com `ON_ERROR_STOP=1`:

```
NOTICE:  column "title" of relation "home_section_items" already exists, skipping
ALTER TABLE
DO
COMMENT                                                                # EXIT=0
```

Depois disso existe **uma** constraint, não duas:

```
 home_section_items_title_len | CHECK (((title IS NULL) OR (char_length(title) <= 28)))
```

**Probe HTTP pelo PostgREST** (`scratchpad/t15/probe.mjs`), autenticado como o admin do `seed.sql`,
com o payload nas **mesmas oito colunas** do `curateSection` do painel:

| Passo | Resposta |
| --- | --- |
| cria seção `category_grid` (desligada) | **201** |
| insere item com `title` de **28** caracteres | **201**, a linha volta com `"title":"aaaa…"` |
| insere item com `title` de **29** caracteres | **400** · `23514` · `violates check constraint "home_section_items_title_len"` |
| insere item com `title: null` | **201** |
| `anon` lê os itens da seção **desligada** | **200** `[]` (a policy pública só devolve seção ativa) |
| liga a seção; `anon` lê | **200** `[{"position":0,"title":"aaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"position":2,"title":null}]` |
| apaga a seção; `anon` confere | **200** `[]` (itens em cascata) |

Uma seção órfã da primeira tentativa (o script errou o nome da coluna de destino — `category_id`,
não `target_id`; `PGRST204`) foi apagada antes, por `id`. O banco local voltou ao estado de antes,
exceto pela migration aplicada.

**E o editor do painel grava `title` de verdade** — não só o probe: a T16 criou o bloco pela tela
real e o banco recebeu as três linhas com `title` `Cinzas`, o de 28 caracteres e `null` (ver abaixo).
É a prova de `AD-012` que a T03 previa: `curateSection` lista as colunas à mão.

## T16 · Prova em navegador

Chromium 1234 (`playwright-core`), Supabase **local** com dado real gravado pelo painel — **sem
interceptação**. Bundle servido conferido antes de medir: `sectionRenderers.tsx` servido pela loja
contém `CategoryList`, `sectionEditors.tsx` servido pelo painel contém `CategoryListEditor`, e o
`catalog.ts` servido contém "Lista de categorias".

### 5 · Painel: acrescentar o bloco, 3 artes, salvar — a prévia muda sem recarregar o iframe

`scratchpad/t16/painel.mjs` e `painel2.mjs`, 1440×900, login real em `/admin/login`. Antes de
qualquer gesto, a janela do iframe recebe um marcador (`window.__marcador`) e o nó `<iframe>`, um
`data-marca`. Recarregar o documento apaga o primeiro; remontar o nó apaga o segundo.

| Gesto | Resultado |
| --- | --- |
| "Lista de categorias" na bandeja | habilitado; criou a seção e abriu `/admin/home/<id>` |
| editor ao abrir | "Título da seção" vazio, lista vazia, "Adicionar categoria" (LCT-15) |
| 3 × (adicionar → arte PNG 800×800 → coleção → título) | sem recado de erro; títulos `Cinzas`, 28 × `a`, vazio |
| salvar | banco: 3 linhas, `title` gravado, `config.title = "Escolha pelo material"` |
| resumo da linha na lista | `“Escolha pelo material” · 3 categorias` |
| prévia antes de ligar | `[]` — o bloco nasce desligado (LCT-15), e a prévia desenha a Home como ela vai ao ar |
| ligar pelo interruptor | prévia: `['Cinzas', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'Linha Leite Materno']` — o 3º sem título mostra o nome da coleção |
| marcador e nó depois de ligar | `nao-recarregou` · `x1` — **o iframe não recarregou** |
| editar o título do 3º para "Leite", sem salvar | prévia já mostra `'Leite'` (o rascunho chega pela ponte) |
| salvar | prévia `[…, 'Leite']`; marcador `nao-recarregou-2` · nó `x2` — **não recarregou** |

### 1 · A-14: a arte circular transparente sobrevive ao envio e à rendição

As três artes eram PNG RGBA 800×800 gerados para a prova (`png.mjs`): disco colorido com **alfa 0**
fora do círculo. O painel as converte no canvas e grava **WebP** (`…/sections/<uuid>.webp`). Medido
decodificando os bytes no navegador (`createImageBitmap` → canvas → `getImageData`) — o objeto
gravado **e** a rendição que a loja de fato pediu (`currentSrc`):

| Viewport | Arquivo | Tipo | Tamanho | Alfa no canto (1,1) | Centro (RGBA) |
| --- | --- | --- | --- | --- | --- |
| 390 @3x | original × 3 | `image/webp` | 800×800 | **0** | `183,148,96,255` · `40,58,75,255` · `190,120,130,255` |
| 390 @3x | rendição `width=208` × 3 | `image/webp` | 208×208 | **0** | os mesmos |
| 1440 @1x | rendição `width=104` × 3 | `image/webp` | 104×104 | **0** | os mesmos |

O `<img>` não tem fundo (`rgba(0, 0, 0, 0)`) e a seção é `ground` (`rgb(250, 248, 244)`): os cantos
mostram o chão da loja, e o que se vê é **só o círculo** — conferido também no recorte de tela
(`alfa-390.png`, `alfa-1440.png`). **A-14 confirmada; nenhuma tarefa de conserto no upload.**

### 2 · 390×844

| Medida | 3 itens | 4 itens | 8 itens |
| --- | --- | --- | --- |
| `document.body.scrollWidth` | **390** | **390** | **390** |
| círculos inteiros visíveis | 3 (centrados, 51px de cada lado) | 3 + o 4º | **3 + 68% do 4º** |
| setas | nenhuma | nenhuma | nenhuma (`hidden md:flex`) |
| vaga | 80×80 | 80×80 | 80×80 |
| `scroll-snap-type` | `x mandatory` | idem | idem |

"~3,5 visíveis, o 4º cortado" (LCT-08): medido **3,68**. O arrasto com encaixe é do navegador e
não foi gesticulado com o dedo — o que está medido é o `scroll-snap-type` computado.

### 3 · 1440×900 (container de 1280, raias de 48px)

| Medida | 3 itens | 4 itens | 8 itens | 12 itens |
| --- | --- | --- | --- | --- |
| `body.scrollWidth` | 1440 | 1440 | 1440 | 1440 |
| fileira | centrada (432 / 432) | centrada (354 / 354) | começa à esquerda | começa à esquerda |
| setas no início | nenhuma | nenhuma | só "Próximas categorias" | só "Próximas categorias" |
| vaga | 104×104 | 104×104 | 104×104 | 104×104 |

Com 8 itens: os 7 primeiros inteiros na área livre e o 8º com **67%** na área livre (o resto sob a
raia da seta) — a conta do design dava ~62% pelo `<li>`, 67% é pelo círculo. Clique em "Próximas":
a esquerda aparece e a direita some no fim; "Anteriores" devolve a direita. Com 12 itens, um
clique (0,8 da janela) já chega ao fim (`scrollLeft` 680 de 680). Rolagem programática a 312: **as
duas** setas. O centro vertical da seta (**778**) é o centro do círculo (**778**) — R5 medido.
Foco de teclado no último link leva a fileira a 680 (o navegador rola sozinho).

### 4 · Rótulo de 28 caracteres sem espaço

`aaaaaaaaaaaaaaaaaaaaaaaaaaaa` quebra em **2 linhas** nos dois viewports (`[overflow-wrap:anywhere]`),
os vizinhos de uma linha ficam em 1, e o topo de todas as vagas é o mesmo (534 em 390, 726 em 1440):
os itens alinham pelo topo (LCT-10, LCT-37).

### 6 · LCP e CLS com o bloco logo abaixo do Banner principal

Três medições por caso (a primeira, aquecimento do Vite, descartada), Home local real com o Banner
principal de 2 slides ativo e o bloco na posição 2:

| | LCP (ms) | elemento do LCP | CLS |
| --- | --- | --- | --- |
| 390 · com o bloco | 852 · 844 · 992 | a arte do **Banner principal** | 0,2488 · 0,0995 · 0,0995 |
| 390 · sem o bloco | 904 · 780 · 748 | a arte do Banner principal | 0,0995 × 3 |
| 1440 · com o bloco | 916 · 936 · 952 | a arte do Banner principal | 0,0767 · 0,0767 · 0,21 |
| 1440 · sem o bloco | 864 · 852 · 964 | a arte do Banner principal | 0,21 · 0,21 · 0,0767 |

**O círculo nunca é o LCP** — confirma a decisão de não repassar `fetchPriority` (R4). A diferença
de LCP fica dentro do ruído do dev server. Os valores de CLS são os **mesmos dois patamares** com e
sem o bloco (0,0995 / 0,2488 em 390; 0,0767 / 0,21 em 1440), alternando entre execuções: são da Home
de hoje (o `<footer>` que a `40` e o esqueleto de 2026-09-21 já descreveram), não do bloco.

### Defeito achado pela prova, e consertado

**O recuo final do rolador ficava fora da área rolável.** Com o `<ul>` em 100% do `<nav>`, quem
transbordava eram os `<li>`, e o `padding-inline-end` do rolador (`px-4` / `md:px-12`) não entrava
no `scrollWidth`. Medido antes: em 1440 com 8 itens `scrollWidth` **1288** contra 1280 — a seta
"Próximas" rolava **8px** —, e em 390 o último item encostava na borda direita no fim da rolagem
(`scrollWidth` 840).

- **Teste primeiro** (`CategoryList.test.tsx`, "o `<ul>` mede o conteúdo quando estoura…"): exige
  `w-max` e `min-w-full` no `<ul>`. **Reprovou** (`expected [ 'flex', 'items-start', 'gap-2' ]`).
- **Conserto**: `<ul className="flex w-max min-w-full items-start gap-2">`. Teste 34/34.
- **Remedido** no bundle servido (`grep -c "w-max min-w-full"` = 1): 1440 → `scrollWidth` **1336**,
  rola **56px** e para com o 8º fora da raia; 390 → **856**, o último termina a 16px da borda.
  Com 3 e 4 itens a centralização continua (432/432 e 354/354) — `min-w-full` devolve a largura
  toda às margens automáticas.

### O que ficou sem prova

- **O arrasto com o dedo** em 390 não foi gesticulado; está medido o `scroll-snap-type` computado.
- **Leitor de tela** não foi usado; o nome acessível de cada link e o `<nav aria-label>` estão em
  teste de componente.
- **LCP em Slow 4G / 4× CPU** não foi medido — os números acima são de rede local.
- **O aviso de proporção** (arte não quadrada) e **a falha de envio** não foram exercitados em
  navegador, só em teste de componente.
- **O painel em 390** (a coluna do editor no celular) não foi aberto.

---

## Verificação independente

**Data**: 2026-10-11 · **Verificador**: sub-agente independente (autor ≠ verificador) · **Spec**:
`spec.md` (LCT-01..LCT-40) · **Régua**: evidência ou zero.

**Faixa de diff verificada** (árvore compartilhada, sem commit; a `63` inteira também está aberta e
ficou fora): `supabase/migrations/20261012120000_64-lista-de-categorias.sql`;
`packages/core/src/home/{categoryList,resolve,carousel,catalog,types,index}.ts` e os testes
`categoryList`, `resolve`, `catalog` e `carousel`; `packages/supabase/src/types/home.ts`;
`apps/store/src/widgets/category-list/**`, `widgets/home-renderer/ui/sectionRenderers.tsx` e
`HomeRenderer.test.tsx`, `entities/home/api/useHomeSections.ts` (+ teste),
`shared/lib/__tests__/categoryListSchema.test.ts`;
`apps/backoffice/src/entities/home/api/useAdminHomeSections.ts` (+ teste) e
`features/home-composition/{model/sectionDraft, model/sectionRefusals, ui/CategoryListEditor,
ui/sectionEditors, ui/HomeSectionRow, ui/ProductPicker}`, com os testes `CategoryListEditor`,
`sectionRefusals`, `toNewItems`, `applyDraft`, `useAdminResolvedHome`, `HomeSectionList` e
`HomeBlockTray`. Também foi mutado, por ser lido pela 64, o hook pré-existente
`apps/store/src/shared/lib/useOverflowAffordance.ts`.

### Veredito: **PASS**, com uma ressalva

Foram injetados 42 mutantes de comportamento nos arquivos reais: **41 morreram por asserção, 0 por
compilação e 1 sobreviveu (M10)**. O sobrevivente fica atrás do `maxLength={28}` do campo, que conta o
texto cru. Pela tela ele não é alcançável, e numa escrita direta o `check` do banco recusa. Não
bloqueia, mas vira tarefa de conserto recomendada (lacuna nº 1).

**Gate medido nesta verificação**: `tsc` store **0** · backoffice **0**. Suítes tocadas, rodadas antes
das mutações e com o exit code capturado fora de pipe: core `src/home` **326/326 (13 arquivos)**;
store (category-list, home-renderer, entities/home, categoryListSchema, alvoDeToque,
renditionSingleOwner, homeSections) **215/215 (9)**; backoffice (home-composition + entities/home)
**463/463 (21)**. `git diff --name-only -- packages/core/src/payment` devolveu **0 arquivos**.
**Não foram medidos aqui**: os cinco workspaces inteiros, `pnpm lint` e `pnpm build`. Esse é o gate
do fecho (T17), e outra sessão está editando a árvore.

### Evidência por AC

| AC | O que a spec define | Evidência (`arquivo:linha` — asserção) | Resultado |
| --- | --- | --- | --- |
| LCT-01 | lista na posição da seção, ordem de `position`, círculo + rótulo | `HomeRenderer.test.tsx` (bloco "Lista de categorias") — links `['Leite materno','Coleção 1']` e a ordem hero < nav < newsletter; `resolve.test.ts` "a ordem é a `position`" — `['primeiro','segundo','terceiro']` | ✅ (fiação pelo `HomeRenderer` real) |
| LCT-02 | título aparado; vazio ⇒ nome atual | `categoryList.test.ts:84-103`; `resolve.test.ts` "com título…" `['Cinzas e flores','Cinzas']` | ⚠️ divergência declarada: o código tem o degrau `alt` (título > `alt` > nome, design R1), que a spec não menciona. O editor não chega a ele |
| LCT-03 | link para `categoryHref` | `HomeRenderer.test.tsx` hrefs `['/colecao-2','/colecao-1']` via `useResolvedHome` → `categoryHref` | ✅ |
| LCT-04 | um link por item, nome = rótulo, `alt=""` | `CategoryList.test.tsx:71-89` | ✅ (M15 morto) |
| LCT-05 | vaga quadrada de 80/104, `object-contain`, sem fundo/borda/raio/recorte | `CategoryList.test.tsx:98-127`, por token exato, no celular e no `md` | ✅ (M16, M17, M18 mortos) |
| LCT-06 | rendição do dono; `loading` de `imagePriority` | `CategoryList.test.tsx:131-172`; `renditionSingleOwner.test.ts` | ✅ (M19 e M20 mortos — M20 só pelo guarda: o teste do widget não distingue `index < 6`, porque o limiar é o mesmo de `imagePriority`) |
| LCT-07 | título acima (Libre Baskerville 22/28 · 28/34); vazio ⇒ nada | `CategoryList.test.tsx:176-191`: presença, ordem e ausência | ⚠️ tipografia sem asserção |
| LCT-08 | rola dentro do contêiner, `scroll-snap` por item, sem rolagem do `body` | `CategoryList.test.tsx:195-213`; `body` só pela prova em navegador do autor | ✅ (M30 morto) |
| LCT-09 | alvo ≥ 44 | `CategoryList.test.tsx:207-212` (`w-24`, o link é o item); medido no navegador | ✅ |
| LCT-10 | 2 linhas, centralizado, reticências, alinhado pelo topo | `CategoryList.test.tsx:251-270` | ⚠️ tamanho do rótulo (14/18 · 16/21) sem asserção |
| LCT-11 | sem item resolvido ⇒ nada | `CategoryList.test.tsx:91-94`; `HomeRenderer.test.tsx` "sem item resolvido…" | ✅ (M28 morto) |
| LCT-12 | pula só o órfão ou o inativo | `HomeRenderer.test.tsx` "órfã é pulada"; `useAdminResolvedHome.test.ts` (desativada); `categoryList.test.ts:161-169` | ✅ (M03 morto); a coleção inativa só é provada do lado do painel |
| LCT-13 | nunca nasce invisível | `CategoryList.test.tsx:301-310` (lê o fonte sem comentários) | ✅ |
| LCT-14 | bandeja oferece o bloco, `comingSoon:false`, rótulo novo | `catalog.test.ts` `toEqual({…label:'Lista de categorias', comingSoon:false…})`; `HomeBlockTray.test.tsx` | ✅ (M12, M13 mortos) |
| LCT-15 | nasce desligado e sem itens; editor com título + lista vazia + botão | `useAdminHomeSections.test.ts`, insert com `active:false`; `CategoryListEditor.test.tsx:112-119, 494-499` (pelo casco real) | ✅ |
| LCT-16 | contador `n / 60` e `maxLength` da mesma constante; apoio literal | `CategoryListEditor.test.tsx:123-140`; `categoryList.test.ts:192-197` | ✅ (M14 morto) |
| LCT-17 | ordem Imagem · Coleção · Título; orientação literal; aviso de proporção; só ativas, por `sort_order`; `n / 28` | `CategoryListEditor.test.tsx:163-216, 280-292` | ⚠️ `accept="image/png,image/jpeg,image/webp"` (`CategoryListEditor.tsx:306`) sem asserção |
| LCT-18 | congela `label_snapshot` no mesmo gesto | `CategoryListEditor.test.tsx:227-236` | ✅ (M37 morto) |
| LCT-19 | recusa antes de gravar, frases literais, rascunho preservado | `CategoryListEditor.test.tsx:501-518`, pelo `HomeSectionEditor` real (`onSave` não é chamado); `categoryList.test.ts:203-265` | ✅ (M09, M33 mortos) |
| LCT-20 | com 24: botão indisponível + "Até 24 categorias por bloco."; recusa também ao salvar | `CategoryListEditor.test.tsx:381-397, 520-528`; `categoryList.test.ts:182-190` | ✅ (M07, M08, M36, M41 mortos) |
| LCT-21 | o arrasto reordena | `CategoryListEditor.test.tsx:405-417`; `position` gravada pelo índice no `curateSection` | ✅ |
| LCT-22 | um aberto por vez; fechado com miniatura, rótulo efetivo e "Coleção · nome"; órfão no tom de aviso | `CategoryListEditor.test.tsx:238-250, 322-371` | ✅ (M34, M35 mortos) |
| LCT-23 | miniatura `object-contain` sobre fundo neutro; `previaUnica` sem edição | `CategoryListEditor.test.tsx:311-320, 424-439`; `previaUnica.test.ts` fora do `git status` | ✅ |
| LCT-24 | frase da seção vazia; frase de "saíram do ar"; prévia sem recarregar | `resolve.test.ts` (as duas frases literais); `HomeSectionList.test.tsx` "sem nenhuma…"; o recarregamento só se prova no navegador (autor, T16) | ✅ (M06, M39 mortos) |
| LCT-25 | `uploadHomeImage`; falha vira texto sem gravar | `CategoryListEditor.test.tsx:270-303` | ✅ (M40 morto) |
| LCT-26 | coluna anulável, `check ≤ 28`, idempotente, sem escrita, sem `grant anon` | `categoryListSchema.test.ts` (âncora dupla, `mutar()` que lança); probe do autor (T15) | ✅ (M42 morto) |
| LCT-27 | um número só, comparado com o disco | `categoryListSchema.test.ts:113-133` | ✅ |
| LCT-28 | `title` no tipo, no rascunho, no `toNewItems` (8 colunas por igualdade) e na leitura dos dois apps | `toNewItems.test.ts` (âncoras 8/10); `useHomeSections.test.tsx`; `useAdminHomeSections.test.ts` (payload por igualdade) | ✅ (M29, M31 mortos) |
| LCT-29 | `homeSections.test.ts` intocado; `COMING_SOON` vazio asserido | `homeSections.test.ts` fora do `git status`; `catalog.test.ts` `toEqual([])` | ✅ |
| LCT-30 | teto em constante, sem `config.limit` | `categoryList.test.ts:62-64`; `catalog.test.ts`, `limit` `toBeNull()` | ✅ |
| LCT-31 | setas pelo estado real de rolagem | `CategoryList.test.tsx:345-371` (medidas fixadas no nó) | ✅ (M24 morto) |
| LCT-32 | anda ~uma janela; suave, ou `auto` com movimento reduzido | `CategoryList.test.tsx:373-390` (`toBeCloseTo(VISIVEL*0.8)`, `motion-reduce:scroll-auto`) | ✅ (M25 morto) |
| LCT-33 | alvo de 44, disco de 36, `TAP_44` sem roubar a posição, só a partir de `md` | `CategoryList.test.tsx:397-415`; `alvoDeToqueNaoRoubaPosicao.test.ts` | ✅ (M23 morto) |
| LCT-34 | centralizada por margem automática, nunca por `justify-center` | `CategoryList.test.tsx:215-249` | ✅ (M21, M22 mortos) |
| LCT-35 | arte opaca exibida como está | `CategoryList.test.tsx:107-118` (sem recorte) | ✅ |
| LCT-36 | foto com 404: a caixa e o rótulo ficam | `CategoryList.test.tsx:285-297` | ✅ (M27 morto) |
| LCT-37 | 28 caracteres sem espaço quebram (`overflow-wrap:anywhere`) | `CategoryList.test.tsx:258-270`; navegador (autor) | ✅ |
| LCT-38 | duas seções com estados independentes | `CategoryList.test.tsx:425-444` | ✅ |
| LCT-39 | renomear muda o rótulo de quem não tem título, e não o de quem tem | `categoryList.test.ts:115-123`; `resolve.test.ts` "renomear…" | ✅ |
| LCT-40 | a prévia usa a foto e o título do rascunho | `applyDraft.test.ts` (título; `image_url` pela régua que já existia); vaga vazia em `CategoryList.test.tsx:274-283` | ✅ (M32 morto) |

### Sensor de discriminação

Arnês em `scratchpad/v64/mut.mjs`: uma mutação por vez, no arquivo real. Ele **lança** se o alvo não
aparece exatamente uma vez, roda só as suítes relevantes
(`pnpm --filter <ws> exec vitest run … --testTimeout=20000`), restaura o arquivo e **confere o
SHA-256**. Os 42 foram restaurados idênticos, e um `grep` confirmou que nenhuma marca de mutação
ficou na árvore. A morte é classificada pelo log, como asserção ou compilação.

| # | Mutação | Arquivo | Resultado | Morte |
| --- | --- | --- | --- | --- |
| M01 | precedência `alt` > título | `core/home/categoryList.ts` | morto | asserção |
| M02 | `imageUrl` cai em `resolved.imageUrl` (o banner) | idem | morto | asserção |
| M03 | destino que não é coleção desenha | idem | morto | asserção |
| M04 | pós-processamento aplicado a todo tipo (≠ `hero`) | `core/home/resolve.ts` | morto | asserção |
| M05 | `resolve` sem `categoryListItem` | idem | morto | asserção |
| M06 | frase antiga da seção vazia | idem | morto | asserção |
| M07 | teto 25 | `categoryList.ts` | morto | asserção |
| M08 | `>` → `>=` no teto | idem | morto | asserção |
| M09 | sem a recusa de imagem | idem | morto | asserção |
| **M10** | **título do item contado aparado (`.trim().length`)** | `categoryList.ts:131` | **SOBREVIVEU** | — |
| M11 | `ordinalF` escreve `º` | `core/home/carousel.ts` | morto | asserção |
| M12 | rótulo "Grade de coleções" | `core/home/catalog.ts` | morto | asserção |
| M13 | `COMING_SOON = ['category_grid']` | idem | morto | asserção |
| M14 | título da seção com 61 passa | `categoryList.ts` | morto | asserção |
| M15 | `alt={item.label}` | `CategoryList.tsx` | morto | asserção |
| M16 | vaga `md:h-24 md:w-24` | idem | morto | asserção |
| M17 | `rounded-full` na vaga | idem | morto | asserção |
| M18 | `object-cover` | idem | morto | asserção |
| M19 | `fetchPriority` no primeiro | idem | morto | asserção |
| M20 | `loading` por `index < 6` | idem | morto (só por `renditionSingleOwner`) | asserção |
| M21 | sem `ml-auto` | idem | morto | asserção |
| M22 | `w-full justify-center` no lugar de `w-max min-w-full` | idem | morto | asserção |
| M23 | `TAP_44` por último no `cn` | idem | morto | asserção |
| M24 | seta esquerda pelo estado `depois` | idem | morto | asserção |
| M25 | passo de 1,0 em vez de 0,8 | `shared/lib/useOverflowAffordance.ts` | morto | asserção |
| M26 | título sem `trim` (espaços viram `<h2>`) | `CategoryList.tsx` | morto | asserção |
| M27 | foto com 404 em `display:none` | idem | morto | asserção |
| M28 | o registro devolve `null` | `sectionRenderers.tsx` | morto | asserção |
| M29 | o mapper da loja perde `title` | `useHomeSections.ts` | morto | asserção |
| M30 | sem `snap-mandatory` | `CategoryList.tsx` | morto | asserção |
| M31 | `curateSection` grava `title: null` | `useAdminHomeSections.ts` | morto | asserção |
| M32 | `applyDraft` perde `title` | `sectionDraft.ts` | morto | asserção |
| M33 | registro com `refusal: () => null` | `sectionEditors.tsx` | morto | asserção |
| M34 | `cruzar` ignora a desativada | `CategoryListEditor.tsx` | morto | asserção |
| M35 | órfão sem o tom de aviso | idem | morto | asserção |
| M36 | o botão libera o 25º (`>`) | idem | morto | asserção |
| M37 | `label_snapshot` não congela | idem | morto | asserção |
| M38 | oferece coleção desativada | idem | morto | asserção |
| M39 | plural "categoria" | `HomeSectionRow.tsx` | morto | asserção |
| M40 | falha de envio grava no rascunho | `CategoryListEditor.tsx` | morto | asserção |
| M41 | o botão some (`hidden`) em vez de ficar indisponível | idem | morto | asserção |
| M42 | `check (… <= 29)` | migration da 64 | morto | asserção |

**Resultado**: 41 de 42 mortos, todos por asserção; 0 por compilação; 1 sobrevivente.

### Lacunas, por ordem

1. **M10 sobreviveu: a regra "conta o texto CRU, como o `check`" não tem asserção.**
   `packages/core/src/home/categoryList.ts:131`. O comentário diz que aparar ali deixaria passar o
   que o banco recusa, e nenhum teste prova isso: todos os casos usam `'a'.repeat(n)`, sem espaço.
   Falta em `categoryList.test.ts` o caso `title: 'a'.repeat(28) + ' '` ⇒ `'O título da 1ª
   categoria passa de 28 caracteres.'`. Não bloqueia, porque o `<Input maxLength={28}>` conta o
   texto cru e o banco recusa a escrita direta. Mas é o mesmo padrão de comentário que afirma uma
   sensibilidade sem medi-la.
2. **LCT-02 diverge da letra da spec** (há um degrau `alt` entre o título e o nome). É decisão do
   `design.md` (R1, linhas 107-110 e 339) e está testada nos dois lados (`categoryList.test.ts:88`,
   `CategoryListEditor.test.tsx:328-332`), mas a spec não a registra. Ação: emendar a spec (A-03 /
   LCT-02) ou declarar um `SPEC_DEVIATION`.
3. **Tipografia sem asserção (LCT-07, LCT-10)**: em `CategoryList.tsx:132`, o h2 (`font-display
   text-[22px] leading-[28px] … md:text-[28px] md:leading-[34px]`); em `:110`, o rótulo (14/18 ·
   16/21). Falta uma asserção por token exato no celular e no `md`, no molde da vaga. A tabela de
   medidas da spec só está provada pelo navegador do autor.
4. **`accept` do upload sem asserção (LCT-17)**: `CategoryListEditor.tsx:306`. Falta
   `expect(input).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp')`.
5. **Coleção INATIVA na loja** (LCT-12): só está provada no painel (`useAdminResolvedHome.test.ts`).
   O `HomeRenderer.test.tsx` cobre a órfã (`category_id` nulo), mas não `active=false`. O caminho é o
   `resolveItem` que já existia, então o risco é baixo.
6. **O que só o navegador prova**, e esta verificação não refez: a ausência de rolagem do `body`
   (LCT-08), a prévia sem recarregar o iframe (LCT-24), o alfa preservado (A-14) e o arrasto com o
   dedo. O autor mediu tudo isso em T16, com o Supabase local.

**Ações, nenhuma bloqueia o PASS**: a lacuna 1 vira tarefa de conserto (um caso); a lacuna 2, emenda
na spec; as lacunas 3 e 4, reforço opcional.

## Fecho das lacunas da verificação independente

Todas as lacunas 1–5 foram fechadas por teste; nenhum código de produção mudou. Cada caso novo foi
provado por mutante reinjetado no arquivo real (arnês que lança sem alvo; SHA-256 conferido na
restauração) — **5 mortos por asserção, 0 por compilação, 0 sobreviventes**, cada um derrubando só o
caso que o nomeia:

| Lacuna | Caso novo | Mutante | Resultado |
| --- | --- | --- | --- |
| 1 · M10 | `categoryList.test.ts`: 28 letras + 1 espaço ⇒ recusado | contagem com `.trim()` | morto |
| 3 · LCT-07 | `CategoryList.test.tsx`: tipografia do `<h2>`, celular e `md` | `text-[22px]` → `text-[20px]` | morto |
| 3 · LCT-10 | `CategoryList.test.tsx`: tipografia do rótulo, celular e `md` | `md:text-[16px]` → `md:text-[15px]` | morto |
| 4 · LCT-17 | `CategoryListEditor.test.tsx`: `accept` PNG/JPEG/WebP | `accept="image/*"` | morto |
| 5 · LCT-12 | `HomeRenderer.test.tsx`: coleção desativada pulada na loja | sem `active === false` em `useResolvedHome` | morto |

A lacuna 2 (LCT-02) virou `SPEC_DEVIATION` declarado na própria `spec.md`. A lacuna 6 é a prova em
navegador da T16, que o verificador não refez.
