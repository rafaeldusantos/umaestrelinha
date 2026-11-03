## TC-FUNC-004: O total do conjunto soma os preços das variações escolhidas e mostra o PIX ao lado

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-03.4, CA-03.5, RNF-04
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passo 4
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** dinheiro exibido; P0 determinístico

### Objetivo

A cliente vê quanto vai pagar pelo conjunto antes de levar, e esse é o valor que aparece na sacola.

### Pré-condições

- Conta: anonima
- Massa: M-01; adicionais com preço por variação diferente do "a partir de"; percentual de PIX configurado em `store_settings`
- Estado de partida: sacola vazia

### Condições reais

As da persona; repetir em 1440 com quantidade 2 do principal.

### Passos

1. Marcar A1 e A2 completos, com variações de preços diferentes do "a partir de"
   - **Esperado:** total = preço da variação do pingente × quantidade + preço da variação de A1 + preço da variação de A2; nunca o "a partir de"
2. Conferir o PIX ao lado do total
   - **Esperado:** o preço no PIX = total com o mesmo percentual de desconto PIX que a página usa no preço do principal
3. Levar o conjunto e abrir a sacola
   - **Esperado:** a soma das linhas = o total que o bloco mostrou

### Esperado e fonte

Fonte: PRD CA-03.4, CA-03.5, RNF-04 ("o total do bloco é a soma dos preços que cada peça terá na sacola").

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| adicional marcado incompleto | marca A1 sem escolher a peça | registrar como o total trata o incompleto (plano assume: só os completos entram, 🟡) |
| quantidade 2 no computador | seletor de quantidade = 2 | o principal conta 2 vezes; cada adicional, 1 |
