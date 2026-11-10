## TC-FUNC-022: Pedido pago por fora aparece pago para a cliente, com o meio informado e o mesmo total, sem observação nem comprovante

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-04.3, RNF-01
**Autor:** dev
**Persona:** PER-03 Cliente que voltou ao pedido
**Jornada:** J-05, passo 4
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a observação da massa tem um texto marcador para provar a ausência

### Objetivo

A cliente que pagou por transferência vê o pedido pago e seguindo — e nunca lê a nota interna da Adri nem o comprovante.

### Pré-condições

- Conta: `cliente`
- Massa: M7 desta conta (registrado à mão com "Transferência", observação com o texto `NOTA-INTERNA-QA`, comprovantes); o total do pedido anotado
- Estado de partida: `/conta`

### Condições reais

As da persona.

### Passos

1. Abre `/pedido/<M7>`
   - **Esperado:** o selo de pago e a jornada de sempre; no bloco "Pagamento e entrega", "Transferência"; o total igual ao do pedido
2. Procura a observação e os comprovantes
   - **Esperado:** `NOTA-INTERNA-QA` não aparece em lugar nenhum da página; nenhum link de comprovante
3. Lê o mesmo pedido em `/conta`
   - **Esperado:** pago, sem pendência

### Esperado e fonte

Pago, meio informado, mesmo total, nunca observação nem comprovante — fonte: PRD CA-04.3; voz da cliente em `core/orders/labels.ts` (`MANUAL_PAYMENT_METHOD_LABELS.customer`).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Meio "Outro" | registro com "Outro" | "Combinado com a loja" (🟡 no plano) |
| Meio "Cartão de crédito" | registro com cartão | "Cartão de crédito", sem "maquininha" nem "gateway" |
| Sem meio | registro sem meio | "Combinado com a loja" |
| Convidada | o mesmo pedido como convidada, pelo link do pedido | o mesmo, sem observação |
