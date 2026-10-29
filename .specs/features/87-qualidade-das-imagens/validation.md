# 87 — Validação (Verificador independente, rodada 1)

**Veredito: FAIL — por cobertura, sem defeito de produto.** 18/18 ACs com evidência `arquivo:linha`
e valor da spec; 31 mutantes nos arquivos reais de produção, **29 mortos por asserção**, 0 por
compilação, **2 sobreviventes** (um deles candidato a equivalente).

- Data: 2026-10-29 · Verificador ≠ autor (não escreveu o código nem os testes).
- Superfície: `git diff bcc11ce1` (22 arquivos, +461/−94) mais o arquivo novo
  `apps/store/src/entities/product/ui/__tests__/ImageZoom.test.tsx`.
- Nada no código ou nos testes foi alterado por esta verificação; toda mutação foi restaurada com o
  SHA-256 conferido igual ao de antes (o arnês lança se a restauração divergir e recusa alvo que não
  apareça exatamente uma vez).

## Gates (medidos pelo verificador, um workspace por vez, exit fora de pipe, `--testTimeout=20000` sem `--`)

| Workspace | Resultado | Esperado | Exit |
| --- | --- | --- | --- |
| core | **4923/190** | 4923/190 | 0 |
| store | **6229/334** | 6229/334 | 0 |
| backoffice | **4504/243** | 4504/243 | 0 |

Delta contra `baseline.md`: core +5/0, store +10/+1 (`ImageZoom.test.tsx` novo), backoffice +13/0.
Nenhuma queda. `git diff --name-only -- packages/core/src/payment` = 0 arquivos.
Tipos, lint e build **não** foram remedidos aqui (não pedidos).

## Checagem ancorada na spec

