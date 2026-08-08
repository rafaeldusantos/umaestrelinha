# 22 · Material Afetivo — Especificação

> **Fatiada por [`AD-016`](../../STATE.md).** Depende da
> [`20-rebrand-uma-estrelinha`](../20-rebrand-uma-estrelinha/spec.md) e da
> [`21-catalogo-nuvemshop`](../21-catalogo-nuvemshop/spec.md) — precisa de produto real para ser
> testada com peça de verdade. Contexto e decisões compartilhadas:
> [`20/context.md`](../20-rebrand-uma-estrelinha/context.md).

## Problem Statement

Uma joia afetiva não é um produto que se compra e chega. A cliente precisa **enviar pelo correio um
material insubstituível** — cinzas de cremação, leite materno, um cacho de cabelo, os pelos do pet
que morreu, o primeiro dente do filho. Se esse material se perde, não existe segunda via.

Hoje isso é combinado por WhatsApp depois da compra, e ninguém tem uma tela que responda a pergunta
que a operação faz o dia inteiro: **quais pedidos ainda esperam material e quais já posso produzir?**
A loja herdada não tem esse conceito — um pin não exige nada de ninguém.

Esta é a feature que separa "loja de bottons reaproveitada" de "loja da Uma Estrelinha".

## Goals

- [ ] A cliente sabe, **antes de comprar**, que precisa enviar material e como enviar.
- [ ] O pedido carrega qual material foi declarado e qual personalização foi pedida.
- [ ] A Adri tem uma fila de pedidos aguardando material, alcançável em um clique.
- [ ] Nenhuma decisão de dinheiro passa a depender do material.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Preço variando por material | Preço vem de `product_variants`; todo desconto passa por `resolveOrderPricing` (`AD-015`). Material com preço próprio é feature nova. |
| Upload de foto do material pela cliente | Storage, moderação e privacidade de imagem sensível são escopo próprio. |
| Etiqueta de postagem pré-paga para a cliente enviar | Integração de logística reversa; o `melhor-envio` atual cota envio de saída. |
| Rastreio do material por item | O estado é **por pedido** — ver Assumptions. |
| Fluxo de aprovação de arte / prévia da peça | Operação que hoje acontece por WhatsApp e não foi desenhada. |

---

## Assumptions & Open Questions

| Assumption / decisão | Chosen default | Rationale | Confirmado? |
| --- | --- | --- | --- |
| Granularidade do rastreio | **Por pedido**, não por item | Um kit com pingente de cinzas + pulseira de cabelo é **uma remessa**; rastrear por item multiplicaria estado sem ganho operacional | n — **confirmar com a Adri** |
| Enum de material | `leite_materno`, `cabelo`, `cinzas`, `pelo_pet`, `dente_leite`, `placenta`, `flores`, `outro` | Derivado das fichas da board `5MC-0` (Leite Materno, Cabelos, Cinzas, Grupo Simples, Preparo Especial/Placenta) + categorias do site | n — **confirmar com a Adri** |
| Peça sem material afetivo | Não declara material e não entra na fila | O catálogo tem correntes e acessórios que não incorporam nada | **y** (`C-03`) |
| Quem marca "material recebido" | A admin, à mão, no backoffice | Não existe integração com os Correios que prove recebimento no ateliê | n — validar na Design |
| Estados | `nao_aplicavel`, `aguardando_material`, `material_recebido`, `em_producao` | Quatro estados cobrem a operação descrita; mais que isso vira burocracia | n — validar na Design |
| E-mail de material recebido | Tipo novo `material_received`, no contrato dirigido por estado do `AD-007` | `{ type, order_id }`, a function relê o pedido e recusa 422 se o estado não casar; idempotência por `order_emails` (`AD-006`) | n — validar na Design |
| Limite do texto de gravação | 30 caracteres | Chute fundamentado no tamanho físico de um pingente; **precisa da Adri** | n — **confirmar com a Adri** |
| Página "Como enviar" | Rota `/como-enviar-o-material` | Slug descritivo e indexável | n — validar na Design |

