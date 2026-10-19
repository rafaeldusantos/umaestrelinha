# 67 — Context

**Gathered:** 2026-10-18
**Spec:** `.specs/features/67-filtros-nas-variacoes/spec.md`
**Status:** Spec confirmada (2026-10-18) — em Design

---

## Feature Boundary

O valor de filtro da `66` passa a poder ser marcado numa **opção da peça** (eixo + texto), além da
peça toda. O painel sugere marcações a partir do nome, das tags e das opções, e a Adri aprova. A
loja exige que uma mesma variação satisfaça a seleção e abre o card nela. **Sem** mudança de
`<head>`, canônica, sitemap ou JSON-LD (isso é a `68`).

## Medido antes de decidir (banco local, 2026-10-18)

- 3.380 variações em 702 peças. 127 peças têm uma só; o máximo é 144 ("Colar coração com letra").
- 233 pares distintos (chave, texto) no catálogo; 1.657 pares (peça, chave, texto) só em Cor e elo.
- `Cor`: 24 textos, entre eles "Prata 925 Folheado a Ouro Rose" (129 peças) e "Prata 925 folheado a
  ouro" (12), que é o mesmo acabamento em outra grafia.
- Eixo de elo: `Tipos de elo` 348 · `Tipo de elo` 50 · `Tipos de Elo` 33 · `Tipo de Elo` 15 ·
  `Tpos de elo` 6 · `Tipode Elo` 3. Os textos misturam formato (Chaveiro 145, Pingente 22) e
  acabamento (Prata 925 152, "Folheado a ouro (Prata 925)" 147).
- O painel atualiza as variações **no lugar** (`persistProduct.ts:289`); o id só muda quando a linha
  sai da grade.
- A vitrine já recebe as variações no card (`PRODUCT_CARD_SELECT`: `option_values`, `image_url`,
  `is_active`, `price`), mas **não** o `nuvemshop_id` delas, que o `publicVariantId` exige.
- A página do produto já abre em `?variant=` (`findVariantByPublicId`, `ProductPage.tsx:159`), e a
  edge function `product-page` também (`handlers.ts:296`).
- Canônica e título de hoje: os da peça, sem query, nos dois lados.

## Implementation Decisions

### Granularidade
- A marcação mora em **(peça, eixo, texto da opção, valor)**. Ela vale para toda variação ativa
  daquela peça cujo `option_values[eixo] = texto`.
- Não há dicionário global: o mesmo texto em outra peça **não** herda a marcação.

### Combinação na loja
- Grupos satisfeitos na peça toda não restringem variação. Os demais têm de ser satisfeitos pela
  **mesma** variação ativa, que também passa por preço e estoque.

### Card
- Casou por opção ⇒ foto, preço e preço-de da variação escolhida, mais o link `?variant=`.

### Recusa
- Gravada por (peça, valor, alvo), e não volta a ser sugerida. Desfazer recusa não tem tela.

### Agent's Discretion
- Desenho da fila e dos blocos novos (no Paper, página "67 · …", na linguagem da "66").
- O algoritmo exato de casamento de texto, dentro do que a spec fixa (dobra + tokens contíguos).

### Declined / Undiscussed Gray Areas → Assumptions
Ver a tabela *Assumptions* da spec, todas com `Confirmed? n`. As principais: renomear eixo leva a
marcação junto; peça toda vence a opção; aprovar por opção troca a marcação da peça toda; preço e
estoque testados na variação; termos extras por valor (P2).

## Specific References

- "Sugestão nunca vira marcação sozinha" (pedido do usuário). Vira AC (VFL-20, VFL-30) e Success
  Criterion com guarda.
- O motivo legível em cada sugestão: "variação Cor = Folheado a Ouro Rosé".

## Deferred Ideas

- **Feature `68` — SEO por variação** (decisão do usuário, 2026-10-18). Uma página indexável por
  **(peça × opção marcada num filtro)**: título "Peça — Opção", canônica própria com `?variant=` da
  variação representativa daquela opção, entrada no sitemap, JSON-LD `ProductGroup`/`hasVariant`, e
  o mesmo título no `<head>` servido pela `product-page`. Letra, gravação e as demais opções sem
  marcação continuam canonizando para a peça. **Contradiz a `SEO-18` da `36`** (que pedia
  `offers.url` sem `?variant=`): a `68` precisa revogá-la por escrito. A `67` só garante que a
  marcação por opção existe e é legível por (peça, eixo, texto).
- Lista "Recusadas" na fila, para desfazer uma recusa (P3, não pedida).
