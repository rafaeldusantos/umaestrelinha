# Menu configurável — mega menu, ícones, curadoria por dispositivo e banners

## Problem Statement

O menu da loja tem **um** botão de configuração: a categoria aparece ou não aparece. Tudo o mais é
decidido no código, igual para computador e celular, e boa parte disso a Adri não vê nem sabe que
existe. Levantamento feito no fonte, em 2026-09-05:

| O que | Onde está hoje | Por que é problema |
| --- | --- | --- |
| A vaga na barra | `categories.show_in_menu`, um booleano | Liga nos **dois** dispositivos ao mesmo tempo. Uma categoria de nome longo que cabe em 1440 e estoura em 390 não tem saída — ou está nos dois, ou em nenhum |
| Quantos itens cabem | `MENU_SLOT_LIMIT = 4`, constante no código | Teto arbitrário: a tela **recusa** a 5ª categoria com um erro, em vez de mostrar o que acontece |
| O que abre no painel | `menuEntries` devolve **todas** as filhas ativas | Sem curadoria: com 12 filhas o painel vira uma lista de 12 numa coluna de 180px. A dona não escolhe o que entra |
| O ícone da entrada | não existe — `navItem.ts` é só texto | O board `7CF-0` da home **já desenhou a barra com ícones** (gota afetiva, corrente, pingente, gravação) e o código nunca os implementou |
| O item "Sobre" | escrito no JSX do `Header` e do `MobileMenu` | Não é configurável: a dona não pode tirá-lo, movê-lo, nem pôr outra página no lugar |
| O card do painel | `menu_promo jsonb` = `{ category_id, badge?, title?, subtitle? }` | **Não aceita imagem.** É um retângulo `primary` com texto, e a loja vende peça que se compra pelo olho |
| O destaque do celular | `MobileMenu.tsx` — `entries.find(e => e.promo !== null)` | Mostra **um** promo, o da primeira entrada que tiver um. Não é escolha de ninguém: é a ordem da árvore decidindo |
| A faixa "Em destaque" | `MegaMenu.tsx` — `useProducts(slug)` filtrando `is_featured` | 3 produtos automáticos, sem tela onde a dona os veja ou troque |

E dois defeitos que a varredura achou de passagem, os dois do tipo que não quebra nada:

- **O painel promete uma entrada fixa que a loja não tem.** `MenuSlotList.tsx:25` declara
  `FIXED_ENTRIES = [{ 'Crie o Seu', '/crie-seu-botton' }, { 'Sobre', '/sobre' }]`, e
  `AdminMenuPage.test.tsx:195` congela isso. Mas `apps/store/src/app/__tests__/routes.test.ts:31`
  assere que `/crie-seu-botton` **não é rota declarada** — cai na 404 da loja —, e o `Header` da loja
  renderiza só "Sobre". A tela de quem decide o menu mostra, na lista e na prévia, um item que não
  existe e que levaria a 404. `menu.ts:59` repete a mesma frase errada num comentário. **Esta feature
  não conserta a lista: ela apaga o conceito** — não existe mais entrada fixa (`context.md` Q5).
- **`MenuBarPreview.tsx` é um segundo desenho da barra**, feito à mão no painel, com a paleta do
  admin. É exatamente o defeito que a feature `25` eliminou na home (`HomePreview.tsx`, 277 linhas)
  e que `previaUnica.test.ts` existe para impedir de voltar — só que no menu ele nunca saiu.

O pedido é dar liberdade de configuração no nível do que grandes lojas fazem (referência trazida pelo
usuário: a barra da Americanas — ícone na categoria principal, painel com colunas de subcategorias,
"ver tudo em X" e banner de anúncio), **sem** trazer junto o vocabulário delas.

## Goals

- [ ] **Nada do menu fica no código.** A Adri monta a barra inteira com categorias e links, e tira o
      que quiser — inclusive o "Sobre".
- [ ] A Adri decide, **separadamente para computador e celular**, o que entra no menu.
- [ ] **Sem teto de itens.** Quando não couber na largura, a loja mostra o que não coube; a tela não
      recusa.
