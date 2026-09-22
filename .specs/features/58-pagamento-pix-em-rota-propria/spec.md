# 58 · Pagamento PIX em rota própria — Especificação

## Problem Statement

Quem escolhe PIX no checkout clica em **"Pagar R$ X com PIX"** e a tela não muda: o botão fica
desabilitado com 50% de opacidade, com o mesmo rótulo, enquanto **duas** chamadas de rede acontecem
em sequência — a criação do pedido (edge `checkout`) e a geração do código (edge `mercado-pago`,
com timeout de 15s). Quando o código chega, ele nasce **dentro do bloco 3 do acordeão**, abaixo da
dobra no celular, sem ninguém rolar até lá, e o CTA fixo continua por cima dizendo "Pagar R$ X com
PIX" — um botão que já não faz nada. A tela de pagamento **não tem endereço**: não sobrevive a
fechar a aba, não volta pelo histórico e não abre em outro aparelho. E `/pedido/:id` pendente não
oferece caminho nenhum para pagar.

No mesmo movimento, o número do pedido sai como `NP-MUBBLKLYGOMR` — prefixo da marca anterior mais
o timestamp em base36. Ninguém dita isso no WhatsApp, e a Adri não confere isso numa lista.

## Goals

- [ ] O pedido nasce e a pessoa é levada para o **endereço dele** (`/pedido/:id/pagamento`), que
      sobrevive a reload, volta pelo histórico e reabre em outro aparelho.
- [ ] As duas esperas de rede viram **uma tela só, com os dois passos nomeados**, e nenhum passo
      avança por tempo — só por resposta real.
- [ ] Nenhum estado do PIX (gerando · pronto · confirmado · expirado · falha) fica sem tela própria:
      hoje "falha" e "gerando" cabem numa caixinha cinza fora da dobra.
- [ ] O pedido pendente tem caminho de volta para pagar, na loja e na conta.
- [ ] O número do pedido passa a ser sequencial e legível — `#0244` —, continuando a numeração que a
      Adri já usava na Nuvemshop.

## Out of Scope

| Item | Razão |
| --- | --- |
| O caminho de **cartão** | O Brick precisa continuar montado depois da criação do pedido, senão o formulário preenchido e o token se perdem e a retentativa de recusa morre (`PGM-08`). O cartão segue no bloco 3 do checkout, sem uma linha alterada. |
| Renumerar os pedidos que já existem | São 35 `NS-…` (importados da Nuvemshop, numeração real dela) e 2 `NP-…`. Renumerar reescreveria número já citado em e-mail enviado e em link de pedido. |
| Mudar como a aprovação é detectada | Realtime para quem tem sessão e a pergunta de 5 em 5 segundos para a convidada (`CSC-05`) continuam exatamente como estão. |
| Upsell/cross-sell pós-compra e o "válido por 10 min" dos prints de referência | Urgência fabricada e oferta comemorativa não entram nesta loja (`DESIGN.md` §1). Os prints são referência de **comportamento**, não de conteúdo. |
| Redesenhar os templates de e-mail | Só o valor de `{{numero_pedido}}` muda de forma; o casco dos templates não é tocado. |
| Criar QR próprio ou trocar de provedor | O QR continua vindo do Mercado Pago, desenhado por `qrcode.react` a partir do `qr_code` devolvido. |

---

## Assumptions & Open Questions

| Assumption / decisão | Default escolhido | Racional | Confirmado? |
| --- | --- | --- | --- |
| Formato do número | Sequência do Postgres começando em **170**, gravada com 4 dígitos (`0244`) e exibida com `#` (`#0244`) | Continua a numeração da Nuvemshop (maior importado: `NS-169`), não colide com `NS-`/`NP-` e é curto de ditar. O `#` é apresentação, com um dono só — gravá-lo seria sujeira na coluna e na busca | **sim** (usuário, 2026-09-21) |
| Pedidos antigos | Mantêm `NS-…` e `NP-…` | Renumerar reescreve número já enviado por e-mail | **sim** |
| O diálogo de PIX de `/conta` | Deixa de montar `PixPayment` e passa a **linkar** para a rota nova | Duas superfícies montando o mesmo pagamento são dois donos de "onde se paga um pedido pendente" — e a de `/conta` já nasce errada hoje: monta sem `amount`, então o valor em destaque (`CNF-01`) não aparece lá | n |
| A batida de "pagamento confirmado" antes de navegar | ~1,2s, com o link para o pedido visível | Quem está olhando para o QR precisa ver a causa do que vai acontecer. O link visível impede a pessoa de ficar presa se a navegação falhar | n |
| A linha de espera longa | Entra aos **8s** de geração | Metade do timeout de 15s: tempo de perceber que está demorando, antes de a tela virar erro | n |
| Rota fora do `StoreLayout` | Igual a `/checkout` | A página tem header próprio, sem navegação de categorias; o `MobileNav` fixo disputaria espaço com o conteúdo | n |
| Pedido com `payment_method = 'card'` na rota nova | Redireciona para `/pedido/:id` | A rota é a superfície do PIX; oferecer QR para pedido de cartão abriria caminho para uma segunda cobrança | n |

