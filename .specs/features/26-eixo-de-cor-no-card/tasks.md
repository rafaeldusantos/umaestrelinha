# 26 · Eixo de cor no card — tasks

10 tasks em 4 fases. Ordem obrigatória: a loja só é verificável com dado real, e o dado real só
existe depois da reimportação.

**Convenção de commit desta feature**: `CLAUDE.md` manda **agrupar** — nada de commit atômico por
task. Os commits saem completos no fim de cada lote (`BL-012`, fechada na `25`).

**Baselines a bater no gate** (medidas no fecho da `25`):
- lint: **30 erros / 8 warnings** (backoffice 28/7 · store 2/1) — o gate é "sem erros novos"
- tipos: **store 0 · backoffice 0 · catalog-import 0** — zero é a baseline
- testes: **4595 em 259 arquivos** — store 1562/116 · backoffice 1388/86 · core 1090/38 ·
  functions 279/4 · catalog-import 276/15
- `git diff --name-only` **não pode tocar** `packages/core/src/payment/**`

---

## Fase 1 · Importador — tags (`COR-06`..`COR-08`)

### T1 — `mapProduct` emite `tags: string[]` ✅
- **Arquivos**: `tools/catalog-import/src/map/product.ts`
- **Fazer**: acrescentar `tags: string[]` a `ProductRow` e um parser puro para
  `RawProduct.tags` (string separada por vírgula): `split(',')` → `trim` → descarta vazias →
  dedupe **preservando a ordem de aparição**.
- **Done when**:
  - `'Leite Materno, Cinzas'` → `['Leite Materno','Cinzas']`
  - `''` → `[]` (nunca `['']`)
  - `' a , , b , a '` → `['a','b']` — trim, vazia descartada, duplicata removida, ordem preservada
  - a fixture de `map/__tests__/product.test.ts` cobre os três casos
- **Verificar**: `pnpm --filter @estrelinha/catalog-import test`

### T2 — `catalogoDoProduto` grava `tags` no insert **e** no update ✅
- **Arquivos**: `tools/catalog-import/src/write/products.ts`
- **Fazer**: incluir `tags` no objeto que insert e update compartilham.
- **Done when**:
  - o insert de produto novo carrega `tags`
  - o update de produto existente carrega `tags` e **sobrescreve** o valor anterior (`COR-08` —
    é a divergência deliberada frente ao `requires_material`, que só semeia onde é `null`)
  - teste em `write/__tests__/products.test.ts` assere as **duas** operações, não uma
- **Verificar**: `pnpm --filter @estrelinha/catalog-import test`

---

## Fase 2 · Importador — foto por variação (`COR-01`..`COR-05`)

### T3 — `writeVariantImages` ✅
- **Arquivos**: `tools/catalog-import/src/write/products.ts`
- **Fazer**: função nova que recebe as `VariantRow[]` do produto e um
  `Map<image_nuvemshop_id, storageUrl>`, e atualiza `product_variants.image_url` casando
  `variant.image_nuvemshop_id` com a chave do mapa. A escrita casa por
  `nuvemshop_id` da variação, que é `UNIQUE` global.
- **Done when**:
  - variação com vínculo e imagem no mapa → recebe a URL
  - variação **sem** `image_nuvemshop_id` → `image_url = null` (`COR-02`)
  - variação cujo `image_nuvemshop_id` **não está no mapa** (upload falhou) → `image_url = null`,
    e **não** a capa nem a URL de outra cor (`COR-02`)
  - variação cujo vínculo mudou na origem → a URL é **corrigida**, não preservada (`COR-04`)
- **Verificar**: `pnpm --filter @estrelinha/catalog-import test`

### T4 — fase 3 do `run.ts` acumula o mapa e chama a escrita ✅
- **Arquivos**: `tools/catalog-import/src/run.ts`
- **Fazer**: no laço de imagens, acumular `plan.nuvemshop_id → outcome.url` para cada
  `outcome.kind !== 'failed'`, e chamar `writeVariantImages` depois de `writeProductImages`.
- **Done when**:
  - imagem `failed` **não** entra no mapa (é o que produz o `null` de `COR-02`)
  - `--dry-run` não alcança a escrita — a fase 3 inteira já retorna antes (`COR-05`), e existe
    teste que prova o zero-escrita
- **Verificar**: `pnpm --filter @estrelinha/catalog-import test`

### T5 — relatório conta variações com e sem foto ✅
- **Arquivos**: `tools/catalog-import/src/report.ts` (+ o consumo em `run.ts`)
- **Fazer**: dois contadores separados, em linha própria do relatório.
- **Done when**: o relatório mostra **os dois** números; um só ("N com foto") não permite conferir
  o total, que é o que `COR-03` pede
