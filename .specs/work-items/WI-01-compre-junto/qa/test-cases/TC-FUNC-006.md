## TC-FUNC-006: A lista mostra as peças na ordem da dona, aceita uma só e nunca oferece a própria joia nem peça repetida

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.7
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passo 3
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** regra P1 determinística com M-02

### Objetivo

A cliente escolhe uma corrente entre as que fazem sentido para aquela joia, sem ver a própria joia oferecida junto de si mesma.

### Pré-condições

- Conta: anonima
- Massa: M-02 contendo o próprio M-01 e a peça de A2; M-03 usando a mesma lista
- Estado de partida: sacola vazia

### Condições reais

As da persona.

### Passos

1. Em M-01, marcar A1 ("Correntes") e ver as peças
   - **Esperado:** na ordem da lista; sem M-01 e sem a peça de A2; o rótulo "Escolha a corrente · N modelos" conta só as oferecidas
2. Escolher uma peça e depois outra
   - **Esperado:** só uma fica escolhida
3. Abrir M-03 e marcar a mesma lista
   - **Esperado:** a lista inteira aparece ali (inclusive a peça que foi pulada em M-01, se não for M-03 nem repetida em M-03)

### Esperado e fonte

Fonte: PRD CA-03.7.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| teclado | setas no grupo de peças | uma escolha por vez (grupo de rádio) |
