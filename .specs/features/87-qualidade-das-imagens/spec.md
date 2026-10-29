# 87 — A qualidade das imagens

**Escopo:** Large · **Apps:** store, backoffice, `packages/core` · **Migration:** não
**Origem:** avaliação de 2026-10-29 ("as imagens na loja e no painel aparecem com qualidade muito
ruim"). O usuário escolheu os itens 1, 2 e 3 da avaliação; o 4 (subir a qualidade de servir) fica
de fora.

## Problem Statement

A loja nunca pede ao `render/image` uma rendição maior que **720px** (`RENDITION_WIDTHS =
[360, 480, 720]`). Em celular de densidade 3 (iPhone, Android médio) a foto principal do produto e
os banners de largura cheia precisam de ~1170px, recebem 720 e o navegador amplia 1,6×: a foto sai
borrada exatamente onde ~90% das clientes olham. O zoom do produto no computador amplia a mesma
foto de 720px a 250%.

Além disso, o painel recomprime **toda** imagem enviada (WebP 0.82, teto 1600px, suavização padrão
do canvas), inclusive arquivo que já chegou pequeno e comprimido. O original gravado no Storage
**nunca chega à cliente** — a loja só serve rendições —, então a qualidade do original não custa
nenhum byte no celular, e hoje ela é sacrificada à toa.

## Goals

- [ ] Em 390×844 com DPR 3, a foto principal do produto e os banners de largura cheia são servidos
      com uma rendição de **1080px** (hoje 720).
- [ ] O custo em bytes é medido e declarado: a foto LCP da página do produto em DPR 3 cresce no
      máximo **2×** a de hoje, e o card e as miniaturas **não mudam**.
- [ ] O original gravado pelo painel perde menos: qualidade 0.92, suavização `high`, teto de 2400px
      e nenhuma recompressão quando o arquivo já está no formato e no tamanho certos.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Subir `RENDITION_QUALITY` (75) | Item 4 da avaliação, não escolhido. ~+20% de bytes por ganho pequeno |
| Reenviar ou reprocessar as imagens que já estão no Storage | As da Nuvemshop têm 1024px na origem; as do painel só melhoram se a dona reenviar. Sem migração de dado |
| Card de produto, miniaturas, menu, lista de categorias, carrinho, busca | Já recebem a largura que precisam (o card em 390 @3x pede 513 e o `srcset` tem 720) |
| A tela cheia da galeria | Já usa o ORIGINAL (`PRF-02` AC 6) |
| A rendição de 1440px | Num celular de DPR 3 (precisa de 1170) o navegador escolheria 1440, que é o maior custo sem ganho visível. Ver A-01 |
| AVIF, `<picture>`, CDN de imagem própria | Outra arquitetura de entrega |
| O painel exibir imagem em tamanho maior | O painel já pede 720 no resumo (330px) e 1600 no lightbox; o defeito dele é o ORIGINAL, coberto por `IMG-09..IMG-14` |

---

## Assumptions & Open Questions

| # | Assunção / decisão | Padrão escolhido | Motivo | Confirmado? |
| --- | --- | --- | --- | --- |
| A-01 | Maior largura das vagas de largura cheia | **1080**, sem 1440 | O navegador escolhe o menor candidato ≥ a necessidade: com 1440 no `srcset`, o celular @3x (1170) baixaria 1440. Com 1080 ele baixa 1080 (amplia 1,08×, invisível). No computador @2x o palco de 588px pede 1176 e também recebe 1080 | y (recomendação aceita na avaliação) |
| A-02 | Quais vagas são "de largura cheia" | palco da galeria (as duas leituras) e o `preload` do `<head>`, `HeroBanner` (foto), `HomeBannerGrid`, `CollectionFeature` e o celular do `HeroCarousel` | São as vagas com `sizes` de `100vw` no celular. O computador do `HeroCarousel` já pede 840/1680 | y (2026-10-29) |
| A-03 | Largura da camada do zoom | **1600** | O palco do computador mede 588px; a 250% são 1470px. 1600 é também o teto antigo do envio, então quase todo original do painel o atende sem pedir mais do que existe | y (2026-10-29) |
| A-04 | Quando o zoom baixa a foto grande | Só na primeira entrada do ponteiro sobre o palco | O zoom só existe com `hover` no computador; carregar antes custaria bytes a quem nunca passa o mouse | y (decorre do item 2) |
| A-05 | Qualidade do WebP do original | **0.92** | O original não é servido à cliente; a qualidade dele só aparece no painel e na tela cheia | y |
| A-06 | Teto do original | **2400px** no maior lado | Dá ao zoom (1600) e à tela cheia folga sobre o maior lado de uma foto de celular reduzida; `render/image` aceita até 2500 | y (2026-10-29) |
| A-07 | Quando NÃO recomprimir | o tipo do arquivo **é** o formato de saída pedido **e** os dois lados ≤ o teto | Um WebP de 1024px enviado como WebP sai idêntico; um JPEG continua virando WebP (uma geração só, a 0.92) | y |
| A-08 | Fonte de 1024px pedida a 1080 | O `render/image` devolve 1024 (medido: `?width=1080&resize=contain` numa origem 1024×1280 → 1024×1280). O descritor `1080w` fica 5% otimista | Inofensivo: o navegador amplia 1,05× | y (medido) |

**Open questions:** nenhuma — A-02, A-03 e A-06 confirmadas pelo usuário em 2026-10-29.

---

## User Stories

### P1: A foto e os banners nítidos no celular ⭐ MVP

**User Story:** Como cliente no celular, quero ver a foto da joia e os banners nítidos, para
enxergar o detalhe da peça que vou encomendar.

**Acceptance Criteria:**

1. **IMG-01** `packages/core/src/media/rendition.ts` SHALL exportar `RENDITION_WIDTHS_WIDE =
   [360, 480, 720, 1080]`, ao lado de `RENDITION_WIDTHS` (que continua `[360, 480, 720]`). O arquivo
   continua **sem nenhum `import`** (Deno).
2. **IMG-02** WHEN o palco da galeria do produto renderiza (a leitura do celular **e** a do
   computador) THEN as duas `<img>` SHALL declarar o MESMO `srcset` — as quatro larguras de
   `RENDITION_WIDTHS_WIDE` — e o MESMO `sizes` (`GALLERY_STAGE_SIZES`). O `src` de recuo é a
   rendição de 1080.
3. **IMG-03** WHEN `imagePreloadLink` monta o `<link rel="preload">` THEN `imagesrcset` SHALL ser
   byte a byte o `srcset` do palco (IMG-02), e `href` a rendição de 1080.
4. **IMG-04** WHEN `HeroBanner` (foto), `HomeBannerGrid` e `CollectionFeature` renderizam uma arte
   do Storage THEN o `srcset` SHALL ter as quatro larguras de `RENDITION_WIDTHS_WIDE`. O `sizes` de
   cada um não muda.
5. **IMG-05** WHEN `HeroCarousel` renderiza a arte do celular THEN o `srcset` SHALL ter 360, 720 e
   **1080**. A do computador continua 840 e 1680.
6. **IMG-06** WHEN o card de produto, a fita de miniaturas, o menu, a lista de categorias, o
   carrinho, a busca ou o checkout renderizam THEN o `srcset`/`src` SHALL ser idêntico ao de hoje.
7. **IMG-07** WHEN a arte vem de fora do Storage THEN toda superfície acima SHALL se comportar como
   hoje: `src` inalterado e sem `srcset`.

**Independent Test:** em 390×844 com DPR 3, abrir uma página de produto e conferir na rede que a
foto principal pedida é `width=1080`, uma única vez (sem uma segunda largura baixada pelo palco
escondido nem pelo preload), e que o card da categoria continua pedindo `width=720`.

---

### P1: O zoom do computador amplia uma foto de verdade ⭐ MVP

**User Story:** Como cliente no computador, quero que o zoom mostre o detalhe da peça, e não a foto
pequena esticada.

**Acceptance Criteria:**

1. **IMG-08** `rendition.ts` SHALL exportar `RENDITION_ZOOM_WIDTH = 1600`.
2. **IMG-15** WHEN o ponteiro entra no palco do computador pela primeira vez THEN a camada de zoom
   SHALL usar a rendição de `RENDITION_ZOOM_WIDTH` da foto ativa. ANTES da primeira entrada, nenhum
   elemento SHALL referenciar essa URL (nem `src`, nem `background-image`).
3. **IMG-16** WHEN a foto ativa troca THEN a camada de zoom SHALL usar a rendição de zoom da foto
   nova (nunca a da anterior).
4. **IMG-17** WHEN a foto é de fora do Storage THEN a camada de zoom SHALL usar a URL inalterada.

**Independent Test:** em 1440, abrir o produto: a rede não mostra `width=1600` até o mouse passar
sobre a foto; ao passar, aparece uma vez.

---

### P1: O painel guarda o original sem estragá-lo ⭐ MVP

**User Story:** Como dona da loja, quero que a foto que eu envio pelo painel seja guardada com a
qualidade que eu enviei, para que ela apareça nítida no painel, no zoom e na tela cheia.

**Acceptance Criteria (todos em `apps/backoffice/src/shared/lib/uploadImage.ts`, que serve o
produto, a Home e o banner do menu):**

1. **IMG-09** WHEN uma imagem é recomprimida THEN o WebP SHALL ser gerado com qualidade **0.92**.
2. **IMG-10** WHEN uma imagem é redimensionada no canvas THEN o contexto SHALL ter
   `imageSmoothingEnabled = true` e `imageSmoothingQuality = 'high'` antes do `drawImage`.
3. **IMG-11** O teto padrão SHALL ser **2400px** no maior lado; imagem menor nunca é ampliada.
4. **IMG-12** WHEN o arquivo enviado tem tipo IGUAL ao formato de saída pedido **e** os dois lados
   ≤ o teto THEN o arquivo SHALL ser gravado **byte a byte como chegou**, sem passar pelo canvas.
5. **IMG-13** WHEN o tipo difere do formato de saída (ex.: JPEG ou PNG com saída WebP) OU um lado
   passa do teto THEN a imagem SHALL passar pelo canvas (uma única recompressão).
6. **IMG-14** O que já existe continua: o `contentType` gravado é o do formato de saída, o
   `cacheControl` é `STORAGE_CACHE_CONTROL`, a validação de tipo e tamanho (8 MB) acontece antes de
   qualquer leitura, e qualquer falha devolve `null` sem lançar.

7. **IMG-18** A dica da área de envio da galeria do produto (`ImageGallery.tsx`), que hoje diz
   "convertidas para WebP 1600 px", SHALL dizer o teto novo e não afirmar conversão que pode não
   acontecer: **"PNG, JPG ou WebP até 8 MB · até 2400 px no maior lado"**.

**Independent Test:** enviar pelo painel (local) um WebP de 1024px e conferir que o objeto gravado
tem o MESMO SHA-256 do arquivo; enviar um JPEG de 4000px e conferir um WebP de 2400px no maior lado.

---

## Edge Cases

- WHEN a imagem do arquivo não carrega (arquivo corrompido com tipo válido) THEN `uploadImageBlob`
  SHALL devolver `null`, como hoje — inclusive no caminho sem canvas (IMG-12), que também precisa
  ler as dimensões.
- WHEN o `Blob` não tem `type` (render do estúdio de mockup) THEN SHALL passar pelo canvas (IMG-13).
- WHEN o formato pedido é PNG e chega um PNG ≤ teto THEN SHALL ser gravado como chegou (IMG-12) —
  inclusive a arte circular transparente da lista de categorias, cujo alfa não pode ser perdido.
- WHEN o produto não tem foto (`url` vazia) THEN palco, preload e zoom SHALL se comportar como hoje.

## Implicit-requirement sweep

| Dimensão | Resolução |
| --- | --- |
| Validação e limites | IMG-11, IMG-14 (8 MB, tipos); `render/image` aceita até 2500, e 1600/1080 estão dentro |
| Falha / falha parcial | Edge cases: arquivo que não carrega ⇒ `null` nos dois caminhos |
| Idempotência / retentativa | N/A: cada envio grava um UUID novo, como hoje |
| Auth e limites de taxa | N/A: nenhuma rota nova; o Storage segue com as policies de hoje |
| Concorrência / ordem | IMG-16 (a foto ativa trocada não mostra o zoom da anterior) |
| Ciclo de vida do dado | Out of Scope: nada é reprocessado; objetos antigos ficam |
| Observabilidade | N/A: o `console.error` de hoje continua (IMG-14) |
| Dependência externa | `render/image`: pedir 1080 numa origem menor devolve a origem (A-08); fora do Storage, URL inalterada (IMG-07, IMG-17) |
| Integridade de transição de estado | N/A: não há máquina de estado |

---

## Requirement Traceability

| ID | Story | Fase | Status |
| --- | --- | --- | --- |
| IMG-01 | P1 nítidas | Design | Pending |
| IMG-02 | P1 nítidas | Design | Pending |
| IMG-03 | P1 nítidas | Design | Pending |
| IMG-04 | P1 nítidas | Design | Pending |
| IMG-05 | P1 nítidas | Design | Pending |
| IMG-06 | P1 nítidas | Design | Pending |
| IMG-07 | P1 nítidas | Design | Pending |
| IMG-08 | P1 zoom | Validate | Verified |
| IMG-15 | P1 zoom | Validate | Verified |
| IMG-16 | P1 zoom | Validate | Verified |
| IMG-17 | P1 zoom | Validate | Verified |
| IMG-09 | P1 painel | Validate | Verified |
| IMG-10 | P1 painel | Validate | Verified |
| IMG-11 | P1 painel | Validate | Verified |
| IMG-12 | P1 painel | Validate | Verified |
| IMG-13 | P1 painel | Validate | Verified |
| IMG-14 | P1 painel | Validate | Verified |
| IMG-18 | P1 painel | Validate | Verified |

**Coverage:** 18 total, 18 mapeados a tasks (01–06), 0 sem task.

## Success Criteria

- [ ] Em navegador, 390×844 @3x, página de produto: a foto principal pedida é `width=1080`, **uma
      vez**; o peso dela é medido e fica ≤ 2× o da rendição de 720 da mesma foto.
- [ ] Em navegador, 390×844 @3x, categoria: os cards continuam pedindo `width=720` (sem regressão
      de peso na listagem).
- [ ] Em navegador, 1440: nenhum `width=1600` antes do hover; um depois.
- [ ] No banco local, um WebP de 1024px enviado pelo painel é gravado com o mesmo SHA-256.
- [ ] `packages/core/src/payment/**` sem uma linha alterada; baselines sem regressão.
