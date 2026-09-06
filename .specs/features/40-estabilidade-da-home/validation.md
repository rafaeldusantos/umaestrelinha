# Estabilidade da home — Validação independente

> **Verificador ≠ autor.** Este relatório foi produzido por um agente **distinto** do que
> implementou a feature, sem herdar o modelo mental dele. Régua: **evidência ou zero** — nada
> aprovado por parecer certo, só por medida. Toda linha de "como medi" abaixo é comando que rodou de
> verdade, com o exit code capturado **fora** de pipe.
>
> **Data:** 2026-09-06 · **Árvore:** `master`, sem commit (convenção `BL-012`) · **10 arquivos
> modificados + 5 não rastreados.**

## Veredito: **PASS com ressalvas**

O que a feature promete está implementado, e os quatro defeitos que a spec nomeia foram de fato
corrigidos no código. **Sete dos dez guardas discriminam de verdade** — provados por mutação real
injetada no código de produção. Mas **três mutantes sobreviveram à suíte inteira**, e os três ficam
exatamente em cima de um acceptance criterion:

- **PRF-17 AC 1** está provado no widget e **não** no ponto onde ele é ligado (`HomeCollectionRow`).
  Apagar `loading={isLoading}` deixa 2531/2531 verdes — e devolve o CLS 0,244 inteiro.
- **PRF-20 AC 1/AC 2** provam que as quatro fileiras compartilham **uma** chave, não que ela é
  **`['categories']`, a do header**. Trocar por uma chave privada mantém a suíte verde e a home
  volta a pagar **duas** requisições em vez de uma.
- **PRF-19 AC 1** só enxerga `opacity: 0` dentro de um variant `hidden:`. Devolver a mesma
  invisibilidade ao `<motion.p>` do LCP pela via idiomática do framer-motion
  (`initial={{ opacity: 0 }}`) passa em silêncio.

Nenhuma das três é defeito **no código de hoje** — o código está certo. As três são **buracos de
guarda**: o sintoma de cada uma é meio segundo de LCP ou um salto de layout, que não aparece em diff
nenhum, não quebra build, `tsc` nem teste de componente, e só reaparece na próxima auditoria
Lighthouse. É a definição de defeito que este repositório escreve guarda para pegar.

Some-se a isso que **a prova em navegador não foi feita** e que **as baselines do `CLAUDE.md` não
foram atualizadas** (item 7 do gate da própria `tasks.md`).

---

## 1. Verificação ancorada na spec

Legenda: **✅** provado pelo resultado que a spec define · **⚠️** provado parcialmente, ou provado num
ponto que não é o que a AC descreve · **📏** gap de precisão da spec.

