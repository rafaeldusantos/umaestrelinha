## TC-CFR-002: Pelo teclado, cada adicional é uma caixa marcável que diz qual peça e qual variação leva

**Tipo:** cfr
**Prioridade:** P1
**Origem:** RNF-06
**Autor:** dev
**Persona:** PER-03 Helena
**Jornada:** J-01
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** árvore de acessibilidade como leitor de tela simulado; leitor real fica fora

### Objetivo

Quem não usa mouse nem vê bem monta o conjunto sabendo o que marcou.

### Pré-condições

- Conta: anonima
- Massa: M-01
- Estado de partida: sacola vazia

### Condições reais

As da persona (1440 com zoom 200%, só teclado).

### Categoria

Acessibilidade.

### Metas

| Observável | Alvo | Aceitável |
| ---------- | ---- | --------- |
| nome acessível da caixa | "Levar junto: <nome>, <resumo da escolha>" | inclui peça e variação |
| alcance por Tab | todo controle do bloco | todo controle do bloco |
| foco visível | em todo controle | em todo controle |
| mensagem de falta e total | anunciados (`status`/`alert`/região viva) | anunciados |

### Passos

1. Percorrer o bloco com Tab e ler a árvore
   - **Esperado:** caixas com papel de checkbox e o nome acima; ordem igual à visual; foco visível
2. Marcar sem completar e acionar o botão com Enter
   - **Esperado:** a mensagem de falta é anunciada e o foco vai ao primeiro adicional incompleto
3. Completar e ouvir o total
   - **Esperado:** o total muda num elemento anunciado

### Esperado e fonte

Fonte: PRD RNF-06; protótipo ("Levar junto: <nome>, <resumo>" é o nome acessível da caixa).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| gravação do adicional | Tab até o campo | rótulo associado e contador |
