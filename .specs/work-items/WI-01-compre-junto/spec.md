# WI-01 · Compre Junto na página do produto

Costura de 2026-11-02. PRD r2 (r1 do PRD Tech Review mais o gate principal do mesmo dia; ver o Histórico de revisões do `prd.md`).

Registro do que se descobriu e decidiu nesta data — **não** descrição do estado atual do código.
Critérios de aceite: `prd.md`, ao lado. Convenção de cada repositório: o arquivo de instruções dele.

## Escopo

| UC | Título | Origem |
| -- | ------ | ------ |
| UC-01 | A dona monta as listas do Compre Junto | caso de uso do PRD |
| UC-02 | A dona monta o Compre Junto de um produto | caso de uso do PRD |
| UC-03 | A cliente vê e monta o conjunto na página do produto | caso de uso do PRD |
| UC-04 | A cliente leva o conjunto à sacola | caso de uso do PRD |
| UC-05 | A sacola e o pedido mostram o que foi comprado junto | caso de uso do PRD |
| UC-06 | A dona acompanha a adesão ao Compre Junto | caso de uso do PRD |
| UC-07 | O bloco se adapta à indisponibilidade | caso de uso do PRD |
| UC-08 | Medição | caso de uso do PRD |
| UC-09 | A dona escolhe a forma do bloco na loja | caso de uso do PRD, acrescentado pelo gate principal |

**Achados de eval que este Work Item resolve**

`nada` — o repositório não tem relatório de avaliação local (`.specs/evals/` não existe) e a condição do lookup não vale: o Work Item não vem de achado de avaliação.

**Anexos consultados**

| Insumo (caminho ou URL) | Tipo | O que se tirou | Alimenta |
| ----------------------- | ---- | -------------- | -------- |
| Claude Design, projeto "Uma Estrelinha - Backoffice" (`e3957c10-bd49-4f3d-9256-04d72a7d0f41`), `Compre Junto - Listas e adesão.html` e `Produto - Compre Junto.html` (casca; o comportamento está em `cj-admin-dados.jsx`, `cj-admin-comum.jsx`, `cj-admin-listas.jsx`, `cj-admin-produto.jsx`) | fonte de design | ver **Design › Painel** | UC-01, UC-02, UC-06, UC-09 |
| Claude Design, projeto "Uma Estrelinha - Loja" (`69224d8a-17ae-4b1f-a251-a8105b41edc2`), `Produto - Compre Junto.html` (comportamento em `cj-loja-dados.jsx`, `cj-loja-bloco.jsx`, `cj-loja.jsx`) | fonte de design | ver **Design › Loja** | UC-03, UC-04, UC-05, UC-07, UC-09 |
| `discovery.md` desta pasta | relatório da descoberta | diagnóstico de código (já serve / muda / não existe) e 14 perguntas decididas no gate da descoberta | todos |
| `prd-review.md` desta pasta | parecer do PRD Tech Review r1 | os findings e as Decisões `D-*` | todos |
| Work Items 92 e 93 (`.specs/work-items/92-*`, `93-*` no checkout principal) | fichas vizinhas | o que ficou fora: desconto (92) e combinar o acabamento (93); ambos reutilizarão a marca e as colunas de `order_items` | fronteira |
| Imagens | — | nenhuma informada | — |

## Fora do escopo

Verbatim do `prd.md` › Escopo › Fora:

- **Desconto da compra casada**: vai ao Work Item 92 ("Desconto da compra casada"). Decidido no gate da descoberta, para o 92: percentual por adicional, sobre o preço da peça adicional quando o principal está no mesmo pedido; segue `AD-015` (concorre por item com order bump e promoção progressiva — vence o menor preço —, concorre com o cupom pelo menor total, e o PIX incide depois); vale pela presença do principal e do adicional no mesmo pedido, decidida pelo servidor, nunca pela marca de origem.
- Compre junto no card da vitrine, na gaveta da sacola e no checkout (o bloco mora só na página do produto).
- O pedido montado pelo painel (feature 89).
- Recomendação automática ("quem comprou também levou").
- **Combinar o acabamento** (sugerir no adicional o mesmo acabamento do principal): vai a um Work Item próprio (93), decidido no PRD Tech Review r1. O catálogo guarda o acabamento em eixos e grafias diferentes, e as correntes são peças separadas por acabamento; a regra de "mesmo acabamento" é decisão de produto que ainda não existe.
- Aviso no painel quando o produto principal já tem a corrente como variação: fica por curadoria da dona, sem aviso.
- O order bump do checkout e o "Complete o frete grátis" seguem como estão, convivendo com o Compre Junto.

Fora por decisão de operação, não de produto: a **segunda migration** (`drop column buy_together_ids`) só é escrita depois do deploy do painel (D-buy-together-ids); o campo de desconto que o protótipo do painel desenha ("WI 92 · depois") não nasce aqui.

## Design

Fontes: as duas de `item.md` › Insumos (links do pedido), lidas pelo `wi-design-lookup` em 2026-11-02 via MCP `claude-design`. Não se leu `cj-admin.css` nem `cj-loja.css` (só aparência): **largura, quebra de linha, alvos de 44 px e rolagem em 390 não estão no design** e se resolvem pelo design system e pela prova em navegador.

### Loja — Página do produto com o bloco Compre Junto (UC-03, UC-04, UC-07)