| AC | Valor da spec | Evidência (`arquivo:linha` — asserção) | Resultado |
| --- | --- | --- | --- |
| IMG-01 | `RENDITION_WIDTHS_WIDE = [360,480,720,1080]`; `RENDITION_WIDTHS` continua `[360,480,720]`; arquivo sem `import` | `packages/core/src/media/rendition.test.ts:294` — `toEqual([360, 480, 720, 1080])`; `:299` — `toEqual([360, 480, 720])` e derivação; `:47` — `imports).toEqual([])` (M28 morto) | ✅ |
| IMG-02 | as duas leituras do palco com o MESMO `srcset` (4 larguras) e MESMO `sizes`; `src` = 1080 | `ProductGallery.test.tsx:111` — `srcset` toBe as 4 larguras; `:123` — `data-srcset` toBe `srcset` do celular e `data-sizes` toBe `sizes`; `:176` — `src` toBe `width=1080`; `:184` — as duas leituras com a mesma URL 1080; `ImageZoom.test.tsx:56` — o `<img>` real repassa `srcset`/`sizes` (M26 morto) | ✅ |
| IMG-03 | `imagesrcset` byte a byte o do palco; `href` = 1080 | `head.test.ts:220` — contém `imagesrcset="…4 larguras"` e `href="…width=1080"`; `serve.test.ts:311` — `srcset` toBe `escapeXml(renditionSrcSet(STORAGE,[360,480,720,1080]))`; `:287` — `href` toBe rendição 1080; `:304` — `href` não é 720 | ✅ (a igualdade com o palco é por o MESMO literal estar fixado nos dois testes, e pela mesma constante na produção — não há comparação direta preload × galeria) |
| IMG-04 | `HeroBanner`, `HomeBannerGrid`, `CollectionFeature`: 4 larguras; `sizes` igual | `HeroBanner.test.tsx:227` — `srcset` toBe as 4, `sizes` toBe `(min-width: 768px) 440px, 100vw`; `HomeBannerGrid.test.tsx:227` — toBe as 4, `sizes` `(min-width: 768px) 50vw, 100vw`; `CollectionFeature.test.tsx:214` — toBe as 4, `sizes` `(min-width: 768px) 46vw, 100vw` | ✅ |
| IMG-05 | celular 360/720/1080; computador 840/1680 | `HeroCarousel.test.tsx:136` — descritores `toEqual(['360w','720w','1080w'])` e `['840w','1680w']` | ✅ |
| IMG-06 | card, miniatura, menu, lista de categorias, carrinho, busca, checkout idênticos | `git diff --stat`: nenhum desses arquivos de produção nem de teste alterado (`ProductCard`, `MegaMenu`, `MobileMenu`, `CategoryList`, `CartDrawerRow`, `CrossSell`, `SearchOverlay`/`Dropdown`, `OrderSummary`, `OrderBump`, `ProductCarousel` e seus testes). `ProductCard.test.tsx:73` — `srcset` toBe as **3** larguras (M27 — o padrão de `renditionSrcSet` trocado para o conjunto largo — morto por ele); `ProductGallery.test.tsx:197` — miniatura `width=160`. Carrinho, busca e checkout não têm asserção de `srcset` própria: cobertos por não-alteração + o padrão de `renditionSrcSet` guardado | ✅ |
| IMG-07 | arte de fora do Storage: `src` inalterado, sem `srcset` | `HeroBanner.test.tsx:239`, `HomeBannerGrid.test.tsx:252`, `CollectionFeature.test.tsx:226`, `HeroCarousel.test.tsx:153`, `ProductGallery.test.tsx:223` (celular), `:151` (computador, `data-srcset` toBe `''`) | ⚠️ ver gap 2: no palco do computador o dublê não distingue `srcSet=""` de ausente |
| IMG-08 | `RENDITION_ZOOM_WIDTH = 1600` | `rendition.test.ts:313` — `toBe(1600)` e a URL `width=1600` | ✅ |
| IMG-15 | zoom usa a rendição de 1600 só depois da 1ª entrada; antes, nenhum elemento referencia a URL | `ImageZoom.test.tsx:32` — `innerHTML` não contém `width=1600` e camada `null`; `:39` — `backgroundImage` toBe `url(ZOOM)`; `ProductGallery.test.tsx:133` — prop `zoomSrc` toBe rendição 1600 | ⚠️ ver gap 1: a ausência só é medida dentro do `ImageZoom`, nunca na galeria (M30 sobrevive) |
| IMG-16 | trocar a foto ativa troca o zoom | `ProductGallery.test.tsx:141` — `data-zoom-src` toBe rendição 1600 da 2ª; `ImageZoom.test.tsx:67` — `backgroundImage` toBe `url(ZOOM_B)` e sem a anterior | ✅ |
| IMG-17 | foto externa: zoom com URL inalterada | `ProductGallery.test.tsx:151` — `data-zoom-src` toBe a externa; `ImageZoom.test.tsx:84` | ✅ |
| IMG-09 | WebP a 0.92 | `uploadImage.test.ts:357` — `toBlobSpy.mock.calls[0][2]).toBe(0.92)` e formato `image/webp` | ✅ |
| IMG-10 | `imageSmoothingEnabled=true` e `Quality='high'` antes do `drawImage` | `uploadImage.test.ts:365` — `eventosDoContexto` toEqual a sequência ordenada (M16, M22, M23 mortos) | ✅ |
| IMG-11 | teto 2400, sem ampliar | `uploadImage.test.ts:125` (4000×3000 → 2400×1800), `:134` (altura como maior lado → 1200×2400), `:143` (não amplia) | ✅ |
| IMG-12 | tipo = saída e dois lados ≤ teto ⇒ gravado como chegou, sem canvas | `uploadImage.test.ts:377` — `uploadMock.mock.calls[0][1]).toBe(original)` e `toBlob` não chamado; `:389` — exatamente 2400 (M19 morto); `:399` — PNG→PNG com `contentType: image/png` | ✅ |
| IMG-13 | tipo difere OU lado passa ⇒ canvas, uma recompressão | `uploadImage.test.ts:410` (JPEG), `:421` (PNG→WebP), `:430` (WebP 2401 → 2400), `:441` (Blob sem tipo) — `toBlobSpy` `toHaveBeenCalledTimes(1)` e `not.toBe(original)` | ✅ |
| IMG-14 | `contentType` do formato, `cacheControl` = `STORAGE_CACHE_CONTROL`, validação antes de ler, falha ⇒ `null` | `uploadImage.test.ts:450` — `toMatchObject({contentType:'image/webp', cacheControl:'31536000', upsert:false})` no caminho sem canvas; `:460`/`:469` — `null` e upload não chamado (M20 morto); validação antes da leitura: `uploadProductImage.test.ts:97`/`:106` — `createObjectURL` não chamado (código anterior, não tocado) | ✅ |
| IMG-18 | "PNG, JPG ou WebP até 8 MB · até 2400 px no maior lado" | `ImageGallery.test.tsx:96` — `toHaveTextContent` da frase inteira, e `not` `1600`/`convertidas` (M21 morto) | ✅ |

