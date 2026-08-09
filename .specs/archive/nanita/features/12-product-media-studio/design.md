# Mídia do Produto e Estúdio de Mockup — Design

**Spec:** [`spec.md`](./spec.md) · **Contexto:** [`../07-product-catalog-admin/context.md`](../07-product-catalog-admin/context.md)
**Status:** Draft
**Desenho:** Paper, arquivo **Nanapin**, página **Backoffice - Produtos** — artboards
*Produto — aba Mídia* e *Estúdio de mockup — ampliado*.

> **Feature 3 de 4** (`AD-009`). `ImageGallery` foi **movida** do design da
> [`07`](../07-product-catalog-admin/design.md) sem reescrita; o resto é detalhamento novo dos dois
> artboards.

---

## Pré-condições vindas da `07` e da `11`

| De onde | O que é | Consumido por |
| ------- | ------- | ------------- |
| `07` — `products.images` em `jsonb` (`{url, alt, source}`) | o modelo que esta feature escreve | `ImageGallery`, `applyPlan` |
| `07` — `@nanapin/core/media` (`normalizeImages`, `primaryImage`) | tolera `string[]` e `jsonb` | carga da galeria |
| `07` — `product_variants.image_url` | imagem por linha | `VariantImageCard` |
| `07` — `@nanapin/core/pricing` (`priceRange`) | o "a partir de" da prévia | `StorefrontPreview` |
| `11` — esqueleto de 5 abas (T25) | slot onde a aba Mídia encaixa | `ImageGallery` |
| `11` — `VariantsTable` (T28) | a grade à qual a imagem por variação se liga | `VariantImageCard` |

---

## Approach — o que cresce e o que **não** é tocado

O estúdio tem duas metades bem separadas, e só uma muda.

| Metade | Onde | Muda? |
| ------ | ---- | ----- |
| **Engine de composição** — `renderPlan`, medição de relevo, `@nanapin/core/mockup` | `packages/core` | **Não.** Os 9 testes existentes são regressão e seguem verdes |
| **Casca** — dialog, colunas, palco, filmstrip, controles de saída, "ao aplicar" | `features/mockup-studio/ui` | Sim — é toda a feature |

Isso é o que torna `PMD-05` barato: 1360 px é layout, não algoritmo. A tentação de "já que estamos aqui,
melhorar o render" é o caminho para uma feature de 5 tasks virar 15 — e a qualidade visual do composto
nem é testável em node (A12).

---

## Components

### `ImageGallery` (PMD-01…PMD-04)

- **Location**: `features/product-form/ui/ImageGallery.tsx`
- **Interfaces**: `{ images: ProductImage[]; onChange; onOpenStudio }`
- **Comportamento**: tiles 196 px, badge `Principal`, alt-text inline com estado, selo `Mockup` a partir
  de `source`, progresso por arquivo, colar `⌘V`, reordenar por arraste (herda o handler atual)

### `buildAltText` (PMD-01 AC 2 — A20, `AD-011`)

- **Purpose**: gerar alt-text **determinístico**, sem serviço externo.
- **Location**: `features/product-form/lib/buildAltText.ts` (+ `.test.ts`)
- **Interfaces**: `buildAltText(productName: string, label?: string): string | null`
  — `('Botton Sailor Moon — Lua Prateada', 'Na mão')` → `Botton Sailor Moon — Lua Prateada · Na mão`;
  nome vazio → `null` (o botão `Gerar` fica desabilitado, nunca produz string vazia)
- **Dependencies**: nenhuma. É função pura — **é isso que a torna testável e a mantém fora do escopo de IA**
- **Por que aqui e não em `@nanapin/core`**: só o backoffice gera alt-text; a loja apenas **lê** o campo,
  com o nome do produto como fallback. Subir para `core` seria antecipar um consumidor que não existe.

### `uploadProductImage` (estendido, PMD-02)

- **Location**: `features/product-form/lib/uploadProductImage.ts`
- **Mudanças**: `validateFile(file)` **antes** de `compressImage`; `MAX_DIMENSION` de 1200 → 1600; erro
  tipado `{ file: string; reason: 'type' | 'size' }` em vez de `null` mudo
- **Assinatura preservada**: `uploadImageBlob(blob: Blob)` continua aceitando `Blob` — o `mockup-studio`
  depende dela para subir os renders, e mudar isso quebraria a feature `05-mockup-generator`
- **Ordem importa**: validar **depois** da compressão é o que trava a aba hoje; o arquivo de 40 MB já
  entrou no canvas antes de qualquer verificação

### `MockupStudioDialog` (ampliado, PMD-05)

