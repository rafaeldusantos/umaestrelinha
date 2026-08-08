# Validação — `07-product-catalog-admin`, Fase 4 (T17 → T20)

**Data:** 2026-08-01 · **Modo:** *standalone* (ver Limitação declarada) · **Veredito: PASS**
**Escopo:** requisitos `VAR-11 (AC 2, 4)`, `PST-05`, `PST-06`, `PST-07`, `PST-08`, `PST-10`
**Diff coberto:** working tree contra `7958669` (`docs(specs): fecha a Fase 3 da 07 no handoff`)

---

## Limitação declarada

O `SKILL.md` pede um **Verifier em sub-agente fresco** (autor ≠ verificador). Esta sessão está sob
instrução explícita de **não** invocar sub-agentes, então rodou o **fallback standalone** previsto na
própria Skill: a mesma checagem ancorada na spec e o mesmo sensor de discriminação, executados pelo
autor. O que isso **não** compra é independência de modelo mental — um buraco que o autor não vê por
ser autor, o autor continua não vendo. O que **compra**, e é o que importa mais aqui, é a prova
determinística: as 13 mutações abaixo são medidas, não opinião.

---

## Gate (MEDIDO)

| Comando | Resultado |
| ------- | --------- |
| `pnpm test` | exit 0 — **1322** testes: core 477 · store **495** · functions 232 · backoffice **118** |
| `pnpm build` | exit 0 nos dois apps |
| `pnpm lint` | **37 err / 16 warn** (backoffice 32/8 · store 5/8). Baseline era **41/16** — *nenhum* problema novo, e 4 erros a menos |
| `tsc --noEmit -p apps/store/tsconfig.app.json` | **0 erros** (era 7 no início da fase) |
| `tsc --noEmit -p apps/backoffice/tsconfig.app.json` | **13 erros** (era 16; os 9 restantes são de `VariantsTable`, da feature `11`) |

Delta de testes da fase: **+84** (store +77, backoffice +7).

---

## Checagem ancorada na spec (evidence-or-zero)

Cada AC no escopo da fase, com o `file:line` da asserção e o valor que a spec define.

### VAR-11 — helper de imagens e os 12 leitores (P1.1b)

| AC | `file:line` + asserção | Resultado esperado pela spec | Coberto? |
| -- | ---------------------- | ---------------------------- | -------- |
| AC 1 — helper aceita `string[]` **ou** `{url,alt,source}[]` | `apps/store/src/entities/product/api/__tests__/useProducts.test.tsx:114` — `expect(mapped.images).toEqual([{ url: 'legado.webp', alt: null, source: 'upload' }])` | string vira `{url, alt:null, source:'upload'}` | ✅ |
| AC 1 (idem, página) | `useProduct.test.tsx:132` — `expect(result.current.data!.images).toEqual([{url:'legado.webp',alt:null,source:'upload'}])` | idem | ✅ |
| AC 2 — leitores migrados (mapper da loja) | `useProducts.test.tsx:88` — `expect(mapped.images).toEqual([{url:'sailor.webp',alt:'Botton da Lua',source:'mockup'}])` · `:104` — `expect(...image_url).toBe('primeira.webp')` | jsonb preservado; `image_url` = **url** da primeira | ✅ |
| AC 2 — galeria usa `alt` quando existe | `ProductGallery.test.tsx:27` — `expect(screen.getAllByAltText('Botton da Lua Prateada').length).toBeGreaterThan(0)` | o `alt` cadastrado vence o genérico | ✅ |
| AC 2 — galeria renderiza `url`, não o objeto | `ProductGallery.test.tsx:45` — `sources.forEach(src => expect(src).toBe('https://cdn.nanapin/sailor.webp'))` | `src` é a URL | ✅ |
| AC 3 — sem imagem: lista vazia, nada de `undefined` em `src` | `ProductGallery.test.tsx:51` — `expect(container.querySelectorAll('img')).toHaveLength(0)` · `useProducts.test.tsx:125-126` — `expect(mapped.images).toEqual([])` / `expect(mapped.image_url).toBe('')` | zero `<img>`; `''` nunca `undefined` | ✅ |
| AC 4 — payload de save é `jsonb`, nunca `string[]` | `apps/backoffice/src/features/product-form/lib/imagePayload.test.ts:11` — `expect(toImagePayload(['a.webp'], meta())).toEqual([{ url:'a.webp', alt:null, source:'upload' }])` · `:61` — `expect(Object.keys(image).sort()).toEqual(['alt','source','url'])` | objeto com as 3 chaves | ✅ |
| AC 4 — extra: `alt` cadastrado sobrevive a um save que não tocou imagem | `imagePayload.test.ts:21` — `expect(payload[0].alt).toBe('Botton Sailor Moon — Lua Prateada')` | *(não especificado — ver Achados)* | ⚠️ além da spec, deliberado |