| AC | O que a spec exige | Prova (arquivo:linha) | Mutante que a derruba | Veredito |
| --- | --- | --- | --- | --- |
| **PRF-17 · 1** | fileira **carregando** desenha seção + título + 1 esqueleto por vaga | `ProductCarousel.test.tsx:166`, `:174`, `:180` | **M1** ✔ (no widget) · **M3 SOBREVIVE** (na fileira real) | ⚠️ |
| **PRF-17 · 2** | consulta **resolvida sem produto** continua `null` | `ProductCarousel.test.tsx:188` | **M1** ✔ | ✅ |
| **PRF-17 · 3** | esqueleto declara as mesmas classes de caixa do card | `cardSkeletonBox.test.ts:90` (`it.each` das 4 medidas) | **M8** ✔ · **M8b** ✔ | ✅ 📏 |
| **PRF-17 · 4** | guarda lê **os dois arquivos do disco** e compara | `cardSkeletonBox.test.ts:80`, `:85` (âncora dupla) | **M8** / **M8b** ✔ | ✅ |
| **PRF-18** | a bolha sai do fluxo, ancorada acima do botão; a caixa do contêiner não muda | `WhatsAppFloat.test.tsx:136`, `:143`, `:149` | **M7a** ✔ | ✅ |
| **PRF-19 · 1** | nenhum filho animado do hero nasce em `opacity: 0` | `heroSemOpacidadeZero.test.ts:62` | **M4a** ✔ · **M4c SOBREVIVE** | ⚠️ |
| **PRF-19 · 2** | a entrada usa **apenas `transform`** (deslize em `y`) | `heroSemOpacidadeZero.test.ts:71` | **M4b** ✔ (apagar a animação **reprova**) | ✅ |
| **PRF-19 · 3** | guarda lê `HeroBanner.tsx` do disco | `heroSemOpacidadeZero.test.ts:52`, `:56` (âncora) | **M4a** ✔ | ✅ |
| **PRF-20 · 1** | a árvore vem da **mesma chave do header** (`['categories']`) | — nenhuma asserção sobre o valor da chave | **M5b SOBREVIVE** | ⚠️ |
| **PRF-20 · 2** | a home registra **uma** requisição a `categories` **no total** | `useProducts.test.tsx:776` — conta `from('categories')` de verdade, não a forma da chave | **M5** ✔ · **M5b SOBREVIVE** | ⚠️ |
| **PRF-20 · 3** | a forma de buscar muda **num lugar só** (fábrica exportada) | `useCategories.ts:103` (`categoriesQueryOptions`) + `categoryTreeSingleOwner.test.ts:99` | **M9** ✔ | ✅ |
| **PRF-20 · 4** | nenhum arquivo de `apps/store/**` fora da fábrica faz `from('categories')` | `categoryTreeSingleOwner.test.ts:99` (escopo literal, âncora dupla) | **M9** ✔ (nomeia o arquivo infrator) | ✅ |
| **PRF-20 · 5** | slug que não casa continua devolvendo vazio (`URL-04`) | `useProducts.test.tsx:485` — teste pré-existente, agora atravessando o caminho novo | — | ✅ |
| **A11Y-01** | o nome da loja mede **≥ 4,5:1** contra o branco | `arbitraryTextColor.test.ts:153` (**conta o valor**, não troca de classe) + `:169` (`4,88:1`) + `:140` (amarra o allowlist ao valor **que está no código**) | **M7b** ✔ | ✅ |
| **A11Y-02 · 2** | cor de texto arbitrária fora do allowlist reprova | `arbitraryTextColor.test.ts:140` | **M10** ✔ | ✅ |
| **A11Y-02 · 3** | âncora de contagem: varrer zero arquivo reprova | `arbitraryTextColor.test.ts:130` (`> 200`) e `:134` | — | ✅ |

### As respostas às quatro perguntas dirigidas

**PRF-20 AC 2 — o teste prova "uma requisição no total", ou só que a chave é compartilhada?**
Prova **mais** que a forma da chave e **menos** que o total. `useProducts.test.tsx:776` conta
chamadas reais a `supabase.from('categories')` num `QueryClient` compartilhado — dar chave própria
por slug (**M5**) o derruba. Mas ele monta **só as quatro fileiras**: nunca monta o `useCategories`
do header. Uma chave compartilhada entre as quatro **e diferente** da do header (**M5b**) faz o teste
medir 1 e a home real pagar 2. O que a AC promete — "uma no total, a do header" — não está guardado.

**PRF-17 AC 2 — o teste distingue "vazio resolvido" de "carregando"?**
**Sim, e é o par que faz a distinção.** `:188` (`loading: false`, `products: []`) exige
`container.textContent === ''`; `:166` (`loading: true`, mesmos `products: []`) exige seção, título e
4 esqueletos. Mesmíssima entrada de dados, veredito oposto — não há como um passar sem o outro
reprovar. **M1** confirmou: reverter a guarda de saída derruba 3 casos.

**PRF-19 — o guarda prova que a animação CONTINUA existindo, ou só que a opacidade sumiu?**
**Prova que continua.** `heroSemOpacidadeZero.test.ts:71` casa a **forma exata**
(`/hidden\s*:\s*\{\s*y\s*:\s*\d+\s*\}/` e `/show\s*:\s*\{\s*y\s*:\s*0/`). **M4b** (apagar a animação
inteira, `hidden: {}`) **reprova**. Melhor ainda: como a régua é de forma fechada, acrescentar
qualquer coisa ao variant — `filter`, `scale` — também reprova, que é o que a AC 2 pede.

