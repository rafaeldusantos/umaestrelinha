## TC-FUNC-011: No celular não há seletor de quantidade; no computador a quantidade da joia entra no total

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.15, CA-03.4
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passo 4
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** dois viewports; determinístico

### Objetivo

A cliente vê no total a quantidade de joias que a página mostra, e cada adicional conta uma vez.

### Pré-condições

- Conta: anonima
- Massa: M-01
- Estado de partida: sacola vazia

### Condições reais

390 × 844 e 1440 × 900.

### Passos

1. Em 390, abrir M-01 e marcar um adicional completo
   - **Esperado:** nenhum seletor de quantidade da joia; total = joia × 1 + adicional
2. Em 1440, escolher quantidade 3 no seletor ao lado do botão e marcar o mesmo adicional
   - **Esperado:** total = joia × 3 + adicional × 1
3. Levar o conjunto em 1440
   - **Esperado:** na sacola, a joia com quantidade 3 e o adicional com quantidade 1

### Esperado e fonte

Fonte: PRD CA-03.15, CA-03.4, CA-04.1.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| ajustar na sacola (celular) | aumenta a joia para 2 na sacola | o adicional continua com 1 |
