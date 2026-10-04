# 59 · Minha Conta V2 — Especificação

> Desenho: Paper, página **"59 · Minha Conta V2 — proposta"** (6 quadros). O retrato do estado
> anterior está na página **"Minha Conta — como está hoje"**. Decisões da cliente em
> [`context.md`](context.md).

## Problem Statement

A área da cliente (`/conta`, que é também o "Meus pedidos" do rodapé e do menu) é uma lista de
acordeões que **não responde à pergunta que trouxe a cliente até ela**: *onde está a minha joia e o
que eu preciso fazer?* Medido no código e no print de produção de 2026-10-04:

- Pedido **pago** aparece como **"Pendente"**: a tela conhece 5 status e o banco tem 6, e o que ela
  não conhece cai no padrão. E pagar não muda `orders.status`, só `payment_status` — nenhuma coluna
  sozinha responde "em que pé está".
- O **rastreio do pacote** (`orders.tracking_code`) existe e nenhuma tela da cliente o mostra.
- O **campo para informar o código de envio do material** existe só em `/pedido/:id`, e a conta
  **não leva até lá** — a cliente só chega pelo link do e-mail.
- PIX **expirado** ou **recusado** some da tela: o servidor aceita gerar um código novo para o mesmo
  pedido (`RETRYABLE_STATUSES`), mas nenhuma tela oferece o caminho.
- Não há como alterar nome, telefone ou endereço. E, do lado oposto, **o banco deixa a cliente
  alterar o próprio CPF e o e-mail** — a policy de `UPDATE` em `customers` libera a linha inteira.
- No celular, o número antigo (`#NP-MUBBLKLYGOMR`) em Libre Baskerville quebra em duas linhas e
  **empurra o total para fora do cartão** (rolagem horizontal do body); o avatar é espremido pelo
  e-mail; o item sem tamanho mostra "· Qtd: 1" com o ponto solto; a bolha do WhatsApp cobre o total.

## Goals

- [ ] A cliente vê, **sem abrir nada**, a situação de cada pedido num rótulo que junta pedido,
      pagamento e material — e esse rótulo tem **um dono só**, lido por todas as telas.
- [ ] Toda ação pendente (pagar, gerar novo PIX, informar o código do material) aparece **no topo da
      conta** e leva ao lugar onde ela se resolve, em no máximo 1 toque.
- [ ] O detalhe do pedido (`/pedido/:id`) mostra rastreio, linha do tempo com datas reais, material,
      peças, pagamento e endereço de entrega.
- [ ] A cliente altera nome, WhatsApp e endereço sozinha; e-mail e CPF já preenchido **o banco
      recusa** alterar.
- [ ] Zero rolagem horizontal do body em 390 px; todo alvo de toque das telas novas com ≥ 44 px.

## Out of Scope

