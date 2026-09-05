# Performance da loja no celular — Validation

**Date**: 2026-09-05
**Spec**: `.specs/features/38-performance-mobile/spec.md`
**Diff range**: `fd4d121..HEAD` (6 commits de implementação, sobre o commit da spec)
**Verifier**: sub-agente independente (autor ≠ verificador) — **não escreveu uma linha desta feature**
**Veredito**: ❌ **FAIL** — 3 lacunas de discriminação e 1 regressão de comportamento confirmada

---

## O que este relatório NÃO conseguiu verificar

Declarado antes de qualquer número, porque o que falta aqui pesa mais do que o que passou.

1. **Nenhum teste desta feature prova comportamento visual em navegador real.** jsdom devolve **0
   para toda medida de layout**: `getBoundingClientRect`, `scrollWidth`, `offsetHeight`, tudo zero.
   Consequências diretas:
   - `PRF-10` AC 1 — "`Suspense` cujo fallback SHALL NOT causar deslocamento de layout" — é asserido
     como **a classe `min-h-[60vh]` estar presente** (`RouteFallback.test.tsx:18`), não como ausência
     de CLS. A classe certa não prova o deslocamento ausente.
   - `PRF-02` e `PRF-03` estão provados no **atributo do DOM**, nunca no **byte que a rede
     entregou**. Que o `<img>` declare `srcset` não prova que o navegador escolheu o candidato de
     360 px, nem que o Supabase respondeu `image/webp` naquela largura.
   - O `sizes` de cada superfície (`"(min-width: 1024px) 25vw, …"`, `"220px"`, `"160px"`) é asserido
     como **string**. Se ele descrever a vaga errada, o `srcset` inteiro vira decoração — e nenhum
     teste desta suíte tem como notar.
2. **Nenhum dos Success Criteria da spec foi medido por mim.** LCP/FCP por Lighthouse, peso da
   primeira visita, JSON da categoria e soma das fileiras da home exigem o deploy e um navegador em
   390×844, aba anônima. Os números do `tasks.md` (214 KB de catálogo, 50 KB de categoria) são
   **medições do autor**, não reproduzidas aqui.
3. **O único Success Criterion que eu reproduzi é o do chunk de entrada** — build real, brotli
   medido por mim (abaixo).
4. **`PRF-05` AC 3 não foi implementada** (T19, o passe sobre os 3.618 objetos já no Storage). Não é
   uma lacuna de teste: é uma AC sem código, pendente de decisão do usuário.
5. **Não houve UAT interativa.** Quinta feature seguida em que autor e verificador conferem sem um
   par de olhos humanos sobre a tela.

---

## Task Completion

| Task | Status | Notas |
| --- | --- | --- |
| T1–T18 | ✅ Feitas e commitadas | Confirmado no diff `fd4d121..HEAD` |
| T19 | ⛔ Não executada | Passe de `cacheControl` — custa 410 MB de upload, espera decisão. **Deixa `PRF-05` AC 3 descoberta** |

---

## Critérios de aceite ancorados na spec

**Regra aplicada**: evidência ou zero. Sem `arquivo:linha` + a expressão do `expect`, conta como não
coberta. E o valor asserido tem de bater com o resultado que a spec define — "existe uma asserção"
não basta.

### P1 — a loja pede a foto do tamanho que vai exibir

| AC | Resultado que a spec define | `arquivo:linha` + asserção | Result |
| --- | --- | --- | --- |
| PRF-01/1 — objeto do Storage + largura → `/render/image/public/` com `width` e `quality=75` | URL exata | `packages/core/src/media/rendition.test.ts:64` — `expect(renditionUrl(OBJETO, 360)).toBe(`${RENDER}?width=360&quality=75`)` | ✅ PASS |
| PRF-01/2 — URL fora do Storage volta **inalterada**, sem lançar | entrada devolvida idêntica | `rendition.test.ts:93` — `expect(renditionUrl('', 360)).toBe('')` · `:98` — `expect(renditionUrl(externo, 360)).toBe(externo)` · `:102` — `/assets/estrela.svg` · `:112` — disfarce na query · `:118` — `expect(() => renditionUrl(null…)).not.toThrow()` | ✅ PASS |
| PRF-01/3 — largura fora de `1..2500` grampeada ao limite mais próximo | 0→1, −800→1, 9000→2500 | `rendition.test.ts:127` — `expect(renditionUrl(OBJETO, 0)).toBe(`${RENDER}?width=${RENDITION_MIN_WIDTH}&quality=75`)` · `:132` (9000→2500) · `:145` (`NaN`→1, `Infinity`→2500) | ✅ PASS |
| PRF-02/4 — card declara `srcset` (360/480/720) e `sizes` da vaga real | as três larguras, e `sizes` da grade | `ProductCard.test.tsx:76` — `expect(foto.getAttribute('srcset')).toBe('…360w, …480w, …720w')` · `:89` — `expect(foto.getAttribute('sizes')).toBe('(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw')` · `:99` — `src` = rendição de 480 | ✅ PASS |
| PRF-02/5 — vagas pequenas pedem largura compatível, nunca o original | 120 amostra · 160 carrinho/resumo/busca · 160 miniatura | `SmallSlotRendition.test.tsx:99` (`width=120`), `:140` (`width=180`), `:183` (`width=160`) · `CartDrawer.test.tsx:526` (`width=160`), `:538` (`width=120`) · `OrderSummary.test.tsx:725` · `OrderBump.test.tsx:200` · `SearchDropdown.test.tsx:68` · `SearchOverlay.test.tsx:154` · `useProductPurchase.test.tsx:283` · `ProductGallery.test.tsx:145` (`width=160&quality=75`) | ✅ PASS |
| PRF-02/6 — palco pede 720 no celular; tela cheia continua no **original** | 720 no palco, original na lupa | `ProductGallery.test.tsx:118` — `expect(container.querySelector('img[sizes]')!.getAttribute('src')).toBe(…)` · `:158-159` — `expect(fontes).toContain(STORAGE)` + `forEach(src => expect(src).not.toContain('/render/image/public/'))` | ✅ PASS |
| PRF-15 — arquivo de `apps/**` que monta URL de rendição fora do helper derruba a suíte, com âncora de contagem | lista vazia + âncora dupla | `renditionSingleOwner.test.ts:246` — `expect(telas).toEqual([])` · âncora `:137` (`>400` arquivos), `:154` (`≥6` chamadas legítimas) · sensores `:260`, `:296`, `:338` | ✅ PASS |