**A11Y-01 — existe prova numérica, ou só a troca da classe?**
**Numérica.** O arquivo carrega a matemática WCAG escrita à mão (`arbitraryTextColor.test.ts:82-118`)
e `:153` computa a razão de **cada** valor do allowlist contra o fundo declarado, exigindo ≥ 4,5. Os
sensores fixam os dois números: `3,22:1` para o antigo (`:162`), `4,88:1` para o novo (`:169`). E
`:140` fecha o laço amarrando o allowlist ao valor **que a varredura achou no código** — não a uma
constante repetida. Confirmei à mão que os fundos declarados são os reais: o verde vive sobre
`bg-white` (`WhatsAppFloat.tsx:71`+) e o terracota `#9E4A3E` sobre `bg-[#F7EDE8]` nos **três** usos
(`MaterialFicha.tsx:31-34`, `ShippingSection.tsx:65-66` e `:97-98`).

### Gaps de precisão da spec (📏)

- **PRF-17 AC 3 diz `min-h-[40px]` "nos dois lados"; o guarda mapeia card `min-h-[40px]` ↔ esqueleto
  `h-[40px]`.** A divergência é **deliberada e bem argumentada** no próprio teste
  (`cardSkeletonBox.test.ts:44-52`: o card reserva duas linhas para um nome que pode ter uma; o
  esqueleto tem conteúdo fixo). O código está certo, a spec é que ficou desatualizada. Registrar na
  tabela de assunções da `spec.md`.
- **`tasks.md` T05 diz "contêiner fixo ganha `relative`"; a implementação não o acrescentou** e o
  teste assere `fixed` (`WhatsAppFloat.test.tsx:149`). Está **correto** — `position: fixed` já é
  bloco de contenção, e `relative` seria ruído. Texto de tarefa velho, não defeito.
- **PRF-18 diz "a caixa do contêiner SHALL NOT mudar de tamanho".** jsdom devolve 0 para toda medida
  de layout, então isso é inasseriável; o que se mede é a **forma** (`absolute` + `bottom-full` +
  `mb-3`). Proxy legítimo pela convenção do projeto — mas só um navegador prova o resultado.

### Fora de escopo da spec, encontrado no diff

`useCategories` deixou de engolir o erro (`if (error || !data) return []` → `throw
CategoryQueryError`). **Nenhuma AC pediu isso**, e é mudança de contrato para **12 telas**
consumidoras. Está bem argumentada (`AD-014`/`BUG-20260809`), guardada por dois casos
(`useCategories.test.tsx:177` e `useProducts.test.tsx:536`, os dois derrubados por **M6**), e
verifiquei que é **segura**: na falha `data` passa a ser `undefined`, que é exatamente o que os 12
consumidores já recebem durante o carregamento — todos tratam (`categories ?? []`, ou assinatura
`readonly T[] | undefined` nos helpers de `core`). Registro como escopo excedente **defensável**, não
como risco.

---

## 2. Sensor de discriminação — mutação real

Cada mutante foi injetado no **código de produção**, medido, e **revertido**. Sobreviventes foram
reconfirmados contra a **suíte inteira** (165 arquivos), não contra um subconjunto.