**Open questions:** nenhuma — tudo resolvido ou registrado acima.

---

## User Stories

### P1: A espera tem nome, e o pedido tem endereço ⭐ MVP

**User Story**: Como quem está comprando uma joia memorial, quero entender que a loja está
trabalhando quando eu clico em pagar, e quero que a tela do PIX tenha um endereço meu, para eu não
achar que perdi a compra quando a tela demora ou quando eu fecho a aba.

**Why P1**: É o defeito relatado. Sem isto, a pessoa fica olhando um botão apagado por até 30
segundos e depois recebe um QR fora da dobra, com um botão morto por cima.

**Acceptance Criteria**:

1. WHEN a pessoa aciona o CTA com PIX escolhido THEN a loja SHALL substituir o checkout por uma tela
   de progresso com **dois passos nomeados** — "Registrando seu pedido" e "Gerando o código PIX com
   o banco" — em que cada passo só é marcado como concluído quando a resposta correspondente chega,
   nunca por tempo decorrido.
2. WHEN o pedido é criado com sucesso no caminho PIX THEN a loja SHALL navegar para
   `/pedido/:id/pagamento` **antes** de pedir o código ao Mercado Pago, mantendo na tela o mesmo
   header, o mesmo valor e os mesmos dois passos.
3. WHEN a pessoa está em `/pedido/:id/pagamento` e o código chega THEN a tela SHALL exibir o valor a
   pagar, o QR Code, o código copia-e-cola com uma ação de copiar, e o tempo de validade do código.
4. WHEN a pessoa recarrega `/pedido/:id/pagamento`, volta pelo histórico do navegador ou abre o
   mesmo endereço em outro aparelho com acesso ao pedido THEN a tela SHALL continuar funcionando,
   pedindo um código novo se necessário, **sem criar um segundo pedido**.
5. WHEN a pessoa está em `/pedido/:id/pagamento` THEN a loja SHALL **não** exibir o CTA "Pagar …",
   os blocos Contato/Entrega/Pagamento nem o resumo editável do checkout.
6. WHEN o pedido em `/pedido/:id/pagamento` já está aprovado, está cancelado, ou tem
   `payment_method = 'card'` THEN a loja SHALL redirecionar para `/pedido/:id` em vez de gerar
   código.
7. WHEN a geração do código passa de 8 segundos THEN a tela SHALL acrescentar uma linha dizendo que
   a espera continua e que o pedido já está guardado — sem substituir os passos e sem barra de
   progresso falsa.
8. WHEN um pagamento é aprovado THEN a loja SHALL limpar carrinho, cupom e rascunho **apenas** se o
   pedido aprovado for o que o rascunho em curso criou; pagar um pedido antigo SHALL deixar o
   carrinho atual intacto.

**Independent Test**: comprar com PIX no ambiente local, conferir que a URL muda para
`/pedido/<uuid>/pagamento`, que os dois passos aparecem nomeados, que o QR nasce nessa rota, e que
`F5` mantém a tela viva sem criar um segundo pedido.

---

### P2: Todo estado do PIX tem tela, inclusive os ruins

**User Story**: Como quem está pagando, quero saber o que houve quando o código expira ou quando o
banco não responde, para não pagar duas vezes nem achar que perdi o dinheiro.

**Why P2**: Os estados existem hoje, mas moram numa caixa cinza dentro do acordeão. O de falha só é
alcançado depois de 15 segundos de silêncio.

**Acceptance Criteria**:

1. WHEN o código expira THEN a tela SHALL dizer que expirou, afirmar que **nada foi cobrado e o
   pedido continua guardado**, e oferecer **uma** ação: gerar um código novo para o mesmo pedido.