- [ ] Cada item pode receber um **ícone** escolhido de um conjunto — o mesmo desenho nas duas
      superfícies.
- [ ] A Adri escolhe **quais subcategorias** aparecem no painel de cada entrada, por dispositivo.
- [ ] Cada painel aceita **até dois banners** com imagem, texto e destino próprios, e a arte pode ser
      diferente no computador e no celular.
- [ ] Tudo isso tem **um dono só** em `@estrelinha/core/menu`, lido pelas quatro superfícies e por
      nenhuma reimplementado.
- [ ] O painel **não desenha o menu**: a prévia é a loja, como em `/admin/home`.

## Out of Scope

Explicitamente excluído. Documentado para impedir alargamento.

| Item | Motivo |
| --- | --- |
| Ordem própria por dispositivo | **Decisão do usuário** (`context.md` Q1). A ordem continua sendo a `sort_order` da árvore, a mesma da grade da home e do rodapé. Duas colunas novas seriam o terceiro dono de "em que ordem as categorias aparecem" |
| Botão "todos os departamentos" | **Decisão do usuário** (`context.md` Q4). Nesta loja quem é departamento são as próprias entradas, cada uma já com o seu painel |
| Painel, subcategorias ou banner em **item de link** | Link é um atalho para uma página que já existe. Dar painel a ele o transformaria numa categoria sem produtos — a "segunda árvore" que a `16` recusou |
| Terceiro nível de árvore no painel (coluna com título de grupo) | O catálogo real tem **no máximo 2 níveis** (medido na `23`, e `categoryHref` publica canônica de dois segmentos). Suportar um nível que não existe é desenhar para dado imaginário |
| Colunas do painel arrumadas à mão | O arranjo é calculado (até 8 por coluna, na ordem da árvore). Um campo `coluna` por filha seria um dono de layout que quebra na hora em que uma filha é desmarcada |
| Agendar troca de banner por data | Segundo mecanismo de agendamento (cupom já tem o dele). A dona troca a arte quando quiser |
| `packages/core/src/payment/**` e `supabase/functions/mercado-pago/**` | Menu não é caminho de dinheiro. Nenhuma linha ali é tocada — conferido por `git diff --name-only` no gate, como nas features 22–25 e 37 |

---

## Assumptions & Open Questions

