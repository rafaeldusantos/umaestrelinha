# Checkout — Fluxo dos blocos, superfície de pagamento e resumo — Specification

**Criada:** 2026-08-02
**Contexto de programa:** [`../08-checkout-one-page/`](../08-checkout-one-page/) (o acordeão de três
blocos) · [`../09-checkout-orders-api/`](../09-checkout-orders-api/) (Orders API, `payer.ts`).
**Desenho no Paper:** arquivo **Nanapin**, página **Checkout / Minha conta**.
**Artboards:** `04 · Checkout Desktop — Uma página` (o resumo é o card *Resumo Card*) ·
`07 · Checkout Mobile — Uma página` (barra *Resumo Bar*).
**Escopo:** 4 frentes · **17 requisitos**.

> Esta feature nasce de uso, não de desenho novo: três das quatro frentes são atrito relatado
> assistindo alguém comprar. A quarta (o resumo) é dívida de fidelidade ao board `04`, que a `08`
> aproximou mas não fechou.

---

## Problem Statement

1. **A tela avança sozinha.** `openBlock = editing ?? resolveBlocks(...).open` — o bloco aberto é
   sempre o *primeiro incompleto*. Consequência: no instante em que a pessoa digita o último dígito
   do WhatsApp, o bloco Contato **colapsa embaixo do dedo dela** e Entrega abre. Ninguém pediu para
   avançar; o formulário decidiu. Pior no mobile, onde o colapso desloca todo o conteúdo abaixo do
   ponto onde o polegar está. E vale para os três: completar o CPF colapsa **o bloco de pagamento
   inteiro**, escondendo o método que ela acabou de escolher.

2. **Os dois métodos de pagamento parecem etapas diferentes.** Os cards usam `grow` com `flex-basis:
   auto`, então "Cartão de crédito" (rótulo longo) fica visivelmente mais largo que "PIX". Dois
   cards de tamanhos diferentes lado a lado não leem como "escolha um dos dois".

3. **O cartão tem um segundo checkout dentro do primeiro.** O Brick do Mercado Pago só monta
   **depois** que o pedido é criado, e monta com **botão "Pagar" próprio** e **campo de e-mail
   próprio** — e-mail que a pessoa já digitou no bloco 1. Ou seja: ela preenche contato, entrega e
   pagamento, aperta "Pagar R$ X no cartão", e cai numa tela que pede o e-mail de novo e tem outro
   botão de pagar. São dois CTAs para uma compra só.

4. **O resumo não é o do board.** Diferenças acumuladas: respiro horizontal de 16px onde o board tem
   24px, o cupom aplicado renderizado pelo componente genérico de `apply-coupon` em vez da faixa
   desenhada, a linha de cupom sem o código, o total em 24px em vez de 32px, e sem a linha de
   parcelamento que o board põe embaixo do total.

---

## Goals

- [ ] **Quem avança é a pessoa, não o formulário** — nenhum bloco colapsa por causa de uma tecla.
- [ ] **Um pagamento, um botão** — o CTA de finalizar é o mesmo para PIX e cartão, e é o único.
- [ ] **Escolher o método abre o que aquele método precisa** — documento no PIX, cartão no cartão.
- [ ] **Nenhum campo pedido duas vezes** — o e-mail do Brick some; o documento aparece uma vez só.
- [ ] **O resumo é o do board `04`**, medida por medida.
- [ ] **Cliente recorrente segue sem redigitar** — `ADR-02` continua valendo (`08/spec.md`).

## Out of Scope

| Fora | Razão |
| ---- | ----- |
| Desafio 3DS / challenge de cartão | `AD-003` segue ativo: `action_required` é tratado como recusa. Nada nesta feature muda esse mapeamento. |
| Salvar cartão para a próxima compra | O Brick tokeniza por transação; guardar cartão é feature própria, com consentimento e LGPD. |
| Trocar o Brick por campos próprios | `PAY-01`: PAN/CVV nunca passam pela loja. O Brick continua sendo quem tokeniza. |
| Pagamento com CNPJ como **pessoa jurídica** (nota fiscal, razão social, `entity_type`) | O pedido é só aceitar o documento no campo do pagador. Cadastro PJ é outro assunto. |
| Reescrever `CouponInput` do slice `apply-coupon` | Ele serve a outras telas (carrinho). A faixa nova é do resumo do checkout; o input segue para o estado vazio. |
| Boleto / outros métodos | Settings só expõem `pix_enabled` e `card_enabled`. |

---

## Assumptions & Open Questions