2. WHEN a pessoa gera um código novo THEN a loja SHALL usar o **mesmo** pedido, sem criar outro e
   sem alterar o valor.
3. WHEN a geração falha ou estoura o timeout de 15s THEN a tela SHALL dizer que a falha foi do lado
   do banco, nomear o pedido que ficou guardado, afirmar que nada foi cobrado, e oferecer tentar de
   novo e falar pelo WhatsApp.
4. WHEN o pagamento é aprovado enquanto a pessoa olha a tela THEN a loja SHALL exibir a confirmação
   na própria tela antes de navegar para `/pedido/:id`, mantendo visível um caminho manual para o
   pedido.
5. WHEN a tela do PIX exibe o tempo de validade THEN ela SHALL apresentá-lo como fato ("vale por
   09:47"), sem vermelho, sem piscar e sem vocabulário de urgência; nos últimos 5 minutos o tempo
   SHALL apenas trocar para `primary` (`CNF-06`).

**Independent Test**: com o banco local, derrubar o worker da function `mercado-pago` e ver a tela
de falha nomeando o pedido; forçar o vencimento do código e ver a tela de expirado gerando outro
código para o mesmo pedido.

---

### P3: O pedido pendente tem caminho de volta

**User Story**: Como quem saiu do PIX sem pagar, quero voltar a pagar pelo pedido que já existe, sem
refazer a compra.

**Why P3**: Hoje só existe o diálogo de `/conta`, que a convidada não alcança sem entrar por código
— e `/pedido/:id` pendente não oferece pagar.

**Acceptance Criteria**:

1. WHEN `/pedido/:id` é aberto com `payment_status = 'pending'` e `payment_method = 'pix'` THEN a
   página SHALL oferecer **Pagar com PIX**, levando a `/pedido/:id/pagamento`.
2. WHEN esse botão existe THEN ele SHALL ser a única pílula cheia da tela, e "Acompanhar pedido"
   SHALL passar a contorno (`CNF-05`).
3. WHEN o pedido não está pendente THEN o botão SHALL não existir.
4. WHEN `/conta` lista um pedido pendente de PIX THEN a ação SHALL levar a `/pedido/:id/pagamento`
   em vez de montar o pagamento dentro de um diálogo.

**Independent Test**: abrir `/pedido/:id` de um pedido pendente e chegar ao QR em um clique; abrir o
mesmo pedido já pago e não encontrar o botão.

---

### P4: O número do pedido é legível

**User Story**: Como a Adri e como a cliente, quero um número de pedido curto e sequencial, para
citar no WhatsApp e conferir na lista sem ler catorze caracteres aleatórios.

**Why P4**: `NP-MUBBLKLYGOMR` não é ditável nem ordenável, e o prefixo ainda é o da marca anterior.

**Acceptance Criteria**:

1. WHEN um pedido é criado THEN o servidor SHALL atribuir um número **sequencial**, com no mínimo 4
   dígitos e zeros à esquerda (`0170`, `0171`, …), começando em **170**.
2. WHEN dois pedidos são criados ao mesmo tempo THEN cada um SHALL receber um número diferente, sem
   nenhuma criação falhar por colisão.
3. WHEN o número é exibido na loja, no painel ou num e-mail THEN ele SHALL aparecer com o prefixo
   `#` vindo de **uma** função, e o valor gravado SHALL ser só os dígitos.
4. WHEN um pedido antigo (`NS-…` ou `NP-…`) é exibido THEN ele SHALL continuar mostrando o número
   que tem, sem quebrar nenhuma tela e sem ganhar um segundo `#`.
5. WHEN a busca de pedidos do painel recebe `244`, `0244` ou `#0244` THEN ela SHALL encontrar o
   pedido `0244`.

**Independent Test**: criar dois pedidos em sequência no banco local e ver `0170` e `0171`; abrir a
lista do painel e buscar por `170`.

---

## Edge Cases

- WHEN `/pedido/:id/pagamento` é aberto com um `id` que não existe, ou sem a credencial da convidada
  THEN a loja SHALL mostrar a mesma recusa que `/pedido/:id` mostra hoje (pedido não encontrado /
  entrar com código), nunca um QR vazio.
- WHEN a pessoa entra ou sai da conta com um pedido em curso THEN a mecânica de `IDN-07` SHALL
  continuar valendo — o pedido em curso é descartado e o próximo CTA cria outro.
- WHEN a criação do pedido falha THEN a loja SHALL voltar ao checkout com o rascunho e o carrinho
  intactos (`CHK-09`), sem navegar para a rota nova.
- WHEN o e-mail já tem conta e o servidor recusa a criação (`NeedsOtpError`) THEN o desafio de código
  SHALL continuar acontecendo no checkout (`IDN-08`), sem passar pela tela de progresso.
- WHEN o pagamento é aprovado enquanto a pessoa está na tela de expirado ou de falha THEN a tela
  SHALL seguir para a confirmação do mesmo jeito.
- WHEN a sequência tiver buracos (transação revertida) THEN isso SHALL ser aceito — número pulado não
  é defeito.

---

## Dimensões implícitas — varredura

| Dimensão | Resolução |
| --- | --- |
| Validação e limites de entrada | O `:id` da rota é lido como o de `/pedido/:id`; id inexistente cai na recusa que já existe. |
| Falha / falha parcial | `PIX-P2-03` (falha e timeout) e `PIX-P1-07` (espera longa). Pedido criado com navegação falhando: a rota é alcançável pelo endereço e por `/pedido/:id`. |
| Idempotência / retry / duplicata | `client_request_id` continua sendo a chave da criação (`PED-04`); regenerar código continua emitindo `idempotency_key` nova por tentativa (`PAY-06`); `PIX-P2-02` proíbe criar um segundo pedido. |
| Fronteira de auth e rate limit | Inalteradas: o token da convidada (`estrelinha-order-access`) segue sendo a credencial, e `create-payment` segue exigindo `access_token` ou JWT. Nenhum limite novo. |
| Concorrência / ordenação | `PIX-P4-02`: a numeração vem de `nextval` de uma sequência do Postgres, segura sob concorrência; o índice único de `order_number` continua sendo a última linha de defesa. |
| Ciclo de vida / expiração | `PIX-P2-01`/`PIX-P2-02`: o código expira, o pedido não. A expiração do token da convidada (`guest_access_expires_at`) não muda. |
| Observabilidade | N/A — nenhuma chamada externa nova e nenhum segredo novo; o log das edge functions não muda. |
| Falha de dependência externa | `PIX-P2-03`: Mercado Pago fora do ar vira tela nomeada, com o pedido preservado. |
| Integridade de transição de estado | `PIX-P1-06`: pedido aprovado, cancelado ou de cartão não recebe superfície de PIX — redireciona. |

---

## Requirement Traceability

| ID | História | Fase | Status |
| --- | --- | --- | --- |
| PIX-P1-01 … PIX-P1-08 | P1: espera nomeada e rota própria | Design | Pending |
| PIX-P2-01 … PIX-P2-05 | P2: estados ruins com tela | Design | Pending |
| PIX-P3-01 … PIX-P3-04 | P3: caminho de volta para pagar | Design | Pending |
| PIX-P4-01 … PIX-P4-05 | P4: número legível | Design | Pending |

**Coverage:** 22 ACs · 0 mapeadas para tasks ainda.

---

## Success Criteria

- [ ] Do clique no CTA até o QR na tela, a pessoa nunca vê um botão desabilitado sem explicação: há
      sempre um passo nomeado na tela.
- [ ] `/pedido/:id/pagamento` sobrevive a `F5` e ao botão voltar, e não cria um segundo pedido.
- [ ] Nenhuma tela do fluxo mostra um CTA que não faz nada.
- [ ] Os cinco estados do PIX (gerando · pronto · confirmado · expirado · falha) têm tela própria,
      conferidas em 390×844 e em 1440.
- [ ] Um pedido novo nasce `0170`; o seguinte, `0171`.
- [ ] Nenhuma linha alterada em `packages/core/src/payment/**` que não seja exigida por uma AC desta
      spec, e nenhuma no caminho de cartão.

---

## Artboards

Arquivo Paper **Uma Estrelinha**, página **58 · Checkout — pagamento PIX**:

| Board | O quê |
| --- | --- |
| 58 A | Celular — CTA acionado, passo 1 de 2 |
| 58 B | Celular — `/pedido/:id/pagamento`, passo 2 de 2 |
| 58 C | Celular — código pronto |
| 58 D | Celular — pagamento confirmado (batida antes de navegar) |
| 58 E | Celular — código expirado |
| 58 F | Celular — não conseguimos gerar o código |
| 58 G | Computador — código pronto |
| 58 H | Computador — gerando o código |
| 58 I | Celular — `/pedido/:id` pendente com "Pagar com PIX" |
