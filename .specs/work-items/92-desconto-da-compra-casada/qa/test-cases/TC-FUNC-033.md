## TC-FUNC-033: A Adesão mostra o valor pago líquido e o "desconto concedido" de cada peça

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-06.2
**Autor:** dev
**Persona:** PER-02 Adri (painel)
**Jornada:** J-05, passo 3
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** depende de M-07; o histórico anterior ao WI conta 0 de concedido (D-15)

### Objetivo

A dona sabe quanto o Compre Junto vendeu de verdade e quanto ele custou em desconto.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-07 — pedidos pagos com a corrente levada pelo bloco: um com o desconto casado, um em que a promoção venceu na linha; um pedido pago antigo (sem preço cheio) com a marca
- Estado de partida: `/admin/compre-junto/adesao`, 30 dias

### Condições reais

As da persona (1440; em 390, os cartões).

### Passos

1. Ler o valor de cada peça
   - **Esperado:** o pago (líquido do desconto), não o cheio
2. Ler a coluna "desconto concedido"
   - **Esperado:** cheio − pago de cada peça, qualquer que seja o desconto que venceu na linha; o pedido antigo conta 0
3. Somar à mão contra os pedidos de M-07
   - **Esperado:** fecha, a centavo

### Esperado e fonte

Fonte: `prd.md` CA-06.2 (H-02); D-15.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| período de 7 e 90 dias | trocar | os números acompanham o período |
| 390 | ver os cartões | "desconto concedido" presente, sem rolagem horizontal |
