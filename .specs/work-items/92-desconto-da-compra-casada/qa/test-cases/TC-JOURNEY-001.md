## TC-JOURNEY-001: No celular, a cliente leva pingente e corrente com desconto e fecha o pedido como convidada pelo valor do bloco

**Tipo:** journey
**Prioridade:** P0
**Origem:** CA-02.2, CA-03.1, CA-03.7, CA-04.2, CA-05.1, RNF-01
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passos 1–7
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** jornada P0 determinística; o "cobrado" é o valor do pedido gravado, o QR do PIX não é condição; a ordem das linhas do resumo é a do painel (decisão Q-01, 2026-11-04)

### Objetivo

Provar que o valor que Marina viu no bloco é o que fica no pedido, sem nenhuma conta diferente no caminho.

### Pré-condições

- Conta: `anonima`
- Massa: M-01 (corrente avulsa R$ 79,90 a 15 %); sem cupom; `checkout` e `mercado-pago` servidas no local
- Estado de partida: sacola vazia

### Condições reais

As da persona (390 × 844, toque, rede lenta).

### Entrada

`/produtos/<slug de P>`, vinda de link externo.

### Passos com tempo

| # | A persona… | Deve ver | Em até |
| - | --- | --- | --- |
| 1 | escolhe a variação de P e marca a corrente avulsa | "de R$ 79,90 por R$ 67,92", "15% a menos levando junto", "Desconto do Compre Junto − R$ 11,98", o total do conjunto descontado e o PIX sobre ele | 15 s |
| 2 | toca no botão de compra | a sacola com o mesmo total | 5 s |
| 3 | vai ao checkout, preenche contato e entrega como convidada, escolhe PIX | o resumo na ordem Subtotal (soma dos preços cheios) · Desconto do Compre Junto − R$ 11,98 · Desconto PIX · Frete · Total; a conta fecha | 90 s |
| 4 | confirma o pagamento | `/pedido/:id/pagamento` com o valor igual ao Total do checkout, ao centavo | 15 s |
| 5 | abre `/pedido/:id` | a corrente com o "de/por" da linha, o resumo na mesma ordem e o mesmo Total | 10 s |

### Objetivo e efeitos

- O Total de `/pedido/:id` = o Total do checkout = (total do bloco + frete − desconto PIX), ao centavo.
- Efeito: o pedido aparece no painel com "Desconto do Compre Junto − R$ 11,98" (TC-FUNC-030).

### Caminho de abandono

J-01a (tirar a joia) é o TC-JOURNEY-002; J-01d (recarregar na tela de pagamento): recarregar não cria outro pedido
e o valor continua o mesmo.

### Esperado e fonte

Exibido = cobrado, PIX depois do desconto casado, a linha guarda o cheio e o cobrado — fonte: `prd.md` CA-02.2,
CA-03.1, CA-03.7, CA-04.2, CA-05.1, RNF-01; o preço levando junto pela fórmula de `spec.md` › Design ›
Loja — Bloco (`round(cheio × (100 − pct)) / 100`); a ordem das linhas do resumo pela decisão Q-01 do Gate 1; as
linhas dos itens pela Design de cada tela (D-38). O Frete antes dos descontos é bug.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| recarregar no envio | confirma e recarrega antes da resposta | um pedido só, valor igual |
| a corrente da lista (10 %) | repetir com a lista | o mesmo encadeamento, 10 % |
