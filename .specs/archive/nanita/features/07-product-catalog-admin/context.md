# Context — catálogo de produtos (contexto de **programa**)

> ### Este arquivo serve as quatro features
>
> `AD-009` fatiou o catálogo de produtos em quatro features. Este `context.md` **não foi fatiado**: ele
> decodifica os 9 artboards do Paper e é o insumo comum das quatro. Mora aqui, na `07`, por ser onde
> nasceu — e é referenciado, não copiado, pelas outras três.
>
> | Feature | Escopo | Artboards que consome |
> | ------- | ------ | --------------------- |
> | **07** (aqui) | fundação e dinheiro | nenhum diretamente — é o modelo que os 8 pressupõem |
> | [11 — formulário v2](../11-product-form-v2/spec.md) | opções, grade, taxonomia, URL, integridade | *aba Geral* · *aba Preços & variações* · *aba SEO* |
> | [12 — mídia e estúdio](../12-product-media-studio/spec.md) | alt-text, upload, estúdio, imagem por variação | *aba Mídia* · *Estúdio ampliado* |
> | [13 — listagem e lote](../13-product-bulk-ops/spec.md) | listagem v2, massa, grade rápida | *Listagem v2* · *Edição em massa* · *Grade rápida* |
>
> **Divergência conhecida entre desenho e spec** (`AD-011`): dois botões dos artboards estão **fora de
> escopo** nas quatro features — **"Sugerir com IA"** (descrição, *aba Geral*) e **"Gerar com IA"**
> (título e descrição de SEO, *aba SEO*). Não há AC para nenhum dos dois, eles não aparecem nos 22 itens
> priorizados, e o projeto não tem provedor de IA. Seguem no desenho de propósito — **não implemente a
> partir deles**. Adiados, não descartados: registrados como **BL-001** em
> [`../../BACKLOG.md`](../../BACKLOG.md).
>
> O **alt-text** (`Gerar` na *aba Mídia*, "Gerar alt-text de cada render" no *Estúdio*) **está no
> escopo**: os artboards nunca o rotulam como IA, e ele é implementado como template determinístico
> (nome do produto + rótulo da variação/mockup) em `PMD-01`, na [`12`](../12-product-media-studio/spec.md).

Reforma do **cadastro de produto** (`/admin/produtos/novo` · `/admin/produtos/:id/editar`) e da
**listagem** (`/admin/produtos`) no backoffice. Este documento consolida funcionalidades,
comportamentos, decisões e opções levantadas na sessão de design de **2026-07-27**.

O desenho vive no Paper (arquivo **Nanapin**, página **Backoffice - Produtos**):
<https://app.paper.design/file/01KPBGSMF2DP3MQVAEB171ZMDZ/6-0>

Nada foi implementado ainda — este documento é o insumo para `spec.md` / `design.md` / `tasks.md`.

---

## Artboards de referência

| Artboard (Paper) | O que fixa |
| ---------------- | ---------- |
| **Produto — aba Geral** | Nome, URL derivada (leitura), descrição, categorias múltiplas com criar inline, tags com autocomplete, checklist de publicação, prévia da vitrine |
| **Produto — aba Preços & variações** | Preço padrão + margem, opções genéricas (até 3 eixos), grade de variações com preço/promo/estoque/SKU/peso/imagem, política de estoque em 3 modos, peso em gramas |
| **Produto — aba Mídia** | Galeria com principal, alt-text por imagem, selo de mockup, upload em progresso, dropzone; imagem por variação; vídeo |
| **Estúdio de mockup — ampliado** | O `Gerar mockup` em painel de 1360 px: palco grande, camadas, antes/depois, filmstrip, saída e "ao aplicar" |
| **Produto — aba SEO** | Prévia de busca, título/descrição com contadores, e o slug como **URL personalizada** em dois estados (novo × já publicado com 301) |
| **Produtos — listagem v2** | Visões salvas, filtros em chips, seleção, edição inline de preço/estoque, barra de massa, paginação com total |
| **Produtos — edição em massa** | Painel de 12 selecionados: campos com modo (definir/aumentar %/somar…), prévia do impacto, desfazer de 30 s |
| **Produtos — grade rápida** | Cadastro em massa: padrões por lote, planilha com colar do Excel, validação linha a linha |
| **Produtos — sugestões de melhoria e mapa de código** | As 22 melhorias em 3 levas + onde cada uma encosta no código |

---

## Problema

O formulário ([`AdminProductFormPage.tsx`](../../../apps/backoffice/src/pages/admin/AdminProductFormPage.tsx))
tem 6 abas, mas os campos estão nos lugares errados em relação a como o produto realmente funciona:

- **O slug pede atenção duas vezes.** Ele nasce do nome, aparece na aba Geral como campo editável
  ([`AdminProductFormPage.tsx:223-226`](../../../apps/backoffice/src/pages/admin/AdminProductFormPage.tsx#L223-L226))
  **e** aparece de novo dentro de `SeoPreview` — dois controles para o mesmo dado, e nenhum
  explica que mudar isso quebra links.
- **Uma categoria só.** `category_id` é um `Select` simples. Um botton de Sailor Moon é *anime*,
  é *Sailor Moon*, é *mais vendidos* — e hoje escolhe um.
- **Criar categoria exige sair da tela.** Sem categoria, o admin perde o rascunho para ir em
  `/admin/categorias`.
- **Tags são um campo de texto com vírgula.** Sem sugestão, sem contagem, sem dedupe: `Naruto`,
  `naruto` e `naruto ` convivem no catálogo.
- **Opções e valores não casam.** Tamanhos e acabamentos são dois inputs de texto na aba **Geral**;
  o preço é um número único na aba **Preços**; a grade de variações é uma terceira aba que só tem
  estoque e SKU ([`VariantsTable.tsx`](../../../apps/backoffice/src/features/product-form/ui/VariantsTable.tsx)).
  Um 5,5 cm que custa mais caro não tem onde ser dito.
- **Estoque é sempre validado.** Não existe "não controlar" — o personalizado da loja resolve isso
  com um produto sintético de `stock_total: 999`
  ([`CustomPinPage.tsx:397-399`](../../../apps/store/src/pages/CustomPinPage.tsx#L397-L399)).
- **Valores e pesos são `input type=number` crus.** Preço em `0.01`, peso em kg com 3 decimais.
  Colar `R$ 14,90` de uma planilha não funciona.
- **O estúdio de mockup abre em 768 px** (`max-w-3xl`,
  [`MockupStudioDialog.tsx:220`](../../../apps/backoffice/src/features/mockup-studio/ui/MockupStudioDialog.tsx#L220)),
  com thumbs de 96 px. O admin aprova um render que não consegue ver.
- **A listagem só lê.** Para mudar o preço de 12 produtos são 12 idas ao formulário; para cadastrar
  20, são 20. O único caminho em lote é um importador de CSV com 8 colunas fixas.

---

## Frentes e escopo

| Frente | Conteúdo | Depende de |
| ------ | -------- | ---------- |
| **A — Modelo de variação** | Migração `product_variants` como fonte de verdade (preço, promo, estoque, SKU, peso, imagem), `product_categories` N:N, política de estoque | nada |
| **B — Formulário** | Abas reorganizadas, categorias múltiplas, tags, opções + grade, máscaras, SEO/URL, checklist, rascunho automático | A |
| **C — Mídia e estúdio** | Alt-text, validação de upload, estúdio ampliado, imagem por variação | A (imagem por variação) |
| **D — Listagem e lote** | Visões salvas, edição inline, edição em massa, grade rápida | A |
| **E — Loja e checkout** | Preço por variação no recálculo, baixa de estoque por variação, categorias N:N na vitrine, redirect 301 | A |

**E não é opcional.** Enquanto `create-payment` recalcular por `products.base_price`, publicar um
produto com preço por variação vende barato o que a grade cobra caro (ver T8).

---

## Funcionalidades e comportamentos

### B1 — Abas: de 6 para 5

`Geral · Mídia · Preços & variações · SEO · Relacionados`

A aba **Variações** deixa de existir como lugar separado: opções e grade passam a viver junto do
preço. É a correção estrutural do "valores ficam em outra página e não casam com as opções".

| # | Funcionalidade | Comportamento |
| - | -------------- | ------------- |
| B1.1 | Cabeçalho fixo | Breadcrumb, nome, badge de status, badge "Alterações não salvas", ações Descartar / Salvar rascunho / Salvar e publicar (⌘S) |
| B1.2 | Badge de pendência na aba | Contador rosa na aba que tem campo inválido — resolve o T3 (validação silenciosa) |
| B1.3 | Rascunho automático | `sessionStorage` por produto, com "salvo automaticamente · há 12 s" ao lado das abas |
| B1.4 | Guarda de saída | Sair com alterações pendentes pede confirmação |
| B1.5 | Checklist "Pronto para publicar" | 6 itens no inspetor (nome, categoria, imagens, peso, variação sem preço, SEO), cada um com atalho para o campo |
| B1.6 | Prévia da vitrine | Card do produto como aparece na loja, com "a partir de R$ …" |

### B2 — Identidade e URL

| Comportamento | Detalhe |
| ------------- | ------- |
| Slug nasce do nome | Enquanto ninguém editar em SEO, renomear o produto atualiza a URL |
| Em **Geral** o slug é leitura | Linha tinta clara: `nanapin.com.br/produto/botton-sailor-moon-lua-prateada · gerada do nome` + link `Editar em SEO →` |
| Em **SEO** o slug é campo | Rotulado **URL personalizada**, com prefixo do domínio fixo e o slug editável |
| Editar rompe o vínculo | Depois de editado, renomear o produto não muda mais a URL — e a tela diz isso |
| Disponibilidade ao digitar | Verde "Disponível" ou vermelho "já existe" com sugestão de sufixo (hoje só falha no save, ver T4) |
| Produto já publicado | Aviso âmbar: o endereço antigo ganha **301** ao salvar. Toggle ligado por padrão |

### B3 — Categorias (conjunto plano, D3)

- Combobox com chips; contador "3 selecionadas".
- Busca mostra hierarquia (`K-Pop › Girl Groups`) e a contagem de produtos de cada categoria.
- Sem resultado → linha violeta **Criar categoria "K-Pop G"** (⌘⏎), que abre um formulário curto
  inline (nome, pai, slug automático) e já marca a nova categoria. Reusa
  [`CategoryFormDialog`](../../../apps/backoffice/src/features/category-form/ui/CategoryFormDialog.tsx).
- Todas as categorias valem igual. Onde a loja precisa de **uma** (selo do card, breadcrumb), usa a
  de menor `sort_order` — regra determinística, não "principal" (T6).

### B4 — Tags

| Comportamento | Detalhe |
| ------------- | ------- |
| Token input | Enter, vírgula ou Tab criam; Backspace remove a última; chips com × |
| Colar da planilha | `naruto, shonen, anos 90` cria três de uma vez |
| Autocomplete | Lista as tags existentes com **quantos produtos usam** cada uma, ordenadas por uso |
| Dedupe tolerante | Compara sem acento e sem caixa. `Naruto` com `naruto` já existente vira aviso âmbar com par **Usar a existente / Manter** |
| Sugeridas | Faixa de chips `+ tag` com as mais usadas nas categorias já escolhidas + "Copiar tags de outro produto" |
| Teto | 15 tags por produto (contador "6 de 15") |

### B5 — Opções do produto (D1: eixos genéricos)

- Até **3 eixos**. Cada eixo tem nome (combobox com presets `Tamanho`, `Acabamento`, `Cor`,
  `Estampa`, `Pack`) e valores como chips.
- Cabeçalho mostra a conta: `2 de 3 eixos · 3 × 2 = 6 variações`.
- Arraste reordena eixos (a ordem é a da página do produto).
- Colar lista com vírgula cria vários valores.
- `sizes[]` / `finishes[]` saem da aba Geral.

### B6 — Grade de variações (D2: preço absoluto por linha)

Colunas: seleção · imagem · variação · SKU · **preço** · **preço "de"** · **estoque** · peso · ativa · ⋯

| Comportamento | Detalhe |
| ------------- | ------- |
| Agrupada pelo 1º eixo | Cabeçalho de grupo com subtotal (`3,5 cm — 2 variações · 28 un.`) |
| Ações em massa na grade | Ao selecionar linhas: Definir preço · Definir estoque · Gerar SKU · Pausar · Excluir |
| Preencher coluna | Menu no cabeçalho: aplicar a todas, só às vazias, `+10%`, copiar de outro grupo |
| Regerar do cruzamento | Recalcula a grade a partir das opções preservando o que já foi preenchido; mostra o diff antes |
| Linha sem preço | Borda vermelha + erro inline "sem preço a variação não entra na loja" e entrada no checklist |
| Pausar variação | `ativa = false`: some da loja sem perder histórico |
| Rodapé | `6 variações · faixa R$ 14,90 – 18,40 · 84 un. somadas` + Variação manual + Exportar CSV |
| SKU automático | Padrão `PREFIXO-EIXO1-EIXO2` (`SLR-45-BRI`), editável |

### B7 — Preço padrão e margem

- `Preço de venda`, `Preço "de" (riscado)`, `Custo por unidade` + card de margem com lucro por unidade.
- Quando há variações, faixa violeta explica o casamento: *"Este produto tem 6 variações — quem manda
  no preço cobrado é a grade abaixo. A vitrine mostra a partir de R$ 14,90"*, com atalho para a grade.
- Sem variações, o preço padrão é o preço cobrado.

### B8 — Estoque e disponibilidade

Segmentado de 3 modos (substitui o par de switches):

| Modo | Comportamento |
| ---- | ------------- |
| **Controlar estoque** | Cada variação baixa do próprio saldo e some da vitrine em zero |
| **Vender no negativo** | Continua vendendo com saldo zerado (encomenda) |
| **Não controlar** | Nunca esgota; a coluna Estoque da grade fica desligada. É o modo do personalizado e do sob demanda |

Mais: alerta de estoque baixo por variação e **prazo de produção em dias úteis** (entra na promessa
de entrega do frete).

### B9 — Máscaras (pedido do usuário)

| Campo | Máscara |
| ----- | ------- |
| Preço, promo, custo | Prefixo `R$` em slot fixo, milhar/decimal pt-BR ao digitar. Colar `R$ 1.234,56` funciona |
| Peso | Digitado em **gramas** com sufixo `g`; guardado em kg (`18 g → 0,018 kg`), com a conversão visível |
| Dimensões | Uma decimal + sufixo `cm` |
| Percentuais | Sufixo `%`, sem decimal |

### C1 — Mídia

- Tiles de 196 px com badge **Principal**, ações de recorte/remoção no hover e **alt-text por imagem**
  (com estados: ok · gerado automaticamente · faltando, com ação `Gerar`).
- Render de mockup ganha selo `Mockup · na mão` — a origem passa a ser um dado (T5).
- Upload com progresso por arquivo e nome/tamanho.
- Dropzone diz a verdade: `PNG, JPG ou WebP até 8 MB · convertidas para WebP 1600 px` (hoje a copy
  fala 5 MB e o código reduz para 1200 px sem validar nada — T9).
- Colar imagem da área de transferência (⌘V).
- Card **Imagem por variação**: cada linha da grade aponta para uma imagem da galeria; as demais
  usam a principal.

### C2 — Estúdio de mockup ampliado

Painel de **1360 × ~886 px** (era 768 px), em três colunas:

| Coluna | Conteúdo |
| ------ | -------- |
| Esquerda (264 px) | Arte de origem (trocar / usar do produto) e lista de mockups com thumb de 38 px, seleção e **estado do relevo** ("relevo não medido — sai chapado") |
| Centro | Palco de 452 px com o composto grande, zoom, antes/depois, lupa na aba, camadas `Fundo · Arte · Relevo · Overlay` e **filmstrip** dos renders (pronto / compondo / com aviso) |
| Direita (300 px) | Ajuste da arte (escala, X, Y, rotação) com "Aplicar a todos", **Saída** (1200/1600/2000 px · WebP/PNG) e **Ao aplicar** (anexar × substituir, definir 1ª como principal, gerar alt-text) |

Rodapé: `4 renders em 1600 px · leva ~6 s · nada é salvo antes de você aplicar` + ação primária
`Aplicar 4 imagens ao produto`.

> Este é o **estúdio** (aplica arte em templates, aba Mídia). Não confundir com o **editor de
> template**, que a feature [`06-mockup-editor-ia`](../06-mockup-editor-ia/context.md) leva para
> tela cheia com rota própria. As duas telas compartilham vocabulário (camadas, antes/depois,
> resolução de saída) de propósito.

### D1 — Listagem v2

| # | Funcionalidade | Comportamento |
| - | -------------- | ------------- |
| D1.1 | Visões salvas | `Todos · Ativos · Rascunhos · Sem estoque (7) · Sem imagem (3) · Sem SEO · Agendados` + "Salvar visão atual" |
| D1.2 | Filtros em chips | Categoria (múltipla), tags, faixa de preço, estoque; chip ativo mostra o valor e o × |
| D1.3 | Busca | Nome, **SKU** e tag |
| D1.4 | Colunas configuráveis | Menu `Colunas` + densidade |
| D1.5 | Edição inline | Clique em preço ou estoque abre input na célula; ⏎ salva, Tab avança, Esc cancela; toast com desfazer |
| D1.6 | Seleção | Checkbox por linha, "Selecionar os 148 do filtro" (não só a página) |
| D1.7 | Barra de massa | Editar em massa · Ativar · Pausar · Duplicar · Exportar · Excluir |
| D1.8 | Coluna Produto | Thumb, nome, contagem de variações e slug; badges de pendência (`sem imagem`) |
| D1.9 | Coluna Preço | Faixa quando há variações (`R$ 14,90 – 18,40` + "6 preços") |
| D1.10 | Coluna Estoque | Número + bolinha de status; `sempre disponível` quando a política é "não controlar" |
| D1.11 | Status | `Ativo · Esgotado · Rascunho · 31/out 18h` (agendado mostra a data) |
| D1.12 | Paginação | `1–25 de 160` com total real (hoje pagina em memória sobre `select('*')`) |
| D1.13 | Novo produto ▾ | Menu: Novo produto · Grade rápida · Importar CSV |

### D2 — Edição em massa

Painel com **um campo por linha, ligado/desligado**. Só o que está ligado muda.

| Campo | Modos |
| ----- | ----- |
| Preço | Definir valor · Aumentar % · Diminuir % · Arredondar (+ "terminar em ,90") |
| Estoque | Definir · Somar · Subtrair (produtos sem controle de estoque são ignorados, e a tela avisa) |
| Categorias | Adicionar · Remover · Substituir |
| Tags | Adicionar · Remover |
| Status | Ativar · Pausar · Agendar |
| Peso e dimensões | Aplicar preset |
| Política de estoque | Controlar · Não controlar |

Ao lado, **Prévia do impacto**: antes → depois das primeiras linhas, ticket médio antes/depois,
avisos de exclusão. Depois de aplicar, toast escuro com **Desfazer · 28s** (guarda os valores
anteriores).

### D3 — Grade rápida (cadastro em massa, D4)

- Rota própria (`/admin/produtos/grade-rapida`).
- Faixa **Padrões de todas as linhas**: categorias, opções (ex.: 3 tamanhos × 2 acabamentos), preset
  de peso, salvar como rascunho. O que a linha não disser, herda daqui.
- Planilha: `# · imagem · Nome* · Categorias · Preço* · Estoque · Tags · SKU base · check`.
- ⌘V cola várias linhas do Excel; Tab avança; ⌥↓ duplica a linha.
- Validação linha a linha, com os erros abertos embaixo da linha (`Preço é obrigatório`,
  `já existe um produto com a URL /…`).
- Rodapé: `7 prontas · 1 com erro`; a ação primária cria **só as válidas**, como rascunho.
- A grade de variações de cada produto é gerada dos padrões — o ajuste fino é no formulário.

---

## Decisões

| # | Questão | Opções consideradas | Escolha | Rationale |
| - | ------- | ------------------- | ------- | --------- |
| D1 | Como modelar as opções que geram variações | (a) Manter 2 eixos fixos (`sizes` × `finishes`) · (b) **Opções genéricas, até 3 eixos** | **Opções genéricas** | Pedido do usuário. Bottons hoje são tamanho × acabamento, mas kit, cor e estampa já aparecem no catálogo. Custo: a loja lê `sizes`/`finishes` fixos em `ProductCard` e `cartStore`, então a mudança sobe para a vitrine |
| D2 | Como o preço se relaciona com a variação | (a) Delta sobre o preço base · (b) **Preço absoluto por variação** · (c) Só estoque por variação | **Preço absoluto** | Pedido do usuário. Cada linha é um preço cheio, com promo própria. Contrapartida aceita: reajuste geral passa a ser trabalho de lote — resolvido por "Preencher coluna → +10%" e pela edição em massa |
| D3 | Um produto em várias categorias | (a) Principal + secundárias · (b) **Conjunto plano** | **Conjunto plano** | Pedido do usuário. Todas valem igual. Onde a loja precisa de uma só, a regra é determinística (menor `sort_order`, T6) em vez de um campo "principal" que o admin teria de manter |
| D4 | Forma do cadastro em massa | (a) Importador CSV v2 · (b) **Grade rápida na tela** · (c) os dois | **Grade rápida** | Pedido do usuário. O volume real é de 5–20 itens por drop, digitados ou colados — não arquivo de fornecedor. O CSV atual continua existindo como porta secundária no menu |
| D5 | Onde vive o slug | (a) Campo em Geral (hoje) · (b) Campo em Geral **e** em SEO (hoje, duplicado) · (c) **Só em SEO, com leitura em Geral** | **Só em SEO** | Pedido do usuário: "preencher automaticamente, mas ficar apenas no campo de SEO como URL personalizada". Um dado, um controle |
| D6 | Como oferecer "não validar estoque" | (a) Switch "controlar estoque" + switch "vender sem estoque" · (b) **Segmentado de 3 modos** | **3 modos** | São três comportamentos mutuamente exclusivos. Dois switches criam a combinação sem sentido "não controla mas permite negativo" |
| D7 | Unidade do peso | (a) kg com 3 decimais (hoje) · (b) **gramas, guardado em kg** | **Gramas** | Botton pesa 16–22 g. `0,018` é um convite a errar uma ordem de grandeza; `18 g` não |
| D8 | Estúdio de mockup: dialog maior ou tela cheia? | (a) **Dialog de 1360 px** · (b) Rota própria em tela cheia | **Dialog grande** | O estúdio é um passo *dentro* do cadastro — sair para outra rota faria perder o formulário não salvo. O **editor de template** (feature 06) é que ganha rota, porque é um objeto com vida própria |
| D9 | Fonte de verdade da variação | (a) `products.variants` JSONB (o form usa hoje) · (b) **tabela `product_variants`** | **Tabela** | `order_items.variant_id` já referencia a tabela: um pedido precisa apontar para a linha vendida. Preço por variação sem FK confiável é oversell e diferença de caixa |
| D10 | Onde a edição em massa acontece | (a) Modal por campo · (b) **Painel único com campos ligáveis + prévia** | **Painel com prévia** | Editar 148 preços de uma vez sem ver o resultado antes é caro de descobrir. A prévia e o desfazer de 30 s são o guarda-corpo |
| D11 | Ordem de entrega | (a) Formulário primeiro, banco depois · (b) **Migração de variação primeiro** | **Migração primeiro** | Grade, política de estoque, listagem e checkout todos leem o mesmo modelo. Fazer o form contra o JSONB e migrar depois é escrever a mesma tela duas vezes |

---

## Decisões técnicas derivadas

| # | Decisão | Rationale / fonte |
| - | ------- | ----------------- |
| T1 | `product_variants` ganha `option_values jsonb`, `price`, `compare_price`, `stock`, `sku`, `weight_kg`, `image_url`, `is_active`, `position`; `products.variants` é migrado e depois removido | D9. `option_values` guarda `{Tamanho: "4,5 cm", Acabamento: "Fosco"}` — é o que permite 3 eixos livres (D1) sem coluna por eixo |
| T2 | `products.options jsonb` guarda os eixos (`[{name, values[], position}]`) | A grade é derivada, mas os eixos precisam existir mesmo sem variação gerada |
| T3 | Validação no submit, não no `required` do input | O `Tabs` do Radix **desmonta** o conteúdo inativo: `required` do preço só existe se a aba Preços estiver aberta. Hoje salvar de outra aba passa batido. O badge por aba (B1.2) é a saída visível |
| T4 | Checagem de slug com debounce contra `products.slug` | Hoje a `unique` do banco estoura no insert e o toast diz "Erro ao salvar produto" — o admin não sabe o que fazer |
| T5 | `products.images` deixa de ser `text[]` e passa a `jsonb`: `{url, alt, source}` | Alt-text (C1) e o selo "Mockup" precisam de um lugar. Migração converte `text[]` em objetos com `alt: null, source: 'upload'` |
| T6 | Categoria de exibição = a de menor `sort_order` entre as do produto | D3 não tem principal, mas `ProductCard` mostra um selo e o breadcrumb mostra um caminho. Regra pura, sem campo novo para manter |
| T7 | `product_categories (product_id, category_id, position)` com backfill de `category_id`; `products.category_id` fica como legado durante a transição | Migração aditiva: a loja continua funcionando enquanto `CategoryPage` ainda filtra por `.eq('category_id')` |
| T8 | `create-payment` passa a precificar por variação | Hoje monta `priceById` só com `products.base_price` ([`mercado-pago/index.ts:113-122`](../../../supabase/functions/mercado-pago/index.ts#L113-L122)). Com D2, o servidor recalcularia 14,90 onde a grade cobra 18,40. `order_items` precisa gravar `variant_id` e a function resolver o preço dele |
| T9 | `apply_payment_approval` baixa estoque da **variação** e respeita a política | Hoje desconta de `products.stock_total` ([migration `20260726000000`](../../../supabase/migrations/20260726000000_products_extended_fields.sql#L99-L107)). Com saldo por linha, descontar do produto é oversell garantido; e produto "não controla" não pode ter baixa nenhuma |
| T10 | `product_redirects (from_slug, product_id)` + resolução em `/produto/:slug` | Sem isso, editar a URL de um produto publicado mata todo link de Instagram já postado |
| T11 | Upload valida tamanho antes de comprimir e sobe o teto para 1600 px | A copy promete "máx. 5MB" e o código não checa nada; `MAX_DIMENSION = 1200` ([`uploadProductImage.ts:5-6`](../../../apps/backoffice/src/features/product-form/lib/uploadProductImage.ts#L5-L6)) é pequeno para zoom de vitrine |
| T12 | Criação em lote com um único `insert` e um refetch | `createProduct` chama `fetchProducts()` no fim ([`useAdminProducts.ts:61-65`](../../../apps/backoffice/src/entities/product/api/useAdminProducts.ts#L61-L65)) e a importação chama em laço ([`AdminProductsPage.tsx:86-90`](../../../apps/backoffice/src/pages/admin/AdminProductsPage.tsx#L86-L90)): 40 produtos = 40 SELECTs do catálogo inteiro |
| T13 | Margem só é calculada com preço > 0 | `((price - cost) / price) * 100` com preço 0 devolve `-Infinity` e o card mostra lixo ([`AdminProductFormPage.tsx:136`](../../../apps/backoffice/src/pages/admin/AdminProductFormPage.tsx#L136)) |
| T14 | Máscaras como funções puras em `@nanapin/core/formatters`, testáveis | `formatPrice` já vive lá; parse/format de moeda, gramas e cm são a mesma família e a grade rápida precisa do parse ao colar |
| T15 | Rascunho em `sessionStorage` por produto + guarda de saída | Mesmo padrão decidido em [`06-mockup-editor-ia`](../06-mockup-editor-ia/context.md) (T3 de lá). Coerência entre as duas telas de edição longa |
| T16 | Desfazer da edição em massa guarda os valores anteriores em memória por 30 s | Não é `undo` transacional no banco — é um segundo `update` com o snapshot. Suficiente e barato |
| T17 | Listagem passa a paginar e filtrar no servidor | Hoje `select('*')` traz o catálogo e filtra em memória. Com 148 produtos ainda passa; com variação e imagem em `jsonb`, não |
| T18 | `stock_policy` (`track` · `backorder` · `none`) em `products`, não por variação | D6 é uma decisão comercial do produto inteiro. Saldo é por variação; política é do produto |

---

## Opções levantadas e não escolhidas

| # | Opção | Por que ficou fora |
| - | ----- | ------------------ |
| O1 | Preço por variação como delta (`+R$ 2,00`) | Reajuste geral seria uma edição só, mas o admin pensa em "quanto custa o 5,5 cm", não em "quanto ele custa a mais". D2 |
| O2 | Categoria principal + secundárias | D3. O usuário escolheu conjunto plano; T6 resolve o único lugar que precisava de uma |
| O3 | Importador CSV v2 (mapeamento de colunas, dry-run, upsert por SKU) | D4 escolheu a grade rápida. O CSV atual continua funcionando; o v2 volta se aparecer catálogo de fornecedor |
| O4 | Editor de mockup e estúdio na mesma tela | São perguntas diferentes: calibrar um template × aplicar arte em vários. D8 |
| O5 | Estoque por variação **e** política por variação | Complexidade sem demanda: nenhum caso real tem uma variação sob demanda e outra controlada. T18 |
| O6 | Arrastar para ordenar produtos na listagem | `sort_order` existe, mas a loja hoje ordena por `created_at`. Fica para quando a vitrine tiver ordem manual |
| O7 | Duplicar produto **com** variações a partir da listagem | O `?from=` atual copia campos rasos. Com a tabela de variação isso vira uma cópia de N linhas — deixar para depois de A |
| O8 | Preço por canal / por cupom na grade | Cupom já é outra feature (`04-*`). Misturar as duas na mesma tabela confunde a origem do desconto |

---

## Riscos e guarda-corpos

| Risco | Guarda-corpo |
| ----- | ------------ |
| Publicar preço por variação antes do checkout entender | T8/T9 entram na **mesma leva** da grade. Enquanto não entrarem, a grade fica atrás de flag |
| Migrar `variants` JSONB e perder saldo | Migração copia para `product_variants` e mantém o JSONB até a validação passar; remoção é uma segunda migração |
| Oversell com saldo por variação | Baixa dentro de `apply_payment_approval` (transacional, já idempotente) com `greatest(saldo - qtd, 0)` por linha |
| Edição em massa errada em 148 produtos | Prévia do impacto + desfazer de 30 s (D10, T16) + a barra dizendo quantos são |
| Tag duplicada com acento e caixa diferentes | Comparação normalizada (B4) com par Usar a existente / Manter — sugere, não força |
| URL quebrada por edição de slug | T10 (301) + toggle visível e ligado por padrão |
| `images` virando `jsonb` e a loja lendo `string[]` | Migração converte e os leitores da loja passam a aceitar objeto; `image_url` legado continua |
| Reescrever a página inteira e regredir o que funcionava | O formulário atual é uma página só de 485 linhas — a reescrita é grande. Fatiar por aba, com a spec listando o que cada aba já fazia |

---

## Impacto no código

| Arquivo | Ação |
| ------- | ---- |
| `supabase/migrations/<ts>_product_variants_pricing.sql` | **novo** — T1, T2, T5, T18 |
| `supabase/migrations/<ts>_product_categories.sql` | **novo** — T7 |
| `supabase/migrations/<ts>_product_redirects.sql` | **novo** — T10 |
| `supabase/migrations/<ts>_stock_by_variant.sql` | **novo** — T9 (`apply_payment_approval`) |
| `supabase/functions/mercado-pago/index.ts` | **muda (crítico)** — T8 |
| `packages/supabase/src/types/index.ts` | **muda** — `ProductVariant`, `DbProduct.options`, `images`, `stock_policy` |
| `packages/core/src/formatters` | **estende** — T14 (moeda, gramas, cm) |
| `apps/backoffice/src/pages/admin/AdminProductFormPage.tsx` | **reescreve** — B1–B9 |
| `apps/backoffice/src/features/product-form/ui/CategoryMultiSelect.tsx` | **novo** — B3 |
| `apps/backoffice/src/features/product-form/ui/TagInput.tsx` | **novo** — B4 |
| `apps/backoffice/src/features/product-form/ui/OptionsEditor.tsx` | **novo** — B5 |
| `apps/backoffice/src/features/product-form/ui/VariantsTable.tsx` | **reescreve** — B6 |
| `apps/backoffice/src/features/product-form/ui/MoneyInput.tsx` · `WeightInput.tsx` | **novo** — B9 |
| `apps/backoffice/src/features/product-form/ui/SeoPreview.tsx` | **muda** — B2 (URL personalizada, 301, disponibilidade) |
| `apps/backoffice/src/features/product-form/ui/ImageGallery.tsx` | **novo** — C1 (alt-text, origem, progresso) |
| `apps/backoffice/src/features/product-form/lib/uploadProductImage.ts` | **muda** — T11 |
| `apps/backoffice/src/features/mockup-studio/ui/MockupStudioDialog.tsx` | **muda** — C2 |
| `apps/backoffice/src/pages/admin/AdminProductsPage.tsx` | **reescreve** — D1 |
| `apps/backoffice/src/features/bulk-edit/` | **novo** — D2 |
| `apps/backoffice/src/pages/admin/AdminQuickGridPage.tsx` · `features/quick-grid/` | **novo** — D3 |
| `apps/backoffice/src/entities/product/api/useAdminProducts.ts` | **estende** — T12, T17, variações |
| `apps/backoffice/src/app/App.tsx` | **muda** — rota da grade rápida |
| `apps/store`: `ProductCard`, `ProductPage`, `useProducts`, `useProduct`, `cartStore`, `CategoryPage` | **muda** — eixos genéricos, preço por variação, categorias N:N, redirect |

---

## Open questions

| # | Questão | Estado |
| - | ------- | ------ |
| Q1 | O `products.variants` JSONB tem dado em produção que precise de backfill cuidadoso, ou o catálogo real ainda é pequeno? | **Aberta.** Muda o risco da migração de D9 |
| Q2 | Preço promocional por variação precisa de janela (de/até), como o cupom tem? | **Aberta.** O desenho tem só o valor. Provável: fica para depois |
| Q3 | "Prazo de produção" entra na cotação do Melhor Envio ou é só texto na página? | **Aberta.** Se entra no frete, mexe na edge function de frete |
| Q4 | O personalizado (`CustomPinPage`) passa a ser um produto real com `stock_policy: none`, ou continua sintético? | **Aberta.** Virar produto real resolve o `id: custom-<timestamp>` que hoje não casa com nenhuma linha de `products` |
| Q5 | Quantos eixos o design da loja aguenta? 3 eixos = até 3 seletores no card da vitrine | **Aberta.** O backoffice permite 3; a loja pode querer limitar a 2 na vitrine e 3 na página |
| Q6 | A grade rápida cria variações a partir dos padrões, ou cria produto simples e o admin gera a grade depois? | **Recomendação: cria a partir dos padrões**, porque é o que economiza as 20 idas ao formulário. Confirmar |

---

## Próximo passo

Rodar a Skill `tlc-spec-driven` sobre este documento para produzir `spec.md`, `design.md` e
`tasks.md` — com os itens numerados `01-nome-implementacao` conforme a convenção do `CLAUDE.md`.
Sugestão de fatiamento em duas features, para não ficar uma spec gigante:

1. **`variant-pricing-model`** — frentes **A + E** (migrações, checkout, baixa de estoque, loja).
   É o alicerce e o único trecho com risco de dinheiro.
2. **`product-admin-v2`** — frentes **B + C + D** (formulário, mídia/estúdio, listagem e lote).
   Depende de 1, mas é onde está o valor visível para quem cadastra.