| Item | Razão |
| --- | --- |
| Trocar o e-mail de acesso | Decisão de 2026-10-04 (`context.md`): mexe no login (GoTrue) e nos snapshots de `orders.customer_email`. A cliente fala com a loja. |
| Mais de um endereço salvo (lista, rótulos, apagar) | A conta edita **um** endereço, o padrão. Não há policy de `DELETE` em `addresses` e gerenciar lista é outra feature. |
| Pagar de novo com **cartão** pela conta | `/pedido/:id/pagamento` é só PIX por construção (feature `58`, `AD-042`). Cartão recusado leva ao WhatsApp. |
| "Comprar de novo" / recompra | Não existe em lugar nenhum e não foi pedido. |
| Renumerar os 35 pedidos `NS-…` da Nuvemshop | Decisão de 2026-10-04: já são curtos e são citados pelas clientes no WhatsApp. |
| Coluna nova `shipped_at` / `delivered_at` | A data já existe em `order_status_history`; uma coluna seria um **segundo dono** da mesma data ("defeito 01", consequência 2). |
| Avisar a cliente por e-mail quando o rastreio é gravado pelo Melhor Envio | É a `BL-035`; esta feature só **mostra** o código. |
| Consultar o status do pacote nos Correios dentro da loja | O botão leva ao rastreio da transportadora; integrar API de rastreio é outra feature. |
| Redesenhar o checkout ou a rota `/pedido/:id/pagamento` | Esta feature só **leva** a cliente até ela. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Onde mora o detalhe do pedido | `/pedido/:id`, ampliado. A conta não ganha um segundo detalhe | Duas superfícies desenhando o mesmo pedido divergem (`AD-042` é o mesmo raciocínio para o PIX) | y (desenho aprovado em pauta) |
| Pedidos `NP-…` | Os **2** ganham número da sequência por migration nova; `NS-…` ficam | Decisão do usuário, revoga em parte o *Out of Scope* da `58` — registrar como `AD-044` | **y** |
| Prazo para gerar PIX novo | Até **7 dias corridos** depois de `orders.created_at`; depois, WhatsApp | Decisão do usuário: preço e prazo podem ter mudado | **y** |
| Datas da linha do tempo | Lidas de `order_status_history` (status + data), **sem** `note` e sem `created_by`, só do pedido da própria cliente | Decisão do usuário; a tabela é fechada a não-admin desde a `52` | **y** |
| E-mail e CPF | E-mail sempre travado; CPF pode ir de vazio para preenchido **uma vez** e depois trava; o **banco** recusa | Decisão do usuário; esconder na tela não protege nada | **y** |
| "Pago" para fins de rótulo | `payment_status = 'approved'` | `paid_at` sozinho não distingue reembolso; `orders.status` não muda ao pagar | y |
| Endereço editado | Vira o `is_default = true` da cliente; os pedidos já feitos não mudam (o endereço do pedido é snapshot) | É o que o caixa lê para preencher (`useDefaultAddress`) | y |
| Convidada (sem sessão) no detalhe | Vê rastreio e linha do tempo; **não** vê o campo do material, vê o caminho do WhatsApp | O campo não funciona para ela (`BL-036`: RPC fechada a `anon`); mostrar campo que falha é o pior estado | y |
| Abas no celular | "Pedidos" e "Meus dados" como sub-rotas (`/conta` e `/conta/dados`) | Endereço próprio sobrevive a recarregar e ao voltar | y |
| Ordem da lista | Mais recente primeiro, sem paginação | Volume por cliente é baixo; paginação fica para quando houver cliente com > 20 pedidos | y |

**Open questions:** nenhuma — todas resolvidas ou registradas acima.

---

## User Stories

### P1: A situação do pedido num rótulo só ⭐ MVP

**User Story**: Como cliente, quero ler em que pé está cada pedido sem abri-lo, para não achar que um
pedido pago ainda está pendente.

**Why P1**: É o defeito que a cliente vê hoje — pedido pago escrito "Pendente".

**Acceptance Criteria** (a primeira regra que casar vence, nesta ordem):

1. WHEN `status = 'cancelled'` THEN o rótulo SHALL ser **"Cancelado"**.
2. WHEN `status = 'delivered'` THEN SHALL ser **"Entregue"**.
3. WHEN `status = 'shipped'` THEN SHALL ser **"A caminho"**.
4. WHEN `payment_status = 'refunded'` THEN SHALL ser **"Reembolsado"**.
5. WHEN `payment_status = 'approved'` AND `material_status ∈ {aguardando_material, material_enviado}` THEN SHALL ser **"Aguardando seu material"**.
6. WHEN `payment_status = 'approved'` (qualquer `status` entre `pending`, `paid`, `separating`) THEN SHALL ser **"Em produção"**.
7. WHEN `payment_status = 'expired'` THEN SHALL ser **"PIX expirado"**.
8. WHEN `payment_status = 'rejected'` THEN SHALL ser **"Pagamento recusado"**.
9. WHEN nenhuma regra acima casar THEN SHALL ser **"Aguardando pagamento"**.
10. WHEN um valor de `status` ou `payment_status` fora do vocabulário do banco chegar THEN o rótulo SHALL ser "Aguardando pagamento" **e** a função SHALL ser testada com esse caso (nada lança).
11. WHEN o rótulo é exibido THEN ele SHALL vir de **uma** função em `packages/core` (ex.: `orderSituation`), chamada pela lista da conta, pelo detalhe e pelas pendências, e um guarda SHALL recusar uma segunda tabela de rótulos de status em `apps/store/**`.
12. WHEN o rótulo é "A caminho" e há `delivery_estimate_max` THEN o selo SHALL acrescentar " · chega até {d MMM}" (ex.: "A caminho · chega até 8 out"); WHEN é "Entregue" e o histórico tem a data da entrega THEN SHALL acrescentar " em {d MMM}".
13. WHEN o selo é desenhado THEN as cores SHALL ser as da régua do Paper (quadro "Régua dos selos"), todas com contraste de texto ≥ 4,5:1 sobre o fundo do selo, e nenhuma classe de cor padrão do Tailwind (`yellow-*`, `blue-*`, `purple-*`, `green-*`, `red-*`) SHALL sobrar na conta.