### P2 — a maior imagem da página é a primeira a ser pedida

| AC | Resultado que a spec define | `arquivo:linha` + asserção | Result |
| --- | --- | --- | --- |
| PRF-03/1 — primeiros seis `eager`, o primeiro `fetchpriority="high"` | `loading=eager` + `fetchpriority=high` no 0 | `ProductCard.test.tsx:136-137` — `expect(foto.getAttribute('loading')).toBe('eager')` / `expect(foto.getAttribute('fetchpriority')).toBe('high')` · `ProductCarousel.test.tsx` (índice deslocado pelo banner) | ⚠️ **PASS no componente, GAP na fiação** — ver Sensor mutação 10 |
| PRF-03/2 — os seis primeiros SHALL NOT nascer em opacidade zero (nem Framer, nem `opacity-0`) | sem `opacity-0` e sem `initial.opacity=0` | `ProductCard.test.tsx:138-139` — `expect(foto.className).toContain('opacity-100')` / `.not.toContain('opacity-0')` · `:142` — `expect((container.firstElementChild as HTMLElement).style.opacity).not.toBe('0')` · `:152-153` (índices 1–5) | ✅ PASS |
| PRF-03/3 — além dos seis, `lazy` + animação de hoje | `loading=lazy`, `opacity-0`, `style.opacity === '0'` | `ProductCard.test.tsx:162-165` · fronteira `:170-171` — `renderCard(5)`→`eager`, `renderCard(6)`→`lazy` | ✅ PASS |
| PRF-03/4 — a decisão tem **um dono** (função pura índice → par), nunca literal repetido | `imagePriority` + recusa de comparação à mão | `rendition.test.ts:191` — `expect(imagePriority(0)).toEqual({ loading: 'eager', fetchPriority: 'high', animateIn: false })` · `:210-212` (fronteira em `EAGER_IMAGE_COUNT`) · `renditionSingleOwner.test.ts:326` — `expect(comparacoes.map(…)).toEqual([])` | ✅ PASS |
| PRF-06/5 — a function injeta `<link rel="preload" as="image">` para a **rendição de 720**, com `imagesrcset` coerente | `href` = rendição de **720** | `handlers.test.ts:397-400` — quatro `toContain` sobre a **string inteira do `<link>`**; **nenhum mira o valor de `href=`** | ❌ **GAP** — mutantes 7 e 7b sobreviveram |
| PRF-06/6 — produto sem foto: nenhum preload, resposta idêntica à de hoje | corpo byte a byte igual | `handlers.test.ts:442` — `expect(await corpoDe(semFoto())).not.toContain('rel="preload"')` · `:452` — `expect(corpo).toBe(injectIntoHead(SHELL, jsonLdScript(productJsonLd(oferta))))` | ✅ PASS |
| PRF-04 — `index.html` declara `preconnect` para a origem do Supabase | `preconnect` + `crossorigin`, antes do `<script type="module">` | `brandAssets.test.ts:530-531` — `expect(supabase).toHaveLength(1)` / `expect(supabase[0]).toMatch(/crossorigin/)` · `:539` — `expect(INDEX).toContain('href="%VITE_SUPABASE_URL%"')` · `:549` — `expect(preconnect).toBeLessThan(script)` | ✅ PASS |

### P3 — o que já foi baixado não é baixado de novo