- **Verificar**: `pnpm --filter @estrelinha/catalog-import test`

---

## Fase 3 · Reimportação (prova com dado real)

### T6 — rodar o import e medir ✅
- **Fazer**: `pnpm --filter @estrelinha/catalog-import run import` contra o Supabase local.
  O cache de imagens já está populado, então a fase 3 reaproveita em vez de rebaixar 3.660 arquivos.
- **Done when** (probe HTTP contra `127.0.0.1:54341`, **não** inspeção de tipo — `AD-012`):
  - `product_variants?image_url=not.is.null` deixa de ser 0
  - `products` com `tags <> '{}'` deixa de ser 0
  - o total de produtos continua **680** e o de variações **3.245** — a feature não pode criar
    nem perder linha
  - exit code do importador é **0**
- **Registrar**: os números medidos vão para o `tasks.md` e para o handoff. Se `image_url`
  continuar 0, a Fase 4 **para** — é sinal de que o vínculo da origem não é o que a spec supõe.

#### Medição da T6 — 2026-08-15, probe HTTP contra `127.0.0.1:54341`

Exit code do importador: **0**. Imagens: `novas 0 · reusadas 3747 · falhadas 0` (o cache e o Storage
já estavam populados, então nada foi rebaixado).

| medida | antes | depois |
| --- | ---: | ---: |
| `product_variants` total | 3.245 | **3.245** |
| `product_variants.image_url` não-nulo | **0** | **3.052** (94%) |
| `product_variants.image_url` nulo | 3.245 | 193 |
| `products` total | 680 | **680** |
| `products.tags` não-vazio | **0** | **622** (91%) |
| `products.tags` = `{}` | 680 | 58 |

**O PORTÃO abriu**: `image_url` deixou de ser 0, o vínculo da origem é o que a spec supõe, e a Fase 4
pode começar. Conferido por amostra que três cores do mesmo produto recebem **fotos diferentes** —
que é a finalidade da feature, e não só "a coluna não está nula".

**A linha do relatório conta ESCRITAS, não linhas**: ele diz `com foto 3162 · sem foto 197`
(3.359 escritas) para 3.245 linhas. A listagem da origem devolve 692 produtos e 3.360 variações, e
691 updates caem sobre 680 linhas distintas — ou seja, a origem **repete pelo menos 11 produtos** na
paginação. É comportamento **pré-existente** e inofensivo (a escrita é idempotente e os totais não
mudaram); fica registrado porque as duas contagens divergem de propósito e a diferença assusta quem
compara sem saber.

---

## Fase 4 · Loja — o card (`COR-09`..`COR-15`)

### T7 — a regra pura: qual eixo é cor, e quantas vagas ✅
- **Arquivos**: `apps/store/src/entities/product/lib/variantSelection.ts`
- **Fazer**: duas funções puras no módulo que **já é dono** desta classe de regra
  (`orderedOptions`, `visibleOptions` moram ali, e o docblock diz que é domínio da loja, não de
  `core`) — não criar um segundo lugar.
  - `colorAxis(options)` → o eixo de cor, ou `null`
  - `colorPreview(product, selected, slots)` → `{ thumbs: [{ value, imageUrl, active }], overflow }`
- **Done when**:
  - eixo com **menos de 2** valores → `null` / sem preview (`COR-10`)
  - produto sem grade e produto com grade sem eixo Cor → `null` (`COR-10`)
  - `slots = 4`, 5 cores → **3** thumbs + `overflow = 2` (a última vaga é o contador) (`COR-12`)
  - `slots = 3`, 3 cores → **3** thumbs + `overflow = 0` (`COR-12`)
  - `imageUrl` é `null` quando a variação daquela cor não tem foto (`COR-15`)
  - a thumb da cor em `selected` vem `active: true` (`COR-14`)
- **Verificar**: `pnpm --filter @estrelinha/store test`

### T8 — o componente da placa ✅
- **Arquivos**: `apps/store/src/entities/product/ui/ColorPreview.tsx` (novo)
- **Fazer**: **um** `<button>` contendo as miniaturas. Miniatura é `<div>`/`<img>`, nunca controle
  (`COR-11`).
- **Done when**:
  - medidas de `COR-13` literais: `h-8 w-8`, raio 6px, gap 6px, padding 6px, borda
    `1px #8C8073`, raio 12px, placa com 44px de altura
  - selecionada com `border-2` `ink`, demais `1px #8C8073` (`COR-14`)
  - cor sem foto renderiza o palco vazio, **sem `<img>`** (`COR-15`) — nunca `<img>` sem `src`
  - o `+N` ocupa a última vaga, no mesmo tamanho
- **Verificar**: `pnpm --filter @estrelinha/store test`

