## TC-FUNC-008: A gravação do adicional é pedida dentro do bloco, com o limite da peça, e vai para a linha certa

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.10
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-02, passo 1
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** regra P1; texto da gravação é dado da cliente

### Objetivo

O nome que a cliente quer gravado na corrente chega à corrente, não ao pingente.

### Pré-condições

- Conta: anonima
- Massa: M-01 com gravação; peça de M-02 com gravação e limite diferente do principal
- Estado de partida: sacola vazia

### Condições reais

As da persona.

### Passos

1. Marcar A1 e escolher a peça com gravação
   - **Esperado:** campo de gravação dentro do bloco, contador "n / limite" com o limite da peça; texto de apoio "Opcional. Deixe em branco se preferir a peça sem gravação."
2. Digitar "Lúcia" no pingente e "Pedro" na corrente; levar o conjunto
   - **Esperado:** na sacola, `Gravação: "Lúcia"` na linha do pingente e `Gravação: "Pedro"` na da corrente

### Esperado e fonte

"pede o texto dentro do bloco, com o mesmo campo e o mesmo limite da página" — fonte: PRD CA-03.10; textos do protótipo (spec › Design › Loja).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| só espaços | digita "   " | o contador conta o texto aparado; a linha vai sem gravação |
| aspas curvas coladas | cola “Pedro” | aparece igual na sacola, sem entidade HTML |
