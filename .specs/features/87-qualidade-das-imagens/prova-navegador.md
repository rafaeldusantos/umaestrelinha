# 87 — Prova em navegador

2026-10-29 · Chromium (Playwright) · loja em `pnpm dev:store` (:8082) e painel em
`pnpm dev:backoffice` (:8083), os dois contra o **Supabase local** (:54441). `*.supabase.co` e
`**/g/collect*` bloqueados por rota (regra do projeto: testes só no local).

## Loja — 390×844, DPR 3, `isMobile`

Produto `joia-afetiva-arvore-da-vida-com-pelo-e-cinzas-de-cremacao` (foto principal
`nuvemshop/279686814/1224285090.webp`, origem 1024×1280):

| Medida | Resultado |
| --- | --- |
| Foto principal pedida | `width=1080`, **uma** vez (nem 720 do palco escondido, nem segunda largura do preload) |
| Peso da foto principal | **58.578 B** contra **31.994 B** da rendição de 720 da mesma foto ⇒ **1,83×** (teto do Success Criterion: 2×) |
| Miniaturas da fita / fotos de variação | `width=160` / `width=180`, como antes |
| Cards de relacionados | `width=720`, como antes |
| `body.scrollWidth` | 390 |

Categoria `/joias-afetivas`: **12** imagens pedidas, **todas** `width=720` (nenhuma 1080); o
`currentSrc` dos cards é 720 com o `sizes` de sempre; `scrollWidth` 390. **IMG-06 sem regressão de
peso.**

## Loja — 1440×900, DPR 2 (zoom)

| Medida | Resultado |
| --- | --- |
| `width=1600` antes do ponteiro | **0** pedidos |
| `width=1600` depois de pôr o ponteiro no palco | **1** pedido, da foto ativa |
| Foto do palco | `width=1080` uma vez, nenhum 720 da mesma foto |
| `body.scrollWidth` | 1440 |

## Painel — o envio (`uploadImageBlob` real, logado como admin local)

| Entrada | Gravado |
| --- | --- |
| WebP 1024×1280 (o original da Nuvemshop acima) | SHA-256 **idêntico** (`e73069d2…77f6f`), `image/webp` — sem recompressão (IMG-12) |
| JPEG 4000×3000 gerado no navegador | WebP **2400×1800**, 44.258 B (IMG-11, IMG-13) |

Os dois objetos (`product-images/qa-87/`) foram apagados do Storage local depois da medida.

## O que NÃO foi provado em navegador

- **Os banners da Home** (`HeroBanner`, `HomeBannerGrid`, `CollectionFeature`, `HeroCarousel`): as
  artes do banco local apontam para o Storage **hospedado**, bloqueado por regra. Ficam provados
  pelos testes de componente (descritores do `srcset`), que medem a forma; a escolha do candidato
  pelo navegador segue a mesma regra medida na galeria.
- **Celular real** (Android/iPhone): a densidade 3 foi emulada.
- **A suavização `high` do canvas** não tem diferença mensurável no Chromium sem GPU (medido na
  avaliação: os três modos dão o mesmo resultado). Ela é provada pela ordem das chamadas no teste.
