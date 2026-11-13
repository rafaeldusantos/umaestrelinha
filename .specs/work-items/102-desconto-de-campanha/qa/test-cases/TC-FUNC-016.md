## TC-FUNC-016: A promoção por quantidade e o Compre Junto não descontam a peça de campanha

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-17
**Autor:** dev
**Persona:** PER-03 Helena
**Jornada:** J-04b
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** pedido de automação E2E

### Objetivo

A sacola não promete um desconto de promoção ou de conjunto que o pedido não vai dar quando há peça em oferta.

### Pré-condições

- Conta: `anonima`
- Massa: Black Friday em vigência; M-A em 20 %; M-E e M-E2 comuns da mesma coleção; promoção progressiva "3 peças por R$ X" ligada nessa coleção; Compre Junto de M-E com M-A como adicional
- Estado de partida: sacola vazia

### Condições reais

as da persona

### Passos

1. Acrescenta M-E, M-E2 e M-A
   - **Esperado:** a faixa da promoção **não** alcançada (a peça de campanha não conta); a frase da próxima faixa ("Falta 1 para…") conta só as comuns; nenhum preço de faixa prometido
2. Vai ao checkout
   - **Esperado:** nenhum desconto de promoção; o mesmo total da sacola
3. Esvazia; na página de M-E, monta o Compre Junto com M-A como adicional e acrescenta o conjunto
   - **Esperado:** M-A pelo preço da campanha, sem o desconto do conjunto em cima; o desconto do conjunto (se houver) só nas peças comuns
4. Vai ao checkout e finaliza; abre `/pedido/:id`
   - **Esperado:** o mesmo total da sacola

### Esperado e fonte

A peça de campanha não conta para a faixa da promoção e não recebe o desconto do Compre Junto, na sacola e no
servidor — fonte: PRD CA-17, RN-17, D-07.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| terceira comum | troca M-A por uma terceira peça comum da coleção | a faixa é alcançada — a promoção continua funcionando para as comuns |
| oferta "leve também" | (se aparecer no checkout) a oferta é uma peça de campanha | cobra o menor entre o preço da campanha e o da oferta, nunca os dois somados |
