## TC-FUNC-002: Sem adicional marcado, o botão diz "Adicionar à sacola" e leva só a joia

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-03.2
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passo 1 e ramo J-01d
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** o caminho de compra de sempre não pode mudar com o bloco presente

### Objetivo

Quem não quer nada além da joia compra como sempre comprou.

### Pré-condições

- Conta: anonima
- Massa: M-01
- Estado de partida: sacola vazia

### Condições reais

As da persona; repetir em 1440 × 900 pelo botão da coluna de informação.

### Passos

1. Abrir M-01 e escolher a variação do pingente
   - **Esperado:** nenhum adicional marcado; o rodapé de total do bloco não aparece; botão "Adicionar à sacola"
2. Marcar um adicional e depois desmarcar
   - **Esperado:** o botão vai a "Levar o conjunto" e volta a "Adicionar à sacola"
3. Tocar "Adicionar à sacola"
   - **Esperado:** a sacola recebe só o pingente

### Esperado e fonte

Fonte: PRD CA-03.2; PRD › Escopo ("Sem adicional marcado, ele diz 'Adicionar à sacola' e leva só o principal, como hoje").

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| computador | 1440, botão da coluna | mesmo comportamento |
