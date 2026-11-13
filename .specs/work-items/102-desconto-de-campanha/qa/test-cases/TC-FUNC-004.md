## TC-FUNC-004: Peça em oferta aparece com o preço com desconto, o cheio riscado e a faixa da campanha no cartão e na página

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-03, R-07 — PRD RN-13
**Autor:** dev
**Persona:** PER-02 Marina
**Jornada:** J-03, passos 3 e 5
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** o caminho principal de CA-03 na vitrine; pedido de automação E2E

### Objetivo

A cliente vê, sem fazer conta, que a peça está em oferta, quanto ela custa agora e quanto custava, em qualquer
lugar onde a peça aparece.

### Pré-condições

- Conta: `anonima`
- Massa: Black Friday em vigência; M-A marcada em 20 %
- Estado de partida: `/ofertas`, sacola vazia

### Condições reais

as da persona (390 × 844, toque)

### Passos

1. Acha M-A na grade
   - **Esperado:** a faixa no pé da foto com "BLACK FRIDAY" e "−20%"; o preço cheio riscado **acima** do preço com desconto; "4x de R$ … sem juros" calculado sobre o preço com desconto
2. Confere os cantos da foto de M-A
   - **Esperado:** nenhum selo do canto (−X%, Novo, Últimas, Destaque) junto da faixa — só a faixa
3. Abre M-A
   - **Esperado:** o selo em linha acima do nome, o preço com desconto, "De R$ X" riscado, as parcelas e o PIX calculados sobre o preço com desconto
4. Acrescenta M-A à sacola
   - **Esperado:** a linha com o preço com desconto, o cheio riscado e o selo em linha no lugar do chip de desconto

### Esperado e fonte

Preço com desconto = 80 % do preço da peça, arredondado ao centavo (meio centavo para cima), por unidade; o cheio
riscado; o selo "BLACK FRIDAY · −20%" — fonte: PRD CA-03, UC-05, RN-06, RN-13; `spec.md` › Selo · a faixa e em linha.
Exemplo do PRD: R$ 209,90 ⇒ R$ 167,92.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| computador | a mesma grade em 1440 × 900 (cartão de 220 px) | a faixa inteira, o mesmo preço |
| peça comum ao lado | olha um cartão sem marcação | o cartão de sempre, com os selos do canto que ela já tinha |
| outra entrada | M-A pela busca e pela coleção dela | a mesma faixa e o mesmo preço |
| recarregar a página | recarrega a página de M-A | o mesmo preço, sem piscar o preço de tabela antes |
