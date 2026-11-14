## TC-INT-001: O pedido montado com entrega na Bahia e a faixa alcançada nasce com o frete cobrado

**Tipo:** integration
**Prioridade:** P0
**Origem:** CA-21 (PRD 99 RN-16)
**Autor:** dev
**Persona:** PER-02 Cida
**Jornada:** J-04, passos 2 e 3
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `integration` — status `missing`
**Spec:** —
**Nota:** "provado no servidor" é do handler de `create-order` e `create-payment`; a sessão confere o efeito visível do pedido que nasce

### Objetivo

Cida não pode receber frete grátis no pedido montado para Salvador — nem na tela, nem no pedido que o servidor grava.

### Pré-condições

- Conta: cliente-salvador
- Massa: o link de pedido montado da massa (peças ≥ R$ 450); Sul + Sudeste, R$ 450; fixture A; functions `checkout`
  e `mercado-pago` servidas no local com chaves externas inválidas
- Estado de partida: o link aberto em `/pedido-montado`

### Condições reais

As da persona.

### Passos

1. Informa o endereço com 01310-100 e escolhe a forma de envio
   - **Esperado:** a opção "Grátis" e o Total sem frete
2. Troca para 40020-000 e escolhe a forma de envio
   - **Esperado:** o frete cobrado e o Total somando o frete
3. Segue ao pagamento
   - **Esperado:** o pedido nasce com o frete no Total: na tela de pagamento do pedido e em `/conta` › o pedido, o Total
     inclui o frete (o PIX não conclui no local — chave inválida — e isso não é achado)

### Esperado e fonte

Pedido montado pago com CEP fora da região e faixa alcançada: o servidor cobra o frete — fonte: PRD 99 CA-21, RN-16.

### Variações

| Variação                        | Ação                                     | Esperado                                         |
| ------------------------------- | ---------------------------------------- | ------------------------------------------------ |
| Pedido nasce com CEP de SP      | (só se houver um segundo link na massa)  | o pedido nasce sem frete                         |
| Duplo toque em pagar            | dois toques                              | um pedido só                                     |
