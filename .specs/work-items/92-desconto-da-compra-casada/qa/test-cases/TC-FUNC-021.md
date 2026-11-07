## TC-FUNC-021: No par recíproco recebe desconto a peça levada pelo bloco; sem marca, só a de menor preço cheio

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.10
**Autor:** dev
**Persona:** PER-04 Helena
**Jornada:** J-03, ramo J-03c
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** com as duas marcadas, recebe a de menor preço cheio (D-29)

### Objetivo

Quando duas joias se oferecem uma à outra, só uma sai com desconto, e a que a cliente viu no bloco.

### Pré-condições

- Conta: `cliente-loja`
- Massa: M-03 (A oferece B e B oferece A, com percentual; A mais cara que B)
- Estado de partida: sacola vazia

### Condições reais

As da persona.

### Passos

1. Na página de B, marcar A e levar o conjunto
   - **Esperado:** A (a levada pelo bloco, com "Acompanha o B") sai com o desconto; B a preço cheio
2. Esvaziar; pôr A e B pelo catálogo, sem o bloco
   - **Esperado:** só B (a de menor preço cheio) sai com desconto
3. Fechar o pedido do passo 1
   - **Esperado:** no pedido gravado, o desconto em A, como a sacola mostrou

### Esperado e fonte

Fonte: `prd.md` CA-03.10 (F7, respondido na página); D-11, D-29.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| as duas pelo bloco | levar B pelo bloco de A e A pelo bloco de B | só a de menor preço cheio |
