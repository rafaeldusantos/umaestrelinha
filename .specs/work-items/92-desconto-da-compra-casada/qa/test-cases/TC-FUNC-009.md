## TC-FUNC-009: Sem promoção nem cupom, o total do bloco é o mesmo da sacola com só a joia e as peças marcadas

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-02.4, RNF-01
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passo 4
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** —

### Objetivo

O número que Marina viu no bloco é o mesmo da sacola.

### Pré-condições

- Conta: `anonima`
- Massa: M-01; sem promoção nem cupom valendo para as peças
- Estado de partida: sacola vazia

### Condições reais

As da persona.

### Passos

1. Marcar a corrente avulsa e a corrente da lista; anotar o total do conjunto
   - **Esperado:** total já descontado
2. Levar o conjunto
   - **Esperado:** o Total da sacola = o total do bloco, ao centavo; a linha "Desconto do Compre Junto" com o mesmo valor do bloco
3. Anotar o "ou R$ Z no PIX" da sacola
   - **Esperado:** Z = o PIX do bloco

### Esperado e fonte

Fonte: `prd.md` CA-02.4, RNF-01.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| com outra peça na sacola antes | uma peça avulsa qualquer já na sacola | o total da sacola = total do bloco + aquela peça |
