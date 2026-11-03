## TC-REG-001: A joia sem Compre Junto se compra como antes, com "Você também vai curtir" e o checkout de sempre

**Tipo:** regression
**Prioridade:** P1
**Origem:** CA-07.2
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, ramo J-01c
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** canário — a jornada de compra que a mudança não devia afetar

### Objetivo

Quem compra uma joia sem Compre Junto não percebe mudança nenhuma.

### Pré-condições

- Conta: anonima
- Massa: M-04
- Estado de partida: sacola vazia

### Condições reais

As da persona.

### O que mudou

O botão de compra passou a ser compartilhado com o conjunto (rótulo e ação), a barra fixa ganhou o estado de conjunto, a sacola mudou de formato e o pedido grava duas colunas novas.

### Pontos de contato com outras jornadas

Barra fixa e botão (J-01), sacola (J-05), checkout e pedido (J-02); order bump e "Complete o frete grátis" seguem como estão (PRD › Fora).

### Passos

1. Abrir M-04
   - **Esperado:** sem bloco; "Você também vai curtir" como antes; barra fixa com preço e "X no PIX"
2. "Adicionar à sacola" e "Finalizar compra"
   - **Esperado:** uma linha, sem frase "acompanha"; o checkout com o order bump e o "Complete o frete grátis" como antes
3. Concluir como convidada
   - **Esperado:** pedido criado com uma peça

### Esperado e fonte

"Se nenhum adicional estiver disponível, o bloco inteiro some e a página fica como hoje" — fonte: PRD CA-07.2; PRD › Fora.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| — | — | — |
