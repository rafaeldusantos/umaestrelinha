## TC-FUNC-009: "Desfazer" só aparece com o pedido em Pago e só em pagamento registrado à mão

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.12, CA-03.13
**Autor:** dev
**Persona:** PER-02 Adri no computador
**Jornada:** J-02, ramo J-02a
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** presença/ausência por estado

### Objetivo

A dona não desfaz um pagamento que a loja recebeu de verdade, nem tira o "pago" de uma peça que já está em produção.

### Pré-condições

- Conta: `admin`
- Massa: M7 (manual, Pago), M8 (manual, Separando), M9 (pago pela loja, Pago)
- Estado de partida: lista de pedidos

### Condições reais

As da persona.

### Passos

1. Abre M7
   - **Esperado:** "Desfazer" presente
2. Abre M8
   - **Esperado:** sem "Desfazer"
3. Abre M9
   - **Esperado:** sem "Desfazer"
4. Com M7 aberto na aba A, avança M7 para Separando na aba B; volta à A e toca em "Desfazer"
   - **Esperado:** não desfaz; diz que o pedido já avançou

### Esperado e fonte

Só em Pago; nunca em pagamento da loja — fonte: PRD CA-03.12, CA-03.13.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Enviado e Entregue | registros manuais em Enviado e Entregue | sem "Desfazer" |
