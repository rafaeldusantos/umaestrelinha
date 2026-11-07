## TC-FUNC-014: Duas joias somam unidades de desconto, o maior percentual vale primeiro e a linha de maior preço recebe antes

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.2
**Autor:** dev
**Persona:** PER-04 Helena
**Jornada:** J-03, passo 2
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a alocação dentro de uma lista com duas peças diferentes segue D-28 (a de maior preço recebe)

### Objetivo

Com duas joias, Helena recebe o desconto em até duas peças, do jeito mais favorável que a regra diz.

### Pré-condições

- Conta: `cliente-loja`
- Massa: M-01 (P dá 15 % à corrente avulsa), M-02 (Q dá 20 % à mesma corrente); duas variações da corrente de preços diferentes
- Estado de partida: sacola vazia

### Condições reais

As da persona.

### Passos

1. Pôr P, Q e três unidades da corrente (em duas linhas de variações de preços diferentes)
   - **Esperado:** duas unidades com desconto e uma a preço cheio
2. Ver qual percentual vale e onde
   - **Esperado:** os 20 % de Q vão primeiro, para a linha de maior preço; os 15 % de P para a unidade seguinte; a que sobra a preço cheio
3. Conferir o rodapé
   - **Esperado:** "Desconto do Compre Junto" = a soma dos dois descontos, a centavo

### Esperado e fonte

Fonte: `prd.md` CA-03.2 ("as unidades somam, e o maior percentual vale primeiro; entre linhas da mesma peça, o
desconto vai primeiro para a de maior preço").

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| tirar Q | — | só uma unidade com desconto, a 15 % |