**Grep de conferência:** `images?.[0]` / `images[0]` — **zero** ocorrências em `apps/` e `packages/`.

### PST-05 — eixos genéricos (P1.2b AC 1-2)

| AC | `file:line` + asserção | Resultado esperado | Coberto? |
| -- | ---------------------- | ------------------ | -------- |
| AC 1 — seletores de `options` na ordem de `position`, até 3 | `variantSelection.test.ts:61` — `expect(ordered.map(o=>o.name)).toEqual(['Tamanho','Cor','Acabamento'])` · `:80` — `visibleOptions(options, PAGE_MAX_AXES)` = 3 primeiros | ordem de `position`, teto 3 | ✅ |
| AC 1 — a **página** mostra os 3 | `VariantSurfaces.test.tsx:177` — `expect(labels).toEqual(['Tamanho','Acabamento','Cor'])` | 3 seletores rotulados pelos eixos | ✅ |
| AC 2 — card mostra 2 | `VariantSurfaces.test.tsx:108-109` — `getByLabelText('Tamanho')` + `getByLabelText('Acabamento')` · `variantSelection.test.ts:93` | os 2 primeiros por `position` | ✅ |
| AC 2 — com 3 eixos o card leva à página | `VariantSurfaces.test.tsx:121-122` — `expect(screen.getByText('rota-produto')).toBeInTheDocument()` + `queryByLabelText('Tamanho')).not.toBeInTheDocument()` | navega, não abre seletor | ✅ |
| PST-05 ⟶ carrinho (liga com PST-04) | `VariantSurfaces.test.tsx:136-139` — `variantId='v-45-fosco'`, `unitPrice=9.4`, `variantLabel='4,5 cm · Fosco'`, `optionValues={Tamanho,Acabamento}` | preço **da linha**, não `base_price` | ✅ |
| `sizes`/`finishes` não são mais lidos | grep nos arquivos da T18: só o *repasse* em `mapProduct.ts:132-133` (colunas legadas até `VAR-13`); nenhuma leitura de comportamento | — | ✅ |

### PST-06 — categorias N:N (P1.2b AC 3-4)

| AC | `file:line` + asserção | Resultado esperado | Coberto? |
| -- | ---------------------- | ------------------ | -------- |
| AC 3 — selo = menor `categories.sort_order` | `displayCategory.test.ts:33` — `expect(displayCategory(product, CATEGORIES)?.id).toBe('anime')` | a de menor `sort_order` | ✅ |
| AC 3 — empate resolve por `product_categories.position` | `displayCategory.test.ts:44` — `expect(displayCategory(product, empatadas)?.id).toBe('b')` (`position 0` vence) | menor `position` | ✅ |
| AC 3 — produto em 3 categorias mostra **uma** | `displayCategory.test.ts:66` — `expect(displayCategory(product, CATEGORIES)).toEqual(ANIME)` | a de menor `sort_order` | ✅ |
| AC 3 — produto sem categoria não quebra o card | `displayCategory.test.ts:70` — `expect(displayCategory({category_links: []}, CATEGORIES)).toBeNull()` | `null`, sem throw | ✅ |
| AC 4 — filtro consulta `product_categories`, não `.eq('category_id')` | `useProducts.test.tsx:286-287` — `expect(eqSpy).toHaveBeenCalledWith('category_id','cat-anime')` + `expect(inSpy).toHaveBeenCalledWith('id',['prod-1','prod-9'])` | filtro por vínculo | ✅ |
| AC 4 — produto aparece em categoria ≠ `products.category_id` | `useProducts.test.tsx` (`o mesmo produto aparece em outra categoria`) — `expect(result.current.data!.map(p=>p.id)).toEqual(['prod-1'])` com `category_id:'cat-1'` na página `cat-anime` | aparece pelas 3 | ✅ |
| vínculos mapeados com `position` | `useProducts.test.tsx:237` — `expect(...category_links).toEqual([{category_id:'cat-anime',position:0},{category_id:'cat-kpop',position:1}])` | — | ✅ |