- **Função:** a cliente monta o conjunto (principal mais até três adicionais) na coluna de informação e o leva por um botão único.
- **Esqueleto da coluna de informação, em ordem:** categoria e nome; preço da variação do principal; linhas do PIX e das parcelas; seletores de variação do principal; campo de gravação do principal (com "Com gravação = Sim"); **bloco Compre Junto**; linha de estoque; botão de compra (a partir de 1024 px, ao lado do seletor de quantidade); aviso de erro do botão; nota "A joia e N peças marcadas · total" (só no computador e só com conjunto); linha "Como enviar seu material de DNA" e o acordeão.
- **Bloco:** cabeçalho "Compre junto" e a frase de abertura (CA-03.14); uma linha por adicional (caixa de marcar, foto, nome — da lista ou do produto, sem título próprio —, resumo da escolha com partes separadas por "·", preço, link de abrir quando há escolha); painel de escolhas quando a linha está marcada ou aberta; rodapé de total, só com ao menos um adicional marcado.
- **Dados:** nome do adicional; foto (no tipo lista, da peça selecionada); preço da variação escolhida (nunca "a partir de"); resumo ("Levar junto: <nome>, <resumo>" é o nome acessível da caixa); rótulo "Escolha a corrente · N modelos" e link "Ver os N modelos"; opção esgotada desabilitada, peça sem combinação vendável omitida; total = principal × quantidade + adicionais marcados (1 cada); PIX = total × (1 − percentual do PIX), ao lado do total; contador do campo de gravação "n / limite" contando o texto aparado.
- **Campos:** caixa de marcar do adicional (checkbox, não); escolha da peça (grupo de rádio com cartões, obrigatória se marcado; a primeira já vem em foco, desmarcada); variação (obrigatória se a peça tem eixo; eixo com uma única opção vendável já nasce escolhido); gravação do adicional (opcional, limite por peça; excedeu: "Cabem até N caracteres nesta peça. Tire X para continuar."; dentro: "Opcional. Deixe em branco se preferir a peça sem gravação."); mensagens de falta: "Escolha a corrente." e "Escolha o <eixo> da <primeira palavra do nome da peça>."
- **Ações:** caixa "Levar junto: <nome>…" marca/desmarca; "Ver os N modelos" / "Ver opções" / "Esconder opções" expande sem marcar; cartão de peça troca a peça; botão único "Adicionar à sacola" / "Levar o conjunto" / "Esgotado" (valida; se faltar escolha, foca e rola até o primeiro adicional incompleto e não adiciona; se completo, adiciona principal e cada adicional como linhas próprias, adicional com quantidade 1, e abre a gaveta); desabilitado com principal esgotado, combinação indisponível ou gravação do principal acima do limite.
- **Estados:** nada marcado ao abrir (total oculto, botão "Adicionar à sacola"); carregando (`aria-busy`, altura mínima reservada de 320 px, esqueleto de título, linha e três cartões); leitura falhou (bloco some); nenhum disponível (bloco some); peça fora do ar (some só ela); peça sem combinação vendável (omitida); peça igual ao principal ou repetida em outro adicional (pulada); variação do principal "Chaveiro" (o adicional com `someCom` some e perde a marca; os outros mantêm a escolha); principal com combinação indisponível ("Essa combinação está indisponível no momento.", botão bloqueado, bloco visível); principal esgotado (bloco não renderiza, botão "Esgotado"); gravação do principal acima do limite ("A gravação passou do limite. Ajuste o texto para continuar."); tentativa com escolha faltando ("Falta uma escolha em 1 peça. Ela está marcada acima." / "… em N peças.").
- **Barra fixa do celular:** sem conjunto, preço do principal e "X no PIX"; com conjunto, total e "Conjunto · N peças" (CA-04.9); mesmo botão único, mesmo rótulo e mesma condição de bloqueio.
- **Gaveta da sacola:** cabeçalho "Sacola · N peça(s)"; cada linha com foto, nome, preço × quantidade, "Acompanha o <nomes>" (vários nomes juntados por vírgulas e "e") enquanto o principal estiver na sacola, chips das opções, `Gravação: “X”`, quantidade e "Remover"; rodapé com subtotal, "ou X no PIX · frete calculado no checkout", "Finalizar compra", "Continuar comprando"; vazia: "Sua sacola está vazia". A frase é recalculada na renderização: removido o principal, some das linhas adicionais; remover uma linha não remove as outras; a mesma peça (id, opções, gravação) soma a quantidade e acumula os principais.
- **Formas do bloco (UC-09):** A "Abre na linha" (marcar abre as escolhas); B "Folha" (celular) / diálogo (computador): cabeçalho com o nome do adicional, mesmo painel de escolhas, rodapé com a frase do que falta e "Incluir no conjunto" (desabilitado enquanto faltar escolha), foco inicial no título, Esc e clique fora fecham; C "Fórmula": faixa decorativa (`aria-hidden`) "Esta joia + <adicional> + …" acima da lista, cada adicional alternável nela.
- **Não mostra:** confirmação do pedido, Minha Conta e painel (CA-05.2); adicional que exige material; recusa de gravação vinda do servidor; GA4; rolagem horizontal, alvos de 44 px e fonte a 200 %; `prefers-reduced-motion`.

### Painel — Compre Junto, Listas (UC-01)

- **Índice** (`Catálogo › Compre Junto`): cabeçalho com título, subtítulo e "Nova lista"; abas "Listas" (com contagem) e "Adesão". Desktop: tabela com Lista, Peças, Em uso em, Atualizada, Editar; celular: cartões equivalentes (cada um abre a lista). Dados: nome (máx. 40); aviso "N peça(s) saiu/saíram do ar"; fotos em pilha (4 no desktop, 3 no cartão); "N de 12" / "N peça(s)"; "N joia(s)" ou "Nenhuma joia"; "Atualizada" relativa (só desktop). Vazio: "Uma lista junta as peças que você oferece junto com outras joias — por exemplo, as correntes. Monte uma vez e use em quantas joias quiser." mais "Nova lista". Carregando e erro: não desenhados.
- **Editor de lista:** migalha; título = nome; subtítulo "A ordem daqui é a ordem em que a cliente vê as peças, em todas as joias que usam esta lista."; "Excluir lista"; faixa de recusa; cartão "Lista" (nome, máx. 40, contador "n / 40", sem mensagem junto do campo além da barra) e cartão "Peças da lista" (busca de produto de 2 caracteres, até 8 resultados, sem acento, resultado desabilitado com motivo "Já está na lista" / "Fora do ar"; lista numerada com posição, foto, nome, "a partir de R$ X"; variações liberadas por peça: "todas as ativas (N)" ou "k de N", marcadores com foto, nenhuma marcada = todas as ativas, "inclusive as que você criar depois"); lateral "Em uso" ("N joia(s) oferece(m) esta lista", até 4 nomes, "Ver as N joias" acima de 4) e "Como a cliente vê"; barra de salvar ("Dê um nome à lista para salvar." / "Alterações não salvas" / "Tudo salvo"; "Salvar lista", "Voltar").
- **Ações por peça:** Subir/Descer (desabilitados na primeira/última), Tirar, arrastar pela alça (só mouse; os botões cobrem teclado e toque), "Escolher quais / Esconder / Oferecer todas".
- **Recusas escritas:** 13ª peça — "Uma lista leva até 12 peças. Tire uma para acrescentar outra, ou crie uma segunda lista."; excluir lista em uso — "Esta lista está em uso em N joia(s) (nomes, até 3, e " e outras" se N > 3). Tire-a delas antes de excluir." (a exclusão não acontece).
- **Estados:** lista nova ("Nova lista", sem peças); sem peças ("Nenhuma peça ainda. A lista só pode ser usada numa joia depois de ter pelo menos uma."; o Salvar só exige nome); peça fora do ar (linha marcada: "Esta peça saiu do ar. A loja a pula em todas as joias até ela voltar; tire-a da lista se não for voltar.", sem marcadores de variação); salvando ("Salvando…"). Toasts: "Lista salva.", "Lista “X” excluída.". Não há confirmação ao sair com alteração não salva nem ao excluir/tirar.
- **Não mostra:** carregando e erro de leitura/gravação; destino dos links "Em uso" e "Ver as N joias"; variante mobile do editor (só o índice e a adesão têm `cards-mob`).