- **Location**: `features/mockup-studio/ui/MockupStudioDialog.tsx`
- **Layout** (do artboard): ~1360 × 886 px, três colunas

  | Coluna | Largura | Conteúdo |
  | ------ | ------- | -------- |
  | Esquerda | 264 px | Arte de origem (trocar / usar do produto) · lista de mockups com thumb 38 px, seleção múltipla e estado do relevo |
  | Centro | 452 px | Palco com zoom, antes/depois, camadas `Fundo · Arte · Relevo · Overlay`, filmstrip dos renders com estado |
  | Direita | 300 px | Ajuste da arte (escala, X, Y, rotação) com `Aplicar a todos` · **Saída** (1200/1600/2000 px · WebP/PNG) · **Ao aplicar** |

- **Reuses**: engine `@nanapin/core/mockup` e `renderPlan` **sem alteração**

### `applyPlan` (PMD-05 AC 6–8)

- **Purpose**: decidir o que acontece com `images` quando o admin confirma — **puro**, é o que os testes
  exercitam.
- **Location**: `features/mockup-studio/lib/applyPlan.ts` (+ `.test.ts`)
- **Interfaces**: `applyPlan(current: ProductImage[], renders: RenderResult[], opts: ApplyOpts): ProductImage[]`
  com `opts = { mode: 'append' | 'replace'; firstAsPrimary: boolean; generateAlt: boolean }`
- **Invariante**: nada é gravado no Storage antes de a ação primária ser acionada. O estúdio compõe em
  memória; fechar sem aplicar é uma operação sem efeito.

### `VariantImageCard` · `StorefrontPreview` (PMD-06, PFM-17)

- **Location**: `features/product-form/ui/`
- `VariantImageCard`: liga cada linha da grade a uma imagem **já existente** na galeria (não sobe imagem
  nova). Imagem removida da galeria ⇒ a variação volta à principal, sem referência quebrada
- `StorefrontPreview`: renderiza o card como a loja mostraria, com `a partir de R$ X` vindo de
  `priceRange`; reflete o estado do formulário **sem salvar**
- **Nota**: o `ProductCard` da loja é referência **visual**, não import — são apps distintos com temas
  distintos (`nanita-*` na loja, `nana-*` no backoffice; ver `DESIGN.md`)

---

## Error Handling Strategy

| Situação | Tratamento |
| -------- | ---------- |
| Arquivo acima de 8 MB ou de tipo inválido | Rejeitado **antes** da compressão, nomeando arquivo e motivo |
| Lote com falhas parciais | Os válidos sobem; os inválidos são nomeados individualmente — o lote não é cancelado |
| Template sem relevo medido | Renderiza chapado **e** avisa. Não recusa o template |
| Produto sem nome ao acionar `Gerar` | Botão desabilitado — nunca alt-text vazio |
| Fechar o estúdio no meio de uma composição | Nada gravado; a composição vive em memória até a confirmação |
| Imagem removida da galeria ainda apontada por variação | Variação volta à principal |

---

## Risks & Concerns

| Risco | Mitigação |
| ----- | --------- |
| "Já que estamos no estúdio, melhorar o render" | Declarado em *Approach*: a engine não é tocada; os 9 testes de `renderPlan` são o gate |
| Qualidade visual do composto não é testável em node | A12: declarada como **UAT manual**, não fingida com asserção fraca |
| Mudar `uploadImageBlob` quebrar `05-mockup-generator` | Assinatura `Blob → url` preservada, com teste específico |
| Botão `Gerar` virar chamada de IA por inércia do desenho | `AD-011` + A20: função pura, e o teste assere **zero** chamadas de rede |
| 1360 px não caber em telas menores | O dialog usa a largura do desenho como alvo com `max-width` responsivo; o backoffice é ferramenta de desktop (a premissa mobile do `CLAUDE.md` é da **loja**) |

---

## Tech Decisions

| Decisão | Alternativa descartada | Por quê |
| ------- | ---------------------- | ------- |
| Validar antes de comprimir | Validar no `catch` da compressão | Validar depois é validar tarde: o arquivo já entrou no canvas, que é onde a aba trava |
| Alt-text por template puro | Chamada a modelo de IA | `AD-011`. O desenho nunca rotula esse botão como IA, e template resolve acessibilidade e SEO sem provedor, chave, custo ou fallback |
| `applyPlan` como função pura | Lógica dentro do componente | É a única parte do estúdio com regra de verdade; fora do componente, ela é testável sem canvas |
| Composição em memória até confirmar | Subir render e apagar se cancelar | Lixo no Storage a cada exploração, e "apagar depois" é a operação que falha calada |

---

## Rastreabilidade design → spec

| Componente | Requisitos |
| ---------- | ---------- |
| `uploadProductImage` (estendido) | PMD-02 |
| `ImageGallery` + `buildAltText` | PMD-01, PMD-03, PMD-04 |
| `MockupStudioDialog` (layout de 3 colunas) | PMD-05 (AC 1–3) |
| `applyPlan` + controles de saída/aplicação | PMD-05 (AC 4–8) |
| `VariantImageCard` · `StorefrontPreview` | PMD-06, PFM-17 |

**7 de 7 requisitos desta feature têm componente.**