| Assunção / decisão | Padrão escolhido | Motivo | Confirmado? |
| --- | --- | --- | --- |
| Papel da categoria no menu (entrada da barra × item do painel) | **Derivado da árvore**, não gravado: uma categoria marcada cujo **pai também está marcado no mesmo dispositivo** é item do painel do pai; caso contrário é entrada da barra | Gravar o papel seria um dono a mais de algo que a árvore já responde, e ele dessincroniza no primeiro "mover categoria" | n |
| Teto de itens | **Não existe**, em nenhuma das duas superfícies. `MENU_SLOT_LIMIT` e `menuSlotRefusal` são **removidos** | Decisão do usuário (`context.md` Q6). O teto de 4 era número de código recusando curadoria da dona | n |
| O que acontece quando não cabe | A barra do desktop é **uma linha só** e **rola na horizontal**; a prévia mostra o estouro | É o que o próprio repositório já decidiu duas vezes: `MenuBarPreview` usa `overflow-x-auto` "porque embrulhar em duas linhas ESCONDERIA o estouro", e a regra de mobile do `CLAUDE.md` manda conteúdo largo rolar dentro do próprio container. A folha do celular é vertical e não tem o problema | n |
| Onde moram os itens de link | `store_settings.menu_links` (jsonb, lista) | Link não tem produto, filha nem página própria — não é categoria e não pode entrar em `categories` sem virar categoria vazia. Uma tabela própria seria peso de RLS e CRUD para um punhado de linhas que nunca são joinadas | n |
| Ordem entre categorias e links | Fusão de duas fontes por `(sort_order, nome)`, com o comparador em `core` | Cada item continua dono da própria posição; o que é único é o **comparador**, não a coluna | n |
| `show_in_menu` | Vira **coluna gerada** `menu_desktop or menu_mobile`, e **nenhuma tela pode lê-la** | Sumir com ela quebra a loja publicada na janela entre `db push` e o deploy da Vercel, que rodam em paralelo. Gerada, ela não pode divergir das duas booleanas | n |
| Chave de ícone inválida no banco | Degrada para **sem ícone**, sem erro | Não é dinheiro nem segurança; `check` em SQL seria cópia do catálogo pedindo guarda própria | n |
| Banner sem imagem | Renderiza como hoje (bloco `primary` com texto) | Deixa a dona anunciar antes de ter arte pronta, e nenhum estado fica com buraco | n |
| Banner com destino quebrado | **Não renderiza** — nem card, nem espaço reservado | É a regra do `resolvePromo` (`MENU-26`) estendida aos destinos novos. Card levando a 404 é pior que card nenhum | n |
| URL externa digitada | Exige `https://`, abre em nova aba, leva `rel="noopener noreferrer"` | Consequência aceita da Q3; ver `context.md` | n |
| A faixa "Em destaque" (3 produtos automáticos) | **Removida** | Decisão do usuário (Q2). Declarada aqui para a queda de contagem de testes não parecer deleção silenciosa | n |
| Migração do que já existe | `show_in_menu = true` ⇒ ligada nos dois dispositivos; filhas ativas viram itens de painel; `menu_promo` vira banner nos dois; **"Sobre" é semeado como item de link** ligado nos dois | O menu que está no ar não pode mudar por causa de um deploy. Sem semear o "Sobre", a página institucional sairia da barra sem ninguém ter decidido isso | n |

**Open questions:** nenhuma — tudo resolvido acima ou em `context.md`.

---

## User Stories

### P1: Curadoria por dispositivo, sem teto ⭐ MVP

**User Story**: como Adri, quero ligar cada categoria no menu **do computador e do celular
separadamente**, e quantas eu quiser, para que a barra do desktop e a folha do celular possam ser
diferentes sem eu ter de escolher uma delas nem esbarrar num limite.

**Why P1**: é a peça que muda o modelo de dados. Sem ela, ícone, curadoria de painel e banner não têm
onde ser configurados por dispositivo.

**Acceptance Criteria**:

1. WHEN a Adri liga uma categoria na aba **Computador** THEN o sistema SHALL fazê-la aparecer na
   barra do topo da loja em ≥768px **e não** na folha do celular, e vice-versa.
2. WHEN uma categoria está ligada num dispositivo e desligada no outro THEN a linha dela na tela
   SHALL dizer em qual dos dois ela está desligada, com o nome do dispositivo escrito.
3. WHEN a Adri liga a 6ª, a 10ª ou a 20ª categoria THEN o sistema SHALL aceitar — **não há teto de
   itens em nenhuma das duas superfícies**, e nenhuma recusa por contagem SHALL existir no código.
4. WHEN os itens ligados não cabem na largura da barra do desktop THEN a barra SHALL **rolar na
   horizontal dentro da própria faixa**, sem embrulhar em duas linhas, sem esconder item e **sem**
   fazer o `body` rolar na horizontal.
5. WHEN a tela do painel mostra a contagem THEN ela SHALL dizer quantos itens o dispositivo tem, e
   SHALL **não** apresentar isso como vagas consumidas de um total.
6. WHEN uma categoria marcada tem o **pai também marcado no mesmo dispositivo** THEN ela SHALL ser
   item do painel do pai, e **não** SHALL virar entrada da barra.
7. WHEN a categoria está inativa (`active = false`) THEN ela SHALL sumir da loja e SHALL ser marcada
   na tela como "inativa — não aparece na loja".
8. WHEN a migration roda sobre o banco atual THEN toda categoria com `show_in_menu = true` SHALL
   ficar ligada **nos dois** dispositivos, e toda filha ativa de uma categoria ligada SHALL ficar
   marcada como item de painel nos dois — a loja renderiza igual antes e depois.