| AC | Resultado que a spec define | `arquivo:linha` + asserção | Result |
| --- | --- | --- | --- |
| PRF-05/1 — imagem enviada ao Storage gravada com cache de **um ano** | `cacheControl: '31536000'` | `tools/catalog-import/src/write/__tests__/storage.test.ts:331` — `expect(uploads[0].cacheControl).toBe(STORAGE_CACHE_CONTROL)` + `:333` — `expect(Number(STORAGE_CACHE_CONTROL)).toBe(365*24*3600)` · `apps/backoffice/…/uploadProductImage.test.ts:323-324` | ✅ PASS |
| PRF-05/2 — o valor vem de uma **constante única em `@estrelinha/core`**, lida pelos dois | uma escrita só | `rendition.test.ts:229` — `expect(STORAGE_CACHE_CONTROL).toBe('31536000')` · `:234` — `.not.toBe('3600')` · `storage.test.ts:341-343` e `uploadProductImage.test.ts:339-341` — `expect(fonte).toContain("from '@estrelinha/core/media'")` + `expect(fonte).not.toMatch(/cacheControl:\s*'\d+'/)` | ✅ PASS |
| PRF-05/3 — passe idempotente sobre os objetos existentes, sem reenviar bytes | segunda execução inócua | **sem evidência — T19 não executada** | ❌ **NÃO COBERTA** (AC sem implementação) |
| PRF-07/4 — `QueryClient` com `staleTime` padrão de 5 min | `1000*60*5` | `queryClient.test.ts:27-28` — `expect(STORE_STALE_TIME).toBe(1000 * 60 * 5)` / `expect(client.getDefaultOptions().queries?.staleTime).toBe(STORE_STALE_TIME)` | ✅ PASS |
| PRF-07/5 — consulta com `staleTime` próprio prevalece | o valor da chamada vence | `queryClient.test.ts:54` — `expect(propria.staleTime).toBe(1234)` · `:43` (sem o próprio, herda) · `:65-66` (o de `store_settings` lido do disco) | ✅ PASS |

### P4 — o celular baixa só o código da tela que abriu

| AC | Resultado que a spec define | `arquivo:linha` + asserção | Result |
| --- | --- | --- | --- |
| PRF-10/1 — cada página por `React.lazy`, `Suspense` sem deslocamento | 14 páginas em `lazy` | `routeSplitting.test.ts:123-124` — `expect(paginasNoDisco).toHaveLength(14)` / `expect([...preguicosas].sort()).toEqual([...paginasNoDisco].sort())` · `:175` — `expect(layout).toContain('<Suspense fallback={<RouteFallback />}>')` · fallback: `RouteFallback.test.tsx:18` — `expect(container.firstElementChild!.className).toContain('min-h-[60vh]')` | ⚠️ **Coberta em `lazy`; "sem deslocamento" é proxy** — jsdom não mede |
| PRF-11 — overlays de gesto sob demanda, fora do chunk inicial | ausentes até o gesto | `StoreLayoutOverlays.test.tsx:68-71` — `expect(screen.queryByTestId('gaveta'\|'busca'\|'menu'\|'entrar')).not.toBeInTheDocument()` · `:88`, `:96`, `:105`, `:113` — aparecem após o gesto (`findByTestId`) | ✅ PASS |
| PRF-12 — React, Supabase e Query em chunks próprios | três chunks nomeados | `viteChunks.test.ts:93` — `expect(Object.keys(grupos).sort()).toEqual(['query','react','supabase'])` · `:87` — órfãos do `dedupe` = `[]` · `:146` — colisões = `[]` · **build real medido por mim** (abaixo) | ✅ PASS |
| PRF-13 — `App.tsx` não monta o `Toaster` do Radix | ausente, Sonner presente | `toasterUnico.test.ts:145-146` — `expect(fonte).not.toMatch(/<Toaster\s*\/>/)` / `expect(fonte).toContain('<Sonner />')` · `:133` — `expect(achados).toEqual([])` (nenhum `useToast` em produção) | ✅ PASS |
| PRF-16 — rota nova com import estático derruba a suíte | lista de estáticas vazia, bidirecional | `routeSplitting.test.ts:113` — `expect(app.estaticas, …).toEqual([])` · `:129` — `expect(orfas.map(o => o.nome), 'chunk que ninguém monta').toEqual([])` · sensor `:94` · âncora dupla `:71`, `:77` | ✅ PASS |
| PRF-10/6 — produto aberto direto pela URL: comportamento idêntico, incluindo `ScrollToTop` e rotas legadas | mesmo DOM, mesma navegação | `routing.test.tsx:121-221` (14 casos, todos `await findBy…`) · `scrollToTop.test.tsx` **intocado no diff** | ✅ PASS |

### P5 — a consulta traz o que o card desenha

