## TC-FUNC-014: O cupom desconta só a peça comum, e a loja e o pedido dão o mesmo total

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-16
**Autor:** dev
**Persona:** PER-03 Helena
**Jornada:** J-04, passos 3–6
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a primeira mudança do código de dinheiro; pedido de automação E2E

### Objetivo

A cliente com cupom entende quanto ele descontou e paga exatamente o total que viu — sem o cupom descontar a peça
que já está em oferta.

### Pré-condições

- Conta: `anonima`
- Massa: Black Friday em vigência; M-A em 20 %; M-E comum; cupom `QA10` (10 %)
- Estado de partida: sacola vazia

### Condições reais

sacola em 390 × 844; checkout em 1440 × 900

### Passos

1. Acrescenta M-A e M-E
   - **Esperado:** M-A com o preço da campanha; M-E com o preço de sempre
2. Aplica `QA10`
   - **Esperado:** o desconto do cupom = 10 % do preço de M-E (só a comum)
3. Vai ao checkout e escolhe PIX
   - **Esperado:** o mesmo subtotal, desconto de campanha, desconto do cupom e frete; o desconto do PIX (5 %) sobre o total
4. Finaliza e abre `/pedido/:id`
   - **Esperado:** o mesmo total do checkout, com o cupom só sobre M-E

### Esperado e fonte

Campanha R$ 167,92 + comum R$ 100,00 com 10 % ⇒ o cupom desconta R$ 10,00; a loja e o servidor dão o mesmo total;
o PIX de 5 % vale sobre o total — fonte: PRD CA-16, RN-16, D-03, D-06.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| cupom antes da peça | aplica `QA10` com só M-E e depois acrescenta M-A | o desconto não muda |
| tirar a comum | tira M-E com o cupom aplicado | o cupom sai com o motivo (TC-FUNC-015) |
| quantidade | M-A com quantidade 2 | o cupom continua só sobre M-E |
| cartão | troca para cartão no checkout (sem digitar cartão) | o total sem o desconto do PIX, o mesmo resto |