**Independent Test**: ligar "Correntes" só no celular, abrir a loja em 1440 e em 390, e ver a entrada
aparecer numa largura e não na outra.

---

### P1: Item de link — o menu deixa de ter item escrito no código ⭐ MVP

**User Story**: como Adri, quero pôr no menu um link para uma página da loja — "Sobre", "Como enviar
o material", uma campanha — e tirá-lo quando quiser, para que nenhuma parte do menu dependa de
alguém mexer no código.

**Why P1**: é o que permite apagar as entradas fixas. Sem ele, tirar o "Sobre" do JSX significaria
tirá-lo da navegação, o que ninguém pediu.

**Acceptance Criteria**:

1. WHEN a Adri adiciona um item de link THEN o sistema SHALL pedir rótulo e destino, SHALL aceitar
   ícone opcional, e SHALL permitir ligá-lo por dispositivo como qualquer outro item.
2. WHEN o destino digitado é interno THEN o sistema SHALL normalizá-lo e SHALL **recusar na
   gravação**, com motivo em texto, o que não resolve numa rota declarada da loja.
3. WHEN o destino é externo THEN o sistema SHALL exigir `https://`, e o link SHALL abrir em nova aba
   com `rel="noopener noreferrer"`.
4. WHEN um item de link é renderizado THEN ele SHALL ser **link direto**: sem painel, sem seta, sem
   subcategoria, sem banner.
5. WHEN a Adri remove um item de link THEN ele SHALL sumir das duas superfícies, e o destino SHALL
   continuar existindo como página da loja.
6. WHEN o menu é montado THEN categorias e links SHALL ser ordenados **juntos**, pela mesma regra, e
   nenhuma das duas superfícies SHALL conter item de menu escrito em JSX.
7. WHEN a lista de links está vazia THEN a barra e a folha SHALL renderizar só as categorias, sem
   sobra de espaço.

**Independent Test**: apagar o item "Sobre" no painel e ver a barra da loja ficar só com categorias,
sem mexer em código.

---

### P1: Ícone na entrada do menu ⭐ MVP

**User Story**: como Adri, quero escolher um ícone para cada item do menu, para que a barra tenha o
desenho que o board da home já previa e a cliente reconheça a coleção pelo símbolo.

**Why P1**: pedido explícito, e o desenho já existe — a barra do board `7CF-0` (Loja — Home Desktop)
tem ícone em cada departamento, e o código nunca implementou nenhum deles.

**Acceptance Criteria**:

1. WHEN a Adri abre o seletor de ícone de um item THEN o sistema SHALL mostrar o conjunto de ícones
   **da loja**, cada um com o desenho de verdade e o nome, mais a opção "sem ícone".
2. WHEN a Adri escolhe um ícone THEN ele SHALL aparecer **na barra do computador e na lista do
   celular**, com o mesmo traço, à esquerda do nome.
3. WHEN o item não tem ícone THEN a barra e a lista SHALL mostrar só o nome, sem reservar espaço
   vazio no lugar dele.
4. WHEN o valor gravado não corresponde a nenhum ícone do conjunto THEN o sistema SHALL renderizar
   como "sem ícone", sem quebrar a barra.
5. WHEN o ícone é renderizado na barra escura THEN ele SHALL usar o realce `accent`, e o rótulo
   SHALL continuar em `on-primary` — a régua de contraste da paleta não muda por causa dele.
6. WHEN o conjunto de ícones é lido pelo painel THEN ele SHALL vir do **mesmo módulo** que a loja usa
   para desenhá-lo, e nenhum dos dois apps SHALL declarar uma cópia do desenho.

**Independent Test**: escolher "Corrente" em uma entrada e ver o mesmo glifo no topo em 1440 e na
linha da folha em 390.

---

### P1: Curadoria das subcategorias no painel ⭐ MVP

