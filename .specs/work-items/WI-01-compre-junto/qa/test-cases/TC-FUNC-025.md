## TC-FUNC-025: Na forma "Com fórmula", a faixa "Esta joia + …" fica acima da lista e fora do leitor de tela

**Tipo:** functional
**Prioridade:** P2
**Origem:** CA-09.1, CA-09.5
**Autor:** dev
**Persona:** PER-03 Helena
**Jornada:** J-04, passo 4
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** forma alternativa; P2 por ser decorativa

### Objetivo

A faixa ajuda quem enxerga e não atrapalha quem navega pelo teclado.

### Pré-condições

- Conta: anonima
- Massa: M-01; forma "Com fórmula" gravada
- Estado de partida: sacola vazia

### Condições reais

As da persona.

### Passos

1. Abrir M-01
   - **Esperado:** a faixa "Esta joia + <adicional> + …" acima da lista; a lista igual à de "Na linha"
2. Percorrer com Tab e ler a árvore de acessibilidade
   - **Esperado:** a faixa não recebe foco nem aparece na árvore; nada da faixa falta na lista

### Esperado e fonte

Fonte: PRD CA-09.1, CA-09.5.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| marcar pela lista | marca A1 | a faixa reflete a marca |
