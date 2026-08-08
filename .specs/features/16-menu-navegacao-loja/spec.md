# Menu de navegação da loja — Specification

## Problem Statement

O backoffice ganhou gestão completa de árvore de categorias na `14` (`parent_id`, `sort_order`,
mover, reordenar, ocultar) e **a loja nunca aprendeu a lê-la**. O `Header` faz `.slice(0, 4)` de uma
lista chapada ordenada por `sort_order`, sem distinguir raiz de filha — então hoje, com a árvore real
`Bottons › {Academia, Anime, K-Pop, …}`, a barra do topo diz **"Bottons · Academia · Anime · K-Pop"**:
o contêiner de tudo mais uma filha que empatou em `sort_order`. A mesma lista chapada alimenta a grade
"Coleções" da home, o rodapé e as sugestões da busca, e `/colecao/bottons` mostra 4 produtos em vez do
catálogo porque `useProducts` filtra por `category_id` exato.

Em paralelo, os boards **"Desktop Mega Menu Open - v3"** (`1QB-0`) e **"Mobile Menu Open - v3"**
(`1SF-0`) desenham uma navegação — painel com subcategorias, produtos em alta e card promocional; no
celular, folha de tela cheia com acordeões e atalhos — que não existe em código.

E o backoffice tem uma tela **Coleções** que nunca funcionou: a tabela `public.collections` não existe
em migration nenhuma, nem no banco vivo (`PGRST205`). É um segundo vocabulário, morto, para o que
`categories` já é — inclusive na loja, onde `/colecao/:slug` **é** a página de categoria.

## Goals

- [ ] A barra do topo mostra as categorias que o admin escolheu, em qualquer profundidade da árvore —
      nunca o contêiner raiz nem uma filha por acidente de empate.
- [ ] `/colecao/:slug` de uma categoria com filhas mostra os produtos das filhas (roll-up recursivo).
- [ ] O admin cura o menu numa tela (`/admin/menu`) que grava em `categories` — sem segunda árvore.
- [ ] Mega menu desktop e menu mobile conforme os boards `1QB-0` e `1SF-0`, com prova em 390×844.
- [ ] Uma palavra só para "conjunto de produtos": categoria. Coleções sai do produto.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Coluna "Por estilo" do mega menu | Eixo transversal (Chibi, Minimalista, Villains) que não é filha de nenhum universo. Único ponto do board que forçaria modelo de dado novo, e só existe no desktop — 10% do tráfego. Volta quando houver produtos que sustentem os estilos. |
| Categoria automática (conjunto por regra) | Única capacidade exclusiva de Coleções (`type: 'auto'`). Vira backlog: os cinco campos que as regras usavam (`is_featured`, `is_new`, `compare_price`, `created_at`, `stock_total`) continuam sendo colunas reais. |
| Remover a tabela `drops` | Quarta palavra para a mesma ideia — tabela existe, tem linha de seed, nenhum código a lê. Derrubar tabela com dado é decisão do dono, não efeito colateral de um menu. |
| Tornar "Crie o Seu" / "Sobre" editáveis | São rotas fixas do produto. Um toggle que esconde "Sobre" é armadilha sem demanda. Aparecem na tela de menu como linhas travadas, só para explicar as vagas. |
| Conjuntos diferentes para desktop e celular | O board mobile mostra os mesmos quatro universos. Dois conjuntos = dois lugares para consertar a mesma escolha. |
| Ordem do menu separada de `sort_order` | Segundo dono do mesmo dado — o "defeito 01" que o próprio `CategoryFormDialog` documenta. A tela avisa que a ordem também vale para rodapé e home. |
| Upload de capa de categoria pela tela de Menu | Já é campo do `CategoryInspector`. Editar a mesma coisa em duas telas é o defeito que esta feature está evitando. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Quantas vagas na barra do topo | **4** (`MENU_SLOT_LIMIT`), além das 2 fixas | É o que os dois boards desenham. Com "Crie o Seu" e "Sobre", dá 6 itens a 1440px — o board `1QB-0` mostra exatamente isso. | y |
| Empate de `sort_order` | Desempate por `name.localeCompare` | É a causa raiz de "Academia" no topo (dois zeros). A regra já existe em `bySortOrder` de `categoryTree.ts` — reusar, não inventar outra. | y |
| `show_in_menu` só na raiz? | **Não** — vale em qualquer profundidade | O caso real exige: Anime é filha de "Bottons" e precisa de vaga; "Bottons" não. Restringir à raiz deixaria o menu impossível de montar no banco atual. | y |
| Onde mora o card promo | `menu_promo jsonb` na categoria que **hospeda** o slot | O board mostra o card sob Anime falando de Anime. Zero tela nova, e não pode divergir da árvore porque É a árvore. | y |
| Para onde o card promo aponta | Uma **categoria** (`category_id`), não URL digitada | "Coleção Anime Villains" é uma subcategoria. Elimina link com typo e deixa a contagem sair de `category_product_counts`, que já existe. | y |
| Card promo com categoria apagada | Card **não renderiza**; admin vê "categoria removida" | `menu_promo.category_id` mora dentro de jsonb — não há FK para `on delete set null`. Guarda em runtime é a única resposta possível. | y |
| Backfill de `show_in_menu` | Slugs `anime`, `kpop`, `games`, `filmes` quando ativos; no-op se ausentes | Seed-shaped de propósito. A alternativa — `default false` puro — faz o menu nascer **vazio** numa loja no ar até alguém abrir o admin. | y |
| Profundidade do roll-up de produtos | Descendência **completa**, recursiva | Meia-descida deixaria a neta fora da página do avô. `buildCategoryTree` já desce recursivamente pelo mesmo motivo. | y |
| Falha de leitura das categorias | Barra renderiza só os itens fixos | `useCategories` já devolve `[]` em erro. A loja nunca mostra barra quebrada; "Crie o Seu" e "Sobre" são estáticos e continuam. | y |
| Dois admins editando o menu | Última escrita vence, sem trava | Um admin. Bloqueio otimista custaria coluna de versão e diálogo de conflito para um risco que não existe nesta operação. | y |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: A loja lê a árvore de categorias ⭐ MVP

