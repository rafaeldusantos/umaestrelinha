## TC-FUNC-023: O resumo acompanha cada mudança na ordem promoção, cupom, combinado, com o valor no PIX

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-07 (D-02)
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-02, passo 5
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** o resumo vem da prévia do servidor

### Objetivo

O total que a Adri vê enquanto monta é o que a cliente vai pagar.

### Pré-condições

- Conta: `admin-atelie`
- Massa: uma peça em promoção de 15 %, outra sem; cupom 10 %
- Estado de partida: passo 3 com as duas peças

### Condições reais

As da persona.

### Passos

1. Olha o "Resumo"
   - **Esperado:** "Subtotal · 2 peças", a promoção (−), Itens, "No PIX: R$ X nos itens (5% de desconto). Frete à parte."
2. Aplica o cupom e liga um combinado de R$ 10
   - **Esperado:** as linhas na ordem promoção, "Cupom CODIGO", combinado; os Itens recalculados; o PIX recalculado
3. Muda a quantidade de uma peça no passo 2 e volta
   - **Esperado:** o resumo atualizado; a barra com o mesmo total dos Itens

### Esperado e fonte

"Resumo vivo + 'No PIX: … nos itens'" — fonte: PRD › Passo 3; spec Design › Passo 3 (a ordem).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| mudanças rápidas | troca a quantidade várias vezes seguidas | o resumo final corresponde à última escolha |
| rede cai no recálculo | corta a rede | um aviso; nunca um total velho como se fosse o atual |
