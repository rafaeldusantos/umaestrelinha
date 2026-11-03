## TC-FUNC-010: O bloco abre com o título e a frase ratificados, e o rodapé explica o que o botão leva

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.14
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passos 1 e 3
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** texto literal; o tom é restrição de produto

### Objetivo

A cliente entende, nas palavras da dona, o que é o bloco e o que acontece ao tocar o botão.

### Pré-condições

- Conta: anonima
- Massa: M-01
- Estado de partida: sacola vazia

### Condições reais

As da persona.

### Passos

1. Abrir M-01
   - **Esperado:** título "Compre junto"; frase "Peças que eu escolhi para acompanhar esta joia. Marque as que quiser levar."
2. Marcar um adicional
   - **Esperado:** rodapé "O botão de compra leva a joia e as peças marcadas. Cada uma entra na sacola como uma linha própria, e você pode tirar qualquer uma depois."

### Esperado e fonte

Literal — fonte: PRD CA-03.14.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| 1440 | mesma conferência no computador | textos iguais |