### PST-07 — redirect de slug (P1.2b AC 5)

| AC | `file:line` + asserção | Resultado esperado | Coberto? |
| -- | ---------------------- | ------------------ | -------- |
| AC 5 — slug antigo redireciona para o atual | `ProductPage.test.tsx:79` — `expect(screen.getByText('url:/produto/botton-sailor-moon')).toBeInTheDocument()` (entrou em `/produto/sailor-moon-antigo`) | URL passa a ser a do slug atual | ✅ |
| AC 5 (hook) — resolve por `product_redirects` | `useProduct.test.tsx:162-163` — `expect(...slug).toBe('botton-sakura-2026')` + `expect(...id).toBe('prod-1')` | o produto atual | ✅ |
| AC 5 — a busca é em `product_redirects` | `useProduct.test.tsx` (`a busca do redirect é por from_slug…`) — `expect(fromMock.mock.calls.map(([t])=>t)).toContain('product_redirects')` | tabela certa | ✅ |
| Done-when — slug inexistente sem redirect mantém 404 | `ProductPage.test.tsx:107-108` — `getByText('Produto não encontrado')` + URL intacta · `useProduct.test.tsx:182` — `expect(result.current.data).toBeNull()` | 404 atual preservado | ✅ |
| Done-when — redirect para produto deletado cai no 404, **sem loop** | `useProduct.test.tsx:191` — `expect(result.current.data).toBeNull()` · `ProductPage.test.tsx:117-118` | 404, sem segundo salto | ✅ |
| Ausência de loop (positivo) | `ProductPage.test.tsx:89-90` — depois do redirect a página **renderiza** (`galeria`) e a URL é a nova | monta, não re-navega | ✅ |
| Custo do caminho normal | `useProduct.test.tsx:172-173` — slug achado **não** consulta `product_redirects` | leitura extra só no miss | ✅ |

### PST-08 / PST-10 — disponibilidade e grade incompleta (P1.2 AC 11, 16; P1.2b AC 6-7)

| AC | `file:line` + asserção | Resultado esperado | Coberto? |
| -- | ---------------------- | ------------------ | -------- |
| AC 16 — `track` + `stock: 0` aparece indisponível | `variantSelection.test.ts:169` — `expect([...disponiveis]).toEqual(['3,5 cm'])` (o 4,5 cm com estoque 0 sai) | valor indisponível | ✅ |
| AC 16 — e **não** entra no carrinho | `VariantSurfaces.test.tsx:152-154` — `expect(cta).toBeDisabled()` + `expect(useCartStore.getState().items).toHaveLength(0)` após clique | bloqueio efetivo | ✅ |
| P1.2b AC 6 — `none` nunca esgota | `variantSelection.test.ts:185` · `VariantSurfaces.test.tsx:214` — `expect(...{name:/Adicionar ao Carrinho/}).toBeEnabled()` | sempre disponível | ✅ |
| P1.2b AC 7 — `backorder` vende com saldo ≤ 0 | `variantSelection.test.ts:177` — disponível com `stock: -3` | permite compra | ✅ |
| Edge case — todas pausadas ⇒ indisponível | `variantSelection.test.ts:193` — `expect(availableValuesFor(...).size).toBe(0)` com `is_active:false` em `policy:'none'` | `is_active` vence a política | ✅ |
| PST-10 — variação ativa com `options` vazio = produto simples | `variantSelection.test.ts:121` — `expect(hasSellableGrid({options:[], variants:[variant({})]})).toBe(false)` | tratado como sem variação | ✅ |
| PST-10 — na superfície: entra por `base_price` | `VariantSurfaces.test.tsx:162-163` — `expect(item.variantId).toBeNull()` + `expect(item.unitPrice).toBe(4.9)` | `base_price`, sem `variant_id` | ✅ |
| PST-10 — no checkout: o pedido **é** criado | `CheckoutPage.test.tsx:648` (`PST-10: variação ativa com options VAZIO não exige escolha`) — `expect(createOrderMutateAsync).toHaveBeenCalled()` + item com `price_source:'base'` | não bloqueia | ✅ |
| Grade só com linha sem preço não é vendável | `variantSelection.test.ts:134` — `hasSellableGrid` com `price:null` ⇒ `false` | cai em `base_price` | ✅ |