**User Story**: Como cliente, quero que o menu, o rodapé e a grade da home mostrem os universos da
loja — não o contêiner que os agrupa nem uma subcategoria solta — para eu saber onde clicar.

**Why P1**: É bug em produção agora, não preparação. A barra do topo diz "Bottons · Academia · Anime ·
K-Pop".

**Acceptance Criteria**:

1. WHEN a lista de categorias tem duas entradas com o mesmo `sort_order` THEN o sistema SHALL ordená-las
   de forma determinística por `sort_order` ascendente e, no empate, por `name.localeCompare`.
2. WHEN a grade "Coleções" da home ou a coluna "Categorias" do rodapé renderizam categorias THEN o
   sistema SHALL oferecer as categorias de navegação: as raízes quando houver **duas ou mais**, e as
   filhas da raiz quando houver **exatamente uma** — porque uma raiz sozinha é contêiner, não escolha.

   > **Correção durante a execução.** Esta AC dizia "somente categorias com `parent_id === null`".
   > Está errado para a árvore desta loja, e o repositório já sabia: `trendingCategories.ts` registra
   > que "filtrar por `parent_id === null` mostrava uma pílula só, escrita 'Bottons', numa loja que
   > vende bottons". Com o guarda-chuva `Bottons › {Anime, K-Pop, …}`, a regra original entregaria uma
   > grade de **um tile**. A regra implementada (`browseCategories`) pula o guarda-chuva e funciona
   > nos dois formatos de árvore sem configuração.
   >
   > As **sugestões de busca saíram desta AC**: `SearchDropdown` passa as categorias para o *matching*
   > (buscar "Naruto" tem de achar Naruto), e a nuvem "Em alta agora" usa `pickTrendingCategories`,
   > que é deliberadamente **folha** — é sobre o que está bombando, não sobre como navegar. Duas
   > intenções diferentes, dois recortes diferentes, cada um com o seu teste.
3. WHEN a cliente abre `/colecao/:slug` de uma categoria que tem descendentes THEN o sistema SHALL
   listar os produtos vinculados à categoria **e a toda a sua descendência**, sem repetir produto que
   esteja vinculado a mais de uma delas.
4. WHEN a consulta de categorias falha THEN o header SHALL renderizar os itens fixos ("Crie o Seu",
   "Sobre") e nenhum item de categoria, sem lançar erro.

**Independent Test**: Com a árvore real (`Bottons › {Academia, Anime, …}`), abrir `/` — a grade
"Coleções" mostra só "Bottons"; abrir `/colecao/bottons` — mostra o catálogo, não 4 produtos.

---

### P1: Curadoria do menu no backoffice ⭐ MVP

