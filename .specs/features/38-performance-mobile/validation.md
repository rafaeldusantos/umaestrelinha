# Performance da loja no celular — Validation

**Feature**: `.specs/features/38-performance-mobile/spec.md`
**Branch**: `feat/38-performance-mobile` · **Faixa**: `fd4d121..HEAD` (11 commits)

| Iteração | Data | Verificador | Veredito |
| --- | --- | --- | --- |
| 1 | 2026-09-05 | sub-agente independente (autor ≠ verificador) | ❌ **FAIL** — 3 lacunas de discriminação + 1 regressão de comportamento |
| 2 | 2026-09-05 | sub-agente independente, outro | ❌ **FAIL** — as 3 lacunas da it. 1 fechadas e provadas; **1 sobrevivente novo** (`L-01`) e 2 defeitos de bookkeeping |
| **3** | **2026-09-05** | **sub-agente independente, terceiro** — não escreveu uma linha desta feature nem dos dois commits de correção | ✅ **PASS dos 11 commits** — `L-01` **morta** (8/8 mutações mortas), `L-02` fechada, `L-03` fechada em substância com **dois resíduos**; `L-05` **levantada e NÃO medida**. **Não cobre a árvore de trabalho** |

> **Iteração 3 é a última permitida.** O que ficou de fora não gera nova rodada: vai para
> *O que falta para o fecho*, no fim deste documento.

---

## O que este relatório NÃO conseguiu verificar

Declarado antes de qualquer número, porque o que falta aqui pesa mais do que o que passou. **Nada
nesta lista mudou nas três iterações** — nenhuma delas teve navegador.

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
     o `srcset` inteiro vira decoração, e nenhum teste desta suíte tem como notar. A `L-05`, abaixo,
     é a forma medida desse limite.
2. **Nenhum Lighthouse foi rodado por mim**, e não há artefato de Lighthouse no repositório. LCP,
   FCP, peso da primeira visita e a soma das fileiras da home exigem deploy e navegador em 390×844,
   aba anônima. Os números do `tasks.md` (214 KB de catálogo, 50 KB de categoria, 117,2 KB de chunk
   de entrada) são **medições do autor**.
   - **Agravante que o próprio `design.md:226` registra**: a rodada de Lighthouse que abriu a feature
     tinha **extensões ativas**, então os números de partida estão inflados. O fecho tem de
     **remedir o antes e o depois** em aba anônima, no mesmo aparelho — comparar contra a linha
     antiga superestimaria o ganho.
3. **O peso entregue pela rede não foi medido por mim em nenhuma das três iterações.** O ganho que a
   spec assina como contrapartida da regressão da busca — "−214 KB por página" — está provado como
   **ausência de requisição no dublê** (M8), não como bytes.
4. **O chunk de entrada não foi rebuildado nesta iteração.** Vale a medição da iteração 1 (**117,5 KB
   brotli** contra o teto de 220 KB), e eu **conferi que ela continua válida**: nenhum commit
   posterior ao build dela toca `vite.config.ts`, `App.tsx`, `index.html` ou `package.json`
   (`92fadbf`, `a1d465d` e `913c989` não os tocam; `6fe260e` toca `index.html`, mas é **anterior** à
   medição). A medida é dela, não minha.
5. **Não houve UAT interativa.** Sexta feature seguida em que autor e verificador conferem sem um par
   de olhos humanos sobre a tela — e esta acrescenta um interruptor cujo efeito observável é
   **presença de requisição**, que jsdom só enxerga por dublê.
6. **`PRF-05` AC 3 segue sem implementação** — declarada adiada na spec, com razão medida e
   confirmada na iteração 2 (o `@supabase/storage-js` 2.110.7 instalado não tem `updateMetadata`).

---

## Histórico — iterações 1 e 2

Preservado porque é o que dá sentido ao critério objetivo da iteração 3.

### Iteração 1 — 13 mutações, 9 mortas, 4 sobreviventes em 3 lacunas

| # | Lacuna | AC |
| --- | --- | --- |
| 7 e 7b | O `href` do `<link rel="preload">` **nunca era asserido**: os quatro `toContain` miravam a string do elemento inteiro, e o `imagesrcset` do mesmo `<link>` satisfazia todos | `PRF-06` AC 5 |
| 10 | **Ninguém provava que a `CategoryPage` passa `index`** ao `ProductCard`. Apagar `index={i}` passava nos 2234 testes — e sem o índice, `imagePriority(undefined)` devolve `lazy` + `animateIn`, na listagem que mediu **LCP de 15,6 s** | `PRF-03` AC 1 |
| 13 | **Nada ligava a página do produto ao select completo.** Trocar `PRODUCT_SELECT` por `PRODUCT_CARD_SELECT` passava, e a descrição de **todo** produto sumiria da loja | `PRF-08` AC 2 |

Mais uma **regressão de comportamento** por leitura: a busca deixou de casar termo que só aparece na
`description`. Fechada por **decisão declarada na spec**, não por código.

### Iteração 2 — as 4 reinjetadas morreram; 1 sobrevivente novo

As quatro mutações da iteração 1 morreram (2, 2, 1 e 4 falhas nomeadas). Sobrou:

- **`L-01` (Blocker)** — `useProducts.ts:228`: `enabled: options?.enabled ?? true` → `enabled: true`
  em `useAllProducts` passava nos **2259 testes do store**. O buraco era de par: os seis casos novos
  provavam que o `SearchDropdown` **passa** `{ enabled: false }`, e nenhum provava que o hook a
  **honra** — as três superfícies de busca mockam o módulo do hook.
