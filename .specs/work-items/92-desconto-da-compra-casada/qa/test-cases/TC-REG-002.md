## TC-REG-002: O pedido montado pelo painel com joia e corrente segue sem desconto do Compre Junto

**Tipo:** regression
**Prioridade:** P1
**Origem:** exploratório — Fora do `prd.md` (Q-07): o pedido montado pelo painel segue igual, sem desconto casado
**Autor:** dev
**Persona:** PER-02 Adri (painel)
**Jornada:** J-05, ramo J-05a
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** depende de a `order-proposals` subir no local (M-09); sem ela, o caso fica `blocked`

### Objetivo

A proposta que a dona combinou com a cliente não muda de valor por causa do Compre Junto.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-09 (proposta com P e a corrente avulsa, preço travado)
- Estado de partida: a proposta aberta pelo link na loja

### Condições reais

As da persona.

### O que mudou

O `create-payment` passou a recalcular o desconto casado; o ramo do pedido montado sai antes do recálculo.

### Pontos de contato com outras jornadas

J-01 (o mesmo `create-payment`); a feature 89.

### Passos

1. Abrir o checkout da proposta na loja
   - **Esperado:** o preço travado da proposta, sem "Desconto do Compre Junto"
2. Confirmar e abrir o pedido no painel
   - **Esperado:** o total da proposta; sem linha do Compre Junto

### Esperado e fonte

Fonte: `prd.md` › Fora (Q-07); cenário preliminar "Pedido montado pelo painel com a joia e a corrente: sem desconto casado" (P1).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| — | — | — |