| # | Mutação | Arquivo | Suíte reprovou? | Comando |
| --- | --- | --- | --- | --- |
| **M1** | `products.length === 0 && !loading` → `products.length === 0` | `ProductCarousel.tsx` | **SIM** — 3 casos | `npx vitest run src/widgets/product-carousel src/widgets/home-collections` |
| **M2** | `Array.from({ length: skeletonCount }` → `length: 4` | `ProductCarousel.tsx` | **SIM** — 1 caso (o do banner) | idem |
| **M3** | apaga `loading={isLoading}` | `HomeCollectionRow.tsx` | **NÃO — SOBREVIVEU** (2531/2531 ✅) | `npx vitest run --reporter=dot` (suíte inteira) |
| **M3b** | apaga `skeletonCount={vagas}` | `HomeCollectionRow.tsx` | **NÃO — SOBREVIVEU** (31/31 arquivos que alcançam o componente) | `npx vitest run src/widgets/home-collections src/widgets/product-carousel src/pages` + `src/app src/widgets/collection-feature src/widgets/home-sections` |
| **M4a** | `hidden: { y: 20 }` → `hidden: { opacity: 0, y: 20 }` | `HeroBanner.tsx` | **SIM** — 2 casos | `npx vitest run src/widgets/hero-banner` |
| **M4b** | apaga a animação inteira: `hidden: {}` | `HeroBanner.tsx` | **SIM** — 1 caso ("a animação CONTINUA existindo") | idem |
| **M4c** | `<motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}>` — **o mesmo defeito, pela via idiomática** | `HeroBanner.tsx` | **NÃO — SOBREVIVEU** (2531/2531 ✅) | suíte inteira |
| **M5** | `fetchQuery` com chave por slug (`['categories', slug]`) | `useProducts.ts` | **SIM** — 1 caso (`PRF-20`) | `npx vitest run src/entities/product/api src/entities/category/api src/shared/lib/__tests__/categoryTreeSingleOwner.test.ts` |
| **M5b** | `fetchQuery` com chave **compartilhada mas privada** (`['categories-tree']`) | `useProducts.ts` | **NÃO — SOBREVIVEU** (2531/2531 ✅) | suíte inteira |
| **M6** | `throw CategoryQueryError` → `if (error \|\| !data) return []` | `useCategories.ts` | **SIM** — 2 casos, em **dois** arquivos | `npx vitest run src/entities/category src/entities/product/api` |
| **M7a** | apaga `absolute bottom-full right-0 mb-3` do teaser | `WhatsAppFloat.tsx` | **SIM** — 2 casos | `npx vitest run src/widgets/whatsapp-float` |
| **M7b** | verde volta a `text-[hsl(142_70%_38%)]` | `WhatsAppFloat.tsx` | **SIM** — 1 caso (`A11Y-02`) | `npx vitest run src/widgets/whatsapp-float src/shared/lib/__tests__/arbitraryTextColor.test.ts src/shared/lib/__tests__/contrast.test.ts` |
| **M8** | o **card** perde `min-h-[40px]` | `ProductCard.tsx` | **SIM** — 3 casos (2 do guarda novo + 1 do `COR-09`) | `npx vitest run src/entities/product/ui` |
| **M8b** | o **esqueleto** troca `aspect-[4/5]` por `aspect-square` | `ProductCardSkeleton.tsx` | **SIM** — 2 casos (bidirecional confirmado) | idem |
| **M9** | recaída de `from('categories')` num widget distante do dono | `HomeCollectionRow.tsx` | **SIM** — o guarda **nomeia o arquivo** | `npx vitest run src/shared/lib/__tests__/categoryTreeSingleOwner.test.ts` |
| **M10** | `text-[#8ab4f8]` num arquivo distante | `HeroBanner.tsx` | **SIM** — o guarda **nomeia o arquivo e o valor** | `npx vitest run src/shared/lib/__tests__/arbitraryTextColor.test.ts` |

**Placar: 13 mortos, 3 sobreviventes.** As três sobrevivências foram confirmadas **na suíte
completa**, numa execução em que M3b, M4c e M5b estavam aplicados ao mesmo tempo e os
**2531/2531 passaram** — logo nenhum teste pega nenhum dos três.

**Todas as mutações foram revertidas.** `git status --porcelain` fecha exatamente nos 10 modificados
+ 5 não rastreados esperados; `ProductCard.tsx` e `ProductCardSkeleton.tsx` voltaram a **não
aparecer** na lista, e cada arquivo mutado foi conferido por `git diff --stat` contra a contagem de
linhas pós-implementação.

---

## 3. Gate de baseline

Medido **um workspace por vez**, exit code capturado **fora** de pipe, com a árvore já revertida.

