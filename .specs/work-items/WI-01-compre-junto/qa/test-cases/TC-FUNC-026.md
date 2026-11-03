## TC-FUNC-026: As regras do conjunto valem iguais nas três formas do bloco

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-09.3
**Autor:** dev
**Persona:** PER-03 Helena
**Jornada:** J-04, passo 5
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** comparação entre três rodadas da mesma montagem; a página real já tem teste por forma (`ProductPageBuyTogetherForma.test.tsx`)

### Objetivo

Trocar a forma muda só o jeito de escolher; a cliente leva o mesmo conjunto pelo mesmo valor.

### Pré-condições

- Conta: anonima
- Massa: M-01; a thread troca a forma entre as rodadas
- Estado de partida: sacola vazia em cada rodada

### Condições reais

As da persona.

### Passos

1. Em cada forma, marcar A1 incompleto e tentar levar
   - **Esperado:** nas três, nada entra e a mesma mensagem de falta
2. Em cada forma, completar A1 e A2 com as mesmas escolhas e gravação acima do limite, depois corrigir
   - **Esperado:** nas três, a mesma recusa de gravação, o mesmo total e PIX
3. Levar o conjunto
   - **Esperado:** nas três, as mesmas linhas na sacola

### Esperado e fonte

Fonte: PRD CA-09.3.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| "Chaveiro" | troca a variação da joia em cada forma | A2 some nas três |