**User Story**: Como administradora, quero escolher numa tela quais categorias ocupam a barra do topo
e em que ordem, para o menu da loja ser uma decisão minha e não um acidente de `sort_order`.

**Why P1**: Sem isso não existe como montar o menu no banco atual — a única raiz é "Bottons".

**Acceptance Criteria**:

1. WHEN a administradora abre `/admin/menu` THEN o sistema SHALL listar todas as categorias ativas com
   o caminho na árvore (`Bottons › Anime`), a contagem de subcategorias e um controle de presença no
   menu.
2. WHEN ela liga a presença de uma categoria e já há 4 ligadas THEN o sistema SHALL recusar a
   alteração e informar que o limite de 4 vagas foi atingido, sem gravar nada.
3. WHEN ela desliga uma categoria e liga outra THEN o sistema SHALL persistir `show_in_menu` em
   `categories` e a loja SHALL refletir a troca na próxima carga.
4. WHEN ela arrasta uma categoria do menu para outra posição THEN o sistema SHALL gravar **apenas as
   linhas cuja `sort_order` mudou**, reusando `reorderWithinParent`.
5. WHEN a tela renderiza THEN o sistema SHALL exibir as entradas fixas "Crie o Seu" e "Sobre" como
   linhas travadas, não editáveis e não contadas nas 4 vagas.
6. WHEN uma categoria marcada no menu é desativada THEN a tela SHALL mostrá-la como "inativa — não
   aparece na loja" e a loja SHALL omiti-la da barra.

**Independent Test**: Abrir `/admin/menu`, ligar Anime/K-Pop/Games/Filmes, tentar ligar uma quinta
(recusa), recarregar a loja e ver os quatro no topo.

---

### P1: Mega menu no desktop ⭐ MVP

**User Story**: Como cliente no desktop, quero ver as subcategorias e alguns produtos ao passar pelo
universo no topo, para chegar ao que quero sem carregar uma página intermediária.

**Why P1**: É o board `1QB-0`, a metade desktop da entrega.

**Acceptance Criteria**:

1. WHEN o ponteiro entra numa entrada do menu que tem subcategorias THEN o sistema SHALL abrir o painel
   com a coluna de subcategorias e um link "Ver todos →" para `/colecao/:slug` da entrada.
2. WHEN a entrada recebe foco de teclado THEN o sistema SHALL abrir o mesmo painel, e `Esc` SHALL
   fechá-lo devolvendo o foco à entrada.
3. WHEN o painel abre THEN o sistema SHALL mostrar até 3 produtos em destaque (`is_featured`) da
   categoria sob o título "Em alta".
4. WHEN a entrada não tem subcategorias nem card promo THEN o sistema SHALL navegar direto para
   `/colecao/:slug` sem abrir painel.
5. WHEN o ponteiro sai do topo e do painel THEN o sistema SHALL fechar o painel.

**Independent Test**: Em 1440px, passar por "Anime" — painel com as subcategorias, 3 cards e "Ver
todos"; passar por uma categoria sem filhas — nenhum painel.

---

### P1: Menu mobile em folha de tela cheia ⭐ MVP

**User Story**: Como cliente no celular, quero um menu que ocupe a tela com os universos em acordeão e
os atalhos de conta, favoritos e pedidos, para navegar com uma mão.

**Why P1**: ~90% dos acessos são mobile, e é o board `1SF-0`. Hoje é um acordeão espremido embaixo do
header.

**Acceptance Criteria**:

1. WHEN a cliente toca no botão de menu THEN o sistema SHALL abrir uma folha de tela cheia com logo,
   botão de fechar, gatilho de busca, os universos em acordeão, "Crie o Seu", "Sobre", a faixa de
   atalhos (Conta / Wishlist / Pedidos) e o card promo.
2. WHEN ela toca num universo THEN o sistema SHALL expandir as subcategorias dele com "Ver todos →",
   e recolher qualquer outro que estivesse aberto.
3. WHEN ela toca no gatilho de busca THEN o sistema SHALL fechar a folha e abrir o overlay de busca
   existente — nunca renderizar um segundo campo de busca.
4. WHEN ela toca em "Conta" sem sessão THEN o sistema SHALL fechar a folha e abrir o overlay de auth,
   não navegar para `/conta`.
5. WHEN a folha está aberta a 390×844 THEN o sistema SHALL manter todos os alvos de toque com ao menos
   44px e não produzir scroll horizontal no body.

