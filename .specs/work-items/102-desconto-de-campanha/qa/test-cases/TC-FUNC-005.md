## TC-FUNC-005: A sacola e o checkout mostram o preço com desconto e o pedido gravado tem o mesmo total

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-03, CA-13
**Autor:** dev
**Persona:** PER-03 Helena
**Jornada:** J-04, passos 1, 5 e 6
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** o caminho do dinheiro; pedido de automação E2E

### Objetivo

O total que a cliente aceita no checkout é o total do pedido que a loja grava — a peça de campanha pelo preço com
desconto, nunca pelo de tabela.

### Pré-condições

- Conta: `anonima`
- Massa: Black Friday em vigência; M-A em 20 %
- Estado de partida: sacola vazia

### Condições reais

sacola em 390 × 844; checkout em 1440 × 900

### Passos

1. Acrescenta M-A (quantidade 1) e abre a sacola
   - **Esperado:** o preço com desconto, o cheio riscado ao lado e o selo em linha na fileira de chips
2. Muda a quantidade para 2
   - **Esperado:** o subtotal é 2 × o preço com desconto da unidade (o desconto por unidade, não sobre o total)
3. Vai ao checkout como convidada (e-mail de teste, endereço, PIX)
   - **Esperado:** o item com o preço com desconto e o cheio riscado; a linha "Desconto de campanha" no resumo; o Total
4. Finaliza
   - **Esperado:** o pedido criado (a página de pagamento pode falhar ao gerar o PIX — chave inválida no local, não é achado)
5. Abre `/pedido/:id` (pelo link da tela ou do e-mail no Mailpit)
   - **Esperado:** o item com o preço cobrado igual ao do checkout; "Desconto de campanha"; o Total igual ao do checkout

### Esperado e fonte

Sacola e checkout mostram o preço com desconto e o cheio riscado; o Total é o que o servidor grava — fonte: PRD
CA-03, CA-13, UC-05, RN-05; `spec.md` T1, T3, I-06 (linha "Desconto de campanha").

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| recarregar o checkout | recarrega no meio do preenchimento | o mesmo total |
| duplo clique em Finalizar | dois cliques | um pedido só |
| sacola reaberta | fecha a aba e reabre a loja | a sacola com o preço com desconto (relido, não congelado) |
| e-mail | abre o e-mail do pedido no Mailpit | a mesma linha "Desconto de campanha" e o mesmo total |
