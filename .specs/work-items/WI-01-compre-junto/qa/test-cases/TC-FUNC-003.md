## TC-FUNC-003: O conjunto usa a variação da joia já escolhida, sem repetir o seletor

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.3
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passo 2
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** regra P1 determinística

### Objetivo

A cliente escolhe a joia uma vez só; o conjunto leva exatamente a que ela escolheu.

### Pré-condições

- Conta: anonima
- Massa: M-01 com variações de preços diferentes
- Estado de partida: sacola vazia

### Condições reais

As da persona.

### Passos

1. Escolher a variação X do pingente e marcar um adicional completo
   - **Esperado:** o bloco não tem seletor de variação do pingente; o total usa o preço de X
2. Trocar para a variação Y
   - **Esperado:** o total do conjunto passa a usar o preço de Y
3. Levar o conjunto
   - **Esperado:** a linha do pingente na sacola está na variação Y

### Esperado e fonte

Fonte: PRD CA-03.3.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| sem variação escolhida | marca o adicional antes de escolher a variação do pingente | o botão fica bloqueado como já fica na página (registrar a mensagem vista) |
