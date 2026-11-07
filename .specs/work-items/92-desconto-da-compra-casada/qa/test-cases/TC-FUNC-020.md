## TC-FUNC-020: Duas joias com percentuais diferentes para a mesma corrente dão o maior; na mesma joia, a peça avulsa vem antes da lista

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.9
**Autor:** dev
**Persona:** PER-04 Helena
**Jornada:** J-03, passo 2
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** —

### Objetivo

Helena recebe o maior desconto que as joias da sacola dão, e na mesma joia o percentual que a página mostrou.

### Pré-condições

- Conta: `cliente-loja`
- Massa: M-01 (em P, a corrente avulsa a 15 % também está na lista a 10 %); M-02 (Q dá 20 % à corrente)
- Estado de partida: sacola vazia

### Condições reais

As da persona.

### Passos

1. Levar P com a corrente avulsa
   - **Esperado:** 15 % (a avulsa vem antes da lista, como na página de P)
2. Acrescentar Q
   - **Esperado:** a corrente passa a 20 %
3. Tirar Q
   - **Esperado:** volta a 15 %

### Esperado e fonte

Fonte: `prd.md` CA-03.9 (P-04; D-05).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| a corrente em duas listas de P | duas listas com percentuais diferentes | vale a da lista que vem primeiro na ordem da dona |
