## TC-FUNC-021: O cupom segue a regra da loja com o e-mail da cliente e recusa com o texto da loja

**Tipo:** functional
**Prioridade:** P0
**Origem:** UC-07 (D-29, D-38)
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-01, passo 6
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** —

### Objetivo

O cupom que a Adri aplica vale exatamente como no checkout da loja — nem a mais, nem a menos.

### Pré-condições

- Conta: `admin-atelie`
- Massa: cupom 10 %; cupom frete grátis; cupom `first_order_only`; cliente com pedidos; cliente nova
- Estado de partida: passo 3, com peças

### Condições reais

As da persona.

### Passos

1. Toca em "Aplicar" sem código
   - **Esperado:** "Digite o código do cupom."
2. Digita um código inexistente
   - **Esperado:** "Cupom inválido."
3. Aplica o de 10 % em minúsculas
   - **Esperado:** vira maiúsculas; cartão com código, "10% de desconto" e "Remover"; a linha "Cupom CODIGO" (−) no resumo
4. Com a cliente que já comprou, aplica o de primeira compra
   - **Esperado:** "Cupom válido apenas no primeiro pedido."
5. Com a cliente nova (com e-mail), aplica o de primeira compra
   - **Esperado:** aplicado
6. Aplica o de frete grátis
   - **Esperado:** "Frete grátis" no cartão e "frete grátis" na linha do resumo

### Esperado e fonte

"Cupom com a regra e os textos da loja, considerando a cliente (`first_order_only`)" — fonte: PRD › Passo 3; spec D-38 (os textos da loja), D-29.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| cliente nova sem e-mail | aplica o de primeira compra | "Este cupom pede o e-mail da cliente." (D-29) |
| troca a cliente depois do cupom | volta ao passo 1 e troca | o cupom é conferido de novo com o e-mail novo |
| rede cai ao aplicar | corta a rede | uma falha com saída; o código digitado fica |