- **`L-02` (Major)** — `BL-018`..`BL-021` foram citados como se estivessem livres. Os quatro **já
  existiam**, com outros significados, e duas citações estavam em **comentário de produção**.
- **`L-03` (Major)** — `tasks.md` contradizia a spec e trazia `6127 em 351`, número **desatualizado e
  mal somado**.

**O commit `913c989`** diz ter fechado as três. É isso que esta iteração mede.

---

## Iteração 3 — o critério objetivo: as mutações têm de morrer

**Protocolo.** Cada mutação aplicada por `perl -i` sobre a árvore, o alvo conferido por `sed`/`grep`
**depois** de aplicada, a suíte inteira do workspace rodada com **exit code capturado sem pipe**
(`cmd > arquivo 2>&1; echo "EXIT=$?"`), e a árvore desfeita por `git checkout --` com
`git status --porcelain` conferido a cada volta. Nenhuma mutação rodou em paralelo com outra — um
workspace por vez, pela regra de flake do `CLAUDE.md`.

**Baseline do store medida por mim antes de qualquer mutação: `2263 testes / 152 arquivos`, exit `0`,
zero falhas.** É contra ela que cada linha abaixo se lê.

| # | Alvo | Mutação | Suíte | Resultado |
| --- | --- | --- | --- | --- |
| **M8** | `useProducts.ts:228` — `useAllProducts` | `enabled: options?.enabled ?? true` → `enabled: true` | store | ✅ **MORTA — 2 testes** |
| **M11** | `useProducts.ts:166` — `useProducts`, o irmão | idem, na outra linha | store | ✅ **MORTA — 1 teste** |
| **M3** | `CategoryPage.tsx:408` | `<ProductCard … index={i} />` → sem `index` | store | ✅ **MORTA — 1 teste** |
| **M4** | `useProduct.ts` | `PRODUCT_SELECT` → `PRODUCT_CARD_SELECT` (import + as duas leituras) | store | ✅ **MORTA — 4 testes** |
| **M13** | `ProductGallery.tsx:121` | `sizes={GALLERY_STAGE_SIZES}` → `sizes="100vw"` | store | ✅ **MORTA — 1 teste** |
| **M12** | `core/media/rendition.ts` — `imagePriority` | `if (index === 0)` → `if (index >= 0)`: **todo** card ansioso vira `fetchPriority: 'high'` | core | ✅ **MORTA — 1 teste** |
| **M12b** | idem, medida no store | idem | store | ✅ **MORTA — 2 testes** |
| **M1** | `product-page/handlers.ts:141` | `href="${escapeXml(renditionUrl(url, PALCO_PX))}"` → `escapeXml(url)` (a URL original) | functions | ✅ **MORTA — 2 testes** |
| **M14a** | `ProductGallery.tsx:121` | `sizes={GALLERY_STAGE_SIZES}` → **o mesmo literal**, cravado | store | ⛔ **ANULADA** — árvore alterada durante a execução |
| **M14b** | `core/media/rendition.ts:62` | `GALLERY_STAGE_SIZES` muda de valor, o literal da galeria fica | store · functions · core | ⛔ **ANULADA** — **duas** mutações vivas ao mesmo tempo |

**As duas M14 não têm resultado neste relatório, e é de propósito.** A M14a caiu na alteração de
árvore descrita na seção seguinte. A M14b chegou a produzir números, mas a execução ocorreu com a
**minha** mutação em `rendition.ts` **e** uma mutação de terceiro em `ProductGallery.tsx` vivas na
mesma árvore — duas variáveis mexidas por vez não isolam nada, e o número seria indefensável. Pela
mesma régua que anulou a M14a, anulei estes também, **sem** reportá-los.

**Elas ficam com o autor**, que vai medi-las sozinho e registrar o resultado identificado como
medição dele. `L-05`, abaixo, descreve a lacuna que elas existem para medir.

### Quais testes morrem, nome a nome

- **M8** — `useProducts.test.tsx`, no `describe('useAllProducts — o interruptor (PRF-09)')` que
  `913c989` acrescentou: *"`enabled: false` não dispara consulta nenhuma"* e *"desligado, NENHUMA
  linha atravessa a rede — é o ponto, não o efeito colateral"*. **`2 failed | 2261 passed (2263)`,
  exit `1`.**
- **M11** — `useProducts.test.tsx`: *"useProducts — filtro por categoria N:N (PST-06 AC 4) > roll-up
  da descendência (MENU-03) > enabled > `enabled: false` não dispara consulta nenhuma"*.
- **M3** — `fiacaoDaVitrine.test.ts`: *"e passa `index` — sem isto, todo card volta a lazy e opacidade
  zero"* (14 ms).
- **M4** — `fiacaoDaVitrine.test.ts`, os quatro: *"`useProduct.ts` importa `PRODUCT_SELECT`"*, *"e NÃO
  usa nenhum dos selects enxutos — a descrição é o conteúdo desta página"*, *"todo `.select(...)` do
  arquivo usa o completo"* e o sensor *"e o `useProduct` real casa a régua porque usa o nome NU"*.
  **`4 failed | 2259 passed`, sem flake.**
- **M13** — `ProductGallery.test.tsx`: *"o `sizes` do palco descreve metade da tela no desktop e a
  tela toda no celular"* (64 ms). **`1 failed | 2262 passed`.**