### Painel — aba "Compre junto" do produto (UC-02)

- **Esqueleto:** migalha "Produtos › <nome>"; cabeçalho com foto, nome, selo "Ativo", subtítulo "R$ 189,00 · Tipo de elo: …", "Ver na loja"; aba "Compre junto" (marca "novo") ao lado de Geral, Perguntas, Preços & variações, SEO, Relacionados; faixa de conversão (opcional); coluna principal: cartão com "n de 3 adicionais", texto de apoio, lista numerada de adicionais, "Acrescentar um adicional" e a recusa; lateral "Na loja" e "Quando a peça sai do ar"; barra de salvar.
- **Cada adicional:** número, nome como a loja mostra ("Adicional N" enquanto nada foi escolhido), Subir/Descer/Tirar; alternador "O que a cliente escolhe": "Uma peça de uma lista" (padrão ao acrescentar) ou "Uma peça só"; tipo lista: rádio entre as listas (fotos até 3, nome, "N peça(s) · em uso em N joia(s)" ou "em nenhuma joia"; "Lista sem peças" desabilitada), com "Editar a lista “X”" e "Criar uma lista nova"; tipo produto: busca de produto (mín. 2 caracteres, até 8 resultados; resultado desabilitado com "É esta joia", "Já está em outro adicional", "Fora do ar") ou a peça escolhida com "Trocar" (desfaz a escolha e zera as variações) e as variações oferecidas; "Some quando a cliente escolhe": marcadores das variações do principal (com seleção: "Com X ou Y escolhido nesta joia, este adicional sai do bloco."; sem: "Nenhuma marcada: o adicional aparece em todas as variações desta joia. Marque, por exemplo, Chaveiro numa oferta de corrente.").
- **Recusas e avisos:** 4ª tentativa — "Cada joia leva até 3 adicionais. Tire um para acrescentar outro." (some ao tirar um); adicional incompleto — a barra diz "1 adicional está sem lista ou peça." (ou "N adicionais estão sem lista ou peça.") e o Salvar fica desabilitado; lista que contém o principal — "Esta joia está na lista e é pulada aqui: ela nunca é oferecida junto de si mesma."; sem adicionais — "Sem Compre Junto. A página desta joia fica como hoje, sem o bloco."; convertido do antigo — faixa "O Compre Junto antigo desta joia foi trazido para cá: as 2 peças viraram adicionais de uma peça só. Confira as variações oferecidas e salve." (os convertidos vêm como tipo produto, sem variações marcadas, sem "some com"); lateral "Quando a peça sai do ar": a loja pula o adicional sem quebrar a página, o painel o marca, e se todas as variações escolhidas deixarem de existir ele também sai, nunca passa a oferecer todas. Toast "Compre Junto salvo.".
- **Não mostra:** o selo "saiu do ar" em adicional de produto na aba (só aparece no editor de lista e no índice; CA-02.7 exige — a tarefa o desenha pelo design system); estados de carregando e de erro; destino dos links "Editar a lista" e "Criar uma lista nova" e o que fazem com alterações não salvas do produto; o campo "Desconto ao levar junto" do protótipo ("WI 92 · depois") **não** entra.

### Painel — Adesão (UC-06)

- **Esqueleto:** seletor de período (7/30/90 dias, padrão 30); três indicadores; nota da regra; cartão "Por joia principal" / "Por lista" com alternador; tabela no desktop, cartões no celular, com barra proporcional de valor.
- **Dados:** "Pedidos com Compre Junto" ("X% dos N pedidos pagos"); "Peças levadas junto" ("n,n por pedido, em média"); "Valor das peças levadas junto" ("pelo preço pago em cada peça"); nota "Conta pedidos pagos e não cancelados, no dia de Brasília — a mesma régua do Dashboard. Uma peça conta quando entrou na sacola pelo Compre Junto e a joia dela está no mesmo pedido."; por joia: joia principal, Pedidos, Peças, Valor com barra, "Peça que mais sai"; por lista: Lista, Peças, Valor com barra, "Peça que mais sai" (sem coluna Pedidos), com a variação ("Corrente Veneziana em Prata 925 · 45 cm"); linha "Peça escolhida direto no produto" no recorte por lista.
- **Estados:** lista sem venda no período aparece com 0 peças e R$ 0,00, peça que mais sai "—". Não desenhados: vazio (decidido: texto escrito, CA-06.4), carregando, erro, divisão por 0 pedidos.

### Painel — forma do bloco (UC-09)

Não está desenhada em nenhuma das duas fontes: a escolha entre as três formas no menu Compre Junto é pedido do humano no gate principal. O lugar (a tela de Listas/Adesão do menu, ou um cartão próprio) e o desenho do controle ficam para a tarefa, pelo design system do painel.

Divergências entre fontes e o PRD (a resolução está ao lado):

| Divergência | O que valeu | Quem decidiu |
| ----------- | ----------- | ------------ |
| Três formas do bloco (A/B/C) × PRD sem forma | A é o padrão; as três são construídas e a dona escolhe (UC-09) | humano, gate principal · `forma-do-bloco` |
| Título e frase do bloco só no protótipo | ratificados (CA-03.14) | humano, gate principal · `texto-do-bloco` |
| "Acompanha o <nome curto>" no protótipo × `products.name` | nome completo, sem campo novo (CA-05.1) | humano, gate principal · `nome-do-principal-na-frase` |
| Barra fixa sem PIX com conjunto | como o protótipo (CA-04.9) | humano, gate principal · `barra-fixa-com-conjunto` |
| Seletor de quantidade só a partir de 1024 px | mantido (CA-03.15) | humano, gate principal · `quantidade-do-principal-no-celular` |
| Relatório: períodos fixos, indicadores extras, linha "direto no produto", "peça que mais sai" × PRD "período escolhido" | como o protótipo, mais o estado vazio escrito (CA-06.4) | humano, gate principal · `relatorio-recortes` |
| Nome da lista até 40, lista vazia salvável × PRD sem limite | como o protótipo (CA-01.1) | humano, gate principal · `lista-nome-e-lista-vazia` |
| Teto de 12 peças por lista no protótipo; PRD sem número | 12 (D-teto-de-pecas-por-lista) | humano, gate do PRD Tech Review · `teto-de-pecas-por-lista` |
| Campo de desconto no protótipo do painel | fora (WI 92) | PRD › Fora |
| Selo "saiu do ar" em adicional de produto ausente no desenho | CA-02.7 vale; a tarefa o desenha | a conferência de cobertura |
| O protótipo já está alinhado ao PRD r1 (botão único, sem título próprio, `someCom`, sem acabamento) — o briefing supunha uma versão anterior | o lido vale; não há divergência a resolver nesses pontos | o lookup |