**Nenhum critério ficou sem `file:line`.** A metade "badge `grade incompleta`" de `P1.2 AC 11` é
`PLS-04`, declarada na própria spec como escopo da feature `13`.

---

## Sensor de discriminação

13 mutações de **comportamento**, injetadas uma a uma em estado descartável, com os testes
relevantes rodados e o arquivo restaurado em `finally`. Script:
`scratchpad/sensor.py` (fora do repo).

| # | Mutação | Arquivo | Veredito |
| - | ------- | ------- | -------- |
| M1 | `image_url` sempre `''` | `mapProduct.ts` | **KILLED** (2 testes) |
| M2 | variação nasce `is_active: true` | `mapProduct.ts` | **KILLED** (1) |
| M3 | remove o `sort` por `position` dos eixos | `variantSelection.ts` | **KILLED** (3) |
| M4 | `hasSellableGrid` ignora `options` (mata PST-10) | `variantSelection.ts` | **KILLED** (1) |
| M5 | disponibilidade ignora estoque/política | `variantSelection.ts` | **KILLED** (3) |
| M6 | off-by-one no teto de eixos do card (`>` → `>=`) | `variantSelection.ts` | **KILLED** (1) |
| M7 | selo ordena por `position` antes de `sort_order` | `displayCategory.ts` | **KILLED** (2) |
| M8 | não consulta `product_redirects` | `useProduct.ts` | **KILLED** (1) |
| M9 | página não redireciona | `ProductPage.tsx` | **KILLED** (2) |
| M10 | ignora o `alt` cadastrado | `ProductGallery.tsx` | **KILLED** (1) |
| M11 | CTA sempre habilitado | `ProductCard.tsx` | **KILLED** (1) |
| M12 | filtro volta para `.eq('category_id')` | `useProducts.ts` | **KILLED** (2) |
| M13 | payload de imagem perde o `alt` | `imagePayload.ts` | **KILLED** (2) |

**13 / 13 killed · 0 survived.**

**Integridade da restauração:** 6 dos 9 arquivos voltaram com md5 diferente do original — causa
identificada e benigna: o script reescreve com `\n` e o Windows converte para `\r\n`. O conteúdo é
idêntico (`git diff --ignore-cr-at-eol` mostra só as mudanças da fase) e o repo tem
`core.autocrlf=true`, que normaliza para LF no commit. Prova final: a suíte completa passa nos
mesmos 1322 testes **depois** do sensor.

---

## Achados

### 1. Deriva de typecheck herdada da Fase 3 — **corrigida**

`tsc` da store estava em **7 erros** no início desta fase, contra **1** na baseline documentada. Os 6
extras vinham da T11: `CartItem` ganhou `variantId`/`variantLabel`/`optionValues`/`unitPrice`
obrigatórios e 6 construtores (5 fixtures + `ShippingCalc.tsx`) não acompanharam. Passou calado
porque **`pnpm build` é `vite build` puro e não checa tipos**, e o gate da fase era build + test.
Corrigido nesta fase; store está em **0**.

### 2. Colisão de nome que tipava `CheckoutTotals.items` errado — **corrigida**

`entities/cart/index.ts` exportava `CartItem` (o **componente**) e, via `export *`, também
`CartItem` (a **interface** do `cartStore`). O valor sombreava o tipo, então
`import { type CartItem } from '@/entities/cart'` em `useCheckoutTotals.ts:31` resolvia para o
componente — `CheckoutTotals.items` estava tipado como um componente React. O export do componente
passou a `CartItemRow`; os dois consumidores reais importam por caminho profundo e não mudaram.

