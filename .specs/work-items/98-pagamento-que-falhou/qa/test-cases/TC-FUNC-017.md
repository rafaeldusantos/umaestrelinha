## TC-FUNC-017: Link de cartão aberto com o pedido pago ou cancelado mostra a situação e não oferece pagar

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-05.7, CA-02.4
**Autor:** dev
**Persona:** PER-04 Cliente que recebeu o link pelo WhatsApp
**Jornada:** J-04, ramo J-04b
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** dois links da massa M14

### Objetivo

A cliente que abre o link depois de o pedido ter sido resolvido sabe em que pé ele está e não paga de novo.

### Pré-condições

- Conta: `anonima`
- Massa: M14 — link de pedido pago (registrado à mão depois de gerado) e link de pedido cancelado
- Estado de partida: sem sessão

### Condições reais

As da persona.

### Passos

1. Abre o link do pedido pago
   - **Esperado:** "Este pedido já foi pago." (ou equivalente com a situação); nenhum formulário de cartão
2. Abre o link do pedido cancelado
   - **Esperado:** "Este pedido foi cancelado."; nenhum formulário de cartão; a saída é falar com a loja

### Esperado e fonte

Situação do pedido sem pagamento — fonte: PRD CA-05.7, CA-02.4; textos de `core/checkout/cardLink.ts` (`CARD_LINK_PAID`, `CARD_LINK_CANCELLED`).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Cancelado com a tela aberta | a thread cancela o pedido com a tela de pagamento aberta; ela tenta pagar | não cobra; a tela passa à situação |