## Código — /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01

Lookup de 2026-11-02, mais o `discovery.md` (confirmado por amostragem). Caminhos relativos à raiz do repositório.

- **Instruções** — `CLAUDE.md` › O "defeito 01", › Os guardas, › Convenções, › Baselines, › CI e deploy, › Feature-Sliced Design; `apps/store/CLAUDE.md` › Página do produto, › A home não salta, › Material afetivo e Gaveta de material, › Carrinho, chrome e checkout; `apps/backoffice/CLAUDE.md` › O fornecedor da peça, › `/admin/perguntas`, › O editor de Produtos em destaque, › A busca de produto, › O movimento do painel; `packages/core/CLAUDE.md` › Quando um código pertence ao pacote, › Pureza, › Os módulos; `supabase/CLAUDE.md` › Migrations, › RLS, › `checkout`.
- **Recorte** — todos os UC-01..UC-09.

**O que já serve**

| O que | Onde | Cobre |
| ----- | ---- | ----- |
| Estado de compra do principal (variação, preço, `canAdd`, recusa de gravação, `add()`, gaveta) | `apps/store/src/entities/product/model/useProductPurchase.tsx:67-178` (gravação 84-99, `canAdd` 102-105, `add` 116-157) | CA-03.3, CA-04.2, CA-04.3 |
| Campo de gravação com id fixo | `apps/store/src/entities/product/ui/EngravingField.tsx:8,21-79` (`ENGRAVING_FIELD_ID`) | CA-03.10 (precisa parâmetro) |
| Seletor de variações da loja, `surface="page"`; `canAddSelection`, `findVariant`, `initialSelection`, `hasSellableGrid` | `entities/product/ui/VariantPicker.tsx`; `entities/product/lib/variantSelection.ts` | CA-03.3, CA-03.6, CA-03.8 |
| Busca de produtos por id numa consulta, ordem da dona, falha sobe como erro; `PRODUCT_CARD_SELECT` já traz variações, `options`, `stock_policy`, `engraving_max_chars`, `requires_material` | `entities/product/api/useProductsByIds.ts:24-51`; `entities/product/lib/mapProduct.ts:106-143` | RNF-02, CA-07.3 |
| Carrinho: identidade da linha (`itemKey`), `addItem`, `version: 3` + `migrate` | `entities/cart/model/cartStore.ts:85-134`, `169-190` | CA-04.1, CA-04.7 |
| Linha da sacola (molde da frase) | `widgets/cart-drawer/ui/CartDrawerRow.tsx:34-115` | CA-05.1 |
| Itens do pedido por coluna explícita | `features/checkout/lib/buildOrderPayload.ts:63-125` (`buildOrderItems`, item do bump 95-125) | CA-04.1, CA-04.5 |
| `create-order`: colunas de `orders` por lista explícita (`COLUNAS_DO_PEDIDO`) | `supabase/functions/checkout/handlers.ts:202-229`, 412-415 | molde de `COLUNAS_DO_ITEM` |
| Fila de material por qualquer item | `packages/core/src/material/material.ts:251-254` (`initialMaterialStatus`) | CA-04.5 |
| `pixPrice(amount, percent)` e o guarda `displayedEqualsCharged` | `packages/core/src/payment/pix.ts:31-35`; `payment/__tests__/displayedEqualsCharged.test.ts` | CA-03.5, RNF-04 |
| Eventos GA4 e `useTrackList` | `packages/core/src/analytics/events.ts:73-102`; `apps/store/src/shared/lib/analytics/useTrackList.ts:19-46`, `items.ts:26-57` | CA-08.1 |
| Busca de produto do painel (`modo: 'multiplo'`, `excluir`, `selecionados` desabilitados com motivo) | `apps/backoffice/src/entities/product/ui/ProductSearchField.tsx:38-90`; `features/product-form/ui/RelatedProductsSelect.tsx:35-48` | CA-01, CA-02.1, CA-02.5 |
| Variações de uma peça por id, só ativas | `apps/backoffice/src/entities/product/api/useProductVariants.ts:30-60` (`VariacaoDaPeca`) | base do "quais variações valem" |
| Recusa com motivo e teto | `packages/core/src/home/featured.ts:22,46-88` | CA-02.1, D-teto |
| Gravar relação depois do produto, sem transação, upsert antes de apagar | `features/product-form/model/persistSupplier.ts:90`; `persistProduct.ts:200` (`persistProductRelations`); chamada em `AdminProductFormPage.tsx:449-493` | CA-02.6 |
| Régua de venda e relógio de Brasília | `supabase/migrations/20261104130000_presenca-leitura.sql:40,109-110`; `20261021120000_71-visitas-unicas.sql:25,42,51` | CA-06.3 |
| `order_items` por colunas explícitas no pedido montado | `supabase/migrations/20261103120000_89-pedido-montado.sql:506` | colunas novas nulas não quebram |

**O que muda**