### 3. A guarda do checkout violava PST-10 — **corrigida** (desvio de escopo declarado)

A T16 consultava só `product_variants` para decidir "este produto exige variação?". Um produto com
variação ativa e com preço mas `options` **vazio** seria marcado como "exige variação" — e a loja não
mostra seletor nenhum para ele. A cliente veria *"Escolha o tamanho e o acabamento"* sem ter como
obedecer: o beco sem saída que a própria guarda existe para evitar, invertido. A leitura agora é do
**produto** (`options` + `product_variants`) e usa `hasSellableGrid`, a mesma regra da vitrine.
`PST-10` é requisito da T18, então o conserto é dentro do escopo — mas o arquivo não estava na lista
da task.

### 4. `alt` sobrevivia a um save do formulário — decisão além da spec

A AC 4 exige só que o payload seja `jsonb`. O caminho mais curto (`imageUrls.map(url => ({url, alt:
null, source:'upload'}))`) satisfaria a AC **e apagaria o `alt` de todas as fotos** a cada save de
preço, porque o formulário controla uma lista de URLs e a UI de `alt` só chega na `12`. Foi
adicionado um mapa `url → {alt, source}` carregado do produto. É escopo a mais, declarado aqui, e a
alternativa era perda silenciosa de dado de acessibilidade e SEO.

### 5. Uma premissa minha de teste nasceu errada — corrigida a premissa, não a asserção

O primeiro teste da galeria usava `getAllByRole('img')` para contar miniaturas. `<img alt="">` tem
role ARIA `presentation`, não `img` — a consulta nunca as veria. Trocado por consulta ao elemento
(`container.querySelectorAll('img')`), o que também torna honesta a asserção de "nenhum `<img>`" da
AC 3. Sem afrouxar nada.

### 6. Fora de escopo, para registro

- `VariantsTable.tsx` mantém **9 erros de tipo** (formato antigo `{size, finish}`). É a metade
  admin, escopo da feature `11` (T21+). Os 3 erros de `images` que a T6 abriu foram fechados aqui.
- `ProductInfo.tsx` seguiu com o bloco "Detalhes" com medidas **fixas em texto**
  (`Tamanho: 3,8 cm de diâmetro`), que agora contradiz um produto com grade de 3 tamanhos. Não é
  requisito de nenhuma AC desta feature; é conteúdo de página. **Vale uma task na `11` ou `12`.**

---

## Desvios do plano

| Task | Plano | Feito | Motivo |
| ---- | ----- | ----- | ------ |
| T18 | `Where: pages/ProductPage.tsx` | seletores em `entities/product/ui/ProductInfo.tsx` | é o componente que tem o CTA "Adicionar ao Carrinho"; `ProductPage` só compõe |
| T18 | — | mapper único em `entities/product/lib/mapProduct.ts` | havia **3 cópias** (`useProducts`, `useProduct`, `useRecoverCart`) e a terceira já divergia: não mapeava as dimensões de SHP-02. Com a grade entrando no tipo, três cópias = esquecer a grade em um caminho |
| T18 | — | `CheckoutPage.tsx` (guarda de PST-03 AC 5) | ver Achado 3 |
| T17 | — | `imagePayload.ts` extraído | o formulário de 500 linhas é escopo da `11`; extrair a regra dá à AC 4 uma asserção real sem reescrever a página |
| — | — | stub de `IntersectionObserver` em `src/test/setup.ts` | lacuna do jsdom: o `whileInView` do framer-motion derruba qualquer teste que renderize um `ProductCard`. Vizinho dos stubs de `matchMedia`/`ResizeObserver` que já existiam |

---

## Veredito

**PASS.** Os 6 requisitos da fase (`VAR-11 AC 2/4`, `PST-05`, `PST-06`, `PST-07`, `PST-08`,
`PST-10`) têm cobertura com `file:line` e valor casando com o que a spec define; o sensor matou
13/13 mutações de comportamento; o gate está verde e o lint **abaixo** da baseline.

Com isto a **feature 07 fecha**: 21/21 tasks. `11-product-form-v2` e `13-product-bulk-ops` estão
destravadas para rodar em paralelo.