| Assunção / decisão | Padrão escolhido | Razão | Confirmado? |
| --- | --- | --- | --- |
| **O que conta como "a pessoa avançou"** em um bloco que nasce completo (cliente recorrente) | Bloco completo que o usuário **nunca editou** conta como confirmado e nasce colapsado. Um bloco só passa a exigir clique depois da primeira edição do usuário nele. | É o que preserva `ADR-02` sem reintroduzir o auto-avanço: o incômodo é o bloco fechar **enquanto se digita**, não já estar fechado ao chegar. | n |
| **De onde sai o documento no caminho cartão** | Do próprio Brick (`getFormData().payer.identification`), não de um campo nosso. | O Brick **já** pede documento em MLB; um campo nosso seria a mesma duplicação do e-mail que motivou esta feature. `handlers.ts:299-308` exige `customers.cpf` para os dois métodos, então o valor do Brick é persistido antes do `create-payment`. | n |
| **Bloco 3 não ganha "Continuar"** | O CTA de finalizar é o "continuar" do último bloco. | Um "Continuar" que só colapsa o bloco e não faz nada seria um segundo botão — exatamente o que a frente 3 vem eliminar. | n |
| **Estado vazio do cupom no resumo** | O board só desenha o cupom **aplicado**; sem cupom, segue o `CouponInput` de hoje. | Remover o campo tiraria a única entrada de cupom do checkout. | n |
| **Base da linha "no cartão: Nx de …"** | O **total do cartão** (total sem desconto PIX), independente do método selecionado. | A linha responde "e se eu pagasse no cartão?". Derivá-la do total exibido com PIX prometeria uma parcela que o cartão não pratica. | n |
| **`payment.cpf` no rascunho** | Continua sendo um campo só, agora com CPF **ou** CNPJ; o nome do campo não muda. | Renomear atravessa `checkoutStore`, `sessionStorage` e `useSaveCustomerCpf` sem ganho funcional. Idem `customers.cpf` (TEXT, sem constraint — 14 dígitos cabem). | n |
| **Retentativa de cartão recusado** | O pedido `pending` já criado é reaproveitado; o CTA gera **novo token** e chama `create-payment` de novo. | `PAY-06`: cada tentativa tem `idempotency_key` nova. Criar um segundo pedido deixaria lixo `pending`. | n |

**Open questions:** nenhuma — tudo acima está resolvido ou registrado como assunção.

---

## User Stories

### P1: Quem decide avançar é a pessoa ⭐ MVP

**User Story**: Como cliente preenchendo o checkout, quero que o bloco continue aberto até eu dizer
que terminei, para não perder o lugar quando o formulário fecha sozinho.

**Why P1**: É o atrito relatado, e é o que mais dói no mobile (390px), onde o colapso reflui a
página inteira sob o polegar.

**Acceptance Criteria**:

1. **FLW-01** — WHEN o usuário edita um bloco aberto e essa edição o torna válido THEN o bloco
   SHALL continuar aberto (não colapsa, não abre o próximo).
2. **FLW-02** — WHEN um bloco de Contato ou Entrega está aberto THEN o sistema SHALL exibir um botão
   `Continuar`, habilitado **somente** quando aquele bloco está válido.
3. **FLW-03** — WHEN o usuário aciona `Continuar` em um bloco válido THEN o sistema SHALL colapsar
   aquele bloco e abrir o próximo bloco ainda não confirmado.
4. **FLW-04** — WHEN um bloco nasce válido sem nenhuma edição do usuário (contato semeado de
   `customers`, endereço `is_default` de `ADR-02`) THEN o sistema SHALL exibi-lo colapsado, sem
   exigir `Continuar`.
5. **FLW-05** — WHEN o bloco de Pagamento fica válido THEN ele SHALL permanecer aberto (nunca
   colapsa por completude), porque não há próximo bloco.
6. **FLW-06** — WHEN o usuário aciona `Alterar` em um bloco colapsado THEN o sistema SHALL abrir
   aquele bloco e colapsar os demais, e `Continuar` naquele bloco SHALL devolver o foco ao primeiro
   bloco ainda não confirmado.
7. **FLW-07** — WHEN os três blocos estão válidos THEN o CTA de finalizar SHALL estar habilitado,
   **independente** de haver bloco aberto.

**Independent Test**: com o carrinho cheio e sessão nova, digitar contato completo e ver o bloco
continuar aberto com `Continuar` habilitado; clicar e ver Entrega abrir.

---

### P1: Um pagamento, um botão ⭐ MVP

**User Story**: Como cliente pagando no cartão, quero preencher o cartão junto com o resto e
finalizar no mesmo botão, para não encontrar um segundo checkout depois do primeiro.

**Why P1**: São dois CTAs e um campo de e-mail duplicado numa tela de dinheiro. É a frente com maior
risco de abandono.

**Acceptance Criteria**:

1. **PGM-01** — WHEN o bloco de Pagamento está aberto THEN os cards de PIX e de Cartão SHALL ter a
   **mesma largura e a mesma altura**, qualquer que seja o comprimento dos rótulos.
2. **PGM-02** — WHEN o card de PIX é exibido THEN seu ícone SHALL ser a marca do PIX (SVG fornecido),
   herdando a cor do texto por `fill="currentColor"`.
3. **PGM-03** — WHEN o método selecionado é PIX THEN o sistema SHALL exibir o campo de documento do
   pagador (e **não** o formulário de cartão).
4. **PGM-04** — WHEN o método selecionado é Cartão THEN o sistema SHALL exibir o formulário de cartão
   **imediatamente** (antes de existir pedido), e **não** o campo de documento do bloco.
5. **PGM-05** — WHEN o formulário de cartão é exibido THEN ele SHALL ser renderizado **sem botão de
   pagar próprio** e **sem campo de e-mail** — o e-mail vai para o Brick a partir do bloco Contato.
6. **PGM-06** — WHEN o usuário aciona o CTA com Cartão selecionado THEN o sistema SHALL validar o
   formulário do cartão **antes** de criar o pedido; formulário inválido SHALL deixar os erros de
   campo do Brick visíveis e **não** criar pedido nem cobrança.
7. **PGM-07** — WHEN o usuário aciona o CTA com PIX selecionado THEN o comportamento SHALL ser o de
   hoje: criar o pedido e apresentar o QR.
8. **PGM-08** — WHEN um pagamento de cartão é recusado THEN o CTA SHALL permanecer acionável e uma
   nova tentativa SHALL reusar o mesmo pedido `pending`, sem criar outro.
9. **PGM-09** — WHEN o método é trocado entre PIX e Cartão THEN a superfície do método anterior
   SHALL ser desmontada (o Brick libera o container).

**Independent Test**: selecionar Cartão, ver o formulário aparecer sem botão "Pagar" e sem campo de
e-mail, e finalizar pelo CTA de baixo.

---

### P1: Documento aceita CPF ou CNPJ ⭐ MVP

**User Story**: Como cliente que compra com CNPJ, quero informar o CNPJ no campo do pagador, para
não ficar impedida de fechar o pedido.

**Why P1**: Hoje `isValidCpf` reprova qualquer CNPJ e o bloco nunca fica válido — o CTA não habilita
e não há saída. É bloqueio total para esse público.

**Acceptance Criteria**:

1. **DOC-01** — WHEN o usuário digita no campo de documento THEN a máscara SHALL ser
   `000.000.000-00` até 11 dígitos e `00.000.000/0000-00` a partir do 12º.
2. **DOC-02** — WHEN o documento tem 11 dígitos válidos (DV de CPF) **ou** 14 dígitos válidos (DV de
   CNPJ) THEN o bloco de Pagamento SHALL ser considerado válido; qualquer outro comprimento ou DV
   errado SHALL exibir erro e manter o bloco inválido.
3. **DOC-03** — WHEN o pagador é montado para o Mercado Pago THEN `identification.type` SHALL ser
   `CPF` para 11 dígitos e `CNPJ` para 14 dígitos.
4. **DOC-04** — WHEN o documento é persistido em `customers.cpf` THEN o valor SHALL ser só os
   dígitos, e a gravação SHALL aceitar CPF **e** CNPJ.
5. **DOC-05** — WHEN o método é Cartão THEN o documento persistido SHALL ser o que o Brick coletou
   (`payer.identification.number`); ausente no Brick, SHALL cair para o CPF já salvo em `customers`,
   e faltando os dois SHALL exibir erro **sem** criar pedido.

**Independent Test**: digitar um CNPJ válido no campo do pagador com PIX selecionado e ver o CTA
habilitar.

---

### P2: O resumo é o do board `04`

**User Story**: Como cliente conferindo o pedido, quero um resumo legível e com o total em
destaque, para saber exatamente o que vou pagar.

**Why P2**: Não bloqueia compra — mas é a peça que substituiu o passo "Revisão" (`CHK-05`), então é
onde a conferência acontece.

**Acceptance Criteria**:

1. **RSM-01** — WHEN o resumo é renderizado THEN suas faixas SHALL usar respiro horizontal de 24px,
   itens com 16px entre linhas e miniatura de 56×56 com raio de 12px, conforme o board.
2. **RSM-02** — WHEN há cupom aplicado THEN o resumo SHALL exibir a **faixa de cupom** do board
   (bordas de 1px em cima e embaixo, ícone de etiqueta, `CÓDIGO aplicado`, valor do desconto em
   geleia e ação de remover), no lugar do cartão genérico de `apply-coupon`.