| Medida | Baseline anterior | Medido agora | Veredito |
| --- | --- | --- | --- |
| **store** | 2490 / 161 | **2531 / 165** (`EXIT=0`) | **+41 / +4** — confere com o alegado pelo autor |
| **backoffice** | 1946 / 118 | **1946 / 118** (`EXIT=0`) | inalterado ✅ |
| **core** | 1728 / 68 | **1728 / 68** (`EXIT=0`) | inalterado ✅ |
| **functions** | 370 / 7 | **370 / 7** (`EXIT=0`) | inalterado ✅ |
| **catalog-import** | 512 / 23 | **512 / 23** (`EXIT=0`) | inalterado ✅ |
| **TOTAL** | 7046 / 377 | **7087 / 381** | **+41 / +4** |
| **Lint** | 27 erros / 5 warnings | **27 / 5** — store `2 errors, 1 warning`, backoffice `25 errors, 4 warnings` | sem regressão ✅ |
| **Tipos (store)** | 0 | **0** (`npx tsc --noEmit -p apps/store/tsconfig.app.json`, `EXIT=0`) | ✅ |
| **`packages/core/src/payment/**`** | intocado | **intocado** (`git status --porcelain \| grep payment` → vazio) | ✅ |

Os **+41 casos** se distribuem em **31 nos 4 arquivos novos** — `cardSkeletonBox` 8,
`arbitraryTextColor` 11, `categoryTreeSingleOwner` 5, `heroSemOpacidadeZero` 7, medidos juntos
(`Tests 31 passed`) — e **10 em 4 arquivos que cresceram**: `ProductCarousel.test.tsx` +5,
`WhatsAppFloat.test.tsx` +3, `useCategories.test.tsx` +1 e `useProducts.test.tsx` +1.
**Nenhuma queda de contagem** — nenhuma exceção do tipo que a regra de leitura da baseline exige
declarar.

**Comandos, na ordem em que rodaram:**

```bash
cd apps/store        && npx vitest run --reporter=dot 2>&1 | grep -E "Test Files|Tests " ; echo "EXIT=${PIPESTATUS[0]}"
cd apps/backoffice   && npx vitest run --reporter=dot 2>&1 | grep -E "Test Files|Tests " ; echo "EXIT=${PIPESTATUS[0]}"
cd packages/core     && npx vitest run --reporter=dot 2>&1 | grep -E "Test Files|Tests " ; echo "EXIT=${PIPESTATUS[0]}"
cd supabase          && npx vitest run --reporter=dot 2>&1 | grep -E "Test Files|Tests " ; echo "EXIT=${PIPESTATUS[0]}"
cd tools/catalog-import && npx vitest run --reporter=dot 2>&1 | grep -E "Test Files|Tests " ; echo "EXIT=${PIPESTATUS[0]}"
npx tsc --noEmit -p apps/store/tsconfig.app.json ; echo "EXIT=$?"
pnpm lint
```

---

## 4. Lacunas, em ordem de custo

### 1 — `HomeCollectionRow` não tem guarda de fiação (**fura PRF-17 AC 1**) · alta

**M3** e **M3b** sobrevivem à suíte inteira. `HomeCollectionRow.test.tsx` mocka `useProducts` com
`{ data: [...] }` — sem `isLoading` —, então `loading` chega `undefined` em todos os 6 casos e
`skeletonCount` nunca é observado. Apagar as duas props deixa **2531/2531 verdes** e devolve
**CLS 0,244**, que é o número inteiro que a feature existe para zerar.

O repositório já reconhece esta família de defeito: `fiacaoDaVitrine.test.ts` existe exatamente
porque "a página parar de passar `index` para o card" não quebrava nada.

**Correção sugerida** — dois casos em
`apps/store/src/widgets/home-collections/ui/__tests__/HomeCollectionRow.test.tsx`, mockando
`ProductCarousel` para capturar as props (ou `useProducts` devolvendo
`{ data: undefined, isLoading: true }`):