- **M12** — `rendition.test.ts`: *"índices 1 a 5: ansiosos, sem `fetchPriority`, e sem animação"*.
  **`1 failed | 1523 passed (1524)`, exit `1`.** A régua é dupla no mesmo teste (`toEqual` do objeto
  inteiro **mais** `expect(imagePriority(i).fetchPriority).toBeUndefined()`), o que é o motivo de ela
  discriminar "mais de um `high`" — a dica diluída que o comentário de produção diz querer evitar.
- **M12b** — a **mesma** mutação medida no store mata mais **2**, em superfícies diferentes das do
  core: `ProductCarousel.test.tsx` (*"COM banner, o primeiro card é o índice 1 — ansioso, mas sem a
  dica de prioridade"*) e `ProductCard.test.tsx` (*"índices 1 a 5: `eager`, SEM `fetchpriority`, e sem
  opacidade zero"*). **A regra pura e as duas vitrines guardam a mesma propriedade por caminhos
  independentes** — é defesa em profundidade de verdade, não a mesma asserção contada duas vezes.
- **M1** — `handlers.test.ts`, os dois sensores que a iteração 1 prescreveu: *"produto com foto do
  Storage: o `href` do preload É a rendição de 720"* e *"o `href` NÃO é a URL original — o sensor da
  lacuna que o Verifier achou"*. **`2 failed | 368 passed (370)`, exit `1`.**

### M8 — o bloqueador da iteração 2 está morto

É o item que decide esta iteração, e ele passou. A correção é **exatamente** a que a iteração 2
prescreveu (três casos espelhando `useProducts.test.tsx:534-556`), com um quarto de reforço, e a
discriminação é a certa: **das quatro asserções novas, M8 mata as duas do lado `false`** e deixa
passar as duas do lado `true` — que é o comportamento correto, porque `enabled: true` cravado de fato
satisfaz *"`enabled: true` dispara normalmente"* e *"sem `options` o padrão continua ligado"*.

Esses dois casos que M8 **não** mata não são peso morto: eles são a vizinha que impede o conserto
ingênuo na direção oposta (`enabled: false` cravado faria os dois estourarem no `waitFor`). O par
cobre os dois sentidos do interruptor. *(A direção `false` é raciocinada, não medida — não injetei
essa quinta mutação.)*

**E o irmão está coberto (M11).** A pergunta explícita desta iteração — se a cobertura nova cobriu um
e deixou o outro — tem resposta: `useProducts` já tinha o `describe('enabled')` desde antes, e ele
mata a mesma mutação na linha 166. Os dois interruptores do arquivo estão guardados.

### Duas falhas de flake apareceram, e as duas são as documentadas

| Onde | Teste que caiu | Tempo | Por que é flake |
| --- | --- | --- | --- |
| M11 | `PixPayment > QR expirado mostra CTA "Gerar novo código"…` | 1725 ms | Nada a ver com `useProducts.ts` |
| M3 | `alvo de toque > todo controle menor que 44px carrega `TAP_44`` | **5258 ms** | Guarda que **varre disco**, estourando o timeout de 5 s |

**A prova de que são flake é a baseline**: a mesma árvore, sem mutação, deu **2263 passed, 0 failed,
exit `0`** — os dois arquivos incluídos. É a flake de carga que o `CLAUDE.md` registra, e nenhuma
delas altera o veredito das mutações: em M11 e M3 o teste **genuíno** que morreu é nomeado acima.

---

## A árvore mudou no meio da medição — e por que isso importa

**Registrado porque compromete uma medida e porque o modo de falha é do processo, não do código.**

Às **19:16:20**, entre a mutação M12b (log fechado às 19:14:48) e a M14a (19:20:23),
`apps/store/src/entities/product/lib/__tests__/fiacaoDaVitrine.test.ts` **ganhou 65 linhas e 7
casos** — de 19 para 26 — sem passar por commit. **Não fui eu**: os meus scripts só tocam
`useProducts.ts`, `CategoryPage.tsx`, `useProduct.ts`, `ProductGallery.tsx`, `rendition.ts` e
`handlers.ts`, e cada um é desfeito por `git checkout --` com `git status` conferido na volta.

O conteúdo acrescentado é um guarda que fecha **exatamente** a lacuna que eu havia descrito como
hipótese num relatório parcial, ainda **não medida**. O comentário dele diz, com estas palavras:
*"Terceira lacuna da mesma família, achada na iteração 3 da verificação"*.

**Consequência 1 — a M14a virou medida inválida, e foi anulada em vez de reportada.** O `mut2.out`
registra a mutação aplicada (`sizes="(min-width: 768px) 50vw, 100vw"`), e a execução já continha o
guarda novo, cuja asserção `expect(galeria).toMatch(/sizes=\{\s*GALLERY_STAGE_SIZES\s*\}/)`
**precisa** falhar sob essa mutação. A execução reportou **0 falhas**. As duas coisas não podem ser
verdade ao mesmo tempo: a árvore se moveu durante a execução — muito provavelmente a mutação foi
desfeita por atividade de git de terceiro antes do `readFileSync` do guarda. **Número saído de
execução cujas entradas mudaram não é evidência**, e reportá-lo seria pior do que não reportar nada.
Refeito de forma limpa: ver `L-05`.

**Consequência 2 — o veredito cobre os 11 commits, não a árvore de trabalho.** As 8 mutações da
tabela acima são todas **anteriores** às 19:16:20 e não foram afetadas. Mas as 65 linhas novas estão
**fora da faixa `fd4d121..HEAD`**, não têm commit, e nenhum verificador as mediu. **Elas não entram
neste PASS.** Se forem commitadas, `L-05` precisa de passe novo.

**Consequência 3 — a ordem se inverteu.** Escrever a correção a partir de uma hipótese que o
Verifier ainda não mediu desfaz o que o papel existe para dar: a prova de que o guarda **discrimina**
vem da mutação que ele mata, e essa mutação precisa ser medida **antes** do conserto. É a mesma
lição que o `CLAUDE.md` registra sobre baseline anotada de memória, aplicada à verificação.

---

## Auditoria do diff de `913c989` — alguma asserção foi afrouxada?

Lido arquivo a arquivo. **Resposta: não. Nenhuma asserção foi removida ou enfraquecida.**

**O commit toca 9 arquivos, e só dois são de produção — os dois em comentário:**

| Arquivo | Mudança | Veredito |
| --- | --- | --- |
| `entities/product/api/useProducts.ts` | 1 linha: `BL-020` → `BL-025` **dentro de comentário** | ✅ Sem efeito em runtime |
| `entities/product/lib/mapProduct.ts` | 1 linha: `BL-020` → `BL-025` **dentro de comentário** | ✅ Sem efeito em runtime |
| `useProducts.test.tsx` | **+58 linhas, `@@ -758,3 +758,61 @@` — puramente aditivo** | ✅ **Zero linhas removidas** |
| `spec.md`, `context.md`, `design.md` | **só** renumeração `BL-018..021` → `BL-023..026` | ✅ Nada mais tocado |
| `BACKLOG.md` | **+104 / −2** — as 2 removidas são a linha de *Origem* do `BL-022`, reescrita para carregar o fecho | ✅ Aditivo |
| `tasks.md`, `validation.md` | bookkeeping (ver abaixo) | ⚠️ dois resíduos |

**Os 41 casos anteriores de `useProducts.test.tsx` estão intactos**, e isso está medido, não afirmado:

```
casos no arquivo em a1d465d ....... 41
casos no arquivo hoje ............. 45
linhas removidas pelo diff ........  0
```

O `describe` novo entra **depois** da última linha do arquivo antigo (offset 758), e o
`git show … | grep -c "^-[^-]"` devolve **0**. A aritmética fecha: **+4 casos**, que é exatamente o
delta de store que o commit declara (2259 → 2263) e o que eu medi na baseline.

**Nenhum outro arquivo de teste foi tocado pelo commit** — nem no backoffice, nem em `functions`, nem
em `core`, nem em `catalog-import`. Não houve como acomodar a correção apagando prova em outro lugar.

---

## Os identificadores do backlog — onde o erro da iteração 2 nasceu

**Fechado. Os três testes passam.**

**(a) `BL-023`..`BL-026` existem e não colidem.** A sequência do `BACKLOG.md` é contínua e sem
duplicata — conferido por extração dos cabeçalhos e `uniq -d`, que devolve **vazio**:

```
BL-001 … BL-006, BL-00X, BL-007, BL-00Y, BL-00Z, BL-008 … BL-022, BL-023, BL-024, BL-025, BL-026
```

(os três `BL-00X/Y/Z` são marcadores anteriores à convenção e não são novos.) Os quatro novos são os
**últimos quatro**, corretamente anexados, cada um com *Status*, *Registrado em* e *Origem*:

| Id | Título | Confere com o uso? |
| --- | --- | --- |
| `BL-023` | Framer Motion no chunk de entrada: 42 KB gzip para fade-in | ✅ |
| `BL-024` | Paginação, filtro e ordenação da categoria no servidor | ✅ |
| `BL-025` | Busca no servidor, e o teto de 1.000 linhas | ✅ |
| `BL-026` | O cache de um ano nas 3.618 fotos que já estão no Storage | ✅ |

**(b) Nenhuma citação errada sobrou.** Varredura de `BL-018`..`BL-022` em `apps/`, `packages/`,
`supabase/` e `tools/`: **zero ocorrências**. Os dois comentários de produção que a iteração 2 acusou
agora dizem `BL-025`, que é o item certo:

- `entities/product/api/useProducts.ts:36` — *"O fecho de verdade é `BL-025`…"*
- `entities/product/lib/mapProduct.ts:77` — *"…registrada em `BL-025`."*

E nos quatro documentos da feature as citações apontam para o significado certo: `spec.md:40-43`,
`:159`, `:333`; `context.md:53`, `:93-95`; `design.md:227`; `tasks.md:68-69`, `:499`. Os itens
originais `BL-018` (endereços da Nuvemshop), `BL-019` (domínio provisório indexável), `BL-020`
(curadoria de SEO) e `BL-021` (image sitemap) **não foram tocados** e mantêm seus significados.

**(c) `BL-022` está fechado, e o que ele descreve é o que a Fase 3 entregou.** Conferido contra o
código, não contra a promessa:

| O que o `BL-022` descrevia | Estado hoje |
| --- | --- |
| "sem `React.lazy`" | **14** ocorrências de `lazy(` no `App.tsx` |
| "sem `manualChunks`" | `vite.config.ts:79` — `manualChunks: (id) => vendorChunk(id)` |
| "sem `Suspense` nas rotas" | `routeSplitting.test.ts` guarda as rotas dentro do `Suspense` |
| `<Toaster />` do Radix sem consumidor | removido; só o Sonner ficou, com o motivo em comentário |

Os dois guardas que o fecho cita existem e são sérios: `routeSplitting.test.ts` (15 casos,
**bidirecional**, com dois sensores) e `viteChunks.test.ts` (11 casos, âncora dupla e dois sensores,
inclusive *"nenhum pacote é reivindicado por dois grupos"*).

---

## Coerência da spec e do `tasks.md`

### As duas exceções de comportamento descrevem o código de hoje? — **Sim, as duas.**

Conferidas por mim contra o fonte, não herdadas da iteração 2:

| Exceção (`spec.md:322-339`) | Evidência no código | Veredito |
| --- | --- | --- |
| "a busca deixou de casar termo que só aparece na descrição; `description` é o último desempate (**peso 5**)" | `searchProducts.ts:55` — `description: 5`; `:76` — `if (description.includes(term)) return SCORE.description`. E `description` **não** aparece em `PRODUCT_CARD_SELECT` (`mapProduct.ts:78-107`) | ✅ Verdadeira |
| "o `SearchDropdown` ganhou o `enabled` que o `SearchOverlay` já tinha" | `SearchDropdown.tsx:50`; e agora **provado do lado do hook** por M8 | ✅ Verdadeira e **provada** |
| "a lupa de passar o mouse no desktop amplia **720 px**, não 1024" | `ProductGallery.tsx:58` — `const PALCO_PX = 720`; `:107` — `<ImageZoom src={renditionUrl(active.url, PALCO_PX)} …>` | ✅ Verdadeira |
| "o original segue na tela cheia" | `ProductGallery.tsx:213` — o `<img>` do `Dialog` usa `src={active.url}`, sem rendição | ✅ Verdadeira |

### O `tasks.md` ainda contradiz a spec? — **A contradição principal saiu; sobraram dois resíduos.**

**O que `913c989` de fato consertou**, e está bom:

- A seção *"Decisões pendentes do usuário"* virou *"As duas decisões do usuário, **tomadas** em
  2026-09-05 *(já não são pendências)*"*. As duas afirmações falsas — que o `SearchDropdown` "baixa o
  catálogo sem interruptor" e que a regressão "contradiz o critério da spec" — **saíram**.
- O total `6127` saiu. Ele estava errado duas vezes (desatualizado **e** mal somado).

**O que ficou (`L-03` residual, ver Lacunas):** o mesmo defeito de bookkeeping, em outro lugar do
mesmo arquivo — e a baseline envelheceu **de novo**, dentro do próprio commit que a corrigiu.

*Menor, sem consequência de gate*: `design.md` não menciona o interruptor da busca em lugar nenhum —
ele nasceu depois do design, e só existe na spec (como exceção), no código e nos testes. Nenhum dos
três documentos (`spec`, `context`, `design`) crava baseline de teste, o que contém o estrago do
resíduo abaixo a um arquivo só.

---

## Portões — números medidos por mim

**Um workspace por vez, exit code capturado sem pipe.**

| Workspace | Medido por mim | Baseline declarada | Exit |
| --- | --- | --- | --- |
| `@estrelinha/store` | **2263 / 152** | 2263 / 152 | `0` ✅ |
| `@estrelinha/core` | **1524 / 61** | 1524 / 61 | `0` ✅ |
| `@estrelinha/functions` | **370 / 7** | 370 / 7 | `0` ✅ |
| `@estrelinha/catalog-import` | **512 / 23** | 512 / 23 | `0` ✅ |
| `@estrelinha/backoffice` | **1789 / 109** | 1789 / 109 | ⚠️ ver abaixo |
| **Total** | **6458 em 352 arquivos** | — | — |

**Os cinco batem a baseline declarada, item por item.** O total é **6458 em 352**, e ele reconcilia
com a baseline de **entrada** do `CLAUDE.md` (`6139 em 334`) num delta de **+319 testes / +18
arquivos**, distribuído assim: store +262/+17 · core +31/+1 · functions +20/0 · catalog-import +3/0 ·
backoffice +3/0.

> **O backoffice saiu com exit `1` na primeira execução, por timeout, não por asserção.** Caiu
> **1** teste — `CategoryInspector — o prefixo é a URL pública real (URL-03) > nenhum arquivo do
> backoffice escreve o prefixo /categoria/` — em **5993 ms**, contra o teto de 5 s do vitest. É um
> guarda que **varre disco**, é o **mesmo arquivo** que flakou na iteração 2 (lá a 12.194 ms), e a
> contagem total não muda (1788 passados + 1 falho = 1789). Reexecução isolada: ver *Sensor da
> flake*, abaixo.

**Tipos** — `npx tsc --noEmit -p …`, medido por mim:

| Projeto | `error TS` | Exit |
| --- | --- | --- |
| `apps/store/tsconfig.app.json` | **0** | `0` ✅ |
| `apps/backoffice/tsconfig.app.json` | **0** | `0` ✅ |
| `tools/catalog-import/tsconfig.json` | **0** | `0` ✅ |

**Lint** — `pnpm lint`: **27 erros / 5 warnings** — store **2/1**, backoffice **25/4**. Idêntico à
baseline; nada novo. Exit `1`, que é o esperado enquanto a baseline não for zerada.

**Build**: não repetido — ver item 4 da seção *O que este relatório NÃO conseguiu verificar*.

---

## Lacunas ranqueadas

### `L-01` — **FECHADA** ✅

O sobrevivente da iteração 2 morre. `enabled: options?.enabled ?? true` → `enabled: true` em
`useProducts.ts:228` derruba a suíte do store (**2 falhas nomeadas, exit 1**), que era literalmente o
*done when* que a iteração 2 escreveu. E o irmão da linha 166 também está coberto (M11).

### `L-02` — **FECHADA** ✅

`BL-023`..`BL-026` escritos, sem colisão; zero citações erradas em código ou documento; `BL-022`
fechado com o conteúdo conferido contra o que a Fase 3 entregou.

### `L-03` — **fechada em substância, dois resíduos** — *Minor*

Não bloqueia, porque é documentação e porque os números certos estão neste relatório. Mas é o mesmo
modo de falha três vezes seguidas no mesmo arquivo, e o `CLAUDE.md` é explícito sobre ele.

1. **A T19 ainda é chamada de pendente em dois lugares.** `tasks.md:13` — *"T19 pendente de decisão
   do usuário"* — e `tasks.md:28` — *"não executada: … e **espera decisão**"*. A decisão **foi
   tomada** em 2026-09-05 e está registrada três seções abaixo, em `tasks.md:69` (*"Decisão: adiar —
   vira `BL-026`"*), e na `spec.md:152-159`, que risca a AC e a marca **ADIADA**. O arquivo se
   contradiz.
2. **A baseline do `tasks.md` está velha em 4 testes.** `tasks.md:40-41` diz store **2259/152** e
   total **6454 em 352** — números da iteração 2, invalidados **pelo próprio commit que os
   escreveu**, que somou os 4 casos de `useAllProducts`. O medido é store **2263/152**.

*(Formatação, de passagem: a linha da tabela de execução sobre `a1d465d` (`tasks.md:38`) ficou órfã,
separada da tabela por dois outros blocos, e **não há linha nenhuma para `913c989`**.)*

### `L-04` — `PRF-05` AC 3 segue sem implementação — *Minor, decisão já tomada*

Adiada com razão medida e confirmada na iteração 2. Enquanto o passe não roda, o cache de um ano vale
para foto **nova**, e os 3.618 objetos existentes seguem em uma hora. Registrado em `BL-026`.

### `L-05` — o `sizes` da galeria não está **ligado** ao dono único — *Minor, NÃO MEDIDA*

**Levantada por leitura, e deliberadamente não fechada por mim.** É a lacuna que a M14a existia para
medir, e a medição foi anulada — então isto é **hipótese com evidência de leitura**, não achado
provado. Registrada assim de propósito.

O que a leitura mostra, e que é verificável sem executar nada:

- `ProductGallery.tsx:121` lê `sizes={GALLERY_STAGE_SIZES}`, e a edge function `product-page` monta
  `imagesizes` da **mesma** constante (`handlers.ts:146`). São os dois leitores que a constante existe
  para manter iguais.
- `ProductGallery.test.tsx:102` assere o **literal** `'(min-width: 768px) 50vw, 100vw'`, não a
  constante. Isso está **certo** como régua (a régua não pode ser o objeto medido), e pega a mudança
  de **valor**.
- Mas **nenhum arquivo de teste de `apps/store` menciona `GALLERY_STAGE_SIZES`** — conferido por
  varredura. E `renditionSingleOwner.test.ts` **não** cobre `sizes`: o escopo literal dele é a
  construção de URL (`render/image`, `[?&]width=`, `quality=`, `srcSet` literal com descritor `w`).
- Do outro lado, `handlers.test.ts:451` assere `imagesizes` usando `escapeXml(GALLERY_STAGE_SIZES)` —
  **a constante como régua de si mesma** —, e o teste se chama *"o `imagesizes` é o MESMO `sizes` que
  a galeria declara — um dono só"*, mas **nunca lê a galeria**.

**A consequência que isso abriria** — se confirmada por medição — é de dois passos: cravar o literal
na galeria não muda nada hoje (mutante equivalente), mas remove o vínculo; a partir daí, mudar a
constante move o `preload` e **não** move a galeria, o navegador escolhe um candidato do `srcset` para
cada um, e a página baixa **as duas** fotos. Fica pior que sem preload, e as duas suítes seguem
verdes. É exatamente o defeito que o comentário de produção de `rendition.ts:56-60` diz querer evitar.

**Não é bloqueador em hipótese nenhuma**: não há mudança de comportamento hoje. Fica como dívida a
medir.

> **O guarda que existe hoje na árvore de trabalho para isto está FORA deste veredito.** Durante esta
> verificação, 65 linhas e 7 casos foram acrescentados a `fiacaoDaVitrine.test.ts` para fechar
> exatamente esta lacuna — **sem commit, e antes de a lacuna ter sido medida**. Eu não o certifico:
> ele não está na faixa `fd4d121..HEAD`, nenhum verificador o mediu, e a prova de que um guarda
> discrimina é a mutação que ele mata — que precisa vir **antes** dele. Quem o commitar precisa de
> passe novo, com a mutação medida primeiro.

---

## Rastreabilidade

| Requirement | It. 1 | It. 2 | **It. 3** |
| --- | --- | --- | --- |
| PRF-01 | ✅ | ✅ | ✅ Verificado |
| PRF-02 | ✅ | ✅ | ✅ Verificado — M13 morta |
| PRF-03 | ⚠️ | ✅ | ✅ Verificado — M3 e M12 mortas |
| PRF-04 | ✅ | ✅ | ✅ Verificado |
| PRF-05 | ⚠️ | ⚠️ | ⚠️ AC 1-2 verificadas · **AC 3 adiada** (`L-04`) |
| PRF-06 | ❌ | ✅ | ✅ Verificado — M1 morta (2 sensores) |
| PRF-07 | ✅ | ✅ | ✅ Verificado |
| PRF-08 | ❌ | ✅ | ✅ Verificado — M4 morta (4 testes) |
| PRF-09 | ✅ | ⚠️ **L-01** | ✅ **Verificado** — M8 e M11 mortas |
| PRF-10 | ⚠️ | ⚠️ | ⚠️ inalterado — jsdom não mede CLS |
| PRF-11 | ✅ | ✅ | ✅ Verificado |
| PRF-12 | ✅ | ✅ | ✅ Verificado (build da it. 1, validade reconferida) |
| PRF-13 | ✅ | ✅ | ✅ Verificado |
| PRF-14 | ✅ | ✅ | ✅ Verificado |
| PRF-15 | ✅ | ✅ | ✅ Verificado — guarda com âncora dupla e sensor CRLF/LF |
| PRF-16 | ✅ | ✅ | ✅ Verificado |

---

## Sensor da flake — o que reprovou e o que isso vale

Três reprovações apareceram fora das mutações, e **nenhuma é asserção quebrada**:

| Onde | Teste | Tempo | Natureza |
| --- | --- | --- | --- |
| store (M11) | `PixPayment > QR expirado…` | 1725 ms | sem relação com o arquivo mutado |
| store (M3) | `alvo de toque > …carrega TAP_44` | **5258 ms** | guarda que varre disco, teto de 5 s |
| backoffice (baseline) | `CategoryInspector … (URL-03)` | **5993 ms** | idem, e o **mesmo arquivo** da it. 2 |

As duas do store estão desmentidas pela própria baseline: a mesma árvore, sem mutação, deu **2263
passed, 0 failed, exit 0**, com os dois arquivos incluídos.

**A do backoffice fica declarada como NÃO RESOLVIDA.** A reexecução isolada foi enfileirada e
**encerrada antes de rodar**, quando a medição foi interrompida — então eu **não** tenho a prova de
que ela passa sozinha. A contagem total confere (1788 + 1 = 1789/109), o tempo é de timeout e não de
asserção, e o arquivo é o mesmo que flakou na iteração 2 a 12.194 ms — tudo aponta para flake, e nada
disso substitui a execução. Fica com o autor.

---

## Resumo

**Overall**: ✅ **PASS**, com escopo declarado — **os 11 commits de `fd4d121..HEAD`**, e **não** a
árvore de trabalho.

**O critério objetivo desta iteração foi cumprido, e com folga.** A `L-01`, único bloqueador da
iteração 2, está **morta**: `enabled: options?.enabled ?? true` → `enabled: true` em
`useProducts.ts:228` derruba a suíte do store com **2 falhas nomeadas**, que era literalmente o *done
when* escrito pela iteração anterior. As **8 mutações** medidas em árvore íntegra morreram, **8 de 8**:

- as **quatro reinjetadas** da iteração 1 (M1, M3, M4 por amostragem, todas mortas — 2, 1 e 4 falhas),
  confirmando que `913c989` não desfez nada;
- o **irmão** (M11), respondendo a pergunta explícita desta rodada: a cobertura nova **não** cobriu um
  e deixou o outro — os dois interruptores do arquivo estão guardados;
- e as **três novas** (M12, M12b, M13), das quais a M12/M12b é a mais informativa: a mesma linha morre
  na regra pura **e** em duas vitrines independentes.

**`913c989` não afrouxou nada.** `useProducts.test.tsx` foi de **41 para 45** casos com **zero linhas
removidas**; as duas mudanças de produção são **comentário**; `spec`, `context` e `design` só
renumeraram; o `BACKLOG.md` é aditivo (+104/−2). Nenhum outro arquivo de teste do repositório foi
tocado, então não houve onde esconder prova apagada.

**`L-02` está fechada e conferida nos três eixos**: `BL-023`..`BL-026` existem, sem colisão (sequência
sem duplicata); **zero** citações de `BL-018`..`BL-022` sobraram em código ou documento; e `BL-022`
está fechado com o conteúdo batendo contra o código, não contra a promessa.

**`L-03` está fechada em substância, com dois resíduos** — a T19 ainda chamada de pendente em
`tasks.md:13` e `:28`, e a baseline velha em 4 testes. São documentação, os números certos estão neste
relatório, e vão para o checklist abaixo.

**Portões**: **6458 testes em 352 arquivos**, reconciliando +319/+18 contra a entrada de 6139/334 ·
tipos **0 · 0 · 0** · lint **27/5**, idêntico à baseline. Quatro workspaces exit `0`; o backoffice
com a ressalva acima.

**O que este PASS não cobre, e o leitor precisa saber:**

1. **A árvore de trabalho.** Ela carrega, agora, alterações não commitadas que **nenhum verificador
   mediu** — inclusive um guarda escrito para fechar a `L-05` **antes** de a `L-05` ter sido medida.
2. **As mutações M14a e M14b**, anuladas por contaminação e deixadas com o autor.
3. **Navegador, Lighthouse e bytes na rede** — sexta feature seguida sem isso.

---

## O que falta para o fecho

Nada aqui é opcional, e **nada aqui é código de produção** — o código está provado. É tudo prova que
depende de gente, mais duas linhas de bookkeeping.

**Depende de um par de olhos humanos:**

1. **Prova em navegador real, em 390×844 e 1440.** É a lacuna mais cara deste relatório, e ela cresce
   nesta feature: jsdom devolve **0** para toda medida de layout, então `PRF-10` AC 1 ("sem
   deslocamento") está provado como *"a classe `min-h-[60vh]` está presente"*, e o `sizes` de cada
   superfície está provado como **string**. Descrever a vaga errada não quebra teste nenhum.
2. **Lighthouse em aba anônima, perfil móvel, no mesmo aparelho — medindo o ANTES e o DEPOIS.** Não
   basta rodar o depois: `design.md:226` registra que a rodada que **abriu** a feature tinha
   **extensões ativas**, então a linha de partida está inflada e comparar contra ela superestimaria o
   ganho. Os alvos da spec são LCP < 2,5 s e FCP < 2,0 s na home e na categoria.
3. **O peso entregue pela rede.** O ganho que a spec assina como contrapartida da regressão da busca
   — **−214 KB por página** — está provado como *ausência de requisição no dublê* (M8), nunca em
   bytes. Idem os 50 KB da categoria e os 214 KB do catálogo.

**Depende de uma decisão ou de uma medição do autor:**

4. **Medir a `L-05`** (M14a e M14b), e **só então** decidir se o guarda de `GALLERY_STAGE_SIZES`
   entra. Se a mutação não morrer no guarda, ele não prova nada e não deve ser commitado.
5. **Reexecutar o backoffice isolado** e registrar se `CategoryInspector … (URL-03)` passa sozinho.
   Enquanto não passar, o workspace está com exit `1` não explicado.

**Bookkeeping, e o `CLAUDE.md` é explícito sobre o custo de errar aqui:**

6. **Corrigir os dois resíduos do `tasks.md`**: linhas **13** e **28** ainda chamam a T19 de pendente
   (a decisão foi tomada em 2026-09-05, `tasks.md:69` e `spec.md:152-159`); e linhas **40-41** ainda
   dizem store **2259/152 = 6454 em 352**, quando o medido é **2263/152** e **6458 em 352**.
7. **Atualizar a tabela de baselines do `CLAUDE.md`** (hoje em `6139 em 334`) para:

   > **Testes** | **6458 em 352 arquivos** — store 2263/152 · backoffice 1789/109 · core 1524/61 ·
   > functions 370/7 · catalog-import 512/23

   Lint (**27/5**) e tipos (**0 · 0 · 0**) **não mudam**.

**E uma lição de processo, que vale mais que qualquer um dos itens acima:** nesta iteração a árvore
foi editada durante a medição, e um guarda foi escrito a partir de uma hipótese ainda não medida. A
ordem correta é **mutação primeiro, guarda depois** — porque a prova de que um guarda discrimina *é* a
mutação que ele mata. Verificador e autor não podem escrever na mesma árvore ao mesmo tempo; se for
inevitável, o verificador mede em cópia isolada.

---

# Adendo do orquestrador — a `L-05`, medida depois do veredito

**Escrito pelo orquestrador, não pelo Verifier, e identificado como tal.** O veredito acima cobre os
11 commits e **exclui** este trecho, com razão: o guarda de `GALLERY_STAGE_SIZES` foi escrito antes
de a lacuna ser medida, e isso inverte o laço. A prova de que um guarda discrimina **é** a mutação
que ele mata, e ela vem primeiro.

## O erro de processo, sem atenuante

Editei a árvore de trabalho enquanto o Verifier media, e escrevi um guarda a partir de uma hipótese
dele que ainda não tinha número. Isso anulou duas medições dele (M14a e M14b) e o obrigou a limitar
o escopo do veredito. A crítica dele está certa e fica registrada aqui, não no rodapé.

Um dado que ele não tinha, e que explica a sequência sem desculpar a minha parte: **ele deixou a
mutação M14a na árvore ao parar** — `ProductGallery.tsx` estava com o literal —, e o processo dele
reportou `completed` quatro vezes enquanto ainda tinha shells medindo. Concluí que tinha terminado.
A contaminação foi mútua; a inversão do laço foi só minha.

## A medição, agora na ordem certa

Duas execuções, isoladas, com a árvore em estado conhecido antes de cada uma:

| Etapa | Árvore | Mutação | Resultado |
| --- | --- | --- | --- |
| **A** | HEAD commitado, **sem** o guarda | `sizes={GALLERY_STAGE_SIZES}` → literal idêntico | **2270 → 2263 passam, exit 0** — o artefato commitado **NÃO pega** |
| **B** | HEAD + o guarda | a mesma mutação | **2 falham, exit 1** — o guarda **mata** |

A Etapa A é a prova que faltava: `L-05` deixa de ser hipótese com evidência de leitura e passa a ser
**achado medido**. O artefato commitado não distingue a constante do literal idêntico.

As duas asserções que morrem na Etapa B:

- `e o `sizes` do palco É a constante — nunca uma string literal`
- `nenhum `sizes` do palco é literal com media query — o literal é o defeito`

## Por que a lacuna importa, apesar de o mutante ser equivalente hoje

O Verifier classificou M14a como **mutante equivalente** — saída renderizada idêntica —, e está
certo. O valor é diagnóstico, e o estrago é futuro:

A edge function `product-page` injeta `<link rel="preload" imagesizes="…">` a partir de
`GALLERY_STAGE_SIZES`. Com a galeria presa a um literal, mudar a constante move o `preload` e **não**
move a galeria. Aí o navegador escolhe um candidato do `srcset` para o preload e **outro** para o
`<img>`, e baixa as **duas** fotos — pior que não ter preload nenhum.

O teste da edge function chamado *"o `imagesizes` é o MESMO `sizes` que a galeria declara — um dono
só"* **nunca lê a galeria**: usa a constante como régua de si mesma. `renditionSingleOwner.test.ts`
cobre só construção de URL, nunca `sizes`. O guarda novo é a ponta que faltava.

## O que este adendo NÃO é

Não é uma auto-certificação. É uma medição minha, com os dois lados escritos, feita depois do
veredito e fora dele. **Quem for fechar a feature deve tratar o guarda de `L-05` como código não
verificado por terceiro** e passar um olhar fresco nele — o mesmo que o Verifier pediu.
