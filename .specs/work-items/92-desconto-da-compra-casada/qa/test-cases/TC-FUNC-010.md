## TC-FUNC-010: Com promoção que dá preço menor que o desconto casado, a sacola mostra o menor e a diferença aparece só ali

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-02.4, CA-03.5
**Autor:** dev
**Persona:** PER-04 Helena
**Jornada:** J-03, ramo J-03a
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** —

### Objetivo

Helena paga o menor preço possível, e o bloco não promete o que a sacola desmente.

### Pré-condições

- Conta: `cliente-loja`
- Massa: M-01; M-04 (promoção sobre uma corrente da lista que dá preço menor que os 10 % do Compre Junto)
- Estado de partida: sacola vazia

### Condições reais

As da persona (1440 e 390).

### Passos

1. Marcar no bloco a corrente em promoção
   - **Esperado:** o bloco mostra o "de/por" do desconto casado (10 %) e o total pelo casado
2. Levar o conjunto
   - **Esperado:** a sacola cobra a corrente pelo preço da promoção (o menor), não pela soma; o Total da sacola é menor que o do bloco
3. Ler o rodapé da sacola
   - **Esperado:** a diferença aparece como o desconto da promoção; o desconto do Compre Junto dessa peça não é somado ao da promoção

### Esperado e fonte

Fonte: `prd.md` CA-02.4 ("a sacola mostra o menor, e a diferença aparece só ali"), CA-03.5 (vale o menor, sem
somar); D-04.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| promoção menor que o casado | uma promoção que dá preço maior | vale o casado; a sacola = o bloco |
