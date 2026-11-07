## TC-FUNC-008: A nota do bloco diz que o desconto vale com a joia no mesmo pedido só quando há peça com desconto marcada

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-02.3
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passo 2
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** —

### Objetivo

Marina entende a condição do desconto antes de comprar.

### Pré-condições

- Conta: `anonima`
- Massa: M-01
- Estado de partida: página de P, nada marcado

### Condições reais

As da persona.

### Passos

1. Marcar só o adicional sem percentual
   - **Esperado:** a nota "O botão de compra leva a joia e as peças marcadas. Cada uma entra na sacola como uma linha própria, e você pode tirar qualquer uma depois." sem a frase do desconto
2. Marcar a corrente avulsa (15 %)
   - **Esperado:** a nota ganha " O desconto vale enquanto a joia estiver no mesmo pedido."

### Esperado e fonte

Fonte: `prd.md` CA-02.3 (Q-11 (d)); `spec.md` › Design › Loja — Bloco ("Só peças sem desconto marcadas: o total
sem a linha do desconto e sem a frase da nota").

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| cabeçalho do bloco | ler o parágrafo do topo | sem a frase "Levando junto, algumas saem com desconto." (H-03) |
