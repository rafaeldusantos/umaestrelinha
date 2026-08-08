# Formulário de Produto v2 — Design

**Spec:** [`spec.md`](./spec.md) · **Contexto:** [`../07-product-catalog-admin/context.md`](../07-product-catalog-admin/context.md)
**Status:** Draft
**Desenho:** Paper, arquivo **Nanapin**, página **Backoffice - Produtos** — artboards
*Produto — aba Geral*, *Produto — aba Preços & variações*, *Produto — aba SEO*.

> **Feature 2 de 4** (`AD-009`). Os componentes abaixo foram **movidos** do design da
> [`07`](../07-product-catalog-admin/design.md), sem reescrita. O que a `07` entrega e esta feature
> apenas **consome** está em "Pré-condições", e não é redesenhado aqui.

---

## Pré-condições vindas da `07`

Tudo abaixo já existe quando a primeira task daqui começa. Esta feature **consome** — não implementa,
não re-testa.

| Da `07` | O que é | Consumido por |
| ------- | ------- | ------------- |
| `product_variants` estendida (`option_values`, `price`, `compare_price`, `stock`, `sku`, `weight_kg`, `image_url`, `is_active`, `position`) | fonte de verdade da linha vendável | `VariantsTable` |
| `products.options`, `stock_policy`, `production_lead_days` | eixos e política | `OptionsEditor`, `PricingTab` |
| `product_categories`, `product_redirects` | N:N e 301 | `CategoryMultiSelect`, `SlugField` |
| `@nanapin/core/pricing` — `cartesian`, `diffGrid`, `priceRange`, `variantLabel` | regra pura de grade e faixa | `OptionsEditor`, `VariantsTable` |
| `@nanapin/core/formatters` — `parseBRL`, `formatBRL`, `parseGrams`… | máscaras puras | via os inputs |
| `shared/ui/inputs/` — `MoneyInput`, `WeightInput`, `DimensionInput` | primitivos mascarados (`AD-010`) | `VariantsTable`, `PricingTab` |
| `@nanapin/core/media` — `normalizeImages` | tolera `string[]` e `jsonb` | `useProductForm` na carga |

---

## Approach — como reescrever o formulário

Três caminhos foram considerados. O escolhido é o (2).

| # | Abordagem | Custo | Risco |
| - | --------- | ----- | ----- |
| 1 | Reescrever `AdminProductFormPage.tsx` de uma vez | 1 commit gigante | Alto — 485 linhas, 6 abas, tudo regride junto e o diff é irrevisável |
| 2 | **Extrair a página para um slice `product-form` com um `useProductForm` + um componente por aba, migrando aba a aba** | 1 task por aba | Baixo — cada aba entra verde, com o resto funcionando |
| 3 | Manter a página e só trocar os componentes internos | Menor | Médio — o estado continua num `useState` gigante e a validação por aba (PFM-11) não tem onde morar |