| AC | Resultado que a spec define | `arquivo:linha` + asserção | Result |
| --- | --- | --- | --- |
| PRF-08/1 — select enxuto exclui `description`, SEO e Google Shopping; variação com colunas explícitas | os campos ausentes | `cardSelect.test.ts:203` — `expect(parseSelect(PRODUCT_CARD_SELECT).colunas).not.toContain('description')` · `:208-209` (SEO) · `:222` (Shopping) · `:230-231` — variação sem `*`, lista exata | ✅ PASS |
| PRF-08/2 — a página do **produto** continua no select completo | `useProduct` usa `PRODUCT_SELECT` | **sem evidência** — nenhuma asserção liga `useProduct`/`useProductById` ao select completo | ❌ **GAP** — mutante 13 sobreviveu |
| PRF-08/3 — todo campo que a listagem lê continua preenchido | preço, tags, variações, imagem, selo, política, 4 dimensões | `cardSelect.test.ts:257-258`, `:263-265`, `:270-271`, `:276-277`, `:285-287`, `:304-306`, `:311-314`, `:319-321` | ✅ PASS |
| PRF-08/4 — campo lido e não pedido derruba a suíte | régua reprova select sem o campo | `cardSelect.test.ts:333` — `expect(dimensoesChegaram(PRODUCT_CARD_SELECT)).toBe(true)` · `:338-339` — sensor: `semPeso` **reprova** | ✅ PASS |
| PRF-09/1 — a fileira da home pede no máximo o que desenha | `limit` = 4 (3 com banner) | `HomeCollectionRow.test.tsx:61` — `expect(options.limit).toBe(4)` · `:67` — `expect(chamada()[1].limit).toBe(3)` | ✅ PASS |
| PRF-09/2 — relacionados limitados, sem rebaixar para a categoria inteira | `limit` = 5 (4 + folga) | `ProductPageRelated.test.tsx:95` — `expect(consultaDeCategoria()[1].limit).toBe(5)` · `:111-127` (4/4/2 desenhados) | ✅ PASS |
| PRF-09/3 — consulta de listagem declara teto explícito | teto declarado, com ordem | `useProducts.test.tsx:611` — `expect(janela().limit).toBe(LISTING_LIMIT)` · `:615` — `expect(LISTING_LIMIT).toBe(1000)` · `:633`/`:645` — ordem `created_at` + desempate `id` · `:677`, `:687`, `:697` (os três outros caminhos) | ✅ PASS |

### P6 — as fontes não dependem de um terceiro

| AC | Resultado que a spec define | `arquivo:linha` + asserção | Result |
| --- | --- | --- | --- |
| PRF-14/1 — `@font-face` do próprio domínio, sem `fonts.googleapis.com` | zero origem externa | `brandAssets.test.ts:256` / `:262` — `expect(INDEX\|semComentarios(APP_CSS)).not.toContain(origem)` para os dois hosts · `:269` — `expect(origens).toEqual([])` (régua por lista, não por nome) | ✅ PASS |
| PRF-14/2 — arquivos sob o cabeçalho `immutable` | `/fonts/(.*)` com `max-age=31536000, immutable` | `vercelRedirects.test.ts` (bloco novo) — `expect(fontes.headers).toEqual([{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }])` + sensor "`/assets` não alcançaria" + `expect(CONFIG.headers).toHaveLength(5)` | ✅ PASS |
| PRF-14/3 — as duas faces do primeiro texto com `preload`; política `swap` | 2 preloads, `font-display: swap` | `brandAssets.test.ts:343` — `expect(PRELOADS).toHaveLength(2)` · `:354-360` (`as="font"`, `type="font/woff2"`, `crossorigin`) · `:335` — `expect(face.display).toBe('swap')` · `:375` — preload antes do `<script>` | ✅ PASS |
| PRF-14/4 — exatamente os pesos do DS, sem pedir peso que a família não tem | LB 400/700/itálico 400; Outfit 300–700 | `brandAssets.test.ts:287` — `expect(declarados).toEqual(esperados)` · sensor `:297-299` (peso 600 reprovado) | ✅ PASS — **e verificado por mim fora do teste**: `libre-baskerville-v24-latin.woff2` **tem tabela `fvar`** (é variável), então declarar 400 e 700 sobre o mesmo arquivo **não** produz falso-negrito. `outfit-v15-latin.woff2` também tem `fvar`; o itálico é estático, e só é declarado em 400 |

**Placar**: **13 de 16** requisitos com asserção batendo o resultado da spec.
**2 gaps de discriminação** (`PRF-06` AC 5, `PRF-08` AC 2) · **1 AC sem implementação** (`PRF-05`
AC 3) · **1 ressalva de medição** (`PRF-10` AC 1, jsdom) · **1 fiação desguarnecida dentro de um
requisito coberto** (`PRF-03` AC 1 na `CategoryPage`).

---

## Sensor de discriminação

13 mutações de comportamento, todas em estado descartável (cópia do arquivo em scratch, mutação,
suíte-alvo, restauração e `cmp` de conferência). **A árvore de trabalho real nunca foi alterada.**