| O que | Onde | Mudança |
| ----- | ---- | ------- |
| `products.buy_together_ids uuid[]` e o card "Compre junto" | `supabase/migrations/20260726000000_products_extended_fields.sql:58`; `packages/supabase/src/types/index.ts:262`; `apps/backoffice/src/entities/product/api/useAdminProducts.ts:56`; `features/product-form/model/useProductForm.ts:93,200,272`; `pages/admin/AdminProductFormPage.tsx:208-210,399,1052-1054`; fixtures `useProductForm.test.ts:49` e `apps/store/src/entities/product/lib/__tests__/cardSelect.test.ts:57` (nenhuma tela da loja lê a coluna) | Conversão idempotente na migration (até 3 pela ordem do array, descartando ids que não existem); painel sem a coluna; só depois `drop column` em outra migration. Se o painel mandar a coluna depois do drop, `PGRST204` |
| Formulário do produto | `AdminProductFormPage.tsx:1047-1055`; `useProductForm.ts:144,155,213,404-412`; `AdminProductFormPage.tsx:501-509` (`markSaved`) | Trocar o card por editor de adicionais; carga, snapshot e gravação depois do produto |
| `ProductPage` | `apps/store/src/pages/ProductPage.tsx:239-343` (`purchase` 194; `ProductInfo` 316-320; acordeão 324-326; `ProductBuyBar` 332; `useProductFaqs` 206 como molde de leitura à parte) | O conjunto sobe ao mesmo pai e vai a `ProductInfo` e `ProductBuyBar` |
| `ProductInfo` | `entities/product/ui/ProductInfo.tsx:134-152` (variação), 154-163 (`EngravingField`), 176-183 (estoque, `MaterialSendTrigger`), 185-239 (CTA, 214-222) | Bloco entre a variação e o botão; o CTA rotula e aciona o conjunto. Já importa `features/share-product` e `features/shipping-calc` (duas violações FSD em `warn`): o bloco mora em `entities/product/ui` ou entra por prop/slot |
| `ProductBuyBar` | `widgets/product-buy-bar/ui/ProductBuyBar.tsx:67-96,127-145,149-179` (`aoTocar` 89 só enxerga `ENGRAVING_FIELD_ID`) | Conhecer `canAdd` e as recusas do conjunto; total e "Conjunto · N peças"; testes: `ProductBuyBar.test.tsx`, `…Material.test.tsx`, `…Reveal.test.tsx` |
| `useProductPurchase.add` | `useProductPurchase.tsx:143-150` | Laço por unidade só no principal; adicionais com quantidade 1; evento único fora do laço |
| `cartStore` | `cartStore.ts:17-47`, `51-71`, `170` (`version: 3`), `179-190` (`migrate`) | `version: 4` preservando; marca opcional (principal e lista) fora do `itemKey`; `addItems`; fixture `pages/__tests__/ProposalCheckoutPage.test.tsx:120` (`version: 3` literal) continua migrando |
| `CartDrawerRow` | `CartDrawerRow.tsx:34-115` (gravação em 105-115) | Frase "acompanha" derivada na renderização |
| `buildOrderItems` / `create-order` | `buildOrderPayload.ts:63-125`; `supabase/functions/checkout/handlers.ts:328,432-435` (`{ ...item, order_id }`) | Marca no payload; `insert` por lista explícita com **todas** as chaves de hoje (`product_id`, `product_name`, `product_image`, `size`, `finish`, `quantity`, `unit_price`, `variant_id`, `price_source`, `variant_label`, `variant_options`, `requires_material`, `material_kinds`, `engraving_text`) — esquecer uma é descarte silencioso e `mercado-pago/handlers.ts:430-431` lê `price_source`; descartar a marca cujo principal não está no pedido |
| `OrderItemsSummary`, `itemDetailLine`, `OrderSummaryItem` | `apps/store/src/entities/order/ui/OrderItemsSummary.tsx:52-82`; `lib/itemDetailLine.ts:4-27` | Frase no pedido (confirmação `/pedido/:id`); o nome do principal sai de outra linha do mesmo pedido, casando por `product_id`. Os selects `order_items(*)` (`useOrder.ts:94`, `useOrders.ts:56,71`, `checkout/handlers.ts:610`) já trazem a coluna nova. Minha Conta só mostra foto e contagem (`widgets/order-list/ui/OrderList.tsx:62,96`) |
| Item do pedido no painel | `apps/backoffice/src/pages/admin/AdminOrderPage.tsx:483-550`; `useAdminOrder.ts:190` (`select('*')`) | Linha de texto. A folha de separação (`pickSlip.ts`) fica fora (F9) |
| Tipos do banco | `packages/supabase/src/types/index.ts:262` (`DbProduct`), `492-518` (`DbOrderItem`), `715` (`OrderItem`) | Tipos novos; provar por probe HTTP (`AD-012`) |
| GA4 | `core/analytics/events.ts:110-112` (`addToCartEvent`, um item); `items.ts:28,46,80` | `add_to_cart` com vários itens e `item_list_id` nos adicionais; `denoReach.test.ts` entra no gate (`purchase.ts` é lido pelo Deno) |
| Rotas e navegação do painel | `apps/backoffice/src/app/App.tsx:56-149`; `widgets/admin-layout/model/navItems.ts:59-118` (Catálogo 82-96) | Duas `<Route>` auto-fechadas dentro do bloco do `RequireAdmin` (sem aninhar); dois itens em `navGroups`; `navItems.test.ts`, `rotasSobGuarda`, `focusRoutes` |

**O que nasce**

| O que | Onde | Por que nada existente serve |
| ----- | ---- | ---------------------------- |
| Tabelas: listas; peças da lista (posição, variações liberadas); adicionais por produto (posição 0..2, tipo produto/lista, alvo, variações do principal em que some) | `supabase/migrations/` (prefixo livre na hora; a chave do `schema_migrations` é o prefixo numérico) | `product_faqs`/`featured` não têm tipo nem variações liberadas |
| View de uso da lista (`security_invoker`) que nomeia os produtos | mesma migration | `faq_usage` só conta; CA-01.7 exige nomear |
| Colunas em `order_items`: principal (texto, porque `order_items.product_id` é `text`) e lista | migration da tarefa do pedido | molde `20260811120000_22-material-afetivo.sql:98-104` |
| RPC admin do relatório | migration da tarefa do relatório | molde `presenca-leitura.sql:40`; entra em `RPCS` de `marcacaoSoPorAcao.test.ts:157-207` |
| `packages/core/src/buy-together/*` e a entrada `./buy-together` em `packages/core/package.json` (molde `./suppliers`, linha 41) e a linha na tabela de `packages/core/CLAUDE.md:36-61` | core | duas leituras (loja decide, painel avisa) e uma terceira no Deno (`checkout` descarta a marca): é o "defeito 01" |
| Tela de Listas | `apps/backoffice/src/pages/admin/…`, `features/buy-together-lists/*` | nada edita lista nomeada de peças com variações por peça |
| Checklist multi-seleção de variações (painel) | `apps/backoffice/src/entities/product/ui` | o `VariantPicker` do painel é rádio de uma escolha (`role="radio"`) |
| "Mover para cima/baixo" | no editor novo | não existe no editor de Destaques; molde em `store-menu/ui/MenuTree.tsx:380,388,475,485`, `product-form/ui/OptionsEditor.tsx:397,408` |
| Bloco do Compre Junto e estado de compra por adicional | `apps/store/src/entities/product/{ui,model,lib}` | `useProductPurchase` é amarrado a um produto |
| `addItems` no carrinho | `cartStore` | só existe `addItem` unitário |
| Página do relatório e hook | `apps/backoffice` | nenhuma tela lê `order_items` por origem |
| Configuração da forma do bloco | `store_settings` (chave própria) e `core/buy-together` (valor padrão e normalização) | UC-09 |
| Guardas | `apps/store/src/shared/lib/__tests__/`; `packages/core/…/__tests__` | `compreJuntoSchema.test.ts` (molde `fornecedorSchema`), dono único da regra e da marca, pureza e alcance do Deno de `core/buy-together`, e um guarda que cruze as chaves de `buildOrderItems` com `COLUNAS_DO_ITEM` |
| AD novo | `.specs/STATE.md` | D-listas-x-ad-014 (lista ≠ coleção); o número livre se apura na hora (o `CLAUDE.md` raiz cita `AD-071` como último) |

