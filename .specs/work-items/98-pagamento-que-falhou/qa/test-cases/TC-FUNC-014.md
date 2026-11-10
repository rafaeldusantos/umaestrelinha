## TC-FUNC-014: "Gerar link de cartão" aparece só em pedido de cartão não pago e não cancelado

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-05.1
**Autor:** dev
**Persona:** PER-02 Adri no computador
**Jornada:** J-03, passo 5
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** presença/ausência por estado

### Objetivo

A dona só oferece o link onde ele serve; num pedido de PIX ou já resolvido, ele não aparece.

### Pré-condições

- Conta: `admin`
- Massa: M3 (cartão recusado), M4 (cartão pendente), um cartão vencido; M1 (PIX pendente), M12 (cancelado), M9 (pago)
- Estado de partida: lista de pedidos

### Condições reais

As da persona.

### Passos

1. Abre M3, M4 e o cartão vencido
   - **Esperado:** "Gerar link de cartão" no bloco Pagamento
2. Abre M1, M12 e M9
   - **Esperado:** sem "Gerar link de cartão"

### Esperado e fonte

Cartão pendente, recusado ou vencido e não cancelado; nunca PIX — fonte: PRD CA-05.1.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Registrado à mão | um pedido de cartão registrado à mão | sem o botão (já pago) |
