## TC-FUNC-012: A peça sai com o percentual sobre o preço da variação escolhida, arredondado a centavo, igual em todas as telas

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-03.1
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passos 4–7
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** o preço com centavos (79,90 a 15 % = 67,915) força o arredondamento

### Objetivo

O centavo do desconto não muda de uma tela para outra.

### Pré-condições

- Conta: `anonima`
- Massa: M-01 (corrente avulsa R$ 79,90 a 15 %, com uma variação de outro preço)
- Estado de partida: sacola vazia

### Condições reais

As da persona.

### Passos

1. Levar P e a corrente avulsa
   - **Esperado:** na sacola, "R$ 79,90" riscado e "R$ 67,92"
2. Seguir ao checkout e ao pedido gravado
   - **Esperado:** R$ 67,92 na linha da corrente no checkout, em `/pedido/:id` e no painel
3. Repetir com outra variação da corrente
   - **Esperado:** o percentual sobre o preço dessa variação, não sobre o da variação padrão

### Esperado e fonte

Fonte: `prd.md` CA-03.1; o valor pela fórmula de `spec.md` › Design › Loja — Bloco (`round(79,90 × 85) / 100` =
67,92).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| quantidade 2 da joia e 2 correntes | — | 2 × 67,92 = 135,84, nunca 135,83 por arredondar o total |