**Open questions:** três itens marcados **confirmar com a Adri** — granularidade do rastreio, enum de
material e limite de gravação. Nenhum bloqueia o desenho; os três bloqueiam a implementação e devem
ser fechados na abertura desta feature.

---

## Sweep de dimensões implícitas

| Dimensão | Resolução |
| --- | --- |
| Validação de entrada e limites | `MAT-03` — limite de caracteres declarado na tela, contador impede envio acima; texto só com espaço é vazio |
| Falha e falha parcial | `MAT-09` — falha de e-mail nunca reverte estado nem retorna erro à admin (`AD-008`) |
| Idempotência / retry / duplicata | `MAT-08` — transição repetida converge para o mesmo estado; e-mail reusa `claim_order_email` (`AD-006`) |
| Fronteiras de auth e rate limit | `MAT-10` — mudar estado de material exige papel admin (`has_role`); RLS impede a cliente de escrever |
| Concorrência / ordenação | `MAT-08` — duas admins na mesma transição produzem o mesmo resultado de uma só, sem estado intermediário inválido |
| Ciclo de vida do dado | `MAT-05` — o pedido é **snapshot**: mudar a exigência no cadastro não altera pedido já criado |
| Observabilidade | `MAT-10` — a fila `aguardando_material` é a própria observabilidade da operação |
| Falha de dependência externa | `MAT-09` — o e-mail é o único externo, e sua falha é contida |
| Integridade de transição de estado | `MAT-07`, `MAT-08` — máquina de estado é função pura em `@estrelinha/core`, testada; estado de material e de **pagamento** são independentes |

---

## User Stories

### P1: A cliente diz qual material vai enviar ⭐ MVP

**User Story**: Como cliente comprando um pingente com as cinzas do meu pai, quero declarar isso na
compra e ser instruída sobre como enviar, para não descobrir só depois que precisava mandar algo.

**Acceptance Criteria**:

1. WHEN a cliente abre `/como-enviar-o-material` THEN SHALL ver a página derivada das boards `5MC-0`
   (desktop) e `6AU-0` (mobile): passos, fichas por material, preparo especial, postagem e checklist.
2. WHEN um produto exige material afetivo THEN a página do produto SHALL exigir a **escolha do
   material** antes de permitir adicionar ao carrinho, e o CTA SHALL permanecer desabilitado com
   motivo visível enquanto não houver escolha — nas **duas** superfícies de compra (coluna de
   informação e barra fixa do mobile), que compartilham o mesmo estado.
3. WHEN um produto **não** exige material THEN nenhum campo de material SHALL ser exibido, e a compra
   SHALL seguir o fluxo atual sem passo extra.
4. WHEN a peça aceita gravação THEN o texto SHALL ter limite de caracteres declarado na tela, o
   contador SHALL impedir o envio acima do limite, e texto composto só de espaços SHALL ser tratado
   como vazio.
5. WHEN o item entra no carrinho THEN a chave do item SHALL distinguir material e personalização —
   duas unidades do mesmo produto com materiais diferentes SHALL ser **duas linhas**, não quantidade
   2. (Mesma armadilha que a chave de `variantId` já custou à loja anterior, em duas telas.)
6. WHEN o pedido é criado THEN o material declarado e a personalização SHALL ser persistidos no item
   do pedido e SHALL aparecer no backoffice e no e-mail de confirmação.
7. WHEN o preço é calculado THEN a escolha de material SHALL **não** alterar valor — o preço vem de
   `product_variants` e todo desconto segue passando por `resolveOrderPricing` (`AD-015`).

**Independent Test**: comprar um pingente escolhendo "cinzas" com gravação e ver as duas informações
no pedido dentro do admin.

---

### P2: A Adri sabe em que ponto está o material de cada pedido

**User Story**: Como Adri, quero uma fila que me diga quais pedidos ainda esperam material e quais já
posso produzir, para parar de rastrear isso em conversa de WhatsApp.

**Acceptance Criteria**:

1. WHEN um pedido contém ao menos um item com material declarado THEN SHALL nascer no estado
   `aguardando_material`.