3. **RSM-03** — WHEN não há cupom aplicado THEN o resumo SHALL continuar exibindo o campo de digitar
   cupom.
4. **RSM-04** — WHEN há desconto de cupom nos totais THEN a linha SHALL ser rotulada com o código
   (`Cupom NANA10`), não apenas `Cupom`.
5. **RSM-05** — WHEN o total é exibido THEN ele SHALL usar 32px de corpo (Fredoka, `-0.03em`).
6. **RSM-06** — WHEN o cartão está habilitado e o parcelamento resolve em 2x ou mais THEN o resumo
   SHALL exibir, abaixo do total e alinhada à direita, a linha `no cartão: Nx de R$ Y sem juros`,
   calculada sobre o **total do cartão** (sem desconto PIX).
7. **RSM-07** — WHEN o frete grátis está liberado THEN a barra de resumo do mobile SHALL dizer
   `Resumo · N itens · frete grátis`.

**Independent Test**: abrir `/checkout` em 1440 com cupom aplicado e comparar o card com o board.

---

## Edge Cases

- WHEN nenhum método de pagamento está habilitado nas settings THEN o bloco SHALL manter a mensagem
  atual (`NO_METHOD_MESSAGE`) e não exibir superfície nenhuma; o CTA permanece desabilitado.
- WHEN o usuário confirma um bloco e depois volta por `Alterar` e o torna inválido THEN `Continuar`
  SHALL desabilitar e o CTA de finalizar SHALL desabilitar junto.
- WHEN o carrinho muda o total enquanto o Brick está montado THEN o valor do Brick SHALL acompanhar
  (o wrapper do SDK chama `update`), e `CHK-08` segue invalidando pedido em curso.
- WHEN `getFormData()` rejeita ou devolve vazio THEN o sistema SHALL tratar como formulário inválido
  (nada é criado) e não SHALL lançar erro não tratado na página.
- WHEN o documento tem 11 dígitos todos iguais (`111.111.111-11`) ou 14 todos iguais THEN SHALL ser
  reprovado.
- WHEN o pedido já existe e o rascunho mudou (`CHK-08`) THEN o CTA SHALL invalidar o pedido antes de
  criar o novo — comportamento atual preservado nos dois métodos.

---

## Requirement Traceability

| ID | Story | Fase | Status |
| --- | --- | --- | --- |
| FLW-01 | P1 Fluxo | Design | Pending |
| FLW-02 | P1 Fluxo | Design | Pending |
| FLW-03 | P1 Fluxo | Design | Pending |
| FLW-04 | P1 Fluxo | Design | Pending |
| FLW-05 | P1 Fluxo | Design | Pending |
| FLW-06 | P1 Fluxo | Design | Pending |
| FLW-07 | P1 Fluxo | Design | Pending |
| PGM-01 | P1 Pagamento | Design | Pending |
| PGM-02 | P1 Pagamento | Design | Pending |
| PGM-03 | P1 Pagamento | Design | Pending |
| PGM-04 | P1 Pagamento | Design | Pending |
| PGM-05 | P1 Pagamento | Design | Pending |
| PGM-06 | P1 Pagamento | Design | Pending |
| PGM-07 | P1 Pagamento | Design | Pending |
| PGM-08 | P1 Pagamento | Design | Pending |
| PGM-09 | P1 Pagamento | Design | Pending |
| DOC-01 | P1 Documento | Design | Pending |
| DOC-02 | P1 Documento | Design | Pending |
| DOC-03 | P1 Documento | Design | Pending |
| DOC-04 | P1 Documento | Design | Pending |
| DOC-05 | P1 Documento | Design | Pending |
| RSM-01 | P2 Resumo | Design | Pending |
| RSM-02 | P2 Resumo | Design | Pending |
| RSM-03 | P2 Resumo | Design | Pending |
| RSM-04 | P2 Resumo | Design | Pending |
| RSM-05 | P2 Resumo | Design | Pending |
| RSM-06 | P2 Resumo | Design | Pending |
| RSM-07 | P2 Resumo | Design | Pending |

**Cobertura:** 28 ACs sob 17 requisitos nomeados nas 4 frentes.

---

## Success Criteria

- [ ] Digitar o último campo obrigatório de qualquer bloco **não** move a tela.
- [ ] Pagar no cartão usa **um** botão e pede o e-mail **zero** vez.
- [ ] Um CNPJ válido fecha o pedido.
- [ ] O card de resumo bate com o board `04` em respiro, tipografia e faixa de cupom.
- [ ] Prova em 390×844 **e** 1440 (premissa mobile do projeto).
- [ ] Sem erros novos de lint (baseline store 5 err / 8 warn) · `tsc` store e core em **0**.