| # | `arquivo:linha` | Mutação | Alvo | Killed? |
| --- | --- | --- | --- | --- |
| 1 | `core/src/media/rendition.ts:106` | `renditionUrl` devolve sempre a URL original | core | ✅ Morto (6+ falhas) |
| 2 | `rendition.ts:160` | `imagePriority(0)` devolve `lazy`/`animateIn: true` | core | ✅ Morto |
| 3 | `rendition.ts:95` | limite invertido: abaixo do mínimo grampeia em **2500** | core | ✅ Morto |
| 4 | `store/…/mapProduct.ts:100` | `PRODUCT_CARD_SELECT` perde `weight_kg` | store | ✅ Morto (inclui o sensor `SHP-02`) |
| 5 | `mapProduct.ts:96` | `PRODUCT_CARD_SELECT` volta a nomear `stock` (o defeito real de `92fadbf`) | store | ✅ Morto (`renamedColumns.test.ts`, 5 falhas) |
| 6 | `store/src/app/App.tsx:38` | `CheckoutPage` volta a import estático | store | ✅ Morto (4 falhas em `routeSplitting`) |
| **7** | `functions/product-page/handlers.ts:141` | `href` do `preload` aponta para a **URL original** | functions | ❌ **SOBREVIVEU** |
| **7b** | `handlers.ts:114` | `PALCO_PX` vira **360** — `href` na largura errada | functions | ❌ **SOBREVIVEU** |
| 8 | `store/src/app/App.css:77` | `@font-face` de Libre Baskerville pede peso **600** | store | ✅ Morto |
| 9 | `rendition.ts:51` | `STORAGE_CACHE_CONTROL` volta a `'3600'` | core | ✅ Morto |
| **10** | `store/src/pages/CategoryPage.tsx:408` | a `CategoryPage` **para de passar `index`** ao `ProductCard` | store — **suíte inteira (2234)** | ❌ **SOBREVIVEU** |
| 11 | `apps/store/index.html:19` | remove o `preconnect` do Supabase | store | ✅ Morto (5 falhas) |
| 12 | `widgets/product-carousel/ui/ProductCarousel.tsx:129` | o carrossel para de passar `index` | store | ✅ Morto (4 falhas) |
| **13** | `entities/product/api/useProduct.ts:3` | a **página do produto** passa a usar o select enxuto | store — **suíte inteira (2234)** | ❌ **SOBREVIVEU** |

**Profundidade**: P0-full (13 mutações, todos os ramos novos de risco).
**Resultado**: **9/13 mortos, 4 sobreviventes** (3 lacunas distintas) — ❌ **FAIL**.

### Por que cada sobrevivente importa

**Mutantes 7 e 7b — o `href` do `preload` nunca é asserido (`PRF-06` AC 5).**
O teste chamado *"produto com foto do Storage: o preload aponta para a rendição de 720"*
(`handlers.test.ts:396-401`) faz quatro `toContain` sobre a **string inteira do `<link>`**:

```
expect(link).toContain('/storage/v1/render/image/public/product-images/pulseira.webp')
expect(link).toContain('width=720')
```

Os dois são satisfeitos pelo **`imagesrcset`**, que carrega as três rendições — inclusive a de 720.
O `href` pode apontar para o original de 1024 px, ou para a rendição de 360, e a suíte não pisca.
É exatamente a violação da regra de payload: a asserção mira o **elemento**, não o **campo**. O
único `href` de fato asserido é o do caso de host de terceiro (`:436`), que é o caminho em que ele
**não** é reescrito. Consequência prática: o preload — a peça de `PRF-06` inteira — pode voltar a
baixar 113 KB no `<head>` da página do produto, em silêncio, e ainda por cima **em duplicidade** com
a foto que a galeria escolhe pelo `srcset`.

**Mutante 10 — a fiação do `index` na `CategoryPage` não tem guarda (`PRF-03` AC 1).**
Removi `index={i}` da única listagem citada no *Independent Test* da spec (`/joias-e-acessorios/…`,
a que mediu **LCP de 15,6 s**) e rodei a **suíte inteira do store**: 2234 testes, todos verdes. Sem
o `index`, todo card cai no ramo `lazy` + `animateIn: true` de `imagePriority` — os três mecanismos
que escondiam a foto do medidor voltam **na página que motivou a feature**. O contraste é o que
torna a lacuna concreta: a mesma mutação no `ProductCarousel` (mutante 12) mata quatro testes. Uma
das duas superfícies de listagem está guardada; a outra, a mais cara, não.

**Mutante 13 — nada liga a página do produto ao select completo (`PRF-08` AC 2).**
Troquei `PRODUCT_SELECT` por `PRODUCT_CARD_SELECT` em `useProduct.ts` e rodei os 2234 testes do
store: verdes. Como `mapDbToProduct` coalesce (`description: p.description ?? ''`), o efeito seria
**a descrição de todo produto sumindo da loja** — `ProductDetailsAccordion` calcula
`temDescricao = sanitizeHtml(product.description) !== ''` e simplesmente não renderiza a seção. É o
`AD-012` do lado da leitura outra vez: a coluna some, nada erra, e quem descobre é a cliente.

---

## Regressão de comportamento confirmada (fora do sensor)

**A busca deixou de casar termo que só aparece na descrição.**

Confirmada por leitura, não por suposição:

- `apps/store/src/features/search/lib/searchProducts.ts:55` — `description: 5` no mapa de pontuação;
  `:76` — `if (description.includes(term)) return SCORE.description`; `:104` —
  `description: normalizeTerm(product.description ?? '')`.
- As **três** superfícies de busca leem `useAllProducts`: `SearchDropdown.tsx:33`,
  `SearchOverlay.tsx:52`, `SearchPage.tsx:23`.
- `useProducts.ts:223` — `useAllProducts` passou a usar `PRODUCT_CARD_SELECT`, que **não pede**
  `description` (`cardSelect.test.ts:203`).
- `mapProduct.ts:132` — `description: p.description ?? ''`, então o campo chega **vazio**, não
  ausente: `includes(term)` devolve `false` e o desempate de peso 5 nunca dispara.

**Nenhum teste cobre a regressão**, e a razão é estrutural: `searchProducts.test.ts:57` constrói
`product({ name: 'Chaveiro Sakura', description: 'inspirado em naruto' })` — um `Product` já pronto,
com descrição. A função continua correta; o **dado que chega até ela** é que mudou. Teste de unidade
de função pura não tem como ver isso.

Isto **contradiz o critério de sucesso "Nenhuma mudança visível de layout, cópia ou comportamento"**
da própria spec. O `tasks.md` registra a perda honestamente e a encaminha como decisão do usuário —
o que é o tratamento certo —, mas enquanto a decisão não sai, a feature **não** satisfaz o critério
que escreveu para si.

Observação de escopo: `ProductDetailsAccordion` e `ProductFaq` também leem `product.description`,
mas vivem na página do produto, que continua no select completo. Hoje eles estão a salvo — e é
justamente essa proteção que o mutante 13 mostrou não ter guarda.

---

## Portões — números medidos por mim

Um workspace por vez, exit code capturado **sem pipe**, nada mais rodando na máquina.

| Workspace | Medido agora | Baseline declarada | Exit |
| --- | --- | --- | --- |
| `@estrelinha/store` | **2234 testes / 151 arquivos** | 2234 / 151 | `0` ✅ |
| `@estrelinha/core` | **1524 / 61** | 1524 / 61 | `0` ✅ |
| `@estrelinha/functions` | **368 / 7** | 368 / 7 | `0` ✅ |
| `@estrelinha/catalog-import` | **512 / 23** | 512 / 23 | `0` ✅ |
| `@estrelinha/backoffice` | **1789 / 109** | 1789 / 109 | `0` ✅ |
| **Total** | **6127 em 351 arquivos** | 6127 / 351 | — |

**Tipos** — `npx tsc --noEmit -p …`: store `0`, backoffice `0`, catalog-import `0`. Exit `0 · 0 · 0`,
igual à baseline.

**Lint** — `pnpm lint`: backoffice **25 erros / 4 warnings**, store **2 / 1** = **27 / 5**. Idêntico
à baseline; nenhum erro novo. (Exit 1 é o esperado enquanto a baseline não for zerada.)

**Build** — `pnpm --filter @estrelinha/store build`, exit `0`. Brotli medido por mim sobre o `dist`:

| Chunk | Cru | Brotli |
| --- | --- | --- |
| `index-D5UVAEGf.js` (entrada) | 417,9 KB | **117,5 KB** |
| `react-ex_17CfA.js` | 138,9 KB | 38,9 KB |
| `supabase-DFM6Pj3g.js` | 210,9 KB | 46,1 KB |
| `query-BXgais-p.js` | 40,3 KB | 10,8 KB |

**Confirma `PRF-12` no artefato real** — os três vendors saem em chunks hasheados próprios — e o
Success Criterion do chunk de entrada: **117,5 KB brotli, contra o teto de 220 KB**. Reproduz a
medição do autor (117,2 KB) dentro do ruído de versão do compressor. As 14 páginas aparecem como
chunks separados (`CheckoutPage` 54,3 KB, `HowToSendMaterialPage` 50,7 KB, `PixPayment` 24,5 KB), o
que confirma `PRF-10`/`PRF-11` no artefato, e não só no fonte.

**Integridade da contagem**: a suíte só subiu. Comparando com a baseline de entrada do `tasks.md`
(store 2001, core 1493, functions 350, catalog-import 509, backoffice 1786): **+233 testes, zero
removido**. Nenhuma queda a justificar.

---

## Asserções reescritas — auditoria do diff

Os commits `2099684` e `7ef8ab1` declaram ter religado encanamento de teste sem alterar asserção.
**Verificado linha a linha no diff** (`git diff fd4d121..HEAD -- <arquivo> | grep '^-'`):