**User Story**: como Adri, quero escolher quais subcategorias aparecem no painel de cada entrada,
para que o mega menu mostre o que vende e não a árvore inteira.

**Why P1**: hoje o painel despeja todas as filhas ativas; com 12 filhas ele já é ilegível.

**Acceptance Criteria**:

1. WHEN a Adri marca uma subcategoria no painel de uma entrada THEN ela SHALL aparecer no painel
   daquele dispositivo, na ordem da árvore.
2. WHEN a Adri desmarca uma subcategoria THEN ela SHALL sumir **do menu** e SHALL continuar
   existindo na loja (página, busca, rodapé, grade da home) — a tela SHALL dizer isso em texto.
3. WHEN o painel tem mais de 8 subcategorias marcadas THEN o mega menu SHALL distribuí-las em
   colunas de **até 8**, na ordem da árvore, sem campo de configuração de coluna.
4. WHEN uma entrada não tem nenhuma subcategoria marcada e nenhum banner THEN ela SHALL ser **link
   direto** na barra, sem painel e sem seta.
5. WHEN o painel abre THEN ele SHALL oferecer "ver tudo em «nome da entrada»" apontando para a
   canônica da categoria (`categoryHref`).
6. WHEN a entrada está no menu do celular THEN a folha SHALL mostrar as subcategorias marcadas
   **para o celular**, que podem ser em número diferente das do computador.

**Independent Test**: marcar 5 de 12 subcategorias no celular e 12 no computador; abrir as duas
larguras e contar.

---

### P1: Banners de destaque no painel ⭐ MVP

**User Story**: como Adri, quero pôr até dois banners com foto em cada painel do menu, para anunciar
uma coleção ou uma peça no lugar onde a cliente está decidindo para onde ir.

**Why P1**: é o que substitui o card sem imagem e a faixa automática de produtos.

**Acceptance Criteria**:

1. WHEN a Adri configura um banner THEN o sistema SHALL aceitar imagem, selo, título, texto e
   destino, e SHALL permitir **até dois** banners por entrada por dispositivo.
2. WHEN a Adri tenta salvar um terceiro banner THEN o sistema SHALL recusar com o motivo em texto.
   (É o **único** limite desta feature, e ele é de layout do painel, não de contagem de menu.)
3. WHEN o destino escolhido é **categoria** ou **produto** THEN o banner SHALL levar à canônica dele
   (`categoryHref` / `productPath`), e o sistema SHALL validar o destino **na leitura**: apagado ou
   inativo ⇒ o banner **não renderiza**, e o painel encolhe sem deixar buraco.
4. WHEN o destino é um **endereço digitado** THEN o sistema SHALL usar exatamente a mesma validação
   do item de link (interno conferido contra as rotas declaradas; externo exigindo `https://`).
5. WHEN o banner não tem título THEN o sistema SHALL usar o nome do destino; WHEN não tem texto,
   SHALL usar a descrição do destino; WHEN não tem imagem, SHALL renderizar o bloco de cor com o
   texto, sem quadro vazio.
6. WHEN a Adri envia a arte THEN o sistema SHALL aceitar **uma arte para o computador e outra para o
   celular**, e SHALL dizer em tela qual das duas ainda falta.
7. WHEN o dispositivo tem banner configurado mas **sem** a arte daquele dispositivo THEN o banner
   SHALL renderizar com a arte do outro, e a tela do painel SHALL avisar que está reaproveitando.
8. WHEN a entrada não tem banner THEN o painel SHALL ficar só com a lista, sem espaço reservado.
9. WHEN o painel do celular abre THEN o banner SHALL aparecer **dentro do acordeão da entrada**, e
   não uma vez só no fim da folha.

**Independent Test**: configurar dois banners em "Coleção Afetivas" e nenhum em "Correntes"; abrir os
dois painéis e ver a diferença de composição.

---

### P1: A tela `/admin/menu` reconstruída ⭐ MVP

**User Story**: como Adri, quero uma tela onde eu veja e mude tudo isso num lugar só, sabendo o que
estou olhando (computador ou celular).