1. carregando, a fileira passa `loading` **verdadeiro** e `skeletonCount === 4`;
2. carregando **com banner**, `skeletonCount === 3` — e não `CARDS`.

### 2 — a chave de `categories` não é asserida (**fura PRF-20 AC 1 e enfraquece a AC 2**) · alta

**M5b** sobrevive à suíte inteira. Nenhum teste do repositório assere que a chave é `['categories']`,
e nenhum monta o `useCategories` do header ao lado das fileiras. O que está provado é "as quatro
fileiras se fundem", não "elas se fundem **com o header**" — que é a metade que economiza a
requisição.

**Correção sugerida** — a mais barata primeiro:

- em `useCategories.test.tsx`, um caso de uma linha:
  `expect(categoriesQueryOptions().queryKey).toEqual(['categories'])`;
- e, para medir o resultado em vez da forma, em `useProducts.test.tsx:776`: montar
  `renderHook(() => useCategories(), { wrapper: wrap })` junto das quatro fileiras, no mesmo cliente,
  e manter `expect(consultasDeCategoria()).toBe(1)`. Aí o teste passa a medir literalmente o que a
  AC 2 escreve: **uma no total**.

### 3 — o guarda do hero é cego à opacidade inline (**fura PRF-19 AC 1**) · média

**M4c** sobrevive à suíte inteira. `nasceInvisivel` só inspeciona `hidden: { … }`; um
`initial={{ opacity: 0 }}` direto no `<motion.p>` — a forma que a documentação do framer-motion
ensina primeiro — reintroduz **o defeito exato** que a feature mediu em 2005 ms de
`elementRenderDelay`, em silêncio. A AC 3 fala em "variant", então tecnicamente está cumprida; a
AC 1 diz "nenhum de seus filhos animados", e essa não está.

**Correção sugerida** — estender o predicado em
`apps/store/src/widgets/hero-banner/ui/__tests__/heroSemOpacidadeZero.test.ts` para casar também
`initial=\{\{ … opacity: 0 … \}\}` e `initial: { opacity: 0 }`, com um sensor ao lado provando que a
forma nova reprova (o próprio M4c serve de fixture).

### 4 — a spec diz `min-h-[40px]` nos dois lados; o guarda usa `h-[40px]` no esqueleto · baixa

Divergência **deliberada e certa** no código. Falta só registrá-la na tabela de assunções da
`spec.md`, para que a próxima leitura da AC 3 não pareça um guarda afrouxado.

### 5 — o par (texto, fundo) do `arbitraryTextColor` é declarado, não derivado · baixa

O allowlist carrega o fundo escrito à mão. Conferi os três usos do terracota e o do verde e **todos
batem** hoje — mas nada impede que um uso futuro do mesmo valor sobre outro fundo entre pelo allowlist
já existente sem medir nada. Não vale código agora; vale a nota de limite.

### 6 — baselines do `CLAUDE.md` não atualizadas (item 7 do gate da `tasks.md`) · processo

Nem o `CLAUDE.md` da raiz nem o `apps/store/CLAUDE.md` foram tocados. Os números medidos para o
autor escrever: **store 2531/165**, total **7087 em 381**, lint **27/5**, tipos **0·0·0**. E a tabela
"Os guardas" da raiz precisa das quatro linhas novas (`cardSkeletonBox`, `heroSemOpacidadeZero`,
`categoryTreeSingleOwner`, `arbitraryTextColor`).

### 7 — nenhuma prova em navegador · processo

**É a lacuna mais grave em natureza, ainda que a mais previsível.** Tudo o que esta feature entrega —
CLS, LCP, e o número de requisições na cascata — é **exatamente o que jsdom não mede** (`jsdom
devolve 0 para toda medida de layout`). Cada asserção deste relatório é proxy de forma. A `spec.md`
escreve isso ela mesma: "a prova final é em viewport 390×844, com rede lenta simulada", e ela não
consta da árvore.

O que falta medir, e que só o navegador responde:

- CLS da home em 390×844, Slow 4G, 4× CPU — a spec afirma `0,244 → ~0`;
- a cascata de rede: **uma** linha `categories`, e as quatro `products` disparando juntas;
- o LCP do `<p>` do hero, com o `elementRenderDelay` que era 2005 ms;
- a bolha do WhatsApp entrando aos 2,2 s **sem** mover o botão;
- a fileira carregando ao lado da fileira carregada, na mesma altura (os 431px que o
  `ProductCardSkeleton` documenta).

Entra na fila de pendências de verificação independente do projeto, ao lado da `39`, `37`, `35`,
`34`, `33` e `32`.

---

## Anexo — o que NÃO mudou e foi conferido

- `packages/core/src/payment/**`: zero linhas (`git status --porcelain`).
- `apps/backoffice`, `packages/core`, `supabase/functions`, `tools/catalog-import`: zero arquivos no
  diff, e as quatro suítes remedidas assim mesmo — todas idênticas à baseline.
- `contrast.test.ts` continua passando **sem alteração**, como a T06 exigia.
- Os 12 consumidores de `useCategories` foram lidos um a um: nenhum quebra com `data === undefined`.

---

# Rodada 2 — correção das lacunas (autor, 2026-09-06)

O Verifier reprovou **três mutantes sobreviventes**, cada um em cima de um AC. Os três foram
corrigidos, e cada correção foi provada **reinjetando a mutação original** e vendo a suíte cair.

| # | Lacuna | AC | Correção | Mutação reinjetada | Resultado |
| --- | --- | --- | --- | --- | --- |
| 1 | `HomeCollectionRow` sem guarda de fiação | PRF-17 AC 1 | 3 casos em `HomeCollectionRow.test.tsx`, pelo `ProductCarousel` **real** | apagar `loading={isLoading}` | **2 reprovam** |
| | | | | apagar `skeletonCount={vagas}` | **1 reprova** |
| 2 | Chave de `categories` nunca asserida | PRF-20 AC 1 | 2 casos: a chave é `['categories']`, e o **header montado junto** das quatro fileiras soma 1 | `queryKey: ['category-tree']` (compartilhada, privada) | **reprova — "expected 2 to be 1"** |
| 3 | Guarda do hero cego à opacidade inline | PRF-19 AC 1 | régua deixou de ancorar em `hidden: {…}` e passou a ser `opacity: 0` em **qualquer** lugar do arquivo, + 2 sensores | `<motion.p initial={{ opacity: 0 }}>` | **reprova** |

A lacuna 4 (a divergência `min-h-[40px]` × `h-[40px]`) virou linha na tabela de assunções da
`spec.md`, como o Verifier pediu. As lacunas 5 e 6 estão fechadas: o allowlist de cor foi conferido
valor a valor na rodada 1, e as baselines estão atualizadas abaixo.

## Baselines depois da rodada 2

| Medida | Antes | Depois | Δ |
| --- | --- | --- | --- |
| store | 2490 / 161 | **2538 / 165** | **+48 / +4** |
| backoffice | 1946 / 118 | 1946 / 118 | — |
| core · functions · catalog-import | 1728/68 · 370/7 · 512/23 | idênticos | — |
| lint | 27 / 5 | **27 / 5** | — |
| tipos (store) | 0 | **0** | — |

Medidas **um workspace por vez**, com exit code capturado fora de pipe.

## O que continua em aberto

**A prova em navegador não foi feita** — e ela importa mais nesta feature que na média, porque tudo
o que a `40` entrega é exatamente o que jsdom não mede: deslocamento, tempo de pintura e cascata de
rede. Toda asserção deste relatório é **proxy de forma**.

O que falta medir, em 390×844 com Slow 4G e 4× CPU:

1. CLS da home — a spec afirma `0,244 → ~0`;
2. a cascata: **uma** linha `categories`, e as quatro `products` disparando juntas;
3. o LCP do `<p>` do hero, cujo `elementRenderDelay` era 2005 ms;
4. a bolha do WhatsApp entrando aos 2,2 s **sem** mover o botão;
5. a fileira carregando ao lado da carregada, na mesma altura (os 431px do `ProductCardSkeleton`).
