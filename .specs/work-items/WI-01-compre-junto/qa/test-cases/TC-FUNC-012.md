## TC-FUNC-012: Cada peça do conjunto entra como linha própria, o adicional com quantidade 1, e a sacola abre

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-04.1, CA-04.2
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-02, passo 3
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** o resultado do gesto único; P0

### Objetivo

A sacola recebe o que o bloco prometeu, peça por peça, e a cliente pode tirar qualquer uma depois.

### Pré-condições

- Conta: anonima
- Massa: M-01 com A1, A2 e A3 disponíveis
- Estado de partida: sacola vazia

### Condições reais

As da persona.

### Passos

1. Marcar os três adicionais completos, com variações e uma gravação, e levar o conjunto
   - **Esperado:** a gaveta abre sozinha; "Sacola · 4 peças"; quatro linhas, cada uma com sua variação (chips) e sua gravação; cada adicional com quantidade 1

### Esperado e fonte

Fonte: PRD CA-04.1, CA-04.2; protótipo (gaveta da sacola).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| um só adicional | marca só A2 | duas linhas |
