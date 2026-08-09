# Formulário de Produto v2 — Specification

**Criada:** 2026-07-31 (fatiada de `07-product-catalog-admin` por `AD-009`)
**Contexto:** [`../07-product-catalog-admin/context.md`](../07-product-catalog-admin/context.md) —
contexto de **programa**, comum às quatro features. Desenho no Paper (arquivo **Nanapin**, página
**Backoffice - Produtos**): <https://app.paper.design/file/01KPBGSMF2DP3MQVAEB171ZMDZ/6-0>
**Artboards:** *Produto — aba Geral* · *Produto — aba Preços & variações* · *Produto — aba SEO*
**Escopo:** frente **B** (formulário). **15 requisitos · 11 tasks.**

> ### Feature 2 de 4
>
> **Depende de** [`07-product-catalog-admin`](../07-product-catalog-admin/spec.md), que precisa estar
> **integralmente fechada** antes de a primeira task daqui começar. Roda **em paralelo** com
> [`13-product-bulk-ops`](../13-product-bulk-ops/spec.md). É pré-condição de
> [`12-product-media-studio`](../12-product-media-studio/spec.md), que precisa do esqueleto de 5 abas
> (T21/T25).
>
> **Numeração preservada.** IDs de requisito e números de task são os da spec original, distribuídos
> sem renumerar — cada um aparece **exatamente uma vez** no programa. Aqui ficam **T21–T26 e T28–T32**
> (T27 migrou para a `07` por `AD-010`). Números não contíguos são esperados.

---

## Problem Statement

O formulário de produto foi construído para um catálogo de botton com **duas opções fixas** (tamanho ×
acabamento) e **um preço só**. O catálogo real já tem kit, cor e estampa. E o pior não é o que falta —
é o que mente:

- O `required` do preço vive dentro de `TabsContent value="precos"`
  ([`AdminProductFormPage.tsx:343`](../../../apps/backoffice/src/pages/admin/AdminProductFormPage.tsx#L343)),
  e o `Tabs` do Radix **desmonta o conteúdo inativo**. Salvar de outra aba passa batido.
- A margem divide por `form.price` guardando contra `cost_price > 0`
  ([`:136`](../../../apps/backoffice/src/pages/admin/AdminProductFormPage.tsx#L136)) — preço 0 com custo
  preenchido renderiza `-Infinity`.
- Um F5 perde tudo: não há rascunho nem guarda de saída.
- O slug tem **dois** campos editáveis (Geral e SEO) e só descobre duplicata quando o `UNIQUE` do banco
  estoura, virando o toast genérico "Erro ao salvar produto".
- Categoria é um `Select` único; tags são uma string separada por vírgula, que cria `Naruto`, `naruto`
  e `naruto ` como coisas diferentes.

Com a `07` fechada, o modelo já sabe representar tudo isso — mas ninguém consegue **cadastrar**. Esta
feature é onde o valor fica visível para quem usa o backoffice todo dia.

---

## Goals

- [x] **Opções livres:** até 3 eixos por produto (nome + valores), substituindo `sizes[]`/`finishes[]`.
- [x] **Preço mora junto da opção:** a grade com preço por linha fica na mesma aba dos eixos; a aba
      `Variações` deixa de existir.
- [x] **Um dado, um controle:** o slug tem um único campo (SEO, como *URL personalizada*), com
      disponibilidade verificada ao digitar e 301 automático para produto já publicado.
- [x] **Taxonomia que não suja:** categorias múltiplas com criação inline; tags como tokens com dedupe
      tolerante a acento e caixa.
- [x] **Nada silencioso:** validação inválida em aba fechada, slug duplicado e variação sem preço
      passam a ter erro visível e localizável, não um toast genérico.
- [x] **Nada se perde:** rascunho automático e guarda de saída.

---

## Out of Scope

| Item | Motivo |
| ---- | ------ |
| **Aba Mídia, alt-text, upload e estúdio de mockup** | Feature [`12-product-media-studio`](../12-product-media-studio/spec.md). Aqui a aba Mídia recebe só o **slot** no esqueleto de 5 abas |
| **Imagem por variação e prévia da vitrine** (`PMD-06`, `PFM-17`) | Feature [`12`](../12-product-media-studio/spec.md) — dependem da galeria |
| **Listagem, edição em massa e grade rápida** | Feature [`13-product-bulk-ops`](../13-product-bulk-ops/spec.md) |
| **Migrações, tipos, `@nanapin/core`, checkout, RPC, leituras da loja** | Feature [`07`](../07-product-catalog-admin/spec.md) — pré-condição desta |
| **Os 3 inputs mascarados** (`MoneyInput`, `WeightInput`, `DimensionInput`) | Entregues pela `07` em `shared/ui/inputs/` (`AD-010`). Aqui são **consumidos** |
| **Geração de texto por IA** ("Sugerir com IA" na descrição, "Gerar com IA" no SEO) | `AD-011`. Desenhado nos artboards *Geral* e *SEO*, sem uma única AC e sem provedor no projeto. **Não implementar a partir do desenho** |
| Aba **Relacionados** | É a única das 5 que não muda. `RelatedProductsSelect` fica como está |
| Preço por variação como delta (`+R$ 2,00`) | D2 escolheu preço absoluto |
| Janela de vigência no preço promocional por variação | A5 (na `07`) → sem janela |
| Política de estoque **por variação** | Política é do produto |

---

## Assumptions & Open Questions

Numeração **herdada da spec original**. As assumções de schema, dinheiro e loja (A2, A3, A5–A11, A14,
A15) vivem na [`07`](../07-product-catalog-admin/spec.md) e **valem aqui como pré-condição** — não são
redecididas.

| # | Assumção / decisão | Default escolhido | Rationale | Confirmado? |
| - | ------------------ | ----------------- | --------- | ----------- |
| A13 | Idioma da UI | Português (pt-BR) | Convenção do projeto | **sim** |
| A17 | Como reescrever a página | **Extrair para um slice `product-form` com `useProductForm` + um componente por aba, migrando aba a aba** — não reescrever `AdminProductFormPage.tsx` de uma vez | 485 linhas e 6 abas num commit só é diff irrevisável, e tudo regride junto. Aba a aba, cada uma entra verde com o resto funcionando | **sim** (design) |
| A18 | Teto de linhas da grade | **3 eixos × 60 linhas** é o teto realista; a tabela agrupa e **só** virtualiza se o perfil mostrar necessidade | Trazer dependência de virtualização por antecipação é custo sem evidência | não |
| A19 | Origem das contagens de tag e categoria | **Uma RPC/view agregada**, nunca `select('*')` no catálogo para contar no cliente | O autocomplete de tags e a contagem por categoria abrem em toda edição; contar no cliente repetiria o erro que a `13` está corrigindo na listagem | não |

**Open questions:** nenhuma bloqueante.

> **Revisão independente (2026-07-27).** Os achados da revisão cética que caem nesta feature: a exclusão
> de variação vendida estourando FK (→ PFM-08 AC 9a — a FK `order_items.variant_id → product_variants`
> é `NO ACTION`) e a validação que não pode depender do `required` do input (→ PFM-11).

---

## User Stories

### P1.3 — Opções genéricas e grade de variações ⭐ MVP

**User Story**: Como admin, quero declarar os eixos do produto (Tamanho, Acabamento, Cor…) e ver a
grade com **preço por linha** logo abaixo, para que valor e opção parem de morar em abas diferentes.

**Why P1**: É o pedido central (D1 + D2) e a correção estrutural do problema.

**Acceptance Criteria**:

1. WHEN o formulário abre THEN SHALL exibir **5 abas** — `Geral · Mídia · Preços & variações · SEO · Relacionados` — e a aba `Variações` SHALL não existir mais.
2. WHEN o admin adiciona um eixo THEN o sistema SHALL aceitar nome livre com presets sugeridos (`Tamanho`, `Acabamento`, `Cor`, `Estampa`, `Pack`) e SHALL permitir no máximo **3 eixos**; a ação de adicionar o 4º SHALL ficar desabilitada.
3. WHEN o admin cola `3,5 cm, 4,5 cm, 5,5 cm` no campo de valores de um eixo THEN o sistema SHALL criar três chips, aparando espaços e descartando vazios e duplicados.
4. WHEN há 2 eixos com 3 e 2 valores THEN o cabeçalho SHALL exibir `2 de 3 eixos · 3 × 2 = 6 variações`.
5. WHEN o admin reordena os eixos por arraste THEN a ordem SHALL persistir em `products.options[].position` e SHALL determinar a ordem dos seletores na página do produto.
6. WHEN o admin aciona **Regerar do cruzamento** THEN o sistema SHALL calcular o produto cartesiano dos eixos, SHALL preservar preço/promo/estoque/SKU/peso/imagem das combinações que já existiam, e SHALL exibir o diff (`N a criar · M a remover`) **antes** de aplicar.
7. WHEN a grade tem variações THEN as colunas SHALL ser: seleção · imagem · variação · SKU · preço · preço "de" · estoque · peso · ativa · ⋯.
8. WHEN há mais de um eixo THEN a grade SHALL agrupar as linhas pelo 1º eixo, com cabeçalho de grupo mostrando nome, contagem de variações e soma de estoque do grupo.
9. WHEN o admin seleciona linhas da grade THEN SHALL oferecer as ações em massa `Definir preço`, `Definir estoque`, `Gerar SKU`, `Pausar`, `Excluir`, aplicadas **só** às linhas selecionadas.
9a. WHEN o admin tenta excluir uma variação já referenciada por `order_items` THEN o sistema SHALL recusar a exclusão, nomear quantos pedidos a referenciam e oferecer **Pausar** no lugar — a FK `order_items.variant_id → product_variants(id)` não tem `ON DELETE` ([`20260414121021:108`](../../../supabase/migrations/20260414121021_305804ba-a826-4a90-9d43-6c78231e94d7.sql#L108)), então excluir estouraria erro de FK cru na cara do admin.
10. WHEN o admin usa **Preencher coluna** no cabeçalho de uma coluna numérica THEN SHALL oferecer `aplicar a todas`, `só às vazias`, `+N%` e `copiar de outro grupo`.
11. WHEN uma linha ativa está sem preço THEN a linha SHALL ficar com borda de erro, com a mensagem inline `"sem preço a variação não entra na loja"`, e SHALL bloquear o *Salvar e publicar*.
12. WHEN o admin pausa uma variação THEN `is_active` SHALL virar `false`, a linha SHALL sumir da loja e o histórico de pedidos que a referenciam SHALL permanecer intacto.
13. WHEN a grade tem linhas THEN o rodapé SHALL exibir `N variações · faixa R$ X – Y · Z un. somadas`, calculando a faixa só sobre linhas ativas com preço.
14. WHEN o admin aciona **Gerar SKU** THEN o padrão SHALL ser `PREFIXO-EIXO1-EIXO2` (ex.: `SLR-45-BRI`), derivado do slug e dos valores, e SHALL permanecer editável.
15. WHEN o produto tem variações THEN a seção de preço padrão SHALL exibir o aviso `"Este produto tem N variações — quem manda no preço cobrado é a grade abaixo. A vitrine mostra a partir de R$ X"` com atalho para a grade.
16. WHEN o produto **não** tem variações THEN o preço padrão SHALL ser o preço cobrado, sem aviso.

**Independent Test**: criar produto com eixos `Tamanho (3,5 cm; 4,5 cm)` × `Acabamento (Fosco; Brilhante)`,
gerar a grade, preencher 3 preços e deixar 1 vazio; conferir que o rodapé mostra a faixa correta e que
*Salvar e publicar* fica bloqueado com o erro apontando a linha vazia.

---

### P1.4 — Categorias múltiplas e tags como tokens ⭐ MVP

**User Story**: Como admin, quero marcar o botton de Sailor Moon como *anime*, *Sailor Moon* e
*mais vendidos* de uma vez, e digitar tags sem criar `Naruto`, `naruto` e `naruto ` no catálogo.

**Why P1**: É o pedido D3 + a limpeza de taxonomia que sustenta os filtros da listagem e da vitrine.

**Acceptance Criteria**:

1. WHEN o admin abre o seletor de categorias THEN SHALL ser um combobox de múltipla escolha com chips, exibindo o contador `N selecionadas`.
2. WHEN o admin busca uma categoria THEN cada resultado SHALL mostrar o caminho hierárquico (`K-Pop › Girl Groups`) e a contagem de produtos daquela categoria.
3. WHEN a busca não retorna resultado THEN SHALL exibir a ação `Criar categoria "<termo>"` (atalho `⌘⏎`), que abre o formulário curto inline (nome, pai, slug automático) reusando [`CategoryFormDialog`](../../../apps/backoffice/src/features/category-form/ui/CategoryFormDialog.tsx) e, ao salvar, SHALL já deixar a nova categoria marcada — sem perder o rascunho do produto.
4. WHEN o produto é salvo THEN as categorias SHALL persistir em `product_categories` com `position` = ordem de seleção.
5. *(movida)* → A regra de **qual** categoria a loja exibe (menor `sort_order`, empate por `position`) é `PST-06` e vive em [`07 / P1.2b AC 3`](../07-product-catalog-admin/spec.md). Aqui fica só a escrita.
6. WHEN o admin digita uma tag e pressiona `Enter`, `,` ou `Tab` THEN o sistema SHALL criar um chip removível; `Backspace` em campo vazio SHALL remover o último chip.
7. WHEN o admin cola `naruto, shonen, anos 90` THEN o sistema SHALL criar três chips de uma vez.
8. WHEN o admin digita THEN o autocomplete SHALL listar as tags existentes com a contagem de produtos que as usam, ordenadas por uso decrescente.
9. WHEN a tag digitada difere de uma existente apenas por acento ou caixa THEN o sistema SHALL exibir aviso âmbar com o par de ações `Usar a existente` / `Manter` — SHALL sugerir, nunca substituir automaticamente.
10. WHEN o produto já tem 15 tags THEN o campo SHALL bloquear novas tags e o contador SHALL exibir `15 de 15`.
11. WHEN a mesma tag é adicionada duas vezes de forma idêntica THEN o sistema SHALL manter uma só ocorrência.
12. WHEN o admin abre o formulário THEN a faixa de tags sugeridas SHALL listar as mais usadas nas categorias já escolhidas.

**Independent Test**: com `naruto` já no catálogo, digitar `Naruto` e conferir o aviso com as duas ações;
selecionar 3 categorias, salvar, recarregar e conferir que as 3 voltaram na mesma ordem.

---

### P1.5 — URL personalizada com disponibilidade e 301 ⭐ MVP

**User Story**: Como admin, quero um único lugar para a URL do produto, que me avise se já existe e
que preserve os links do Instagram quando eu mudar.

**Why P1**: D5 (um dado, um controle) + o defeito 15 (slug duplicado só falha no salvar) + o risco de
matar todo link já postado.

**Acceptance Criteria**:

1. WHEN a aba **Geral** é exibida THEN o slug SHALL aparecer como **linha de leitura** (`nanapin.com.br/produto/<slug> · gerada do nome`) com o link `Editar em SEO →`, e SHALL não haver campo editável de slug em Geral.
2. WHEN o slug nunca foi editado manualmente E o admin muda o nome do produto THEN o slug SHALL ser regerado a partir do nome.
3. WHEN o admin edita o slug na aba SEO THEN o vínculo com o nome SHALL ser rompido; mudar o nome depois disso SHALL não alterar a URL, e a tela SHALL informar isso.
4. WHEN o admin digita no campo de URL personalizada THEN o sistema SHALL consultar a disponibilidade contra `products.slug` com debounce e SHALL exibir `Disponível` (verde) ou `Já existe` (vermelho) com uma sugestão de sufixo.
5. WHEN o slug está marcado como indisponível THEN *Salvar* SHALL ser bloqueado com o erro apontando o campo — SHALL não depender do `unique` do banco estourar no insert.
6. WHEN o produto **já está publicado** E o admin altera o slug THEN SHALL aparecer aviso âmbar informando que o endereço antigo ganhará **301**, com toggle ligado por padrão.
7. WHEN o produto é salvo com o toggle de 301 ligado E o slug mudou THEN o slug antigo SHALL ser gravado em `product_redirects`.
8. *(movida)* → A **resolução** do redirect em `/produto/:slug` é `PST-07` e vive em [`07 / P1.2b AC 5`](../07-product-catalog-admin/spec.md). Aqui fica só a gravação.
9. WHEN o slug de um produto muda para um valor que já está em `product_redirects` apontando para outro produto THEN o registro conflitante SHALL ser removido em favor do produto vivo (o slug ativo sempre vence o redirect).
10. WHEN o admin edita o slug com o toggle de 301 desligado THEN nenhum registro SHALL ser criado.

**Independent Test**: publicar um produto, anotar a URL, alterar o slug com o toggle ligado, salvar e
abrir a URL antiga na loja — deve chegar ao produto.

---

### P1.6 — Máscaras pt-BR e política de estoque em 3 modos ⭐ MVP

**User Story**: Como admin, quero digitar `18` para 18 gramas e colar `R$ 1.234,56` de uma planilha
sem o campo brigar comigo — e quero poder dizer "este produto não controla estoque".

**Why P1**: Pedido explícito do usuário (B9) + D6. Sem "não controlar", o sob demanda não tem como ser
cadastrado; e `0,018` kg é convite a errar uma ordem de grandeza.

> **As ACs 1–6 são de consumo.** Os inputs mascarados são entregues pela [`07`](../07-product-catalog-admin/spec.md)
> (T27, `AD-010`) em `shared/ui/inputs/`. Aqui elas descrevem o **comportamento observável no
> formulário** e são verificadas via os campos reais das abas Geral e Preços — não reimplementadas.

**Acceptance Criteria**:

1. WHEN o admin digita em um campo monetário THEN o valor SHALL ser exibido com prefixo `R$` em slot fixo e separadores pt-BR (milhar `.`, decimal `,`), com 2 casas.
2. WHEN o admin cola `R$ 1.234,56`, `1234,56` ou `1234.56` em um campo monetário THEN o valor interpretado SHALL ser `1234.56`.
3. WHEN o admin cola um texto sem número em campo monetário THEN o campo SHALL manter o valor anterior e SHALL não virar `NaN`.
4. WHEN o admin digita `18` no campo de peso THEN a UI SHALL exibir `18 g` e o valor persistido SHALL ser `0.018` kg, com a conversão visível na tela.
5. WHEN um produto existente tem `weight_kg = 0.018` THEN o campo SHALL abrir exibindo `18 g`.
6. WHEN o admin digita em um campo de dimensão THEN SHALL aceitar uma casa decimal com sufixo `cm`; em campo percentual, SHALL usar sufixo `%` sem decimal.
7. WHEN a política de estoque é escolhida THEN SHALL ser um controle segmentado de exatamente 3 modos mutuamente exclusivos — `Controlar estoque` · `Vender no negativo` · `Não controlar` — substituindo os switches atuais.
8. WHEN a política é `Não controlar` THEN a coluna **Estoque** da grade SHALL ficar desabilitada. *(A metade "a loja nunca marca esgotado" é `PST-08`, em [`07 / P1.2b AC 6`](../07-product-catalog-admin/spec.md).)*
9. WHEN a política é `Vender no negativo` THEN o formulário SHALL permitir saldo zero ou negativo na grade. *(A metade "a loja permite a compra" é `PST-08`, em [`07 / P1.2b AC 7`](../07-product-catalog-admin/spec.md).)*
10. WHEN o admin define alerta de estoque baixo THEN o limite SHALL ser avaliado **por variação** e a listagem SHALL sinalizar as linhas abaixo dele. *(A sinalização na listagem é consumida por `PLS-04`, na [`13`](../13-product-bulk-ops/spec.md).)*
11. WHEN o admin preenche o prazo de produção THEN o valor SHALL ser guardado em dias úteis e exibido na página do produto (sem entrar na cotação de frete — A6).

**Independent Test**: colar `R$ 1.234,56` no preço e `18` no peso, salvar, reabrir e conferir que o
banco tem `1234.56` e `0.018`; trocar a política para `Não controlar` e conferir que a coluna Estoque
some da grade.

---

### P1.7 — Integridade do formulário — validação, checklist e rascunho ⭐ MVP

**User Story**: Como admin, quero que o formulário me diga **onde** está o erro e não perca meu
trabalho num F5.

**Why P1**: Os defeitos 10, 11, 12 e 17 são inerentes à reescrita — se a página for reescrita sem eles,
a regressão nasce junto.

**Acceptance Criteria**:

1. WHEN o admin salva com um campo obrigatório inválido em uma aba **fechada** THEN o sistema SHALL bloquear o save e SHALL exibir o erro — SHALL não depender do `required` do input, que o `Tabs` do Radix desmonta junto com o conteúdo inativo.
2. WHEN há campos inválidos THEN cada aba com pendência SHALL exibir um badge com a contagem de erros daquela aba.
3. WHEN o admin clica no badge de uma aba THEN o sistema SHALL abrir a aba e focar o primeiro campo inválido.
4. WHEN `cost_price > 0` E `price = 0` THEN o card de margem SHALL não ser exibido — SHALL não renderizar `-Infinity` nem `NaN`.
5. WHEN `price > 0` E `cost_price > 0` THEN a margem SHALL ser `((price - cost) / price) * 100` com uma casa decimal, e o lucro por unidade SHALL ser `price - cost`.
6. WHEN o admin altera qualquer campo THEN o rascunho SHALL ser gravado em `sessionStorage` chaveado pelo produto e a tela SHALL exibir `Rascunho salvo automaticamente · há N s` ao lado das abas.
7. WHEN o admin reabre o formulário do mesmo produto com rascunho pendente THEN o sistema SHALL oferecer restaurá-lo.
8. WHEN o produto é salvo com sucesso THEN o rascunho daquele produto SHALL ser descartado.
9. WHEN o admin tenta sair (navegação interna ou fechar aba) com alterações não salvas THEN SHALL pedir confirmação.
10. WHEN há alterações não salvas THEN o cabeçalho fixo SHALL exibir o badge `Alterações não salvas`.
11. WHEN o cabeçalho é exibido THEN SHALL conter breadcrumb, nome do produto, badge de status e as ações `Descartar` · `Salvar rascunho` · `Salvar e publicar`, com `⌘S`/`Ctrl+S` acionando o save.
12. WHEN o inspetor é exibido THEN o checklist **Pronto para publicar** SHALL avaliar 6 itens — nome, ao menos uma categoria, ao menos uma imagem, peso preenchido, nenhuma variação ativa sem preço, SEO preenchido — cada um com atalho que leva ao campo.
13. WHEN algum item do checklist está pendente THEN *Salvar e publicar* SHALL ficar bloqueado, enquanto *Salvar rascunho* SHALL continuar disponível.

**Independent Test**: abrir o formulário, preencher só o nome na aba Geral, clicar em *Salvar e publicar*
sem nunca abrir a aba Preços — o save deve ser bloqueado com badge na aba Preços; alterar um campo,
dar F5 e conferir que o rascunho é oferecido.

---

## Edge Cases

- WHEN o admin reduz os eixos de 3 para 2 THEN as variações do cruzamento antigo SHALL aparecer no diff de **Regerar** como "a remover", e nenhuma SHALL sumir sem o admin confirmar.
- WHEN duas variações do mesmo produto recebem o mesmo SKU THEN o sistema SHALL bloquear o save apontando as duas linhas (`product_variants.sku` é `UNIQUE` global no banco hoje).
- WHEN a grade tem 3 eixos com muitos valores (ex.: 5 × 4 × 3 = 60 linhas) THEN a tabela SHALL permanecer utilizável (agrupada e virtualizada se necessário) e o save SHALL enviar as 60 linhas em uma operação.
- WHEN o preço "de" (riscado) é menor ou igual ao preço de venda THEN o sistema SHALL avisar, porque a vitrine mostraria um desconto negativo.
- WHEN o `sessionStorage` está cheio ou indisponível THEN o rascunho automático SHALL falhar em silêncio, sem quebrar o formulário.
- WHEN a categoria escolhida inline é criada mas o produto não chega a ser salvo THEN a categoria SHALL permanecer criada (é um objeto próprio) — o comportamento SHALL ser previsível, não um rollback surpresa.
- WHEN um produto tem variações mas **todas** estão pausadas THEN o checklist SHALL apontar a pendência antes de o admin publicar.

---

## Requirement Traceability

**Frente:** B = formulário. A coluna **Melhoria** referencia as 22 melhorias do artboard *Produtos —
sugestões de melhoria e mapa de código* (Paper).

| ID | Requisito | Story | Melhoria | Fase | Status |
| -- | --------- | ----- | -------- | ---- | ------ |
| PFM-01 | Abas de 6 → 5 (`Variações` deixa de existir) | P1.3 | 04 | 1 | Done |
| PFM-11 | Validação no submit com badge de pendência por aba | P1.7 | 10 | 1 | Done |
| PFM-12 | Margem só com `price > 0` | P1.7 | 11 | 1 | Done |
| PFM-13 | Rascunho automático em `sessionStorage` + guarda de saída | P1.7 | 12 | 1 | Done |
| PFM-14 | Checklist "Pronto para publicar" com 6 itens e atalhos | P1.7 | 17 | 1 | Done |
| PFM-16 | Cabeçalho fixo com status, pendências e `⌘S` | P1.7 | 12, 17 | 1 | Done |
| PFM-07 | Editor de opções, até 3 eixos genéricos, reordenáveis | P1.3 | 04 | 2 | Done |
| PFM-08 | Grade de variações com preço absoluto, grupos, ações em massa, regerar com diff e exclusão bloqueada para variação já vendida | P1.3 | 04 | 2 | Done |
| PFM-15 | Preço padrão + margem + aviso de precedência da grade | P1.3 | 04, 11 | 2 | Done |
| PFM-09 | Política de estoque em 3 modos | P1.6 | 05 | 2 | Done |
| PFM-05 | Categorias múltiplas com criar inline | P1.4 | 02 | 2 | Done |
| PFM-06 | Tags como tokens com autocomplete, dedupe tolerante e teto de 15 | P1.4 | 03 | 2 | Done |
| PFM-02 | Slug leitura em Geral, campo (URL personalizada) em SEO | P1.5 | 01 | 2 | Done |
| PFM-03 | Disponibilidade de slug com debounce, antes do save | P1.5 | 15 | 2 | Done |
| PFM-04 | Aviso + toggle de 301 para produto publicado | P1.5 | 22 | 2 | Done |

**Coverage:** 15 requisitos · 15 mapeados para tasks em [`tasks.md`](./tasks.md)

**Consumidos, não implementados aqui:** `PFM-10` (máscaras — entregue pela `07`), `PST-06` / `PST-07` /
`PST-08` (metades de loja — `07`), `PFM-17` (prévia da vitrine — `12`).

**Melhorias do Paper cobertas aqui:** 01 · 02 (metade admin) · 03 · 04 (editor e grade) · 05 (metade
admin) · 06 (uso) · 10 · 11 · 12 · 15 · 17 (metade formulário) · 22 (metade admin).

---

## Fases de entrega

| Fase | Conteúdo | Requisitos | Por que nesta ordem |
| ---- | -------- | ---------- | ------------------- |
| **1 — Esqueleto e integridade** | `useProductForm`, validação, checklist, rascunho, cabeçalho, 5 abas | PFM-01, PFM-11…PFM-14, PFM-16 | O estado sai da página **antes** de qualquer aba ser reescrita; a validação precisa de um lugar que não dependa de aba montada |
| **2 — Opções, grade, taxonomia e URL** | `OptionsEditor`, `VariantsTable`, política de estoque, categorias, tags, slug | PFM-07, PFM-08, PFM-15, PFM-09, PFM-05, PFM-06, PFM-02…PFM-04 | Cada aba entra verde sobre o esqueleto da fase 1, com o resto funcionando |

---

## Success Criteria

- [ ] O formulário abre com **5** abas e a aba `Variações` não existe.
- [ ] Um produto com eixos `Tamanho × Acabamento` é cadastrado com preço por linha, e o rodapé mostra a
      faixa correta ignorando as pausadas.
- [ ] *Salvar e publicar* com o preço vazio e a aba Preços **fechada** é bloqueado, com badge na aba e
      foco no campo — nenhum toast genérico.
- [ ] `price = 0` com `cost > 0` não renderiza margem (nada de `-Infinity`).
- [ ] Alterar um campo e dar F5 oferece restaurar o rascunho.
- [ ] Slug duplicado é detectado **enquanto se digita**, não no insert.
- [ ] `Naruto` com `naruto` existente gera aviso com as duas ações, sem substituir sozinho.
- [ ] Excluir variação já vendida é recusado, nomeando a contagem e oferecendo Pausar.
- [ ] `pnpm build`, `pnpm test` e o gate de lint continuam na baseline conhecida (28 err / 7 warn
      pré-existentes) — sem novos erros introduzidos.
