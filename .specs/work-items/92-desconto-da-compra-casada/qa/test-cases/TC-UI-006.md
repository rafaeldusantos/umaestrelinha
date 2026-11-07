## TC-UI-006: O campo "Desconto ao levar junto" da aba Compre junto confere com o protótipo do painel

**Tipo:** ui
**Prioridade:** P2
**Origem:** exploratório — conferência contra o protótipo do `prd.md` › Expectativas de UI/UX (CA-01.1)
**Autor:** dev
**Persona:** PER-01 Marina (a tela é aberta com `admin-painel` só para a conferência)
**Jornada:** n/a
**Charter:** CH-09
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** sem o MCP do Claude Design, `not-run`; o protótipo desenha o campo desabilitado com "10" e "WI 92 · depois" — o estado desabilitado e a etiqueta não são régua

### Objetivo

O campo novo do painel é o que foi desenhado.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-01
- Estado de partida: aba "Compre junto" de P

### Condições reais

1440 e abaixo de 1024.

### Protótipo e tela

Claude Design, projeto `e3957c10-bd49-4f3d-9256-04d72a7d0f41`, `Produto - Compre Junto.html` · bloco "Desconto ao
levar junto" em cada adicional · `/admin/produtos/:id/editar`.

### Propriedades a comparar

O bloco por último em cada adicional; o campo de texto com sufixo "%" e nome acessível "Desconto em percentual"; em
1440 o texto à esquerda e o campo numa coluna de 120; abaixo de 1024, empilhado.

### Passos

1. Comparar o bloco em 1440 e em 900
   - **Esperado:** igual, ou diferenças registradas

### Esperado e fonte

Fonte: o protótipo; `spec.md` › Design › Painel. A ajuda do protótipo que diz que o desconto concorre com o cupom
contradiz CA-03.6: vale o PRD, sem achado.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| a prévia e a recusa | — | sem frame; registrar, não comparar |
