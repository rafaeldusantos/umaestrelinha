## TC-INT-004: O e-mail do pedido traz a peça com "Compre Junto · N% a menos", o preço cheio riscado e uma linha por desconto

**Tipo:** integration
**Prioridade:** P1
**Origem:** CA-05.2
**Autor:** dev
**Persona:** PER-04 Helena
**Jornada:** J-03, passo 7
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `integration` — status `missing`
**Spec:** —
**Nota:** o e-mail se lê no Mailpit (:54444) ou pela prévia da aba Notificações do painel com o `order_id` do pedido; coberto também por `send-notification/__tests__/render.test.ts`; a ordem dos totais é a do painel (decisão Q-01, 2026-11-04)

### Objetivo

O e-mail que Helena guarda tem a mesma conta da tela, na mesma ordem.

### Pré-condições

- Conta: `cliente-loja`
- Massa: o pedido de TC-JOURNEY-004 (desconto casado, cupom, PIX)
- Estado de partida: `send-notification` servida no local, com o envio contido (Mailpit)

### Condições reais

Leitura do e-mail em 390 e 1440 (o cliente de e-mail do Mailpit).

### Passos

1. Abrir o e-mail do pedido
   - **Esperado:** "1× {corrente}", a variação, "Compre Junto · 15% a menos" e o valor com o cheio riscado acima do cobrado, como na Design do e-mail
2. Ler os totais
   - **Esperado:** na ordem Subtotal · Desconto do Compre Junto · Cupom · Desconto PIX · Frete · Total, e a conta fecha

### Esperado e fonte

Fonte: `prd.md` CA-05.2; `spec.md` › Design › E-mail do pedido (o valor da linha, D-38); a ordem dos totais pela
decisão Q-01 do Gate 1 (a régua é o painel). O Frete antes dos descontos é bug.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| linha mista | o pedido de TC-FUNC-013 | duas linhas da corrente |