2. WHEN um pedido não contém item com material THEN SHALL nascer em `nao_aplicavel` e não SHALL
   aparecer na fila de material.
3. WHEN a admin marca o material como recebido THEN o pedido SHALL transicionar para
   `material_recebido`, e a transição SHALL ser **rejeitada** a partir de qualquer estado que não
   seja `aguardando_material`.
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

### P3: As URLs indexadas continuam resolvendo

**User Story**: Como Adri, quero que quem chegar pelo Google num endereço antigo caia no produto
certo, para não perder o tráfego que as landing pages vêm construindo.

**Why P3**: Só passa a valer no go-live, que depende de decisão de DNS ainda não tomada (`C-08`).

**Acceptance Criteria**:

1. WHEN uma URL de produto não corresponde a nenhum slug atual THEN o sistema SHALL resolver o
   redirect por `product_redirects` e responder o produto correto.
2. WHEN uma URL de categoria antiga é acessada THEN SHALL resolver por uma tabela de redirect de
   categoria equivalente, criada nesta feature — hoje só existe a de produto (`20260801120300`).
3. WHEN nenhum redirect casa THEN a loja SHALL responder a 404 própria, nunca uma tela em branco.

---

## Edge Cases

- WHEN a cliente adiciona ao carrinho, muda o material e volta THEN o item anterior SHALL permanecer
  intacto — mudar material cria linha nova, não edita a existente.
- WHEN um produto que exigia material tem essa exigência removida no cadastro THEN os pedidos já
  criados SHALL manter o material declarado — o pedido é snapshot.
- WHEN um pedido tem dois itens com materiais diferentes THEN SHALL haver **um** estado de material,
  e ele só avança quando toda a remessa chegou.
- WHEN a admin tenta marcar recebimento de um pedido `nao_aplicavel` THEN SHALL ser recusado com
  motivo, não silenciosamente ignorado.
- WHEN o e-mail `material_received` é disparado duas vezes para o mesmo pedido THEN SHALL sair uma
  vez só.
- WHEN o pedido é cancelado antes de o material chegar THEN o estado de material SHALL parar de
  aparecer na fila.

---

## Requirement Traceability

| ID | História | Fase | Status |
| --- | --- | --- | --- |
| MAT-01 | P1 · Página "Como enviar o material" (AC 1) | Specify | Pending |
| MAT-02 | P1 · Escolha de material obrigatória nas duas superfícies (AC 2, 3) | Specify | Pending |
| MAT-03 | P1 · Personalização de texto com limite e trim (AC 4) | Specify | Pending |
| MAT-04 | P1 · Chave do item distingue material e personalização (AC 5) | Specify | Pending |
| MAT-05 | P1 · Persistência no pedido, admin e e-mail (AC 6) | Specify | Pending |
| MAT-06 | P1 · Material não altera preço (AC 7) | Specify | Pending |
| MAT-07 | P2 · Estado inicial do material por pedido (AC 1, 2) | Specify | Pending |
| MAT-08 | P2 · Transições guardadas, idempotentes, independentes do pagamento (AC 3, 4, 5) | Specify | Pending |
| MAT-09 | P2 · E-mail `material_received` contido (AC 6, 7) | Specify | Pending |
| MAT-10 | P2 · Filtro e fila de material no admin (AC 8) | Specify | Pending |
| SEO-01 | P3 · Redirect de produto por `product_redirects` | Specify | Pending |
| SEO-02 | P3 · Redirect de categoria (tabela nova) | Specify | Pending |
| SEO-03 | P3 · 404 própria quando nenhum redirect casa | Specify | Pending |

**Cobertura:** 13 requisitos · aguardando o fecho das features `20` e `21`.

---

## Success Criteria

- [ ] Uma compra de joia com material declarado atravessa do carrinho ao pedido pago em **390×844**.
- [ ] Dois itens do mesmo produto com materiais diferentes são duas linhas no carrinho.
- [ ] A fila `aguardando_material` existe no admin e um pedido atravessa até `material_recebido` com
      e-mail entregue no Mailpit.
- [ ] Nenhum teste de dinheiro muda de resultado por causa desta feature.