| Arquivo | `expect` removidos | O que os substituiu | Veredito |
| --- | --- | --- | --- |
| `useProducts.test.tsx` | **0** | — | ✅ Nenhuma asserção tocada |
| `routing.test.tsx` | 17 | Cada uma reaparece como `await screen.findBy…` ou `await waitFor(() => expect(…))` com **o mesmo alvo e o mesmo valor**. O `beforeAll` novo só aquece o cache de transformação dos módulos que viraram `lazy`; o teto de 120 s é do **hook**, não das asserções | ✅ Religado, não afrouxado |
| `handlers.test.ts` | 1 — `expect(corpo.replace(/<script…ld\+json…>/,'')).toBe(SHELL)` | Substituída por `:452` — `expect(corpo).toBe(injectIntoHead(SHELL, jsonLdScript(productJsonLd(oferta))))`, no caso **sem foto**. A antiga afirmava "a única injeção é o JSON-LD", que deixou de ser verdade por desenho; a nova é **igualdade estrutural completa**, mais forte no caminho em que se aplica | ✅ Trocada por equivalente mais forte |

**Nenhuma asserção foi enfraquecida ou removida.** E os cinco guardas de rota/composição
(`scrollToTop.test.tsx`, `routes.test.ts`, `reservedSlugs.test.ts`, `sitemapRoutes.test.ts`,
`homeComposition.test.tsx`) estão **byte a byte intocados** no diff — o que é a evidência mais limpa
possível de que o `lazy` não custou régua.

---

## Edge cases da spec

- [x] URL `''` → helper devolve `''`, superfície sem `<img>` — `rendition.test.ts:93`,
      `ProductGallery.test.tsx:51`, `SmallSlotRendition.test.tsx:114`
- [x] Host externo → sem `srcset`, imagem como hoje — `ProductCard.test.tsx:109-110`,
      `ProductGallery.test.tsx:168-169`, `HomeBannerGrid.test.tsx:237`, `MegaMenu.test.tsx:290`
- [x] Categoria com zero produtos → caminho vazio intacto — `useProducts.test.tsx:412`
- [x] Rendição que falha → sem caminho alternativo, registrado na tabela de assunções (decisão, não defeito)
- [x] Navegador sem `srcset` usa o `src` da **largura média** — `ProductCard.test.tsx:99` (`width=480`)
- [ ] Passe de `cacheControl` rodando duas vezes → **T19 não executada**
- [x] Chunk que falha ao baixar → estado de erro legível, nunca tela branca —
      `ChunkErrorBoundary.test.tsx:79`, `:105`
- [x] `?preview=1` → leitura de `isPreviewWindow` **acima** do `Suspense` —
      `routeSplitting.test.ts:167`

---

## Qualidade de código

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ |
| Mudanças cirúrgicas | ✅ — 75 arquivos, todos rastreáveis a uma task |
| Sem escopo além do pedido | ✅ — Framer, paginação no servidor e busca no servidor ficaram fora, como a spec manda |
| Segue os padrões do repositório | ✅ — guardas com âncora dupla e sensor embutido, molde de `freeShippingSingleOwner`; `rendition.ts` sem um único `import`, como a armadilha da `33` exige; imports da edge function relativos e com `.ts` |
| Asserções batem o valor da spec | ⚠️ — falha em `PRF-06` AC 5 (mira o elemento, não o campo) |
| Cobertura por camada | ⚠️ — regra pura 1:1 com as ACs; **a fiação entre camadas é o buraco** (mutantes 10 e 13) |
| Todo teste mapeia uma AC/edge case/"done when" | ✅ |
| Diretrizes documentadas seguidas | ✅ — `CLAUDE.md` (raiz), `apps/store/CLAUDE.md`, `packages/core/CLAUDE.md` |

**Ponto positivo que merece registro**: `92fadbf` corrigiu um defeito que teria deixado **toda
vitrine da loja vazia em produção** (`products.stock` não existe desde a migration
`20260726000000`), e criou `renamedColumns.test.ts`, que lê os `RENAME COLUMN` das migrations **do
disco** e é **por tabela** — `product_variants.stock`, que nunca foi renomeada, segue permitida. A
mutação 5 confirmou que o guarda mata o defeito de volta. É a prescrição do `AD-012` aplicada
corretamente, e o guarda é mais forte que a correção.

---

## Planos de correção

### Fix 1 — asserir o `href` do `preload`, não a string do `<link>` — **Blocker**

- **Causa raiz**: `handlers.test.ts:396-401` usa `toContain` sobre o `<link>` inteiro; o
  `imagesrcset` satisfaz todas as substrings, então o `href` é livre.
- **Correção**: extrair o `href` (`link.match(/href="([^"]+)"/)?.[1]`) e comparar por **igualdade**
  com `renditionUrl(STORAGE, 720)`. Acrescentar o par negativo: `expect(href).not.toBe(STORAGE)`.
- **Done when**: a mutação `renditionUrl(url, PALCO_PX)` → `url` **e** a mutação
  `PALCO_PX = RENDITION_WIDTHS[0]` derrubam a suíte de `@estrelinha/functions`.

### Fix 2 — guardar a fiação do `index` na `CategoryPage` — **Blocker**

- **Causa raiz**: `PRF-03` é asserido no `ProductCard` (que recebe o índice) e no `ProductCarousel`
  (que o passa). A `CategoryPage`, a listagem que motivou a feature, passa e ninguém confere.