**Why P1**: sem ela nada acima é alcançável.

**Acceptance Criteria**:

1. WHEN a tela abre THEN ela SHALL apresentar um alternador **Computador / Celular** que troca ao
   mesmo tempo o que se edita e o que a prévia mostra.
2. WHEN a Adri arrasta uma categoria THEN o sistema SHALL reordenar a **categoria** (a `sort_order`
   da árvore) e SHALL avisar que essa ordem vale também para a grade da home e o rodapé.
3. WHEN a Adri tenta arrastar entre ramos diferentes THEN o sistema SHALL recusar com o motivo, como
   hoje.
4. WHEN a tela lista o menu THEN ela SHALL mostrar **exatamente** o que a loja renderiza — categorias
   e links, na mesma ordem —, e **nenhuma** entrada declarada no próprio painel.
5. WHEN a leitura das categorias ou dos links falha THEN a tela SHALL mostrar o erro com botão de
   tentar de novo, e não uma lista vazia.
6. WHEN uma gravação falha THEN o sistema SHALL dizer o que não salvou, e o estado da tela SHALL
   voltar ao que está no banco.

**Independent Test**: abrir `/admin/menu`, trocar de aba e ver a lista, a contagem e a prévia mudarem
juntas.

---

### P2: A prévia ao vivo do menu

**User Story**: como Adri, quero ver a loja de verdade enquanto mexo no menu, para conferir se a
barra estoura ou se o painel ficou cheio antes de publicar.

**Why P2**: a tela funciona sem ela (há "Ver na loja" em nova aba); mas é o que impede o painel de
voltar a ter um desenho próprio — e, sem teto de itens, é onde o estouro da barra fica visível.

**Acceptance Criteria**:

1. WHEN a tela abre THEN a prévia SHALL ser a **loja num iframe**, com o menu já aberto na entrada
   selecionada, e o painel SHALL **não** conter um segundo desenho do menu.
2. WHEN a Adri muda algo ainda não salvo THEN a prévia SHALL refletir o rascunho sem recarregar.
3. WHEN o alternador está em **Celular** THEN o iframe SHALL medir 390 de largura — a loja escolhe as
   media queries dela pelo viewport, então a prévia SHALL ser escalada, nunca encolhida.
4. WHEN `VITE_STORE_URL` não está definida THEN a tela SHALL dizer isso e SHALL continuar editável.
5. WHEN a prévia recebe uma mensagem de origem diferente da loja THEN ela SHALL ignorá-la.

**Independent Test**: desligar uma entrada e ver a barra da prévia perder o item sem salvar.

---

### P3: Busca no seletor de ícones

**User Story**: como Adri, quero digitar para achar o ícone, para não varrer o conjunto inteiro.

**Acceptance Criteria**:

1. WHEN a Adri digita no seletor THEN o sistema SHALL filtrar pelo nome do ícone, sem diferenciar
   acento nem caixa.

---

## Edge Cases

- WHEN a categoria de destino de um banner é apagada THEN o banner SHALL sumir do menu (a referência
  mora em jsonb, onde não cabe FK — a validação é na leitura).
- WHEN a árvore tem ciclo (`a → b → a`) THEN a montagem do menu SHALL terminar, sem travar o header.
- WHEN o menu tem itens demais para a largura THEN a faixa SHALL rolar; o `body` **nunca** SHALL
  rolar na horizontal.
- WHEN a loja é carregada sem nenhum item no menu daquele dispositivo THEN a faixa de departamentos
  SHALL não renderizar, e o header SHALL continuar com marca, busca e ações.
- WHEN a consulta de categorias falha na loja THEN o menu SHALL renderizar vazio e o resto da página
  SHALL continuar funcionando.
- WHEN um item de link aponta para uma rota que deixou de existir THEN o cadastro SHALL recusar a
  gravação na próxima edição; o item já gravado SHALL continuar renderizando (a loja não tem como
  saber, e sumir com ele em silêncio seria pior que um 404 visível).
