## TC-FUNC-015: Remover uma linha do conjunto não remove as outras, e sem a joia a peça perde o "acompanha"

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-04.4, CA-05.3
**Autor:** dev
**Persona:** PER-04 Sônia
**Jornada:** J-05, passo 5 e ramo J-05a
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** P1 determinístico na sacola

### Objetivo

A cliente desiste de uma peça sem perder as outras, e a sacola não afirma uma relação que já não existe.

### Pré-condições

- Conta: anonima
- Massa: sacola com o conjunto de M-01 (pingente + A1 + A2)
- Estado de partida: gaveta aberta

### Condições reais

As da persona; repetir em 390.

### Passos

1. Remover A2
   - **Esperado:** o pingente e A1 continuam; A1 ainda "acompanha o <M-01>"
2. Remover o pingente
   - **Esperado:** A1 continua na sacola, sem a frase "acompanha"
3. Fechar a aba e reabrir
   - **Esperado:** a sacola igual ao passo 2

### Esperado e fonte

Fonte: PRD CA-04.4, CA-05.3.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| peça que acompanha duas joias | remove uma das joias | a frase passa a citar só a que ficou |
