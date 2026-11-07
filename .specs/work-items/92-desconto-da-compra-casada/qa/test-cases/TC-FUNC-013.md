## TC-FUNC-013: Uma joia com duas correntes na mesma linha: uma com desconto e uma a preço cheio, dito na linha

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-03.2
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, ramo J-01b
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** cenário preliminar P0 do PRD

### Objetivo

Marina sabe que só uma corrente sai com desconto por joia, e paga a conta que a linha diz.

### Pré-condições

- Conta: `anonima`
- Massa: M-01 (corrente avulsa R$ 79,90 a 15 %)
- Estado de partida: P (1 unidade) e a corrente (1) na sacola, pelo bloco

### Condições reais

As da persona.

### Passos

1. Aumentar a corrente para 2 unidades na gaveta
   - **Esperado:** a linha diz "1 com desconto, 1 a preço cheio" e o valor = 67,92 + 79,90 = R$ 147,82; "Desconto do Compre Junto − R$ 11,98" no rodapé
2. Ir ao checkout
   - **Esperado:** a mesma frase e o mesmo valor na linha do resumo
3. Fechar o pedido e abrir `/pedido/:id`
   - **Esperado:** a corrente em duas linhas — uma com "Acompanha o … · 15% a menos" e "de/por", outra a preço cheio — cada uma com "1 unidade"
4. Aumentar P para 2 unidades (antes de fechar)
   - **Esperado:** as duas correntes com desconto; a frase da linha mista some

### Esperado e fonte

Fonte: `prd.md` CA-03.2; `spec.md` › Design › Loja — Sacola, Checkout · resumo, Confirmação.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| variação da joia que esconde as correntes | uma unidade de P em "Chaveiro" | essa unidade não dá desconto (TC-FUNC-022) |
