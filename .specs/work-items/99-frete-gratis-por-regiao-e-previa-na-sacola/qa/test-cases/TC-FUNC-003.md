## TC-FUNC-003: A mais barata já vem escolhida e o Total da sacola é o mesmo do checkout

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-04 (PRD 97; RN-04; D-11 item 2)
**Autor:** dev
**Persona:** PER-01 Luana
**Jornada:** J-01, passos 3 e 7
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** regra de dinheiro P0, determinística com a fixture

### Objetivo

Luana decide comprar pelo Total da sacola; se o checkout cobrar outro número, ela perde a confiança na loja.

### Pré-condições

- Conta: anonima
- Massa: uma peça abaixo de R$ 450 (sem frete grátis); cotação com a fixture A
- Estado de partida: gaveta aberta, sem CEP

### Condições reais

As da persona.

### Passos

1. Calcula com 01310-100
   - **Esperado:** a opção mais barata (PAC) marcada sem toque; o resumo ganha "Frete · PAC" com o valor; o Total é
     produtos − descontos + frete
2. Toca "Finalizar Pedido", preenche o Contato e chega ao Resumo
   - **Esperado:** "Frete · PAC" com o mesmo valor, e o Total do checkout igual ao da gaveta, centavo a centavo
3. Na gaveta, escolhe o SEDEX e volta ao checkout
   - **Esperado:** o Total dos dois lados muda junto, para o mesmo número

### Esperado e fonte

A mais barata marcada ao calcular; Total da gaveta = Total do Resumo com a mesma opção, cupom e promoção — fonte: PRD 97
CA-04, UC-02, RN-04; `spec.md` D-11 (2).

### Variações

| Variação                      | Ação                                                   | Esperado                                         |
| ----------------------------- | ------------------------------------------------------ | ------------------------------------------------ |
| Com cupom de valor            | aplica um cupom de desconto do seed antes de calcular  | o desconto aparece nos dois e o Total segue igual |
| Com desconto progressivo/campanha ativo no banco local | se houver, repete | a mesma linha de desconto nos dois e o mesmo Total |
| Recarrega a página            | com o frete escolhido, recarrega (mesma aba)           | a escolha e o Total continuam                    |

**Ajuste da rodada 1 (decisoes-produto.md, pergunta 1):** o "mesmo Total" entre a gaveta e o checkout é com o mesmo meio de pagamento — a gaveta não aplica desconto de meio; compare com o cartão escolhido no checkout (com o PIX pré-marcado, o checkout mostra o desconto PIX de 7 