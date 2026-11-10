# CH-02 · Pagar pelo link de cartão — ou não conseguir pagar o que não se deve

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-04 Cliente que recebeu o link pelo WhatsApp                               |
| Tour         | Money                                                                         |
| Modo         | com tour                                                                      |
| Time-box     | 60 min · orçamento: 50 ações                                                  |
| Mudança      | Nasce a tela `/pagar-com-cartao#<código>`: abre o pagamento por cartão do MESMO pedido, sem login, com o valor da compra travado; o link vale até o pedido ser pago, cancelado ou até a Adri gerar outro; com o pedido pago ou cancelado mostra a situação sem pagamento; o servidor recusa cobrar pedido cancelado ou pago — CA-05.2, CA-05.3, CA-05.5, CA-05.6, CA-05.7, CA-02.4, CA-01.5 |
| Viewport     | 390 × 844 (toque)                                                             |
| Entrada      | `http://localhost:8082/pagar-com-cartao#<código>` · sem sessão; os quatro links da massa M14 (vivo, substituído, de pedido pago, de pedido cancelado) e o pedido de catálogo com promoção encerrada (M15) entregues pela thread |
| Jornadas     | J-04                                                                          |
| TC           | TC-JOURNEY-002, TC-FUNC-016, TC-FUNC-017, TC-SEC-002, TC-SEC-003, TC-INT-005, TC-INT-006 |

## Missão

Achar qualquer jeito de, pelo link do WhatsApp, pagar o pedido errado, pagar outro valor, pagar duas
vezes, ou pagar um pedido que já não aceita pagamento — e confirmar que o link vivo leva a cliente sem
conta ao pagamento do pedido certo.

## Deve tentar

1. Abrir o link vivo: sem login, o pedido reconhecível (número, peça, valor), o código fora da barra de endereço depois de carregar; conferir que o valor é o da compra (M15: o da primeira cobrança, não o preço de hoje)
2. Abrir o link substituído, o de pedido pago e o de pedido cancelado: situação, sem formulário de cartão
3. Alterar um caractere do código, apagar o `#…`, e abrir o link vivo numa segunda aba e recarregar a primeira
4. Tentar avançar no Brick (no local ele não carrega: registrar como `blocked`, não como bug, e o que a tela diz quando o meio de pagamento não responde)

## Edge cases sugeridos

- Deep link no meio do fluxo (link sem fragmento)
- Mesma URL em duas abas
- Voltar depois do sucesso / da tela de situação
- Recarregar durante a espera do pagamento
- Link interno para deslogado (é o caso de uso: confirmar que não pede conta)
- Link mágico em outro contexto (abrir com uma sessão de `cliente` de OUTRA conta na mesma janela)
- Viewport mínima 320 × 568
- Fonte do sistema a 200 %

## Fora do escopo

- Gerar e copiar o link no painel — CH-05
- O checkout da primeira compra e o cartão dentro do checkout — a mudança não os toca
- O Brick e a cobrança real do Mercado Pago (chaves inválidas no local): ficam `blocked`, provados pelo probe 09 da Validation
- `/pedido/:id` e `/conta` da convidada — CH-04
- Parcelas e juros do cartão — comportamento pré-existente do Brick
