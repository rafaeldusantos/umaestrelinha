## TC-FUNC-029: Mudar ou apagar o desconto do adicional depois não muda um pedido já feito

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-05.4
**Autor:** dev
**Persona:** PER-04 Helena
**Jornada:** J-04, ramo J-04d
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** "pedido feito" = pedido já recalculado pelo `create-payment` (gravado); o pedido pendente que ainda vai pagar é o TC-JOURNEY-006

### Objetivo

O pedido de Helena guarda o desconto que ela recebeu, aconteça o que acontecer depois na loja.

### Pré-condições

- Conta: `cliente-loja`
- Massa: o pedido de TC-JOURNEY-004 (gravado com 15 %)
- Estado de partida: Minha conta

### Condições reais

As da persona.

### Passos

1. (A dona muda o percentual para 5 % e depois apaga)
   - **Esperado:** —
2. Abrir o pedido em Minha conta e em `/pedido/:id`
   - **Esperado:** o mesmo "de/por" de 15 % e o mesmo Total de antes
3. Abrir o pedido no painel
   - **Esperado:** o mesmo desconto

### Esperado e fonte

Fonte: `prd.md` CA-05.4.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| tirar o adicional do pingente | a dona remove a corrente do Compre Junto de P | o pedido continua igual |
