## TC-FUNC-018: Pedido PIX pendente oferece "Pagar com PIX"; vencido nos 7 dias oferece "Gerar novo PIX" com a data-limite

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-01.1, CA-01.2
**Autor:** dev
**Persona:** PER-03 Cliente que voltou ao pedido
**Jornada:** J-05, passo 1
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a data-limite se confere contra a data do pedido da massa

### Objetivo

A cliente com PIX em aberto ou vencido vê, no pedido e na conta, como pagar — e até quando.

### Pré-condições

- Conta: `cliente`
- Massa: M1 (PIX pendente), M2 (PIX vencido e recusado, dentro de 7 dias)
- Estado de partida: `/conta`

### Condições reais

As da persona.

### Passos

1. Lê a pendência de M1 e abre `/pedido/<M1>`
   - **Esperado:** "Pagar com PIX"
2. Lê a pendência de M2 (vencido) e abre `/pedido/<M2>`
   - **Esperado:** "Gerar novo PIX" e a data-limite (7 dias depois do pedido)
3. Repete com M2 (recusado)
   - **Esperado:** o mesmo

### Esperado e fonte

"Pagar com PIX" no pendente; "Gerar novo PIX" com data-limite no vencido/recusado — fonte: PRD CA-01.1, CA-01.2.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| No último dia | pedido vencido com 6 dias e 23 horas | ainda oferece, com a data-limite de hoje |