**Independent Test**: Em 390×844, abrir o menu — folha cheia conforme o board; tocar em Anime — expande;
tocar em busca — folha fecha e overlay abre.

---

### P1: Uma palavra só para conjunto de produtos ⭐ MVP

**User Story**: Como administradora, quero que o admin não tenha uma tela "Coleções" permanentemente
quebrada competindo com "Categorias", para eu não perder tempo tentando usá-la.

**Why P1**: A tela nunca funcionou em ambiente nenhum e ocupa uma vaga na navegação do admin. Manter
código morto que descreve tabela inexistente é a terceira ocorrência do `AD-012`.

**Acceptance Criteria**:

1. WHEN a administradora abre o backoffice THEN o sistema SHALL não apresentar item de navegação nem
   rota "Coleções".
2. WHEN o código é compilado THEN o sistema SHALL não conter `DbCollection`, `CollectionRule`,
   `useAdminCollections`, `CollectionFormDialog`, `CollectionProductsSorter` nem
   `AdminCollectionsPage`.
3. WHEN a remoção é concluída THEN o `tsc` de ambos os apps SHALL continuar em 0 erros e o `lint`
   SHALL não ter erro novo em relação à baseline.

**Independent Test**: `grep -ri "collection" apps/ packages/` não retorna nada, e o backoffice sobe com
a navegação sem "Coleções".

---

### P2: Card promocional no menu

**User Story**: Como administradora, quero destacar uma coleção dentro do menu de um universo, para
empurrar o lançamento da semana de dentro da navegação.

**Why P2**: O menu funciona sem ele — o painel apenas encolhe. É a zona comercial dos dois boards, mas
não é o caminho de navegação.

**Acceptance Criteria**:

1. WHEN a administradora ativa o card promo de uma entrada do menu THEN o sistema SHALL exigir a
   escolha de uma **categoria de destino** e SHALL gravar `menu_promo` como
   `{ category_id, badge?, title?, subtitle? }`.
2. WHEN `title` ou `subtitle` estão vazios THEN a loja SHALL usar o nome e a descrição da categoria de
   destino.
3. WHEN a categoria de destino foi apagada ou desativada THEN a loja SHALL **não renderizar** o card, e
   a tela do admin SHALL sinalizar o destino inválido.
4. WHEN `menu_promo` é nulo THEN o painel desktop SHALL renderizar sem a quarta coluna e a folha mobile
   SHALL renderizar sem a faixa promo — sem espaço vazio reservado.
5. WHEN o card renderiza THEN o sistema SHALL levar para `/colecao/:slug` da categoria de destino.

**Independent Test**: Configurar um card apontando para uma subcategoria, ver o card no desktop e a
faixa no mobile; desativar a categoria de destino e ver o card sumir.

---

## Edge Cases

- WHEN duas categorias empatam em `sort_order` **e** em `name` THEN o sistema SHALL manter ordem estável
  pela ordem de chegada do banco, sem lançar erro.
- WHEN a categoria marcada no menu não tem subcategorias nem promo THEN a entrada SHALL ser link direto,
  sem painel vazio.
- WHEN todas as categorias do menu estão inativas THEN a barra SHALL renderizar apenas os itens fixos.
- WHEN `menu_promo` contém JSON com forma inesperada THEN o sistema SHALL tratá-lo como ausente, sem
  quebrar o painel.
- WHEN uma categoria aponta o promo para **si mesma** THEN o sistema SHALL aceitar (é um destaque válido
  para a própria coleção) e renderizar normalmente.
- WHEN o roll-up de produtos encontra uma categoria com centenas de descendentes THEN o sistema SHALL
  consultar por lista de ids em uma única query, sem N+1.
- WHEN a árvore tem ciclo ou órfã THEN o roll-up SHALL terminar sem laço infinito, tratando o nó como
  folha.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| MENU-01 | P1: Loja lê a árvore | Verified | ✅ |