**Escolha: (2).** O guarda-corpo do `context.md` (*"fatiar por aba, com a spec listando o que cada aba já
fazia"*) vira estrutura: o estado sai do componente para `features/product-form/model/useProductForm.ts`,
cada aba é um componente burro que recebe `form` + `setField` + `errors`, e a validação vira um schema
único avaliado no submit — que é exatamente o que resolve PFM-11 (o `Tabs` do Radix desmonta o conteúdo
inativo, então `required` de input nunca poderia funcionar).

**Consequência para a aba Mídia:** T25 cria as 5 abas e a Mídia entra como **slot com o conteúdo
atual**. A reforma dela é a [`12`](../12-product-media-studio/design.md), que encaixa no mesmo slot sem
mexer no esqueleto.

---

## Code Reuse Analysis

### Componentes existentes a aproveitar

| Componente | Local | Como usar |
| ---------- | ----- | --------- |
| `FormCard`, `PageHeader`, `FieldGroup` | `apps/backoffice/src/shared/ui/` | Cascas de todas as abas e do inspetor — já em tokens shadcn |
| `CategoryFormDialog` | `features/category-form/ui/` | Reusado **como está** pelo "Criar categoria" inline (PFM-05 AC 3) |
| `RelatedProductsSelect` | `features/product-form/ui/` | Aba Relacionados fica intacta — é a única das 5 que não muda |
| `RichTextEditor` | `shared/ui/RichTextEditor.tsx` | Descrição na aba Geral, sem mudança |
| `SeoPreview` | `features/product-form/ui/` | Estendido (não reescrito): ganha URL personalizada, disponibilidade e 301 |
| `useAdminCategories` | `entities/category/api/` | Alimenta o combobox; ganha a contagem de produtos por categoria |
| `@dnd-kit` | já no projeto | Arraste de reordenação dos eixos |

### Pontos de integração

| Sistema | Integração |
| ------- | ---------- |
| `useAdminProducts` | Consumido para carga e save. A **extensão** dele (paginação, lote) é da [`13`](../13-product-bulk-ops/design.md) — as duas features tocam o arquivo, por isso rodam em paralelo com atenção ao merge |
| Aba Mídia | Slot preservado; conteúdo é da [`12`](../12-product-media-studio/design.md) |
| Loja | **Não tocada** por esta feature. As leituras do modelo novo são `PST-05`…`PST-08`, na `07` |

> **Ponto de atrito conhecido do paralelismo.** `11` (T21) e `13` (T38) tocam
> `entities/product/api/useAdminProducts.ts`. T21 só **lê** o hook; T38 reescreve a assinatura de
> `fetchProducts`. Se as duas correrem juntas, a `13` é quem manda no arquivo e a `11` adapta a chamada.
> Registrado aqui para não virar surpresa de merge.

---

## Components

### `useProductForm` — estado e validação do formulário

- **Purpose**: tirar o `useState` de 30 campos de dentro da página e dar à validação um lugar que não
  depende de aba montada.
- **Location**: `apps/backoffice/src/features/product-form/model/useProductForm.ts`
- **Interfaces**:
  - `useProductForm(productId?: string)` → `{ form, setField, errors, errorsByTab, isDirty, checklist, save, saveDraft, restoreDraft, discardDraft }`
  - `validateProduct(form: ProductFormState): FieldError[]` — **função pura exportada**, é o que os testes exercitam
  - `errorsByTab: Record<TabId, number>` — alimenta o badge de pendência (PFM-11 AC 2)
  - `checklist: ChecklistItem[]` — 6 itens com `{ id, label, ok, focusField }` (PFM-14)
- **Dependencies**: `useAdminProducts`, `useAdminCategories`, `sessionStorage`
- **Reuses**: padrão de rascunho decidido em `06-mockup-editor-ia` (T3 de lá) — coerência entre as duas
  telas de edição longa

### `OptionsEditor` (PFM-07)

- **Location**: `features/product-form/ui/OptionsEditor.tsx`
- **Interfaces**: `{ options: ProductOption[]; onChange(o: ProductOption[]): void }`
- **Comportamento**: máx. 3 eixos; combobox de nome com presets; chips de valor com colar-por-vírgula;
  arraste reordena (`position`); cabeçalho com `N de 3 eixos · a × b = N variações`
- **Reuses**: `Badge`, `Command`/`Popover` do shadcn já presentes em `@nanapin/ui`

### `VariantsTable` (reescrita, PFM-08)

- **Location**: `features/product-form/ui/VariantsTable.tsx`
- **Interfaces**: `{ variants, options, stockPolicy, images, onChange, onRequestDelete }`
- **Comportamento**: colunas do artboard; agrupamento pelo 1º eixo com subtotal; seleção + ações em
  massa; **Preencher coluna** no cabeçalho; **Regerar** com diff antes de aplicar; rodapé com faixa;
  borda de erro na linha ativa sem preço
- **Dependencies**: `@nanapin/core/pricing` (`cartesian`, `diffGrid`, `priceRange`),
  `shared/ui/inputs` (`MoneyInput`, `WeightInput`)
- **Nota de escala** (A18): 3 eixos × 60 linhas é o teto realista; a tabela agrupa e só virtualiza se o
  perfil mostrar necessidade — não vale trazer dependência de virtualização por antecipação.
- **Nota de FK**: a exclusão passa por `onRequestDelete`, que consulta `order_items` antes. A FK
  `order_items.variant_id → product_variants(id)` é `NO ACTION`; sem a consulta prévia, o admin veria
  erro de FK cru (PFM-08 AC 9a).

### `CategoryMultiSelect` (PFM-05) · `TagInput` (PFM-06)

- **Location**: `features/product-form/ui/`
- `CategoryMultiSelect`: combobox com chips, caminho hierárquico e contagem; linha "Criar categoria"
  abrindo `CategoryFormDialog`; devolve `string[]` na ordem de seleção
- `TagInput`: tokens por `Enter`/`,`/`Tab`, `Backspace` remove, colar cria vários, autocomplete por uso,
  teto de 15; dedupe por chave normalizada `normalizeTag(s) = s.normalize('NFD').replace(diacríticos).toLowerCase().trim()`
- **Dependência de dados** (A19): `useTagUsage()` e a contagem por categoria vêm de **uma** RPC/view
  agregada, não de `select('*')` no catálogo (ver Risks)

### `SlugField` (PFM-02, PFM-03, PFM-04)

- **Location**: `features/product-form/ui/SlugField.tsx`, consumido por `SeoPreview`
- **Interfaces**: `{ slug, name, isPublished, wasEdited, onChange, onRedirectToggle }`
- **Comportamento**: prefixo de domínio fixo; `useSlugAvailability(slug, currentId)` com debounce de
  400 ms contra `products.slug`; aviso âmbar + toggle de 301 quando `isPublished && slug !== slugSalvo`
- **Em Geral**: `SlugReadonlyLine` — texto, sem input, com link `Editar em SEO →`

### `PricingTab` (PFM-09, PFM-15)

- **Location**: `features/product-form/ui/tabs/PricingTab.tsx`
- **Comportamento**: segmentado de 3 modos substituindo os `Switch` atuais; card de preço padrão com
  margem (guardada por `price > 0`) e o aviso de precedência da grade com atalho; alerta de estoque
  baixo por variação; prazo de produção em dias úteis
- **Dependencies**: `shared/ui/inputs`, `@nanapin/core/pricing` (`priceRange` para o "a partir de")

---

## Error Handling Strategy

| Situação | Tratamento |
| -------- | ---------- |
| Campo obrigatório inválido em aba fechada | `validateProduct` puro roda sobre o estado inteiro no submit; badge por aba + foco no primeiro inválido. **Nunca** `required` de input |
| Slug duplicado | Detectado por `useSlugAvailability` com debounce **antes** do save; bloqueia com erro no campo. O `UNIQUE` do banco vira rede de segurança, não o mecanismo |
| Variação ativa sem preço | Borda de erro na linha + mensagem inline; bloqueia *Salvar e publicar*, libera *Salvar rascunho* |
| Exclusão de variação vendida | Consulta a `order_items` antes; recusa nomeando a contagem e oferece Pausar |
| `sessionStorage` cheio/indisponível | Rascunho falha **em silêncio**; o formulário segue funcionando |
| Categoria criada inline mas produto não salvo | Categoria permanece criada — comportamento previsível, sem rollback surpresa |

---

## Risks & Concerns

| Risco | Mitigação |
| ----- | --------- |
| Contagem de tags/categorias virar `select('*')` no catálogo | A19: uma RPC/view agregada. É exatamente o erro que a `13` está corrigindo na listagem — não vale reintroduzi-lo aqui |
| Merge com a `13` em `useAdminProducts.ts` | Declarado em *Pontos de integração*: a `13` manda no arquivo, a `11` adapta a chamada |
| Reescrita da página regredir comportamento silenciosamente | Aba a aba (A17), cada uma entra verde com o resto funcionando; a aba Relacionados não é tocada |
| Grade de 60 linhas ficar lenta | A18: agrupa; virtualiza só com evidência de perfil |
| Botões de IA no desenho induzirem implementação | `AD-011` e nota no `context.md`: fora de escopo, não implementar a partir do artboard |

---

## Tech Decisions

| Decisão | Alternativa descartada | Por quê |
| ------- | ---------------------- | ------- |
| Validação como função pura sobre o estado inteiro | `required` do input / validação por aba montada | O `Tabs` do Radix desmonta conteúdo inativo — a alternativa **não pode** funcionar, é a causa do defeito 10 |
| Slug editável só em SEO | Manter os dois campos sincronizados | Dois donos do mesmo dado é o defeito 01; sincronizar só esconde a ambiguidade |
| Dedupe de tag **sugere**, não substitui | Normalizar e substituir automaticamente | `Naruto` e `naruto` podem ser intencionais; substituir sozinho tira a decisão de quem cadastra |
| Preço absoluto por linha | Delta sobre `base_price` | D2. Delta obriga a recalcular em toda leitura e torna a grade ilegível |
| Rascunho em `sessionStorage` | `localStorage` | Mesmo padrão do `checkoutStore` e do editor de mockup: rascunho é da sessão, não do navegador |

---

## Rastreabilidade design → spec

| Componente | Requisitos |
| ---------- | ---------- |
| `useProductForm` + `validateProduct` + `checklist` + `useFormDraft` | PFM-11, PFM-12, PFM-13, PFM-14 |
| `ProductFormHeader` + `TabsList` de 5 abas | PFM-01, PFM-16 |
| `OptionsEditor` | PFM-07 |
| `VariantsTable` + `RegenerateGridDialog` | PFM-08, PFM-15 |
| `PricingTab` | PFM-09, PFM-15 |
| `CategoryMultiSelect` · `TagInput` · `normalizeTag` | PFM-05, PFM-06 |
| `SlugField` · `SlugReadonlyLine` · `SeoPreview` | PFM-02, PFM-03, PFM-04 |

**15 de 15 requisitos desta feature têm componente.**