**Independent Test**: um pedido com `payment_status='approved'`, `status='pending'`, sem material, aparece como "Em produção" na conta e no detalhe.

---

### P1: A lista da conta, legível no celular ⭐ MVP

**User Story**: Como cliente no celular, quero ver meus pedidos numa lista que cabe na tela e me leva
ao detalhe com um toque.

**Acceptance Criteria**:

1. WHEN a cliente logada abre `/conta` THEN a página SHALL mostrar, nesta ordem: saudação ("Olá, {primeiro nome}" + e-mail), as abas **Pedidos** (com a contagem) e **Meus dados**, o bloco "Precisa da sua atenção" (só se houver pendência), e "Seus pedidos".
2. WHEN a lista é desenhada THEN cada linha SHALL mostrar: miniatura da primeira peça (56 px), "Pedido {número}", data por extenso curto ("2 out 2026") · quantidade de peças ("1 peça" / "2 peças"), o selo da situação e o total — e a linha inteira SHALL ser um link para `/pedido/:id`, com altura ≥ 44 px.
3. WHEN o número é exibido THEN SHALL passar por `formatOrderNumber` e o título SHALL usar Outfit 600 16 px numa linha só, cortando com reticências se não couber — nunca quebrando a linha nem empurrando o total.
4. WHEN o viewport tem 390 px THEN `document.body.scrollWidth` SHALL ser ≤ 390 com o pedido de número mais longo da base e o e-mail mais longo da fixture.
5. WHEN a saudação é desenhada THEN o avatar SHALL manter 48×48 px (não encolhe) e o e-mail SHALL cortar com reticências.
6. WHEN a cliente não tem pedidos THEN SHALL aparecer o estado vazio com "Você ainda não fez nenhum pedido." e um link para a Home.
7. WHEN a lista está carregando THEN SHALL aparecer esqueleto com a altura de 3 linhas, sem texto "Carregando…".
8. WHEN a consulta de pedidos falha THEN SHALL aparecer uma mensagem de erro com "Tentar de novo", e nunca a lista vazia (falha não é "você não tem pedidos").
9. WHEN não há sessão THEN `/conta` SHALL abrir o login com retorno a `/conta`, como hoje.
10. WHEN o viewport é ≥ 1024 px THEN a conta SHALL ter coluna lateral de 264 px (saudação, navegação Pedidos · Meus dados · Favoritos · Sair, bloco de ajuda) e coluna principal com as pendências lado a lado e a lista em colunas (Pedido · Situação · Total, com a data embaixo do número na coluna Pedido), em larguras fixas compartilhadas com o cabeçalho. *Desvio medido do quadro do Paper, que desenha uma coluna Data própria*: o cartão da loja não passa de ~618px de miolo em 1024, 1280 e 1440, e com a quarta coluna o título caía para 102px (prova em navegador, 2026-10-04).

---

### P1: "Precisa da sua atenção" ⭐ MVP

**User Story**: Como cliente, quero ver logo no topo o que depende de mim, para não perder o prazo do
PIX nem esquecer de mandar o material.

**Acceptance Criteria**:

1. WHEN um pedido tem `requires_material` em algum item, `payment_status='approved'`, `material_status='aguardando_material'` e `status ≠ 'cancelled'` THEN SHALL aparecer a pendência **"Aguardamos o seu material"** com o número do pedido e o nome da primeira peça que exige material, e os botões **"Informar código de envio"** (leva a `/pedido/:id#material`) e **"Como enviar"** (leva ao guia de material).
2. WHEN um pedido PIX tem `payment_status='pending'`, `status ≠ 'cancelled'` e não está pago THEN SHALL aparecer **"Pagamento pendente"** com o valor e o botão **"Pagar com PIX"** (leva a `orderPaymentPath(id)`).
3. WHEN um pedido PIX tem `payment_status ∈ {expired, rejected}`, `status ≠ 'cancelled'` e **`now() − created_at ≤ 7 dias`** THEN SHALL aparecer **"O código PIX expirou"** (ou "O PIX foi recusado") com o valor e o botão **"Gerar novo PIX"** (leva a `orderPaymentPath(id)`).
4. WHEN o mesmo pedido passou de 7 dias THEN a pendência SHALL virar **"O pagamento não foi concluído"** com o botão **"Conversar no WhatsApp"**, e nenhum botão de gerar PIX SHALL aparecer em nenhuma tela.
5. WHEN o limite de 7 dias é calculado THEN SHALL existir **uma** função pura em `core` (ex.: `podeGerarNovoPix(order, agora)`) com o limite numa constante nomeada, lida pela conta e pelo detalhe; o teste SHALL cobrir 6 dias e 23 h (oferece) e 7 dias e 1 min (não oferece).
6. WHEN há mais de uma pendência THEN a ordem SHALL ser: pagamento (pendente/expirado) antes de material, e dentro de cada tipo, a mais antiga primeiro.
7. WHEN não há pendência THEN o bloco inteiro (inclusive o título) SHALL não ser renderizado.
8. WHEN o predicado de `podePagarComPix` (feature `58`) é lido THEN ele SHALL continuar valendo para `pending`; a regra dos 7 dias SHALL ser uma função **irmã**, nunca uma alteração dele (a assimetria com a rota é deliberada e documentada no arquivo).

---

### P1: O detalhe do pedido completo ⭐ MVP

**User Story**: Como cliente, quero abrir um pedido e ver rastreio, etapas, material, peças,
pagamento e endereço numa página só.

**Acceptance Criteria** (`/pedido/:id`, nesta ordem):

1. WHEN o pedido abre THEN SHALL mostrar o link **"Meus pedidos"** (para `/conta`; só com sessão), o título **"Pedido {formatOrderNumber}"** (ex.: "Pedido #0231") em Libre Baskerville — o número aparece **uma vez** na página —, a linha "Feito em {d MMM yyyy} · {n} peças · {total}" e o selo da situação. O subtítulo caloroso muda com a etapa (decisão do usuário, 2026-10-04): **"É nosso!"** quando `paid_at` está preenchido e o pedido ainda não foi enviado nem cancelado; **"Pedido registrado"** enquanto `paid_at` está vazio, o pagamento está pendente e o pedido não foi cancelado; **nenhum** subtítulo depois de enviado, entregue, cancelado ou reembolsado, **nem com o PIX expirado ou recusado** (o estado do topo fala — achado da prova em navegador: a página prometia "aguardando a confirmação" logo acima de "O código PIX expirou"). "Pago" aqui é `paid_at`, e não `payment_status`, porque a frase de e-mail ao lado (`STO-01`) já decide por `paid_at` — decidir por colunas diferentes faria a página dizer "É nosso!" acima de "Estamos aguardando a confirmação do pagamento" (achado da verificação independente, rodada 1). Revoga a linha em caixa alta "PEDIDO #N · PAGO EM …" (`PIX-P4-03`) e o título "É nosso!"/"Pedido registrado" (`CNF-04`), com os testes antigos **invertidos** para a forma nova.
2. WHEN há um estado que pede ação (material a enviar · PIX pendente · PIX expirado/recusado dentro ou fora dos 7 dias · cancelado) THEN o **primeiro** bloco depois do título SHALL ser o desse estado, conforme o quadro "Estados do topo" do Paper — e só um aparece por vez.
3. WHEN `tracking_code` não é vazio THEN SHALL aparecer o cartão **"Rastreio do pacote"** com o código, a transportadora (`shipping_carrier`, quando houver), e os botões **"Acompanhar entrega"** (abre o rastreio da transportadora em nova aba) e **"Copiar"** (copia o código e confirma com aviso).
4. WHEN `tracking_code` é vazio THEN o cartão de rastreio SHALL não ser renderizado.
5. WHEN a linha do tempo é desenhada THEN as etapas SHALL ser: Pedido recebido · Pagamento aprovado · (Material recebido no ateliê, só se o pedido exige material) · Em produção no ateliê · A caminho · Entregue.
6. WHEN uma etapa tem data THEN SHALL mostrar a data **da fonte da etapa**: `created_at`, `paid_at`, `material_received_at`, e o **primeiro** registro do histórico com `separating`, `shipped` e `delivered` respectivamente; WHEN não tem fonte THEN SHALL não mostrar data (nunca `updated_at` — `L-017`).
7. WHEN a etapa "Entregue" ainda não aconteceu e há estimativa THEN SHALL mostrar "Previsão: entre {min} e {max}".
8. WHEN o pedido está cancelado THEN a linha do tempo SHALL ser substituída pelo bloco "Pedido cancelado", com a data do registro `cancelled` do histórico quando houver.
9. WHEN o pedido exige material THEN o bloco **"Seu material"** SHALL mostrar o selo de `MATERIAL_STATUS_LABELS` e o código informado; com âncora `#material` para o link da pendência.
10. WHEN as peças são listadas THEN cada uma SHALL mostrar miniatura, nome (até 2 linhas), as opções que existirem unidas por " · " **sem separador solto**, quantidade, gravação ("Gravação: “{texto}”") quando houver, e o valor; e o resumo SHALL somar: subtotal + frete − descontos = total, com o rótulo do cupom quando `coupon_code` existir.
11. WHEN o bloco de pagamento e entrega é desenhado THEN SHALL mostrar a forma de pagamento (PIX · Cartão) com a data de aprovação quando houver, e o endereço do **snapshot do pedido** em linhas (nome · rua, número, complemento · bairro · cidade/UF · CEP), com o CEP sem quebrar no hífen.
12. WHEN a página termina THEN SHALL haver o bloco **"Alguma dúvida sobre este pedido?"** com "Conversar", que abre o WhatsApp da loja com o número do pedido já na mensagem; WHEN o número da loja não está configurado THEN o bloco SHALL não aparecer (mesma régua de `PolicyContact`).