**Edge cases**

| Caso | Evidência | Resultado |
| --- | --- | --- |
| arquivo corrompido com tipo válido ⇒ `null`, inclusive no caminho sem canvas | `uploadImage.test.ts:460` (WebP, seria sem canvas) e `:469` (JPEG) | ✅ |
| `Blob` sem `type` ⇒ canvas | `uploadImage.test.ts:441` | ✅ |
| PNG ≤ teto com saída PNG ⇒ como chegou (alfa) | `uploadImage.test.ts:399` | ✅ |
| produto sem foto ⇒ palco, preload e zoom como hoje | `ProductGallery.test.tsx:71` (nenhum `<img>`, zoom não monta); `head.test.ts:230` (preload `''`) | ✅ |

## Sensor de discriminação

Arnês: `/private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/75ea0484-1835-4eb6-bd17-4ecb6e72223c/scratchpad/mut/harness.py`
(substituição exata com alvo único, só os testes do workspace afetado, restauração por reescrita +
SHA-256). "Por asserção" = o arquivo de teste carregou, outros casos do mesmo arquivo passaram e o
caso falhou com `AssertionError` nomeando o valor.

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| M01 | `core/media/rendition.ts` | `RENDITION_WIDE_MAX` 1080 → 1440 | morto por asserção (5 casos) |
| M02 | `core/page/head.ts` | preload com o conjunto curto (`renditionSrcSet(url)`) | morto por asserção (2) |
| M03 | `core/page/head.ts` | `href` do preload 720 | morto por asserção (3) |
| M04 | `core/media/rendition.ts` | `RENDITION_ZOOM_WIDTH` 1600 → 1080 | morto por asserção (1) |
| M05 | `ProductGallery.tsx` | palco do computador sem `srcSet` | morto por asserção (1) |
| M06 | `ProductGallery.tsx` | `zoomSrc` com a largura do palco (1080) | morto por asserção (2) |
| M07 | `ImageZoom.tsx` | camada com `src` em vez de `zoomSrc` | morto por asserção (4) |
| M08 | `ImageZoom.tsx` | camada sempre montada | morto por asserção (2) |
| M09 | `ProductGallery.tsx` | palco do celular com o conjunto curto | morto por asserção (2) |
| M10 | `ProductGallery.tsx` | palco do computador com `sizes="100vw"` | morto por asserção (1) |
| M11 | `HeroCarousel.tsx` | celular sem a largura 1080 | morto por asserção (1) |
| M12 | `HomeBannerGrid.tsx` | volta ao conjunto curto | morto por asserção (1) |
| M13 | `HeroBanner.tsx` | volta ao conjunto curto | morto por asserção (1) |
| M14 | `CollectionFeature.tsx` | volta ao conjunto curto | morto por asserção (1) |
| M15 | `uploadImage.ts` | `WEBP_QUALITY` 0.92 → 0.82 | morto por asserção (1) |
| M16 | `uploadImage.ts` | suavização depois do `drawImage` | morto por asserção (1) |
| M17 | `uploadImage.ts` | `MAX_DIMENSION` 2400 → 1600 | morto por asserção (4) |
| M18 | `uploadImage.ts` | desvio sem canvas sem checar o tipo | morto por asserção (5) |
| M19 | `uploadImage.ts` | `<=` → `<` no teto | morto por asserção (1) |
| M20 | `uploadImage.ts` | falha de decodificação engolida (`loadImage(...).catch(() => ({width:0,height:0}))`) | morto por asserção (2) |
| M21 | `ImageGallery.tsx` | copy "convertidas para WebP 2400 px" | morto por asserção (1) |
| M22 | `uploadImage.ts` | `imageSmoothingQuality` 'medium' | morto por asserção (1) |
| M23 | `uploadImage.ts` | `imageSmoothingEnabled = false` | morto por asserção (1) |
| M24 | `ProductGallery.tsx` | `PALCO_PX` 720 | morto por asserção (3) |
| M25 | `uploadImage.ts` | desvio devolve uma CÓPIA (`new Blob([file])`) em vez do próprio arquivo | morto por asserção (3) |
| M26 | `ImageZoom.tsx` | `<img>` do palco sem `srcSet`/`sizes` | morto por asserção (1) |
| M27 | `core/media/rendition.ts` | padrão de `renditionSrcSet` trocado para o conjunto largo (IMG-06) | morto por asserção (`ProductCard.test.tsx:73`) |
| M28 | `core/media/rendition.ts` | `import type` acrescentado (IMG-01) | morto por asserção (`rendition.test.ts:47`; `imagesDenoReach` também cai, por leitura de arquivo) |
| M29 | `ProductGallery.tsx` | palco do computador sem o `\|\| undefined` (externa ⇒ `srcSet=""`) | **SOBREVIVEU** |
| M30 | `ProductGallery.tsx` | `<link rel="prefetch" href={renditionUrl(active.url, RENDITION_ZOOM_WIDTH)} />` antes do `<ImageZoom>` | **SOBREVIVEU** |
| M31 | `ImageZoom.tsx` | `data-z={zoomSrc}` no `<img>` do palco | morto por asserção (`ImageZoom.test.tsx:32`) |

