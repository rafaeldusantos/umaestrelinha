## TC-FUNC-013: A mesma peça já na sacola soma à linha, que passa a dizer quais joias ela acompanha

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-04.1, CA-05.1
**Autor:** dev
**Persona:** PER-04 Sônia
**Jornada:** J-05, passos 2–3
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** borda P1 da identidade da linha

### Objetivo

A cliente não vê a mesma corrente duplicada, e a linha conta de verdade a quais joias ela pertence.

### Pré-condições

- Conta: anonima
- Massa: M-01, M-03 (ambos com a lista "Correntes"); uma corrente C, variação V, já na sacola (avulsa ou por M-07)
- Estado de partida: sacola com C/V

### Condições reais

As da persona.

### Passos

1. Levar o conjunto de M-01 com C/V
   - **Esperado:** uma só linha de C/V, quantidade somada, "Acompanha o <nome de M-01>"
2. Levar o conjunto de M-03 com C/V
   - **Esperado:** a mesma linha, "Acompanha o <nome de M-01> e o <nome de M-03>"

### Esperado e fonte

Fonte: PRD CA-04.1 ("soma à linha existente… Se acompanhar mais de um principal, a linha diz 'acompanha o Pingente X e o Pingente Y'"), CA-05.1.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| gravação diferente | leva C/V com outra gravação | outra linha |
| variação diferente | leva C em outra variação | outra linha |