---

### P1: Informar o código de envio do material ⭐ MVP

**User Story**: Como cliente que comprou uma joia afetiva, quero informar o código do envelope que
postei, para a Adri saber que o material está a caminho.

**Acceptance Criteria**:

1. WHEN `material_status='aguardando_material'`, há sessão e o pedido não está cancelado THEN o estado do topo SHALL ser "Envie o seu material" com o campo **"Código de rastreio do envio"**, o botão **"Enviar código"** e o link "Como embalar e enviar o material".
2. WHEN a cliente envia THEN SHALL usar o caminho que já existe (`useSetMaterialTracking` → RPC `set_material_tracking` → notificação `material_tracking_set`) — nenhum gravador novo.
3. WHEN o código vem vazio ou só com espaço THEN o botão SHALL não chamar a rede e o campo SHALL mostrar "Informe o código de rastreio."
4. WHEN a RPC recusa THEN a mensagem SHALL vir de `materialTrackingMessage` (uma frase por motivo), e o texto digitado SHALL continuar no campo.
5. WHEN a gravação dá certo THEN o estado do topo SHALL sair, o bloco "Seu material" SHALL mostrar "Material a caminho" e o código, e a pendência da conta SHALL sumir na próxima leitura.
6. WHEN não há sessão (convidada, acesso por token) THEN o campo SHALL **não** aparecer; no lugar SHALL aparecer "Para informar o código, fale com a gente" com o botão do WhatsApp (fecha a opção (b) da `BL-036`).

---

### P1: Datas reais da linha do tempo ⭐ MVP

**User Story**: Como cliente, quero saber quando o pedido foi postado e entregue.

**Acceptance Criteria**:

1. WHEN a cliente logada pede a linha do tempo de um pedido THEN o banco SHALL devolver, por uma função `security definer` com `search_path` vazio, só `status` e `created_at` de `order_status_history` **daquele pedido**, e só se ele for da cliente (`customers.user_id = auth.uid()`).
2. WHEN o pedido não é dela ou não existe THEN a função SHALL devolver **zero linhas** (sem distinguir os dois casos).
3. WHEN a função é criada THEN `execute` SHALL ser concedido a `authenticated` e revogado de `anon` e `public`, e `note` e `created_by` SHALL não estar no retorno — com guarda que lê a migration do disco, no molde de `entregaDeEmailSchema.test.ts`.
4. WHEN a convidada abre o pedido pelo token THEN `checkout?action=get-order` SHALL devolver os mesmos eventos (status + data), no mesmo formato, para o detalhe desenhar a mesma linha do tempo.
5. WHEN a linha do tempo é montada a partir dos eventos THEN a montagem SHALL ser **uma** função pura em `core`, chamada igual pelos dois caminhos.