### T9 — integrar no `ProductCard` ✅
- **Arquivos**: `apps/store/src/entities/product/ui/ProductCard.tsx`
- **Fazer**: (a) título `text-[14px] leading-[20px] line-clamp-2` (`COR-09`); (b) a placa dentro do
  palco, `absolute bottom-3.5 left-3.5`, abrindo o mesmo seletor que o `+` abre.
- **Done when**:
  - o clique na placa faz `preventDefault` + `stopPropagation` e **não** navega (`COR-11`) —
    mesmo padrão que o favorito e o `+` já usam dentro do `<Link>`
  - abre `QuickAddDrawer` no desktop e `VariantSheet` no mobile, sem terceira superfície
  - produto sem eixo de cor não renderiza a placa e o palco fica idêntico ao de hoje (`COR-10`)
- **Verificar**: `pnpm --filter @estrelinha/store test`

### T10 — testes de superfície ✅
- **Arquivos**: `apps/store/src/entities/product/ui/__tests__/ProductCardSurface.test.tsx`
- **Done when**:
  - `COR-12` tem asserção **positiva nas duas metades** — a classe de mobile **e** a com prefixo
    `md:`. Negação que tolera o prefixo não prova que ele existe (lição `L-029`)
  - `COR-09` assere os três valores (14px, 20px, `line-clamp-2`), não "mudou de tamanho"
    (lição `L-024`)
  - a ausência da placa é aserida para os três casos de `COR-10`
  - `COR-15`: zero `<img>` sem `src` — é o modo de falha que a AC descreve
- **Verificar**: `pnpm --filter @estrelinha/store test` e depois a suíte inteira por workspace

---

## Gate final

1. `pnpm --filter <ws> test` por workspace (nunca `pnpm test | tail` — o exit code sai do `tail`)
2. `npx tsc --noEmit -p apps/store/tsconfig.app.json` · idem `tools/catalog-import/tsconfig.json`
3. `pnpm lint` — comparar com 30/8, não exigir limpo
4. `git diff --name-only` sem nada em `packages/core/src/payment/**`
5. Prova em viewport móvel 390×844 — `CLAUDE.md` exige, e `COR-12` é metade regra de mobile

---

## Prova em navegador — 2026-08-15, Chrome, loja em dev contra o Supabase local

Medida com o catálogo real importado. Cada número abaixo saiu de `getBoundingClientRect` /
`getComputedStyle` na página, não de leitura de classe.

### O que a placa mede, em tela (`COR-13`, `COR-14`)

| medida | board | medido |
| --- | ---: | ---: |
| altura da placa | 44px | **44px** |
| inset esquerdo · inferior | 14 · 14 | **14 · 14** |
| raio da placa · da miniatura | 12 · 6 | **12px · 6px** |
| borda da placa | 1px `#8C8073` | **1px `rgb(140,128,115)`** |
| fundo da placa | `surface` | **`rgb(255,255,255)`** |
| padding · gap | 6 · 6 | **6px · 6px** |
| miniatura | 32×32 | **32×32** |
| borda da escolhida | 2px `ink` | **2px `rgb(35,48,58)`** |
| nome do produto | 14 / 20 / 40 | **14px / 20px / `min-height` 40px, clamp 2** |

### As duas metades de `COR-12`, com produto real

| largura | superfície | card | vagas visíveis |
| ---: | --- | ---: | --- |
| 390 | home, carrossel | 220px | **3** — 3 fotos (mediana do catálogo) |
| 390 | categoria, grade 2 col. | 171px | **3** — 2 fotos + `+2` (4 cores) · 2 fotos + `+3` (5 cores) |
| 768 · 1024 · 1440 | categoria | 134,7 · 220 · 305,3 | **4** — 4 fotos (4 cores) · 3 fotos + `+2` (5 cores) |

- `COR-10`: `pingente-afetivo-cabelo-livre-com-coto-umbilical` (grade sem eixo de cor) renderiza
  **sem placa**, com o palco `aspect-[4/5] rounded-xl bg-estrelinha-ground-deep` intacto.
- `COR-15`: `colar-gravata-mae-de-menino` — a cor `Folheado a Ouro` não tem foto na origem e sai como
  palco vazio `rgb(241,235,225)` (`ground-deep`), **sem `<img>`**; as outras duas carregam
  (`complete: true`). Zero `<img>` sem `src`.
- `COR-11`: clique na placa em 390 abre o `VariantSheet` com os três chips de cor e o CTA
  `Adicionar à sacola · R$ 169,90`, e a URL **continua** `/personalizados` — não navegou.
- Scroll horizontal do body: **390 → 390** (home e categoria) e **1440 → 1440**. Sem regressão.

