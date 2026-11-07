## TC-JOURNEY-004: Com cupom de 15% e o desconto do Compre Junto, a conta fecha no checkout e na confirmação

**Tipo:** journey
**Prioridade:** P0
**Origem:** CA-03.6, CA-05.2
**Autor:** dev
**Persona:** PER-04 Helena
**Jornada:** J-03, passos 1–6
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** cenário preliminar P0 do PRD ("cupom de 15 % com desconto casado"); a ordem do resumo é a do painel (decisão Q-01, 2026-11-04)

### Objetivo

Provar que o cupom e o desconto do Compre Junto valem juntos e que a conta fecha em toda tela do pedido.

### Pré-condições

- Conta: `cliente-loja`
- Massa: M-01; cupom percentual de 15 % (M-04); sem promoção sobre a corrente
- Estado de partida: sacola vazia

### Condições reais

Notebook 1440 (a persona alterna; repetir o passo 3 em 390).

### Entrada

`/produtos/<slug de P>`, logada.

### Passos com tempo

| # | A persona… | Deve ver | Em até |
| - | --- | --- | --- |
| 1 | leva P com a corrente avulsa pelo bloco | a sacola com "Desconto do Compre Junto − R$ X" | 10 s |
| 2 | aplica o cupom de 15 % | o cupom incide sobre o subtotal já com o desconto casado; a linha do Compre Junto continua | 10 s |
| 3 | abre o checkout e escolhe PIX | na ordem Subtotal (cheio) · Desconto do Compre Junto · Cupom {CÓDIGO} · Desconto PIX (N%) · Frete · Total, e Subtotal − descontos + Frete = Total | 30 s |
| 4 | confirma | o pedido gravado com o mesmo Total | 15 s |
| 5 | abre `/pedido/:id` | o mesmo resumo, na mesma ordem, e a conta fechando | 10 s |

### Objetivo e efeitos

- Cupom = 15 % × (subtotal − desconto do Compre Junto), a centavo, e o Total igual em checkout e confirmação.

### Caminho de abandono

J-03b: com promoção concorrente, a frase de "ficou de fora" só aparece se o descartado desconta (TC-FUNC-017).

### Esperado e fonte

O cupom acumula e incide sobre o subtotal já com o desconto casado; o resumo fecha — fonte: `prd.md` CA-03.6,
CA-05.2; os valores do exemplo de `spec.md` › Design › Checkout · resumo (372,00 − 11,65 − 36,04 − 16,22 + 18,90 =
326,99); a ordem das linhas pela decisão Q-01 do Gate 1 (a do painel), que prevalece sobre a ordem do protótipo.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| cartão | escolher cartão no passo 3 | o mesmo resumo sem a linha do PIX |