- **Correção**: um caso em teste de `CategoryPage` que renderize a grade e assere que o primeiro
  `<img>` sai com `loading="eager"` e `fetchpriority="high"` e o sétimo com `loading="lazy"`;
  **ou** estender `renditionSingleOwner.test.ts` com uma régua bidirecional: todo arquivo que
  renderiza `<ProductCard` dentro de um `.map(` **precisa** passar `index=`.
- **Done when**: remover `index={i}` de `CategoryPage.tsx:408` derruba a suíte do store.

### Fix 3 — guardar o select da página do produto — **Blocker**

- **Causa raiz**: `PRF-08` AC 2 não tem asserção nenhuma; o par "enxuto na listagem / completo no
  produto" só existe no código.
- **Correção**: em `cardSelect.test.ts`, ler `useProduct.ts` e `useProducts.ts` **do disco** e
  asserir quem usa qual — na mesma forma bidirecional dos outros guardas do repositório: as quatro
  leituras de listagem usam o enxuto, as duas de produto usam o completo, e nenhuma troca de lado.
- **Done when**: trocar `PRODUCT_SELECT` por `PRODUCT_CARD_SELECT` em `useProduct.ts` derruba a
  suíte do store.

### Fix 4 — decidir a regressão da busca — **Major, decisão do usuário**

- **Causa raiz**: `description` saiu do select que alimenta as três superfícies de busca.
- **Opções**: (a) aceitar a perda e **registrar** — mas então o critério "nenhuma mudança visível de
  comportamento" precisa ser corrigido na spec, não deixado contraditório; (b) `BL-020` (busca no
  servidor) vira pré-requisito; (c) select próprio para a busca, com `id, name, slug, tags,
  description`, o que devolve o casamento sem os 430 KB do select completo.
- **Done when**: qualquer que seja a escolha, um teste que prove o comportamento **com o dado que a
  consulta realmente entrega**, e não com um `Product` construído à mão.

### Fix 5 — `PRF-05` AC 3 — **Minor, decisão do usuário**

- T19 pendente. Enquanto não roda, `PRF-05` vale só para foto nova e a economia de CDN que segura o
  custo da transformação **não acontece** nos 3.618 objetos existentes.

---

## Atualização de rastreabilidade

| Requirement | Status anterior | Novo status |
| --- | --- | --- |
| PRF-01 | Pending | ✅ Verificado |
| PRF-02 | Pending | ✅ Verificado |
| PRF-03 | Pending | ⚠️ Verificado no componente · **fiação da `CategoryPage` sem guarda** |
| PRF-04 | Pending | ✅ Verificado |
| PRF-05 | Pending | ⚠️ AC 1-2 verificadas · **AC 3 sem implementação** |
| PRF-06 | Pending | ❌ **Precisa de correção** (AC 5 sem asserção de valor) |
| PRF-07 | Pending | ✅ Verificado |
| PRF-08 | Pending | ❌ **Precisa de correção** (AC 2 sem evidência) |
| PRF-09 | Pending | ✅ Verificado |
| PRF-10 | Pending | ⚠️ `lazy` verificado · "sem deslocamento" só por proxy |
| PRF-11 | Pending | ✅ Verificado |
| PRF-12 | Pending | ✅ Verificado, **inclusive no build real** |
| PRF-13 | Pending | ✅ Verificado |
| PRF-14 | Pending | ✅ Verificado |
| PRF-15 | Pending | ✅ Verificado |
| PRF-16 | Pending | ✅ Verificado |

---

## Resumo

**Overall**: ❌ **Not Ready** — o trabalho é bom e os portões estão limpos, mas três peças novas não
são defensáveis por teste, e uma delas é justamente a que a feature existe para consertar.

**Ancorada na spec**: 13/16 batendo o resultado definido · 2 gaps · 1 AC sem implementação
**Sensor**: 13 mutações, **9 mortas, 4 sobreviventes** (3 lacunas distintas)
**Portões**: 6127 testes em 351 arquivos, exit `0` nos cinco · tipos `0·0·0` · lint 27/5 · build `0`,
chunk de entrada **117,5 KB brotli**

**O que funciona, e funciona bem**: o dono único da URL de rendição é um módulo puro, sem um único
`import`, alcançável pelo Deno — a armadilha da feature `33` foi respeitada desde a primeira linha.
O guarda `renditionSingleOwner` segue o molde de `freeShippingSingleOwner` com âncora dupla e três
sensores embutidos. O `routeSplitting` é bidirecional e provado nos dois sentidos. A correção
`92fadbf` pegou um defeito que teria esvaziado a loja em produção, e o guarda que ela criou lê as
migrations do disco. A economia é real e reproduzível: 117,5 KB de chunk de entrada contra 278.

**O que precisa de conserto antes do fecho**: os três Blockers acima — todos são **teste**, nenhum
é código de produção. E a decisão sobre a busca, que é do usuário.

**Próximo passo**: rotear Fix 1, 2 e 3 para um implementador; levar Fix 4 e 5 ao usuário. Depois da
correção, re-verificar reinjetando as mutações 7, 7b, 10 e 13 — o critério de fecho é as quatro
morrerem.