### Dois achados PRÉ-EXISTENTES, provados por medição na árvore limpa

Nenhum dos dois é desta feature; os dois foram confirmados com `git stash` e nova medição.

1. **O `+` e o favorito do card não são `absolute`, e por isso não aparecem.** `TAP_44` começa com
   `relative`, e o Tailwind emite `.relative` **depois** de `.absolute` na folha — então
   `${TAP_44} absolute …` resolve para `position: relative` e os dois botões caem no fluxo, dentro
   de um palco `overflow-hidden`, invisíveis. Medido em `getComputedStyle`: `relative` nos dois,
   **com e sem** esta feature aplicada. Vale para `ProductCard.tsx` (favorito e "+").
2. **`storeOrigin.test.ts` do backoffice falha quando `VITE_STORE_URL` existe no `.env`.** O caso
   "sem env devolve `null`" chama `storeOrigin(undefined)`, e o parâmetro **default** faz `undefined`
   cair em `STORE_URL` — que a env preenche. Falha idêntica na árvore limpa. É da feature 25.

### O que a medição em tela mostrou sobre `COR-12`, e que a spec não previu

A conta de largura de `COR-12` usou os **220px do carrossel da home**. Nas outras duas superfícies o
card é mais estreito, e as quatro vagas (**160px**) não cabem:

| largura | card | placa termina em | onde o "+" começaria (se fosse `absolute`) | veredito |
| ---: | ---: | ---: | ---: | --- |
| 768 (categoria, com o trilho de filtros) | 134,7px | 174px | 82,7px | placa **maior que o card** |
| 1024 | 220px | 174px | 168px | **6px de sobreposição** |
| 1440 | 305,3px | 174px | 253,3px | 79px de folga |

Hoje nada disso aparece, porque o "+" está no fluxo (achado 1). **No dia em que o achado 1 for
corrigido, 768 e 1024 passam a mostrar placa por cima do "+".** A AC foi implementada como escrita —
4 vagas a partir de `md` — e a divergência fica registrada aqui em vez de resolvida por conta
própria: mudar o ponto de corte é decisão de spec.

---

## Revisão pós-uso — 2026-08-15 (decisão do usuário, vendo a feature rodando)

Quatro pedidos, e um deles reverte uma AC que o Verifier já tinha aprovado:

1. **Tirar a placa branca** que envolvia as miniaturas
2. **Aumentar as miniaturas** (32 → 40px; depois → 45px a partir de `md`)
3. **Dar zoom na foto**, porque a cor não se distinguia
4. **Clicar numa cor troca a imagem em destaque** — reverte `COR-11`

### O que a revisão obrigou, além do pedido

- **O preço passou a seguir a cor** (`COR-12`, novo). Medido no banco: em **271 dos 385** produtos
  com eixo de cor (70%) o preço muda com a cor. Trocar só a imagem deixaria a foto de uma cor ao
  lado do preço de outra em 7 de cada 10 produtos. Pix, parcela e o "de" riscado seguem junto —
  senão a % do selo sairia calculada entre duas linhas diferentes.
- **A reversão de `COR-11` só coube porque a miniatura cresceu.** Com 40px e `gap` 6 o passo é 46px,
  então os alvos `TAP_44` de 44px não se sobrepõem — que era a objeção que sustentava a AC anterior.
  `touchTarget.test.ts` é satisfeito pelo caminho que ele existe para induzir.
- **As vagas passaram a ser container query** (`COR-16`), fechando a lacuna `G1` do Verifier.
  Medido no navegador: a largura do card **não acompanha a viewport** — em 1024 a categoria tem
  220px e a home 230px. Entrou `@tailwindcss/container-queries`.
- **Os pisos são dimensionados pelo lado de 45px**, não pelo de 40: o tamanho varia por viewport e a
  quantidade de vagas por largura de card, então um card de 220px aparece nas duas larguras.

### Prova em navegador — Chromium, dado real do catálogo

| superfície | card | o que aparece | lado |
| --- | ---: | --- | ---: |
| 390 home (carrossel) | 220px | 3 fotos | 40px |
| 390 categoria | 171px | 1 foto + `+2` | 40px |
| 768 categoria | 134,7px | **fileira oculta** — nem 2 cabem | — |
| 1024 home | 230px | 3 fotos | **45px** |
| 1440 home | 294px | 3 fotos | 45px |
| 1440 categoria | 305,3px | 3 fotos | 45px |

Zero colisão com o `+` em todas; zero scroll horizontal do body (o de 768 é o rodapé, pré-existente).

### Gates da revisão
store **1608 testes / 116 arquivos** · `tsc` 0 · lint **30/8** (baseline exata) ·
`packages/core/src/payment/**` sem diff.
