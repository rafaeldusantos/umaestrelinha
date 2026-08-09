# 22 · Material Afetivo — Especificação

> **Fatiada por [`AD-016`](../../STATE.md).** Depende da
> [`20-rebrand-uma-estrelinha`](../20-rebrand-uma-estrelinha/spec.md) e da
> [`21-catalogo-nuvemshop`](../21-catalogo-nuvemshop/spec.md) — **as duas fechadas**. Contexto e
> decisões compartilhadas: [`20/context.md`](../20-rebrand-uma-estrelinha/context.md).
>
> **Reescrita em 2026-08-09**, depois de as três perguntas bloqueantes serem respondidas e de o
> catálogo real ser medido. A medição derrubou duas suposições — o registro está em
> *[O que a medição mudou](#o-que-a-medição-mudou)*, abaixo, porque uma spec que apaga a própria
> versão errada não ensina nada a quem chegar depois.

## Problem Statement

Uma joia afetiva não é um produto que se compra e chega. A cliente precisa **enviar pelo correio um
material insubstituível** — cinzas de cremação, leite materno, um cacho de cabelo, os pelos do pet
que morreu, o primeiro dente do filho. Se esse material se perde, não existe segunda via.

Hoje isso é combinado por WhatsApp depois da compra, e ninguém tem uma tela que responda a pergunta
que a operação faz o dia inteiro: **quais pedidos ainda esperam material e quais já posso produzir?**
A loja herdada não tem esse conceito — um pin não exige nada de ninguém.

Esta é a feature que separa "loja de bottons reaproveitada" de "loja da Uma Estrelinha".

## Goals

- [ ] A cliente sabe, **antes de comprar**, que precisa enviar material, qual material e como enviar.
- [ ] O pedido carrega qual material foi exigido e qual personalização foi pedida.
- [ ] A Adri tem uma fila de pedidos aguardando material, alcançável em um clique.
- [ ] A cliente pode informar o rastreio da remessa dela, e a fila não mente quando ela não informa.
- [ ] Nenhuma decisão de dinheiro passa a depender do material.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Preço variando por material | Preço vem de `product_variants`; todo desconto passa por `resolveOrderPricing` (`AD-015`). Material com preço próprio é feature nova. **Não confundir com gravação, que altera preço e está DENTRO do escopo** — ver `MAT-06`. |
| Upload de foto do material pela cliente | Storage, moderação e privacidade de imagem sensível são escopo próprio. |
| Etiqueta de postagem pré-paga para a cliente enviar | Integração de logística reversa; o `melhor-envio` atual cota envio de saída. |
| Rastreio do material **por item** | O estado é por pedido — confirmado com a Adri: as peças de um mesmo pedido chegam na mesma remessa. |
| Envio do endereço por **WhatsApp** depois da compra | Decisão do usuário em 2026-08-09: desejável, mas é feature própria. Registrado no `BACKLOG.md`. |
| Estado para material que chega errado ou insuficiente | Confirmado com a Adri: **não acontece**. Inventar o estado seria burocracia sem caso de uso. |
| Fluxo de aprovação de arte / prévia da peça | Operação que hoje acontece por WhatsApp e não foi desenhada. |

---

## O que a medição mudou

A primeira redação desta spec fazia duas afirmações que o catálogo real contradiz. As duas viraram
requisito diferente, e ficam registradas porque **as duas eram plausíveis** — é assim que uma spec
erra.

### 1 · "A cliente escolhe o material" era falso

`MAT-02` dizia que a página do produto exigiria a escolha do material antes de permitir comprar.
Medido em 2026-08-09 contra as 3.356 variações importadas:

| Eixo de variação | variações |
| --- | ---: |
| Cor | 2.602 |
| Letra | 810 |
| **Com gravação** | **626** |
| Tamanho | 598 |
| Tipos de elo · Modelo · Com Base · Pingente · … | 348 · 325 · 246 · 80 · … |
| **Material** | **0** |

**Nenhuma variação do catálogo tem eixo de material.** E o material está no **nome do produto**, em
massa: 169 produtos dizem "leite", 127 "cinzas", 85 "cabelo", 51 "coto", 50 "pet", 25 "dente", 25
"flores", 2 "penas". Pedir que a cliente escolha seria pedir que repita o que já escolheu ao clicar
no produto.

Pior: o produto `joia-afetiva-arvore-da-vida-com-cabelo-em-prata-925` chama-se *"Árvore da Vida com
Cabelo **e** Coto Umbilical"*. Ali "escolha o material" não é incompleto — é **errado**. A peça exige
os dois.

**O material é propriedade do PRODUTO, não escolha de compra.** A lista de materiais continua
existindo, e serve a três coisas, nenhuma delas sendo a cliente escolher:

1. **Qual ficha de instrução ela vê.** Preparar leite materno não é preparar cinzas não é preparar
   cabelo. Sem a lista, "Como enviar" é uma página genérica e ela adivinha.
2. **O que a Adri espera no envelope.** O pedido diz "aguardando: cabelo + coto umbilical".
3. **Se o pedido entra na fila.** Só isso seria um booleano — a lista não é necessária para a fila.

### 2 · "Gravação" já existe, e cobra

A primeira redação tratava "a peça aceita gravação" como campo novo. **Já é eixo de variação**, veio
da importação, e a loja já o desenha em chips:

| | |
| --- | ---: |
| Produtos com o eixo `Com gravação` | **35** de 689 |
| Variações que o carregam | **626** — o terceiro maior eixo do catálogo |
| Desses 35, quantos **cobram a mais** | **33** |
| Acréscimo | mín. R$ 28 · mediana **R$ 42** · máx. R$ 112 |

Então o liga/desliga não precisa ser construído: ele existe e precifica. O que **não** existe é o
**campo de texto** que ela digita e o **limite de caracteres**.

E a armadilha que isso quase produziu: a regra "material não altera preço" está certa para material e
**errada se escrita larga demais** — gravação altera preço, legitimamente, via `product_variants`.
Uma regra de dinheiro escrita com uma palavra a mais quebraria 33 produtos.

---

## Assumptions & Open Questions

| Assumption / decisão | Valor | Rationale | Confirmado? |
| --- | --- | --- | --- |
| Granularidade do rastreio | **Por pedido** | As peças de um pedido chegam na mesma remessa | **y** — Adri, 2026-08-09 |
| Quem determina o material | **O produto**, no cadastro | Ver *[O que a medição mudou](#o-que-a-medição-mudou)* | **y** — medido |
| Enum de material | `leite_materno`, `cabelo`, `cinzas`, `pelo_pet`, `dente_leite`, `coto_umbilical`, `placenta`, `flores`, `penas`, `outro` | Derivado das fichas da board `5MC-0` **mais** os nomes reais do catálogo — `coto_umbilical` (51 produtos) e `penas` não estavam na lista original | **y** — Adri + medido |
| Um produto pode exigir **mais de um** material | Sim — é lista, não valor único | "Árvore da Vida com Cabelo **e** Coto Umbilical" exige os dois | **y** — medido |
| "Aceita gravação" | **Derivado da variação escolhida** (`Com gravação: Sim`), não coluna nova | O eixo já existe em 35 produtos e já precifica | **y** — medido |
| Limite do texto de gravação | **Coluna por produto, editável no painel** | Um pingente não comporta o mesmo que uma pulseira; constante de código seria errada para quase todos | **y** — Adri, 2026-08-09 |
| Peça sem material afetivo | Não declara material e não entra na fila | O catálogo tem correntes e acessórios que não incorporam nada | **y** (`C-03`) |
| Material que chega errado/insuficiente | **Não acontece** — sem estado próprio | Adri, 2026-08-09 | **y** |
| Estados | `nao_aplicavel`, `aguardando_material`, `material_enviado`, `material_recebido`, `em_producao` | `material_enviado` entrou com o rastreio da cliente | **y** |
| Onde a cliente informa o rastreio | `/pedido/:id`, a rota de confirmação que já existe | Sobrevive ao F5 e é o link que o e-mail manda | **y** — Adri, 2026-08-09 |
| Informar o rastreio é obrigatório | **Não.** A Adri também pode informar pelo painel | "o cliente pode enviar pelo WhatsApp e eu adiciono o código no pedido dela" | **y** — Adri, 2026-08-09 |
| Endereço de envio | **Na página de compra** | Adri, 2026-08-09 | **y** |
| Quem marca "material recebido" | A admin, à mão, no backoffice | Não existe integração com os Correios que prove recebimento no ateliê | n — validar na Design |
| E-mail de material recebido | Tipo novo `material_received`, no contrato dirigido por estado do `AD-007` | `{ type, order_id }`, a function relê o pedido e recusa 422 se o estado não casar; idempotência por `order_emails` (`AD-006`) | n — validar na Design |
| Página "Como enviar" | Rota `/como-enviar-o-material` | Slug descritivo e indexável. **Entra em `ROUTE_SLUGS`** (`AD-018`): com categoria na raiz do domínio, rota nova sem reserva é colisão esperando acontecer | n — validar na Design |

**Open question — uma só, e não bloqueia o desenho:**

> **Existe peça que aceita QUALQUER material, em que a cliente é quem decide?** As fichas da board
> `5MC-0` falam em "Grupo Simples", o que sugere que sim. Enquanto não confirmado, o default é **o
> produto sempre declara** o que exige, e a cliente nunca escolhe.
>
> Se existir, **não é o mesmo formato**: hoje a lista do produto significa "mande todos estes"; o caso
> aberto significaria "mande um destes, você escolhe". São semânticas diferentes sobre a mesma lista,
> e por isso a distinção precisa de resposta antes de virar código — não depois.

---

## Sweep de dimensões implícitas

| Dimensão | Resolução |
| --- | --- |
| Validação de entrada e limites | `MAT-03` — limite por produto declarado na tela, contador impede envio acima; texto só com espaço é vazio |
| Falha e falha parcial | `MAT-09` — falha de e-mail nunca reverte estado nem retorna erro à admin (`AD-008`) |
| Idempotência / retry / duplicata | `MAT-08` — transição repetida converge para o mesmo estado; e-mail reusa `claim_order_email` (`AD-006`) |
| Fronteiras de auth e rate limit | `MAT-10`, `MAT-11` — mudar estado exige papel admin (`has_role`). **`orders` não tem policy de UPDATE para cliente, de propósito** (PAY-10, para ninguém adulterar `payment_status`), então o rastreio da cliente entra por **RPC `security definer` que escreve só aquele campo** — nunca por `PATCH` na tabela |
| Concorrência / ordenação | `MAT-08` — duas admins na mesma transição produzem o mesmo resultado de uma só |
| Ciclo de vida do dado | `MAT-05` — o pedido é **snapshot**: mudar a exigência no cadastro não altera pedido já criado |
| Observabilidade | `MAT-10` — a fila `aguardando_material` é a própria observabilidade da operação |
| Falha de dependência externa | `MAT-09` — o e-mail é o único externo, e sua falha é contida |
| Integridade de transição de estado | `MAT-07`, `MAT-08` — máquina de estado é função pura em `@estrelinha/core`, testada; estado de material e de **pagamento** são independentes |
| Endereçamento | `MAT-01` — a rota nova entra em `ROUTE_SLUGS` de `@estrelinha/core/routes`, senão o guarda bidirecional da `23` quebra — e é ele que impede a rota de encobrir uma categoria homônima |

---

## User Stories

### P1: A cliente sabe o que enviar, e como ⭐ MVP

**User Story**: Como cliente comprando um pingente com as cinzas do meu pai, quero saber na hora da
compra o que preciso enviar e como preparar, para não descobrir depois que faltava algo.

**Acceptance Criteria**:

1. WHEN a cliente abre `/como-enviar-o-material` THEN SHALL ver a página derivada das boards `5MC-0`
   (desktop) e `6AU-0` (mobile): passos, **fichas por material**, preparo especial, postagem,
   **endereço de envio** e checklist.
2. WHEN um produto exige material afetivo THEN a página do produto SHALL **declarar quais materiais**
   serão necessários e SHALL levar à ficha correspondente — em **ambas** as superfícies de compra
   (coluna de informação e barra fixa do mobile), que compartilham o mesmo estado. A compra **não**
   SHALL exigir escolha de material: o produto já determina.
3. WHEN um produto **não** exige material THEN nenhum aviso de material SHALL ser exibido, e a compra
   SHALL seguir o fluxo atual sem passo extra.
4. WHEN a variação escolhida tem `Com gravação: Sim` THEN um campo de texto SHALL aparecer, com
   **limite vindo do cadastro daquele produto**, contador visível, envio bloqueado acima do limite, e
   texto só de espaços tratado como vazio. WHEN a variação tem `Com gravação: Não` THEN o campo
   **não** SHALL existir.
5. WHEN o item entra no carrinho THEN a chave do item SHALL distinguir o **texto de gravação** — duas
   unidades do mesmo produto e da mesma variação com gravações diferentes SHALL ser **duas linhas**,
   não quantidade 2. (Mesma armadilha que a chave de `variantId` já custou à loja anterior, em duas
   telas.)
6. WHEN o pedido é criado THEN os materiais exigidos e o texto de gravação SHALL ser persistidos no
   item do pedido e SHALL aparecer no backoffice e no e-mail de confirmação.
7. WHEN o preço é calculado THEN o **material** SHALL não alterar valor. A **gravação** SHALL alterar,
   pelo caminho que já existe — `product_variants` —, e todo desconto SHALL continuar passando por
   `resolveOrderPricing` (`AD-015`). Nenhum preço SHALL ser calculado no front.

**Independent Test**: comprar a Árvore da Vida com gravação, e ver no admin os dois materiais exigidos
e o texto gravado, com o preço da variação `Com gravação: Sim`.

---

### P2: A Adri sabe em que ponto está o material de cada pedido

**User Story**: Como Adri, quero uma fila que me diga quais pedidos ainda esperam material e quais já
posso produzir, para parar de rastrear isso em conversa de WhatsApp.

**Acceptance Criteria**:

1. WHEN um pedido contém ao menos um item que exige material THEN SHALL nascer em
   `aguardando_material`.
2. WHEN um pedido não contém item que exige material THEN SHALL nascer em `nao_aplicavel` e não SHALL
   aparecer na fila de material.
3. WHEN a admin marca o material como recebido THEN o pedido SHALL transicionar para
   `material_recebido` a partir de `aguardando_material` **ou** de `material_enviado` — o salto direto
   é obrigatório, porque informar o rastreio é opcional. A transição SHALL ser **rejeitada com motivo
   visível** a partir de qualquer outro estado, `nao_aplicavel` incluído.
4. WHEN duas requisições tentam a mesma transição THEN o resultado final SHALL ser o mesmo de uma só,
   sem estado intermediário inválido.
5. WHEN o estado do material muda THEN o estado de **pagamento** SHALL permanecer intocado — as duas
   máquinas são independentes, e nenhuma decisão de dinheiro SHALL depender do material.
6. WHEN o material é marcado como recebido THEN um e-mail `material_received` SHALL ser enviado no
   contrato dirigido por estado do `AD-007`, com a idempotência de `order_emails` do `AD-006`.
7. WHEN o envio de e-mail falha THEN o pedido SHALL permanecer no estado novo — falha de e-mail nunca
   reverte estado nem retorna erro à admin (`AD-008`).
8. WHEN a admin abre a listagem de pedidos THEN SHALL poder filtrar por estado de material, e a fila
   `aguardando_material` SHALL ser alcançável em um clique — é a fila que **acumula**, no mesmo
   critério que ordena os eixos da sidebar.

**Independent Test**: criar dois pedidos (um com material, um sem), conferir estados iniciais, marcar
recebimento e ver o e-mail no Mailpit.

---

### P2: A cliente diz que postou

**User Story**: Como cliente que já postou o cacho de cabelo, quero registrar o código de rastreio no
meu pedido, para a Adri saber que está a caminho sem eu precisar chamar no WhatsApp.

**Acceptance Criteria**:

9. WHEN a cliente abre `/pedido/:id` de um pedido em `aguardando_material` THEN SHALL poder informar o
   **código de rastreio da remessa dela**, e o pedido SHALL passar a `material_enviado`.
10. WHEN ela **não** informa THEN nada SHALL travar: o pedido segue em `aguardando_material` e a Adri
    SHALL poder registrar o código pelo painel — é o caso de a cliente avisar por WhatsApp — ou pular
    direto para `material_recebido`.
11. WHEN o código é gravado THEN a escrita SHALL passar por **RPC que altera somente o campo de
    rastreio do material**, do próprio pedido da cliente. Nenhuma policy de `UPDATE` em `orders` SHALL
    ser aberta para a cliente — `payment_status` e valores permanecem inalcançáveis (PAY-10).
12. WHEN o pedido já está em `material_recebido` ou adiante THEN informar o código SHALL apenas
    registrar o dado, **sem mover o estado para trás**.

**Independent Test**: pela loja, informar um código num pedido aguardando material e ver o estado
mudar; pelo painel, informar outro código num segundo pedido e ver o mesmo resultado.

---

> **O bloco `P3` saiu daqui.** Ele descrevia "slug antigo → slug novo", e a medição feita no fecho da
> [`21`](../21-catalogo-nuvemshop/spec.md) mostrou que o problema real era o **caminho**. Virou a
> feature [`23-urls-e-seo`](../23-urls-e-seo/spec.md), **já fechada** — inclusive os redirects de
> `/produtos/:slug` que esta feature carregava.

---

## Edge Cases

- WHEN a cliente adiciona ao carrinho, muda o texto de gravação e volta THEN o item anterior SHALL
  permanecer intacto — gravação diferente cria linha nova, não edita a existente.
- WHEN um produto que exigia material tem essa exigência removida no cadastro THEN os pedidos já
  criados SHALL manter os materiais declarados — o pedido é snapshot.
- WHEN um produto exige **dois** materiais THEN o pedido SHALL listar os dois, e o estado SHALL ser
  **um** — ele só avança quando toda a remessa chegou.
- WHEN a admin tenta marcar recebimento de um pedido `nao_aplicavel` THEN SHALL ser recusado com
  motivo, não silenciosamente ignorado.
- WHEN o e-mail `material_received` é disparado duas vezes para o mesmo pedido THEN SHALL sair uma
  vez só.
- WHEN o pedido é cancelado antes de o material chegar THEN o estado de material SHALL parar de
  aparecer na fila.
- WHEN o limite de gravação de um produto muda no cadastro THEN os pedidos já criados SHALL manter o
  texto que foi gravado, ainda que ele exceda o limite novo — snapshot, de novo.
- WHEN a cliente abre `/pedido/:id` **sem sessão** no navegador THEN o campo de rastreio SHALL ficar
  indisponível com motivo, nunca falhar em silêncio — a RPC exige identidade, e o caminho alternativo
  (avisar a Adri) continua valendo.

---

## Requirement Traceability

| ID | História | Fase | Status |
| --- | --- | --- | --- |
| MAT-01 | P1 · Página "Como enviar o material", com fichas e endereço (AC 1) | Specify | Pending |
| MAT-02 | P1 · Material é propriedade do produto, declarada nas duas superfícies (AC 2, 3) | Specify | Pending |
| MAT-03 | P1 · Gravação derivada da variação, com limite por produto (AC 4) | Specify | Pending |
| MAT-04 | P1 · Chave do item distingue o texto de gravação (AC 5) | Specify | Pending |
| MAT-05 | P1 · Persistência no pedido, admin e e-mail (AC 6) | Specify | Pending |
| MAT-06 | P1 · Material não altera preço; gravação altera **via variação** (AC 7) | Specify | Pending |
| MAT-07 | P2 · Estado inicial do material por pedido (AC 1, 2) | Specify | Pending |
| MAT-08 | P2 · Transições guardadas, idempotentes, independentes do pagamento (AC 3, 4, 5) | Specify | Pending |
| MAT-09 | P2 · E-mail `material_received` contido (AC 6, 7) | Specify | Pending |
| MAT-10 | P2 · Filtro e fila de material no admin (AC 8) | Specify | Pending |
| MAT-11 | P2 · Rastreio da remessa da cliente, por RPC, opcional nas duas pontas (AC 9, 10, 11, 12) | Specify | Pending |

**Cobertura:** 11 requisitos. `MAT-11` nasceu da resposta da Adri em 2026-08-09; `MAT-02`, `MAT-03`,
`MAT-04` e `MAT-06` mudaram de conteúdo pela medição do catálogo, mantendo o ID.

---

## Success Criteria

- [ ] Uma compra de joia com material exigido e gravação atravessa do carrinho ao pedido pago em
      **390×844**.
- [ ] Duas unidades do mesmo produto e variação com gravações diferentes são **duas linhas** no
      carrinho.
- [ ] O preço cobrado de um item com `Com gravação: Sim` é o da variação — conferido contra o
      recálculo do servidor, não contra a tela.
- [ ] A fila `aguardando_material` existe no admin e um pedido atravessa até `material_recebido` com
      e-mail entregue no Mailpit, **pelos dois caminhos**: com rastreio informado e sem.
- [ ] A cliente informa um rastreio pela loja e o pedido muda de estado, sem que nenhuma policy de
      `UPDATE` em `orders` tenha sido aberta.
- [ ] Nenhum teste de dinheiro muda de resultado por causa desta feature.