**Exemplares**

| Tipo | Siga a forma de |
| ---- | --------------- |
| Migration de conteúdo com leitura pública e escrita do painel | `supabase/migrations/20260816120000_28-perguntas-frequentes.sql` (tabelas 60-82, view 107-114, RLS 154-194) |
| Tabela só do painel | `20261022150000_80-fornecedor-da-peca.sql` (46-62) |
| Guarda de schema (uma régua por comando, `mutar()` que lança, âncora) | `apps/store/src/shared/lib/__tests__/fornecedorSchema.test.ts` (24, 28-70) e `faqSchema.test.ts` |
| Snapshot em `order_items` | `20260811120000_22-material-afetivo.sql:91-104` |
| Pedido com colunas explícitas | `checkout/handlers.ts:202-229`; `20261103120000_89-pedido-montado.sql:506` |
| RPC admin de leitura com período | `20261104130000_presenca-leitura.sql:18,40,109-110`; `20261023120000_73-resumo-do-atelie.sql:29`; guardas `overviewSchema.test.ts`, `visitasSchema.test.ts` |
| Módulo `core` puro com recusas e teto | `packages/core/src/home/featured.ts`; pureza `core/proposals/__tests__/purity.test.ts`; Deno `core/checkout/__tests__/denoReach.test.ts` |
| Editor ordenável de peças | `apps/backoffice/src/features/home-composition/ui/FeaturedProductsEditor.tsx` (62-74, órfã 222) |
| Biblioteca com "em N produtos" e apagar recusado | `AdminFaqsPage.tsx`, `features/faq-library/*` |
| Estado de compra de um produto; recusa da grade sem variação | `useProductPurchase.tsx`; `widgets/cart-drawer/ui/CrossSell.tsx:18-24,78-100` |
| Leitura à parte, passada por prop | `ProductPage.tsx:206` (`useProductFaqs`), `entities/product/api/useProductFaqs.ts:26` |
| Marca no carrinho com `migrate` | `cartStore.ts:179-190` (v2→v3) |
| GA4 de lista | `useTrackList.ts`, `widgets/related-products/ui/RelatedProducts.tsx:9,29`, `ProductCard.tsx:260` |

**Obrigações transversais**

- Migration só no banco local (`supabase migration up --local`); push em `master` aplica em produção — perguntar antes de qualquer push com migration nova. A contagem de `buy_together_ids` em produção é conferida pelo usuário antes do deploy. Migration aplicada é imutável (`AD-017`).
- RLS: nada de `grant` a `anon`; policy de escrita com `has_role` no `using` e no `with check`; contagem é VIEW `security_invoker`; vínculo produto→lista `on delete restrict` (`supabase/CLAUDE.md` › RLS).
- Conversão idempotente (`not exists`/`on conflict do nothing`), sem escrita de dado fora do backfill declarado.
- `packages/core/src/payment/**` com zero linha alterada, `shoppingParity.test.ts` sem uma linha, feed sem mudança (RNF-03).
- Tipo escrito à mão é afirmação (`AD-012`): provar por probe HTTP contra `:54441`.
- `strictNullChecks: false`: recusas devolvem `string | null`.
- Todo import relativo em `core/buy-together` com `.ts` explícito, `import type` incluso (o `checkout` o importa por caminho no Deno); não descrever a forma proibida em comentário.
- Mobile primeiro: prova em 390×844, 130 % e 200 % de fonte; `minmax(0, …)` no mobile; `TAP_44`/`TAP_ROW`; sem rolagem horizontal.
- Tom memorial: sem urgência, contagem, escassez, prova social nem emoji (`copyInstitucional.test.tsx`, `semMaterialNaPaginaDoProduto.test.ts`).
- FSD: camada estritamente abaixo; o bloco não importa widget por baixo.
- Movimento com par `motion-reduce:` (`animacaoRespeitaMovimento.test.ts`, escopo literal: incluir os arquivos novos).
- Medição: `--testTimeout=20000` sem o `--`, um workspace por vez, exit fora de pipe, e a suíte da loja junto quando o painel muda.

**Testes** (comportamento e nível)

- Unidade em `core/buy-together`: teto de 3 adicionais e de 12 peças com motivo; disponibilidade (produto inativo/apagado, variação esgotada, peça sem variação vendável, variações liberadas que deixaram de existir nunca viram "todas"; numa lista só a peça indisponível some); numa lista, o principal e a peça de outro adicional são pulados só naquele produto; adicional que some para a variação do principal; total = principal × quantidade + adicionais × 1 e PIX = `pixPrice` do total; frase "acompanha o X e o Y"; descarte da marca sem principal; normalização da forma do bloco.
- Loja, página real: nada marcado ao abrir; botão único leva só o principal ou o conjunto; barra fixa e CTA do computador levam o mesmo; adicional com grade sem variação não entra e diz qual falta; gravação recusada de qualquer peça aborta tudo; principal indisponível bloqueia o botão com o bloco visível; esgotado esconde o bloco; leitura falha deixa a página de pé; peça já na sacola soma e vira "acompanha o X e o Y"; remover o principal tira a frase; sacola v3 abre intacta; frase na gaveta, no `/pedido/:id` e no painel; `add_to_cart` com todos os itens, principal uma vez; esqueleto sem salto; em 390 sem rolagem horizontal e alvos ≥ 44 px (prova em navegador); as três formas.
- Painel: recusa da 4ª adicional e da 13ª peça; principal não escolhível; ordem e mover; peça e adicional "saiu do ar"; variações liberadas; gravar um produto não altera outro; falha no meio não deixa o produto sem nenhum; apagar lista em uso recusado pelo banco e pela tela com os produtos nomeados; relatório só pago e não cancelado, por principal e por lista, editar a lista não muda o histórico; o setting da forma grava e relê.
- Banco local (probe `psql`/HTTP em `:54442`/`:54441`, molde `.specs/features/*/probes`): RLS (anônimo lê o que a loja vê e não escreve; escrita só com `has_role`); `on delete restrict`; `check`s de posição e tipo; conversão de `buy_together_ids` (até 3, ordem, idempotente, ids inexistentes descartados); RPC do relatório (`42501` sem papel, régua de venda, dia de Brasília); embed com FK nomeada responde 200 e não `300`.

