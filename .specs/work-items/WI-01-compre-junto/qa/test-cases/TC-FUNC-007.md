## TC-FUNC-007: Variação esgotada não pode ser escolhida e peça sem nenhuma variação vendável não aparece

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.8
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passo 4
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** regra P1 determinística

### Objetivo

A cliente não monta um conjunto com peça que o ateliê não tem.

### Pré-condições

- Conta: anonima
- Massa: M-02 com uma peça que tem uma variação esgotada e uma peça com todas as variações esgotadas
- Estado de partida: sacola vazia

### Condições reais

As da persona.

### Passos

1. Marcar A1 e abrir a peça com uma variação esgotada
   - **Esperado:** a variação esgotada aparece desabilitada e não pode ser escolhida
2. Procurar a peça com todas as variações esgotadas
   - **Esperado:** ela não aparece na lista

### Esperado e fonte

Fonte: PRD CA-03.8.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| toque repetido na esgotada | toca várias vezes | nada muda; total igual |
