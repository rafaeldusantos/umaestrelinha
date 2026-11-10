## TC-SEC-003: O servidor recusa cobrar pedido cancelado ou já pago

**Tipo:** security
**Prioridade:** P0
**Origem:** CA-02.4
**Autor:** dev
**Persona:** PER-04 Cliente que recebeu o link pelo WhatsApp
**Jornada:** J-04, ramo J-04b
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `integration` — status `missing`
**Spec:** —
**Nota:** a recusa é da function `mercado-pago` servida localmente (probe 06 da Validation); na sessão, o explorer só confere que a tela não chega a pedir a cobrança

### Objetivo

Mesmo por uma tela velha ou uma chamada direta, a loja não cobra um pedido que já foi cancelado ou pago.

### Pré-condições

- Conta: `anonima` (link) e `cliente` (pedido)
- Massa: M12 (cancelado), M7 (pago à mão), M14 (links desses pedidos)
- Estado de partida: a tela de pagamento aberta antes de o pedido mudar de estado

### Condições reais

As da persona.

### Passos

1. Com `/pagar-com-cartao` aberto, a thread cancela o pedido; a cliente tenta pagar
   - **Esperado:** nenhuma cobrança criada; a tela mostra a situação
2. A thread chama a cobrança do pedido cancelado e do pedido pago direto na function servida
   - **Esperado:** recusa com código, antes de qualquer gravação ou chamada ao Mercado Pago

### Esperado e fonte

O servidor recusa a cobrança de pedido cancelado — fonte: PRD CA-02.4; costura "O que muda" (`create-payment` recusa cancelado, pago ou registrado).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| PIX de pedido cancelado | `/pedido/<M12>/pagamento` | sem código gerado |
