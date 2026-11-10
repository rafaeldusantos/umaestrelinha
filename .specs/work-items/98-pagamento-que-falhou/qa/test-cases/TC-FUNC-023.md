## TC-FUNC-023: Pedido avançado à mão sem pagamento não oferece à cliente pagar de novo

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.16
**Autor:** dev
**Persona:** PER-03 Cliente que voltou ao pedido
**Jornada:** J-05, passo 5, ramo J-05a
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** massa M10

### Objetivo

A cliente cuja peça já está sendo feita (porque combinou com a Adri) não é chamada a pagar de novo.

### Pré-condições

- Conta: `cliente`
- Massa: M10 desta conta (Separando, pagamento pendente, sem registro)
- Estado de partida: `/conta`

### Condições reais

As da persona.

### Passos

1. Abre `/pedido/<M10>`
   - **Esperado:** nenhuma oferta de pagar (PIX, PIX novo, cartão)
2. Lê `/conta`
   - **Esperado:** M10 não está nas pendências de pagamento
3. Cola `/pedido/<M10>/pagamento`
   - **Esperado:** não gera código

### Esperado e fonte

A cliente não vê oferta de pagar de novo — fonte: PRD CA-03.16.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| — | — | — |
