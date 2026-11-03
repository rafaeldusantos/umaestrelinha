## TC-FUNC-001: O bloco só aparece quando há adicional disponível; sem nenhum, a página fica como hoje

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.1, CA-07.2
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, ramo J-01c
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** regra P1 determinística com massa

### Objetivo

A cliente nunca vê um bloco vazio ou "quebrado": ou há peça para oferecer, ou a página é a de sempre.

### Pré-condições

- Conta: anonima
- Massa: M-04 (sem Compre Junto); um produto cujos adicionais estão todos fora do ar ou esgotados (preparado pela dona em CH-04, ou na massa)
- Estado de partida: sacola vazia

### Condições reais

As da persona.

### Passos

1. Abrir M-04
   - **Esperado:** sem bloco "Compre junto"; botão "Adicionar à sacola"
2. Abrir o produto com todos os adicionais indisponíveis
   - **Esperado:** sem bloco; nada de título solto ou espaço vazio reservado depois do carregamento

### Esperado e fonte

"O bloco só aparece quando o produto tem ao menos um adicional disponível"; "Se nenhum adicional estiver disponível, o bloco inteiro some" — fonte: PRD CA-03.1, CA-07.2.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| variação do principal sem adicional | escolhe no principal a variação para a qual todos os adicionais somem | o bloco some (CA-03.1) |