- WHEN o mesmo ícone é escolhido para dois itens THEN o sistema SHALL aceitar (não é chave).
- WHEN a imagem do banner não carrega THEN o card SHALL manter o texto e o link legíveis.

---

## Requirement Traceability

| ID | Story | Fase | Status |
| --- | --- | --- | --- |
| NAV-01 | P1 Curadoria — duas superfícies independentes | Design | Pending |
| NAV-02 | P1 — estado cruzado visível na linha ("desligada no celular") | Design | Pending |
| NAV-03 | P1 — **sem teto de itens**, e nenhuma recusa por contagem no código | Design | Pending |
| NAV-04 | P1 — barra do desktop rola na horizontal quando não cabe; `body` nunca rola | Design | Pending |
| NAV-05 | P1 — contagem é informação, não vaga consumida | Design | Pending |
| NAV-06 | P1 — papel (barra × painel) derivado da árvore | Design | Pending |
| NAV-07 | P1 — inativa some da loja e é marcada na tela | Design | Pending |
| NAV-08 | P1 — migração preserva o menu que já existe | Design | Pending |
| NAV-09 | P1 Link — cadastro com rótulo, destino, ícone e ligação por dispositivo | Design | Pending |
| NAV-10 | P1 — destino interno conferido contra as rotas declaradas, na gravação | Design | Pending |
| NAV-11 | P1 — externo exige `https://` e sai com `noopener noreferrer` | Design | Pending |
| NAV-12 | P1 — link é link direto: sem painel, seta, subcategoria ou banner | Design | Pending |
| NAV-13 | P1 — remover o link não mexe na página de destino | Design | Pending |
| NAV-14 | P1 — categorias e links ordenados juntos; **zero item de menu em JSX** | Design | Pending |
| NAV-15 | P1 — sem links, a barra é só categorias, sem sobra | Design | Pending |
| NAV-16 | P1 Ícone — seletor com o desenho de verdade e "sem ícone" | Design | Pending |
| NAV-17 | P1 — mesmo ícone nas duas superfícies | Design | Pending |
| NAV-18 | P1 — sem ícone não reserva espaço | Design | Pending |
| NAV-19 | P1 — chave inválida degrada para sem ícone | Design | Pending |
| NAV-20 | P1 — ícone em `accent`, rótulo em `on-primary` | Design | Pending |
| NAV-21 | P1 — um dono só do conjunto de ícones, alcançável pelos dois apps | Design | Pending |
| NAV-22 | P1 Subcategorias — marcadas aparecem, na ordem da árvore | Design | Pending |
| NAV-23 | P1 — desmarcada some do menu e continua na loja | Design | Pending |
| NAV-24 | P1 — colunas de até 8, calculadas | Design | Pending |
| NAV-25 | P1 — entrada sem filhas e sem banner é link direto | Design | Pending |
| NAV-26 | P1 — "ver tudo em X" aponta para a canônica | Design | Pending |
| NAV-27 | P1 — curadoria de filhas é por dispositivo | Design | Pending |
| NAV-28 | P1 Banner — até dois por entrada por dispositivo | Design | Pending |
| NAV-29 | P1 — terceiro banner é recusado com motivo | Design | Pending |
| NAV-30 | P1 — destino categoria/produto validado na leitura | Design | Pending |
| NAV-31 | P1 — destino digitado usa a mesma validação do item de link | Design | Pending |
| NAV-32 | P1 — herança de título/texto do destino; sem imagem não vira buraco | Design | Pending |
| NAV-33 | P1 — arte por dispositivo, com aviso do que falta | Design | Pending |
| NAV-34 | P1 — arte ausente reaproveita a do outro, com aviso no painel | Design | Pending |
| NAV-35 | P1 — sem banner o painel encolhe | Design | Pending |
| NAV-36 | P1 — no celular o banner mora dentro do acordeão da entrada | Design | Pending |
| NAV-37 | P1 Tela — alternador Computador/Celular governa edição e prévia | Design | Pending |
| NAV-38 | P1 — arrastar reordena a árvore, com o aviso do alcance | Design | Pending |
| NAV-39 | P1 — recusa de arraste entre ramos | Design | Pending |
| NAV-40 | P1 — a tela mostra o que a loja renderiza, e nada declarado nela | Design | Pending |
| NAV-41 | P1 — falha de leitura é superfície explícita | Design | Pending |
| NAV-42 | P1 — falha de gravação diz o que não salvou | Design | Pending |
| NAV-43 | P2 Prévia — a loja num iframe, sem segundo desenho | Design | Pending |
| NAV-44 | P2 — rascunho ao vivo | Design | Pending |
| NAV-45 | P2 — celular é 390 escalado, não encolhido | Design | Pending |
| NAV-46 | P2 — sem `VITE_STORE_URL` a tela segue editável | Design | Pending |
| NAV-47 | P2 — mensagem de origem estranha é ignorada | Design | Pending |
| NAV-48 | P3 — busca por nome no seletor de ícones | - | Pending |