| MENU-02 | P1: Loja lê a árvore | Verified | ✅ |
| MENU-03 | P1: Loja lê a árvore | Verified | ✅ |
| MENU-04 | P1: Loja lê a árvore | Verified | ✅ |
| MENU-05 | P1: Curadoria no backoffice | Verified | ✅ |
| MENU-06 | P1: Curadoria no backoffice | Verified | ✅ |
| MENU-07 | P1: Curadoria no backoffice | Verified | ✅ |
| MENU-08 | P1: Curadoria no backoffice | Verified | ✅ |
| MENU-09 | P1: Curadoria no backoffice | Verified | ✅ |
| MENU-10 | P1: Curadoria no backoffice | Verified | ✅ |
| MENU-11 | P1: Mega menu desktop | Verified | ✅ |
| MENU-12 | P1: Mega menu desktop | Verified | ✅ |
| MENU-13 | P1: Mega menu desktop | Verified | ✅ |
| MENU-14 | P1: Mega menu desktop | Verified | ✅ |
| MENU-15 | P1: Mega menu desktop | Verified | ✅ |
| MENU-16 | P1: Menu mobile | Verified | ✅ |
| MENU-17 | P1: Menu mobile | Verified | ✅ |
| MENU-18 | P1: Menu mobile | Verified | ✅ |
| MENU-19 | P1: Menu mobile | Verified | ✅ |
| MENU-20 | P1: Menu mobile | Verified | ✅ |
| MENU-21 | P1: Vocabulário único | Verified | ✅ |
| MENU-22 | P1: Vocabulário único | Verified | ✅ |
| MENU-23 | P1: Vocabulário único | Verified | ✅ |
| MENU-24 | P2: Card promocional | Verified | ✅ |
| MENU-25 | P2: Card promocional | Verified | ✅ |
| MENU-26 | P2: Card promocional | Verified | ✅ |
| MENU-27 | P2: Card promocional | Verified | ✅ |
| MENU-28 | P2: Card promocional | Verified | ✅ |

**ID → AC**: MENU-01..04 = P1 Loja AC 1..4 · MENU-05..10 = P1 Backoffice AC 1..6 ·
MENU-11..15 = P1 Desktop AC 1..5 · MENU-16..20 = P1 Mobile AC 1..5 ·
MENU-21..23 = P1 Vocabulário AC 1..3 · MENU-24..28 = P2 Promo AC 1..5

**Coverage:** 28 total, 28 mapeadas para tasks, 28 **verificadas**. Zero sem cobertura.

---

## Dimensions Sweep

| Dimension | Resolução |
| --- | --- |
| Input validation & bounds | MENU-06 (limite de 4 vagas), MENU-24 (destino obrigatório), edge case de JSON malformado. |
| Failure / partial-failure | MENU-04 (falha de leitura → só itens fixos); MENU-08 grava só linhas alteradas, e falha parcial de reorder mantém o refetch como fonte de verdade. |
| Idempotency / retry | Ligar/desligar vaga é escrita de valor absoluto (`show_in_menu = true/false`), idempotente por construção. `reorderWithinParent` já devolve só o delta. |
| Auth boundaries & rate limits | RLS existente cobre: `public read categories using (active = true)` e `admin full categories`. `/admin/menu` fica sob `RequireAdmin`. Rate limit **N/A** — operação de admin, sem exposição pública. |
| Concurrency / ordering | Ordenação determinística é MENU-01 (a causa raiz do bug). Concorrência entre admins: última escrita vence, assumption registrada. |
| Data lifecycle / expiry | MENU-26: destino de promo apagado/desativado não renderiza. `menu_promo` mora em jsonb, sem FK — a guarda é em runtime, por isso virou AC. |
| Observability | **N/A** — navegação de loja, sem instrumentação no projeto hoje; nada nesta feature justifica introduzir. |
| External-dependency failure | **N/A** — nenhuma chamada externa; tudo é Supabase, coberto por "failure states". |
| State-transition integrity | MENU-10: categoria desativada sai da barra e é sinalizada no admin. MENU-14: entrada sem filha e sem promo vira link, não painel vazio. |

---

## Success Criteria

- [ ] A barra do topo em 1440px mostra os quatro universos + "Crie o Seu" + "Sobre" — nunca "Bottons"
      nem "Academia" por acidente.
- [ ] `/colecao/bottons` lista o catálogo (roll-up), não os 4 vínculos diretos.
- [ ] Menu mobile em 390×844 idêntico ao board `1SF-0`, sem scroll horizontal e com alvos ≥ 44px.
- [ ] `grep -ri "collection" apps/ packages/` volta vazio; `lint` não sobe.
- [ ] Migration provada por probe HTTP (AD-012) antes de qualquer UI: `PATCH` de `show_in_menu` e
      `menu_promo` retorna 204, não `PGRST204`.
- [ ] `tsc` store 0 · backoffice 0; `pnpm test` verde; `lint` sem erro novo.
