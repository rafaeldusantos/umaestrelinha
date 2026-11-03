## TC-FUNC-020: O adicional marcado para sumir numa variação da joia sai do bloco quando ela é escolhida

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-02.9, CA-03.1
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passo 2
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** regra P1 determinística

### Objetivo

Quem escolhe o pingente como chaveiro não recebe a oferta de uma corrente que não faz sentido.

### Pré-condições

- Conta: anonima
- Massa: M-01 com a variação "Chaveiro" e A2 marcado (no painel) para sumir em "Chaveiro"
- Estado de partida: sacola vazia

### Condições reais

As da persona.

### Passos

1. Escolher uma variação que não seja "Chaveiro" e marcar A2 e A1 completos
   - **Esperado:** A2 visível e marcado
2. Trocar para "Chaveiro"
   - **Esperado:** A2 sai do bloco e perde a marca; A1 mantém a escolha; o total e "Conjunto · N peças" não contam A2
3. Levar o conjunto
   - **Esperado:** A2 não entra na sacola

### Esperado e fonte

Fonte: PRD CA-02.9, CA-03.1; protótipo (o adicional com "some com" some e perde a marca; os outros mantêm a escolha).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| voltar da "Chaveiro" | escolhe outra variação | A2 volta, desmarcado |