**Depende / Expõe** — monorepo: o contrato é entre camadas.

| Direção | Dado | Formato | Momento |
| ------- | ---- | ------- | ------- |
| banco expõe | listas, peças, adicionais; leitura pública | tabelas novas; `select` público, escrita `has_role` | página do produto, painel |
| banco expõe | uso da lista com os produtos | view `security_invoker` | apagar lista, "em N produtos" |
| banco expõe | colunas de `order_items` (principal, lista) | texto/uuid nulos | gravação do pedido, relatório, confirmação |
| banco expõe | relatório de adesão | RPC admin, dias de Brasília | página do relatório |
| core expõe | `core/buy-together` | funções puras, `.ts` explícito | loja, painel, `checkout` (Deno) |
| loja → banco | adicionais do produto e produtos/variações | embed com FK **nomeada** (a tabela terá duas FKs para `products`; sem nome, `300 PGRST201`) ou hook à parte | abertura da página |
| loja → `checkout` | itens com a marca | `items[]` de `create-order` | fechar o pedido |
| `checkout` expõe | `order_items` só com colunas permitidas; marca descartada sem principal | lista explícita de colunas | gravar o pedido |
| `mercado-pago` | preço recalculado do banco, não da marca | colunas `id, product_id, quantity, unit_price, variant_id, price_source` | `create-payment` (sem mudança; confirmar) |
| painel → banco | listas, adicionais, relatório | PostgREST + RPC | salvar produto, telas |

## Fronteira entre repositórios

`nada` — repositório único (monorepo); a conferência de fronteira está em `não` no `PROJECT.md`. As camadas se casam na tabela acima.

| Depende (repo) | Expõe (repo) | Como casou |
| -------------- | ------------ | ---------- |
| — | — | — |

## Cobertura dos UCs

Todo UC tem dono; a numeração de tarefas só vem no fatiamento. Reivindicações do lookup:

| UC | Reivindicado por |
| -- | ---------------- |
| UC-01 | `supabase`, `packages/core`, `apps/backoffice` |
| UC-02 | `supabase` (conversão), `apps/backoffice` |
| UC-03 | `apps/store`, `packages/core` |
| UC-04 | `apps/store`, `packages/core` (GA4) |
| UC-05 | `apps/store`, `supabase/functions/checkout`, `supabase`, `apps/backoffice` |
| UC-06 | `supabase`, `apps/backoffice` |
| UC-07 | `packages/core`, `apps/store` |
| UC-08 | `packages/core`, `apps/store` |
| UC-09 | `apps/backoffice`, `apps/store` |

Conferências (ditas, limpas ou não): **UC × design** — UC-01..UC-04, UC-06, UC-07 têm tela; sem desenho: a frase "acompanha" no pedido (CA-05.2), o selo "saiu do ar" de adicional de produto (CA-02.7), o adicional com material (CA-03.10/03.13), os estados de carregando e erro do painel e a forma do bloco no painel (UC-09); nada disso trava, as tarefas resolvem pelo design system. **UC × código** — todos tocam o repositório; nenhum UC órfão. **Fronteira** — não se aplica.

## Decisões

Respostas do humano verbatim; `D-*` são os `tech` e `tech_prd_edit` do gate do PRD Tech Review r1 (`prd-review.md` › Decisões).