---

### P2: Meus dados — editar o que pode, travar o que não pode

**User Story**: Como cliente, quero corrigir meu nome, WhatsApp e endereço sem falar com ninguém, e
entender por que e-mail e CPF não mudam.

**Acceptance Criteria**:

1. WHEN a cliente abre `/conta/dados` THEN SHALL ver "Dados pessoais" (nome completo, WhatsApp, e-mail de acesso, CPF) em modo leitura com o botão **"Editar"**, e "Endereço de entrega" com **"Alterar"**, e o botão **"Sair da conta"**.
2. WHEN ela edita e salva THEN nome e WhatsApp SHALL ser gravados em `customers` (WhatsApp só com dígitos, máscara de `maskPhone`, validado por `isValidBrPhone`), e o nome também em `user_metadata.full_name` (caminho de `updateDisplayName`).
3. WHEN o nome fica vazio ou com menos de 2 caracteres, ou o WhatsApp não tem 10 ou 11 dígitos THEN o botão SHALL não gravar e o campo SHALL dizer o motivo.
4. WHEN o e-mail é exibido THEN SHALL ter cadeado e o texto "É com ele que você entra na loja. Para trocar, fale com a gente." e nenhum campo editável.
5. WHEN o CPF já está preenchido THEN SHALL aparecer mascarado (`•••.456.789-••`), com cadeado e "Informado na primeira compra, ele identifica quem pagou. Para corrigir, fale com a gente."; WHEN está vazio THEN SHALL ser editável uma vez, validado pelo dígito verificador.
6. WHEN qualquer cliente tenta, pelo PostgREST, mudar `customers.email`, mudar `customers.cpf` já preenchido, ou mudar `customers.user_id` THEN o banco SHALL recusar com erro (gatilho `before update`), e admin (`has_role`) e a service role SHALL continuar podendo — provado por probe SQL contra o banco local, não por mock (`AD-012`).
7. WHEN a cliente altera o endereço THEN SHALL usar o formulário de endereço do checkout (CEP com `maskCep` e consulta automática, rua, número, complemento, bairro, cidade, UF), gravar como o endereço `is_default = true` dela e deixar **no máximo um** padrão por cliente.
8. WHEN o endereço é salvo THEN SHALL aparecer o aviso "Vale para as próximas compras. Pedidos já feitos seguem para o endereço escolhido no caixa." e o próximo caixa SHALL vir preenchido com ele.
9. WHEN a gravação falha THEN o formulário SHALL manter o que foi digitado e mostrar o erro; nunca voltar ao modo leitura como se tivesse gravado.

---

### P2: Número de pedido legível nos pedidos antigos

**User Story**: Como cliente com pedido antigo, quero um número que eu consiga ler e ditar.

**Acceptance Criteria**:

1. WHEN a migration roda THEN os pedidos com `order_number like 'NP-%'` SHALL receber `lpad(nextval('orders_number_seq')::text, 4, '0')`, em ordem de `created_at`, e nenhum outro pedido SHALL ser tocado.
2. WHEN ela roda duas vezes THEN a segunda SHALL não alterar nada (idempotente pelo próprio recorte `like 'NP-%'`).
3. WHEN ela é escrita THEN SHALL ser migration **nova** (as da `58` são imutáveis — `AD-017`), com guarda que prova o recorte, a idempotência e que a migration não toca `NS-%`.

---

### P3: Pequenos acabamentos

**Acceptance Criteria**:

1. WHEN o item não tem tamanho nem acabamento THEN a linha SHALL mostrar só a quantidade, sem ponto solto.
2. WHEN a conta ou o detalhe estão abertos no celular THEN a bolha do WhatsApp SHALL não cobrir o último bloco (o conteúdo reserva o espaço da barra inferior **e** da bolha).
3. WHEN há animação nas telas novas THEN SHALL respeitar `prefers-reduced-motion`.

---

## Edge Cases

