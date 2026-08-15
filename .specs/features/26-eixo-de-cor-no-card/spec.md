# 26 · Eixo de cor no card de produto

**Status**: especificada · 2026-08-15
**Origem**: board Paper `7CF-0` ("Loja — Home (Desktop)") + artboard "Loja — Home · Fileira no
mobile (390)", desenhados e aprovados em 2026-08-15.

O card de produto passa a mostrar **as cores da peça** como preview de imagem, dentro do palco da
foto, e o nome do produto encolhe para dar o primeiro lugar ao preço. Para isso o importador precisa
gravar dois dados que ele lê da origem e **descarta hoje**: a foto de cada variação e as tags do
produto.

---

## O que a medição mudou

A primeira redação desta feature era só a loja: "mostrar as imagens das variações de cor no card".
Medição contra o banco local em **2026-08-15**, com o catálogo real importado (680 produtos, 3.245
variações), derrubou a premissa e acrescentou uma segunda entrega.

### 1 · Não existe foto por variação — a coluna está 100% vazia

`product_variants.image_url` está `null` em **3.245 de 3.245** variações.

O dado existe na origem e o importador **chega a mapeá-lo**: `VariantRow.image_nuvemshop_id`
([`map/variant.ts:64`](../../../tools/catalog-import/src/map/variant.ts#L64)), com o comentário
*"vira URL do Storage na fase de imagens"*. A fase 3 sobe as imagens e grava `products.images` —
e **nada** resolve aquele id para URL nem escreve na variação. `linhaDaVariacao`
([`write/products.ts:95-106`](../../../tools/catalog-import/src/write/products.ts#L95-L106)) não
tem a coluna.

É a terceira ocorrência da classe do `AD-012`: **o tipo afirma, o banco não confirma**. Aqui com um
agravante — o comentário do código descreve um comportamento que nunca foi implementado, então
quem lesse o mapeamento concluiria que o dado existe.

**Sem corrigir o importador, o preview renderiza zero miniatura em 100% do catálogo.**

### 2 · O contador `+N` é caso de borda, não o caso comum

| medida (680 produtos) | valor |
| --- | ---: |
| com eixo **Cor** | **385** (57%) |
| com grade, sem eixo Cor | 175 (26%) |
| sem grade nenhuma | 120 (18%) |
| valores de Cor — mínimo · **mediana** · máximo | 2 · **3** · **5** |
| distribuição | 2 cores: 75 · **3 cores: 305** · 4 cores: 3 · 5 cores: 2 |

O board desenhou 4 vagas + `+N` supondo dez cores por peça. O catálogo real tem **no máximo cinco**,
e 305 dos 385 têm exatamente três. Com 4 vagas no desktop, o `+N` aparece em **5 produtos de 680**.
A regra fica, porque o cadastro futuro não está limitado a cinco — mas ela é borda, e o desenho não
pode ser otimizado para ela.

### 3 · A loja já tem filtro por tag, e ele está morto

`features/category-filters` lê `p.tags`, monta a lista de tags a partir dos produtos
([`filters.ts:82`](../../../apps/store/src/features/category-filters/model/filters.ts#L82)) e filtra
por elas. **0 de 680 produtos têm tag gravada** — `products.tags` (`TEXT[]`, existe desde a migration
inicial) nunca foi alimentada, porque `mapProduct` não lê `RawProduct.tags`.

Trazer as tags não é feature nova: é **acender um filtro que já está construído e escondido**.

---

## Escopo

| Entra | Não entra |
| --- | --- |
| `product_variants.image_url` gravado pelo importador | Coluna nova em qualquer tabela — `image_url` e `tags` já existem |
| `products.tags` gravado pelo importador | Curadoria de tag no backoffice (a origem é dona) |
| Preview de cor no card da loja | Trocar a variação escolhida clicando na miniatura (ver `COR-11`) |
| Nome do produto em 14px, duas linhas | Re-skin do card; selo, favorito e `+` ficam como estão |
| Reimportação do catálogo | Página do produto — `ProductGallery` e `VariantPicker` não mudam |

**Nada de dinheiro muda.** `packages/core/src/payment/**` fecha esta feature sem uma linha alterada,
conferido no gate.

---

## P1 · Importador — a foto de cada variação

**User Story**: Como dona da loja, quero que a foto que escolhi para cada cor na Nuvemshop chegue à
loja, para a cliente ver a peça na cor que ela está considerando.

### COR-01
WHEN o import roda a fase de imagens THEN o sistema SHALL gravar `product_variants.image_url` com a
**URL do Storage** da imagem cujo `images[].id` na origem é igual ao `variants[].image_id` daquela
variação.

### COR-02
WHEN a variação não tem `image_id` na origem, **ou** quando o upload daquela imagem falhou, THEN o
sistema SHALL deixar `image_url` como `null` — nunca a URL de outra imagem da galeria e nunca a capa
do produto.

> A capa como fallback faria três cores da mesma peça mostrarem a mesma foto, que é pior que não
> mostrar nada: a cliente concluiria que a cor não muda a peça.

### COR-03
WHEN a fase de imagens termina THEN o relatório SHALL contar, em linha própria, quantas variações
receberam foto e quantas ficaram sem — os dois números, separados.

### COR-04
WHEN o import roda **de novo** THEN o sistema SHALL produzir as mesmas URLs, e SHALL **corrigir** a
`image_url` de uma variação cujo `image_id` mudou na origem. Rodar duas vezes não pode divergir do
resultado de rodar uma.

### COR-05
WHEN o import roda em `--dry-run` THEN o sistema SHALL **não** escrever `image_url` — a fase 3
inteira já sai do caminho em dry-run, e esta escrita nasce dentro dela.

---

## P2 · Importador — as tags do produto

**User Story**: Como dona da loja, quero que as tags que uso na Nuvemshop cheguem à loja, para o
filtro por tema da página de categoria funcionar.

### COR-06
WHEN o import mapeia um produto THEN o sistema SHALL gravar `products.tags` a partir de
`RawProduct.tags` — que é **string separada por vírgula**, não array —, com cada tag
`trim`-ada, as vazias descartadas e as duplicatas removidas **preservando a ordem de aparição**.

### COR-07
WHEN o produto não tem tag na origem (string vazia) THEN o sistema SHALL gravar `[]` — nunca
`['']`, nunca `null`.

### COR-08
WHEN o produto **já existe** na loja THEN o sistema SHALL gravar as tags também no **update**, e
SHALL sobrescrever o valor anterior.

> Divergência deliberada frente ao precedente de `requires_material`, que só semeia onde a coluna é
> `null` porque ali a dona cura no painel. Tag **não tem tela de curadoria** nesta loja: a origem é
> a única dona, e "só semeia se null" congelaria a primeira importação para sempre.

---

## P3 · Loja — o nome do produto

**User Story**: Como cliente, quero que o preço seja a primeira coisa que eu leio no card.

### COR-09
WHEN o card renderiza o nome do produto THEN o sistema SHALL usar **`text-[14px]`**, `font-display`,
`font-medium`, **`leading-[20px]`**, em no máximo **duas linhas** (`line-clamp-2`), com altura
reservada de **40px** para que os preços fiquem na mesma linha entre os cards de uma fileira.

> Reconcilia uma divergência board↔código que já existia: o board sempre desenhou duas linhas e
> `ProductCard.tsx:248` sempre truncou em **uma** (`line-clamp-1`). Reduzir a fonte sem trocar o
> clamp não mudaria nada em produção — o nome seguiria cortado, só que menor.

---

## P4 · Loja — o eixo de cor no card

**User Story**: Como cliente, quero ver de relance em que cores a peça existe, sem abrir o produto.

### COR-10
WHEN o produto tem um eixo de cor com **2 ou mais** valores THEN o card SHALL exibir uma placa
sobreposta no **canto inferior esquerdo do palco da imagem**, com uma miniatura por cor. WHEN o
produto não tem eixo de cor, ou o eixo tem menos de 2 valores, THEN o card SHALL **não** exibir a
placa e o palco SHALL ficar idêntico ao de hoje.

### COR-11
A placa SHALL ser **um único controle**, e clicá-la SHALL abrir o mesmo seletor de variação que o
botão `+` já abre (`QuickAddDrawer` no desktop, `VariantSheet` no mobile), sem navegar para a página
do produto. As miniaturas **não** SHALL ser controles individuais.

> Três razões independentes, e a terceira é um guarda deste repositório. (1) A miniatura mede 32px e
> o passo entre elas é 38px — dar `TAP_44` a cada uma criaria alvos de 44px **sobrepostos**, e um
> toque na fronteira acertaria a vizinha. (2) `touchTarget.test.ts` varre `<button|a|Link>` com
> `h-8 w-8` e exige o auxiliar: miniatura-como-botão ou quebra o guarda ou o satisfaz criando a
> sobreposição de (1). (3) O seletor de variação **já existe em duas superfícies** — um terceiro
> lugar que escolhe cor é a terceira escrita da mesma regra. O pedido era **preview**, e preview é o
> que esta placa é.

### COR-12
A placa SHALL mostrar até **4** miniaturas a partir de `md` e até **3** abaixo de `md`. WHEN há mais
cores que vagas THEN a última vaga SHALL ser um contador `+N`, onde N é o número de cores não
mostradas.

> As duas metades precisam de asserção positiva — a de mobile e a de `md:` (lição `L-029`).
> Em 220px (largura real do card no carrossel, `ProductCarousel.tsx:119`) quatro vagas medem 160px
> e o botão `+` começa em 168px a partir da esquerda: **sobrepõem**. Três vagas medem 122px e
> sobram 32px. Com mediana de 3 cores, o mobile mostra todas as cores em 305 dos 385 produtos.

### COR-13
Medidas fixadas pelo board, todas verificáveis: miniatura **32×32** com raio **6px**; `gap` **6px**;
`padding` da placa **6px**; placa em `--color-surface` com borda **1px `#8C8073`** e raio **12px**;
inset de **14px** das bordas esquerda e inferior do palco; altura resultante da placa **44px**.

> A borda é `#8C8073` (o token `field`, 3,63:1) e não `--color-line` porque a placa é **controle**,
> e a WCAG 1.4.11 pede 3:1 de contorno. Medido no board: placa branca sobre palco branco (seção
> "Decorativos Afetivos") desaparece sem ela.

### COR-14
A miniatura da cor **atualmente selecionada** SHALL ter borda **2px `--color-ink`**; as demais,
**1px `#8C8073`**.

### COR-15
WHEN a variação daquela cor não tem `image_url` THEN a miniatura SHALL renderizar o palco vazio
(`--color-ground-deep`), sem `<img>` — nunca um `<img>` sem `src`, e nunca a foto de outra cor.

---

## Edge cases

| Caso | Comportamento esperado | Requisito |
| --- | --- | --- |
| Produto sem grade (120 de 680) | Sem placa. Palco idêntico ao de hoje | `COR-10` |
| Produto com grade mas sem eixo Cor (175) | Sem placa | `COR-10` |
| Eixo Cor com 1 valor só | Sem placa — não há escolha a mostrar | `COR-10` |
| Eixo Cor com 5 valores, desktop | 3 miniaturas + `+2` | `COR-12` |
| Eixo Cor com 3 valores, mobile | 3 miniaturas, sem contador | `COR-12` |
| Nenhuma variação de cor tem foto | Placa com as vagas vazias | `COR-15` |
| Origem renomeia a tag | Update sobrescreve | `COR-08` |
| Origem remove todas as tags | Grava `[]` | `COR-07`, `COR-08` |
| Upload da foto da cor falha | `image_url` null naquela variação; produto entra | `COR-02` |

---

## Requisitos implícitos verificados

| Dimensão | Presente? | Tratamento |
| --- | --- | --- |
| Persistência | **sim** | Duas colunas já existentes; nenhuma migration |
| Chamada externa | **sim** | Nuvemshop + Storage, já cobertos pelo cache e pelo retry do importador |
| Idempotência | **sim** | `COR-04` — segunda execução não diverge |
| Concorrência | não | Import é one-shot, à mão |
| Auth / RLS | não | Leitura pública de produto já existente |
| Dinheiro | **não** | Conferido no gate: `packages/core/src/payment/**` sem diff |

---

## Rastreabilidade

| Req | Superfície |
| --- | --- |
| `COR-01`..`COR-05` | `tools/catalog-import/src/{map,write}`, `run.ts`, `report.ts` |
| `COR-06`..`COR-08` | `tools/catalog-import/src/map/product.ts`, `write/products.ts` |
| `COR-09` | `apps/store/src/entities/product/ui/ProductCard.tsx` |
| `COR-10`..`COR-15` | `apps/store/src/entities/product/{lib,ui}` |
