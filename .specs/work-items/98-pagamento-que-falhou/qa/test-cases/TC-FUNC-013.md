## TC-FUNC-013: Bloco Pagamento avisa "Pago duas vezes" e "Pago depois de cancelado"

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.5b, CA-06.4
**Autor:** dev
**Persona:** PER-02 Adri no computador
**Jornada:** J-02, ramo J-02c
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a massa M11 vem do molde do probe 05 (a aprovação chegando depois); a tela é determinística

### Objetivo

Quando a cliente pagou a mais, a dona fica sabendo no pedido e pode devolver — em vez de descobrir no extrato.

### Pré-condições

- Conta: `admin`
- Massa: M11 — um pedido pago duas vezes e um pago depois de cancelado
- Estado de partida: lista de pedidos

### Condições reais

As da persona.

### Passos

1. Abre o pedido pago duas vezes
   - **Esperado:** "Pago duas vezes — devolver um dos valores" no bloco Pagamento; estoque e cupom do pedido baixados uma vez só
2. Abre o pedido pago depois de cancelado
   - **Esperado:** status continua Cancelado; "Pago depois de cancelado — devolver o valor" no bloco; sem data de venda; nada baixado do estoque
3. Confere o Mailpit para os dois
   - **Esperado:** nenhum "pagamento confirmado" para a cliente pela aprovação a mais

### Esperado e fonte

Os dois selos, sem efeitos repetidos — fonte: PRD CA-03.5b, CA-06.4; textos de `core/orders/paymentAlerts.ts`.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Dashboard | olhar a venda do dia do pedido cancelado | não conta como venda |
