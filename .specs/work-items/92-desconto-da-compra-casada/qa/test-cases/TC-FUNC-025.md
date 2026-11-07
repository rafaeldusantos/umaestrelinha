## TC-FUNC-025: Se o desconto aumentou ou outro desconto passou a valer, o pagamento segue pelo valor igual ou menor, sem aviso

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-04.3
**Autor:** dev
**Persona:** PER-04 Helena
**Jornada:** J-04, ramo J-04c
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a mudança entre a criação e o pagamento é feita por fixture ou pelo painel

### Objetivo

Helena nunca é barrada quando o pedido ficou mais barato.

### Pré-condições

- Conta: `cliente-loja`
- Massa: M-01 (corrente a 15 %); M-04 (uma promoção que pode ser ligada na corrente)
- Estado de partida: checkout aberto com P e a corrente

### Condições reais

As da persona.

### Passos

1. (O percentual sobe de 15 % para 25 %) e confirmar o pagamento com PIX
   - **Esperado:** o pagamento segue, sem o aviso "o valor mudou"; o pedido gravado pelo valor recalculado (igual ou menor que o mostrado)
2. Repetir: (liga-se uma promoção maior que o casado na corrente) e confirmar
   - **Esperado:** o pagamento segue, sem aviso; o pedido gravado com o desconto que venceu na linha

### Esperado e fonte

Fonte: `prd.md` CA-04.3 ("Se sair igual ou mais barato — inclusive quando outro desconto passou a valer no lugar
do casado —, o pagamento segue"); D-03.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| sem mudança | confirmar direto | segue, pelo valor mostrado |