Total: 31 · mortos por asserção 29 · por compilação 0 · sobreviventes 2.

## Gaps ranqueados

1. **IMG-15 ("antes da primeira entrada, NENHUM elemento referencia essa URL") só é medida dentro do
   `ImageZoom`** — M30 sobrevive: a galeria pode nomear a rendição de 1600 fora do componente (um
   `prefetch`, uma `<img hidden>`, um `preload`) e os 33 casos de galeria e zoom seguem verdes,
   porque `ProductGallery.test.tsx` dubla o `ImageZoom` e o próprio dublê põe a URL no DOM
   (`data-zoom-src`), o que torna a asserção de ausência impossível naquele arquivo. Hoje o código não
   faz isso (a prova em navegador mediu 0 pedidos de `width=1600` antes do ponteiro), então é lacuna
   de régua, não defeito. Conserto sugerido: um caso que monte a `ProductGallery` com o `ImageZoom`
   REAL (ou um dublê que não exponha `zoomSrc` em atributo) e asserir que o HTML do contêiner não
   contém `width=1600` antes do `mouseEnter` e contém depois.
2. **IMG-07 no palco do computador: o dublê não distingue `srcSet` ausente de vazio** — M29 sobrevive:
   tirar o `|| undefined` faz o `<img>` real do computador sair com `srcset=""` numa foto externa, e o
   dublê (`data-srcset={srcSet ?? ''}`) devolve `''` nos dois mundos. Efeito no navegador: atributo
   vazio é ignorado e o `src` vale — **candidato a equivalente**, baixa prioridade. Conserto, se
   desejado: o dublê registrar `srcSet === undefined` (ex.: `data-sem-srcset`) e o caso de
   `ProductGallery.test.tsx:151` asserir ausência.