| # | A pergunta | A resposta | Quem decidiu |
| - | ---------- | ---------- | ------------ |
| 1 | `forma-do-bloco` — como o bloco abre as escolhas | escolha "A — abre na linha, sem a faixa de fórmula"; ressalva verbatim: "Adicionar no menu Compre Junto a opção do usuário admin configurar como ele quer que aparece na Loja. Adicione esses 3 modos". Aplicação: A é o padrão; as três formas são construídas; a dona escolhe no menu Compre Junto (UC-09). A ressalva estende a escolha; não a nega. **Premissa:** uma configuração só, para a loja inteira (a ressalva não fala de por produto) | o humano no gate principal |
| 2 | `texto-do-bloco` | "Ratificar os três textos do protótipo como estão" → CA-03.14 | o humano no gate principal |
| 3 | `nome-do-principal-na-frase` | "Nome completo do produto (`products.name`), quebrando linha se preciso; sem campo novo" → CA-05.1 | o humano no gate principal |
| 4 | `barra-fixa-com-conjunto` | "Como no protótipo: total + "Conjunto · N peças", PIX só no bloco" → CA-04.9 | o humano no gate principal |
| 5 | `quantidade-do-principal-no-celular` | "Manter como o protótipo e como a página de hoje: sem seletor no celular, ajusta-se na sacola" → CA-03.15 | o humano no gate principal |
| 6 | `relatorio-recortes` | "Como no protótipo (7/30/90, indicadores extras, linha "direto no produto"), mais um estado vazio escrito por nós" → CA-06.4 | o humano no gate principal |
| 7 | `pecas-do-relatorio-por-unidade-ou-linha` | "Somar a quantidade da linha marcada (simples; pode contar a unidade avulsa nesse caso raro)" → CA-06.5 | o humano no gate principal |
| 8 | `lista-nome-e-lista-vazia` | "Ratificar o protótipo: nome até 40 caracteres, lista vazia salvável mas inutilizável num adicional" → CA-01.1 | o humano no gate principal |
| 9 | `leitura-publica-ativo` | "Seguir o precedente (leitura pública sem condição; produto inativo é filtrado pela RLS de `products`) e emendar RNF-07 para dizer isso" → RNF-07 emendado | o humano no gate principal |
| 10 | `teto-de-pecas-por-lista` | **D-teto-de-pecas-por-lista** — no máximo 12 peças por lista; a 13ª é recusada no painel com o motivo, sugerindo uma segunda lista (molde `featuredProductsRefusal`, `packages/core/src/home/featured.ts`). Motivo: `.in()` com ids na URL (BUG-20260809) e peso no 390 px | o humano no gate do PRD Tech Review (`teto-de-pecas-por-lista` · `tech_prd_edit` rebaixado a `tech` · r1) |
| 11 | `variacoes-liberadas-que-deixam-de-existir` | **D-variacoes-liberadas-que-deixam-de-existir** — "nenhuma marcada vale todas" só quando a dona não marcou nenhuma; se todas as liberadas deixarem de existir, o adicional (ou a peça da lista) sai da loja e o painel avisa; nunca passa a valer todas. **Consequência de modelagem:** variações liberadas guardadas como lista de ids sem FK com cascata (um `on delete cascade` deixaria zero linhas e seria lido como "todas") — inferência do code lookup, a confirmar na tarefa | o humano no gate do PRD Tech Review (`variacoes-liberadas-que-deixam-de-existir` · r1) |
| 12 | `listas-x-ad-014` | **D-listas-x-ad-014** — novo AD: a lista do Compre Junto ≠ coleção, sem rota, menu ou sitemap. Tabelas: listas, peças da lista (ordem, variações liberadas) e adicionais por produto (ordem, tipo, alvo — sem título —, variações do principal em que some). Leitura pública, escrita por `has_role`, guarda de schema no molde `faqSchema`/`fornecedorSchema`; uso contado por VIEW `security_invoker`; vínculo produto→lista `on delete restrict` | o humano no gate do PRD Tech Review (`tech` · r1) |
| 13 | `marca-acompanha-carrinho-e-order-items` | **D-marca-acompanha** — campo opcional no item do carrinho (`estrelinha-cart` v3→v4 preservando; chave inalterada), frase derivada na renderização; `create-order` grava `order_items` por lista explícita de colunas (molde `COLUNAS_DO_PEDIDO`) e descarta a marca cujo principal não está no pedido; a marca guarda principal e lista (CA-06.1). Preço segue recalculado no servidor | o humano no gate do PRD Tech Review (`tech` · r1) |
| 14 | `relatorio-de-adesao-rpc-e-regua-ad-055` | **D-relatorio** — RPC admin única (`has_role` ⇒ `42501` primeiro, `security definer`, `search_path=''`), régua do AD-055 por fragmento comparado em teste, período em dias de Brasília no banco; entra em `marcacaoSoPorAcao.test.ts`; rota nova ⇒ `rotasSobGuarda`, `navItems`, `focusRoutes` | o humano no gate do PRD Tech Review (`tech` · r1) |
| 15 | `leitura-da-configuracao-na-pagina` | **D-leitura-na-pagina** — configuração embutida no select do produto com FK nomeada (evita `PGRST201`); produtos dos adicionais e das listas por `useProductsByIds`; esqueleto só quando há adicionais; erro ⇒ página de pé. O code lookup avisa que o embed entra no `PRODUCT_SELECT` (`mapProduct.ts:50-51`), compartilhado por `useProduct.ts:20,37`, `useProducts.ts:194` e `useRecoverCart`; a tarefa decide entre o embed e um hook à parte (molde `useProductFaqs`) pelo teste que mostrar menos risco, mantendo o esqueleto sem salto | o humano no gate do PRD Tech Review (`tech` · r1) |
| 16 | `estado-de-compra-por-adicional-e-gravacao` | **D-estado-de-compra** — regra pura "o conjunto pode ser levado?" em `entities/product/lib` (ou `core` se o painel validar); `EngravingField` parametrizado por id; `add_to_cart` com vários itens em `core/analytics`. O botão único faz a barra fixa conhecer o conjunto | o humano no gate do PRD Tech Review (`tech` · r1) |
| 17 | `guardas-que-a-feature-toca` | **D-guardas** — por tarefa: `semMaterialNaPaginaDoProduto` (escopo literal, incluir o widget novo), `marcacaoSoPorAcao` (RPC nova), `animacaoRespeitaMovimento`, `rotasSobGuarda`/`navItems`/`focusRoutes`, `buscaDeProdutoComDonoUnico`, fixtures com `buy_together_ids`, e o guarda de schema novo (uma régua por comando, `mutar()` que lança) | o humano no gate do PRD Tech Review (`tech` · r1) |
| 18 | `conversao-e-queda-de-buy-together-ids` | **D-buy-together-ids** — duas etapas: (1) tabelas novas + conversão idempotente (até 3, na ordem do array) + painel sem a coluna; (2) depois do deploy do painel, `drop column`. O usuário confere a contagem em produção antes do deploy (banco local: 0 de 734) | o humano no gate do PRD Tech Review (`tech` · r1) |
| 19 | `gravacao-do-compre-junto-no-formulario-do-produto` | **D-gravacao-no-formulario** — recusas puras em `core/buy-together` (retorno `string \| null`); adicionais gravados recortados pelo principal; probe HTTP contra o banco local (`AD-012`) | o humano no gate do PRD Tech Review (`tech` · r1) |
| 20 | `evento-ga4-com-varios-itens` | **D-ga4** — `addToCartEvent` aceita lista de itens (ou função irmã) em `core/analytics`, com teste de "principal uma vez"; `item_list_id` nos adicionais | o humano no gate do PRD Tech Review (`tech` · r1) |
| 21 | Onde mora a configuração da forma do bloco | `store_settings` (chave `buy_together`, sem migration: a tabela e o padrão `value ||` já existem), valor padrão e normalização em `core/buy-together`; lida na loja por hook à parte | a conferência (precedente: o frete grátis, a `37`, e a regra "defaults do TypeScript = o que o banco grava") |

## Não resolvido

- **Premissa da decisão 1 (a confirmar):** a forma do bloco é uma configuração global; "por produto" não foi pedido e não está construído.
- **Embed × hook à parte** para a leitura da configuração na página (decisão 15): a tarefa mede e decide, sem mudar o contrato do PRD.
- **Número do AD novo e prefixo da migration:** apurados na hora (conflito possível com os Work Items 92/93 e outros worktrees); não se escreve valor fixo.
- **A conversão em produção:** a contagem real de `buy_together_ids` é conferida pelo usuário antes do deploy; a segunda migration (`drop column`) só depois do painel publicado.
- **Lacunas do design** (CA-05.2, CA-02.7, adicional com material, estados de carregando/erro, forma do bloco no painel): resolvidas pelas tarefas com o design system; sem prova de desenho.
- **Alvos de 44 px, rolagem horizontal em 390 e fonte a 200 %** não estão nos arquivos de design lidos; ficam para a prova em navegador.
- **Runtime local das functions** (`checkout`, `mercado-pago`): o `CLAUDE.md` raiz registra boot local problemático em `core/pricing`; a prova do `checkout` por execução real pode ficar limitada a teste de unidade.