**Coverage:** 48 requisitos, 0 mapeados para tarefas ainda.

---

## Guardas que esta feature deve deixar para trás

Não é opcional neste repositório: identidade e curadoria erram **sem quebrar nada**.

| Guarda | O que derruba a suíte |
| --- | --- |
| `menuSurfaceSingleOwner.test.ts` | Qualquer arquivo de `apps/**` ler `show_in_menu` (coluna gerada, legado) em vez de passar por `menuEntries(…, surface)`. **Âncora dupla** |
| `menuSemItemFixo.test.ts` | Um item de menu voltar a ser escrito em JSX: `FIXED_ENTRIES`/`FIXED_MENU_ENTRIES` existirem; `Header.tsx` ou `MobileMenu.tsx` conterem `to="/sobre"` (ou qualquer rota) dentro da navegação; o painel declarar item próprio. **Âncora dupla** — é o guarda que mata o `/crie-seu-botton` pela raiz |
| `menuSemTeto.test.ts` | `MENU_SLOT_LIMIT`, `menuSlotRefusal` ou "vagas" voltarem a existir; a barra do desktop trocar rolagem por `flex-wrap` |
| `menuIconCatalog.test.ts` | Chave de `MENU_ICON_KEYS` sem componente em `@estrelinha/ui/icons`; âncora de contagem |
| `previaUnica.test.ts` (estendido) | `MenuBarPreview.tsx` voltar a existir; o painel desenhar o menu; o painel importar de `apps/store` |
| `menuBanner.test.ts` | Destino inexistente/inativo renderizar; externo sem `noopener`; terceiro banner passar |
| `menuLinkTarget.test.ts` | Destino interno que não resolve numa rota declarada ser aceito na gravação; o validador do link e o do banner divergirem (é **um** dono) |
| `menuSchema.test.ts` | A migration afrouxar: `show_in_menu` deixar de ser gerada; `grant` alcançar `anon`; o índice parcial sumir; o backfill deixar de ser idempotente; o "Sobre" não ser semeado |

---

## Success Criteria

- [ ] A Adri monta um menu diferente no computador e no celular sem tocar em código, **inclusive
      tirando ou trocando o "Sobre"** — conferido em navegador real, em 390 e em 1440.
- [ ] Não existe item de menu escrito no código da loja nem do painel — provado por teste.
- [ ] Nenhuma superfície da loja lê a curadoria do menu por conta própria: as quatro leem
      `@estrelinha/core/menu`.
- [ ] Não existe segundo desenho do menu no backoffice.
- [ ] Sem regressão nas baselines: **27 erros / 5 warnings** de lint, **0 · 0 · 0** de tipos, e a
      contagem de testes só sobe — com as **três** quedas declaradas sendo os casos de `TrendingLane`,
      de `MenuBarPreview` e de `menuSlotRefusal`/`MENU_SLOT_LIMIT`, que saem junto com as superfícies
      e a regra que eles cobriam.