3. **(precisão, informativo) IMG-03 "byte a byte o `srcset` do palco"** é provado por os dois lados
   (preload em `serve.test.ts:311` e galeria em `ProductGallery.test.tsx:111`) fixarem o MESMO
   conjunto literal, e não por uma comparação direta entre as duas saídas. Basta enquanto ambos usam
   `RENDITION_WIDTHS_WIDE` (M02 e M09 morrem); não é sobrevivente.

## Superfície coberta

- core: `rendition.ts` (constantes, padrão de `renditionSrcSet`, pureza), `head.ts` (preload) —
  `rendition.test.ts`, `head.test.ts`, `serve.test.ts`.
- store: `ProductGallery.tsx`, `ImageZoom.tsx`, `HeroBanner.tsx`, `HomeBannerGrid.tsx`,
  `CollectionFeature.tsx`, `HeroCarousel.tsx` — testes de cada um; `ProductCard.test.tsx` como guarda
  de IMG-06.
- backoffice: `uploadImage.ts` (todo o novo caminho `prepareImage`/`loadImage`), `ImageGallery.tsx`
  (copy). Os comentários em `uploadHomeImage.ts` e `AdminQuickGridPage.tsx` são só texto (conferidos:
  consistentes com o teto 2400; `uploadHomeImage`/`uploadBannerImage` não passam `maxDimension`, então
  herdam o padrão).
- Não medido aqui: tipos, lint, build e navegador (a prova em navegador é do autor:
  `prova-navegador.md`).

## Código (qualidade)

Mudança pequena e no padrão do repositório: constantes no dono único (`core/media`), opt-in por
superfície, sem tocar o conjunto curto; o desvio sem canvas é uma condição só, e o `Blob` sem tipo
cai no canvas por construção (`'' !== format`). Nada fora do escopo pedido.

## Lições candidatas

- **Dublê que põe a prop no DOM torna a ausência daquela URL inauditável no arquivo que o usa.**
  Quando a AC é "nenhum elemento referencia X antes de Y", a prova tem de montar a árvore real até o
  componente que decide; o teste de unidade do componente não alcança o que o PAI pode acrescentar.
- **`?? ''` num dublê funde "ausente" e "vazio"** — se a AC fala de ausência de atributo, o dublê
  precisa registrar `undefined` como um terceiro estado.

---

## Fecho das lacunas da rodada 1 (orquestrador, 2026-10-29)

Sem rodada 2 do Verificador (precedente da `72`, `73`, `83` e `86`: lacunas só de cobertura, fechadas
com o mutante reinjetado). Nenhum código de produção mudou.

| Gap | Conserto | Mutante reinjetado | Resultado |
| --- | --- | --- | --- |
| 1 — IMG-15 só provada dentro do `ImageZoom` | `ProductGalleryZoom.test.tsx` (novo, 2 casos): a galeria com o `ImageZoom` **real**; o HTML inteiro sem `width=1600` antes do ponteiro e a camada com a rendição de 1600 depois | M30 (`<link rel="prefetch">` da URL de zoom posto pela galeria) | **morto por asserção** |
| 2 — IMG-07 no palco do computador | o dublê de `ProductGallery.test.tsx` registra `undefined` como `<ausente>` (não mais `?? ''`); o caso IMG-17 assere `<ausente>` | M29 (`|| undefined` removido do `srcSet` do palco do computador) | **morto por asserção** |
| 3 — IMG-03 por literais iguais | informativo, mantido | — | — |

Restauração conferida por SHA-256 depois de cada mutante. Store: **6231/335** (+2/+1 sobre o gate).