- WHEN o pedido tem itens e nenhum tem foto THEN a miniatura SHALL ser o quadrado neutro, sem ícone quebrado.
- WHEN o pedido é importado da Nuvemshop (`NS-…`, `payment_method` em `credit_card`/`boleto`/`manual`) THEN o rótulo SHALL seguir a mesma régua e a forma de pagamento SHALL ter um rótulo legível para os quatro valores.
- WHEN o histórico tem dois registros `shipped` THEN a data mostrada SHALL ser a do **primeiro**.
- WHEN `delivery_estimate_min = delivery_estimate_max` THEN a previsão SHALL ser "Previsão: {d MMM}".
- WHEN a cliente tem pedido de outra pessoa adotado por e-mail (`handle_new_customer`) THEN ele SHALL aparecer como qualquer outro pedido dela.
- WHEN o relógio do aparelho está errado THEN a oferta de PIX novo pode aparecer ou sumir fora da janela de 7 dias. **Limite conhecido e aceito**: o servidor já aceita gerar PIX para `expired`/`rejected` sem prazo (`RETRYABLE_STATUSES`), então a janela é regra de **oferta** na tela, não de autorização. Apertar o servidor fica fora desta feature.

---

## Implicit-requirement dimensions

| Dimension | Cobertura |
| --- | --- |
| Input validation & bounds | Nome ≥ 2, WhatsApp 10–11 dígitos, CPF por dígito verificador, CEP 8 dígitos, código do material não vazio (DAD-03, DAD-05, MAT-03) |
| Failure / partial-failure | Falha de leitura ≠ lista vazia (LST-08); gravação falha mantém o digitado (DAD-09, MAT-04) |
| Idempotency / retry | Migration de renumeração idempotente (NUM-02); gerar PIX novo reaproveita a idempotência da rota da `58` |
| Auth boundaries | Função do histórico só do próprio pedido, sem `anon` (LIN-01..03); gatilho recusa e-mail/CPF (DAD-06); campo do material escondido sem sessão (MAT-06) |
| Concurrency / ordering | "No máximo um endereço padrão" sob duas abas salvando (DAD-07): resolver em transação ou índice único parcial (`L-018`) — decisão do design |
| Data lifecycle / expiry | Janela de 7 dias para PIX novo (PEN-03..05) |
| Observability | N/A — nenhum fluxo novo de servidor além de leitura; recusas do gatilho aparecem como erro na tela |
| External-dependency failure | Rastreio abre site externo; se o número da loja não estiver configurado, o bloco do WhatsApp some (DET-12) |
| State-transition integrity | Nenhuma transição nova; a do material segue pela RPC existente (MAT-02) |

---

## Requirement Traceability

| ID | Story | Status |
| --- | --- | --- |
| SIT-01 … SIT-13 | P1: A situação do pedido num rótulo só | Verified |
| LST-01 … LST-10 | P1: A lista da conta | Verified |
| PEN-01 … PEN-08 | P1: Precisa da sua atenção | Verified |
| DET-01 … DET-12 | P1: O detalhe do pedido | Verified |
| MAT-01 … MAT-06 | P1: Informar o código de envio do material | Verified |
| LIN-01 … LIN-05 | P1: Datas reais da linha do tempo | Verified |
| DAD-01 … DAD-09 | P2: Meus dados | Verified |
| NUM-01 … NUM-03 | P2: Número legível nos pedidos antigos | Verified |
| ACB-01 … ACB-03 | P3: Pequenos acabamentos | Verified |

Os IDs seguem a ordem dos critérios de cada história (SIT-01 é o critério 1 da primeira história, e
assim por diante).

**Coverage:** 69 total, 69 mapeados para tasks (T01–T28), 69 verificados (`validation.md`, rodada 2; `LST-04` provado em navegador).

---

## Success Criteria

- [ ] Nenhum pedido pago aparece como "Pendente" — conferido contra os pedidos reais do banco local.
- [ ] Em 390×844: zero rolagem horizontal do body em `/conta`, `/conta/dados` e `/pedido/:id`, com o número e o e-mail mais longos da base.
- [ ] Da conta até "Gerar novo PIX" ou "Enviar código": no máximo **2 toques**.
- [ ] Probe SQL: a cliente não altera e-mail nem CPF preenchido; o admin altera.
- [ ] Probe SQL: a função do histórico devolve zero linhas para pedido de outra cliente.
- [ ] Gate da feature: lint, tipos e testes **sem regressão** contra as baselines do `CLAUDE.md`, nos cinco workspaces (os guardas da loja varrem os dois apps).
