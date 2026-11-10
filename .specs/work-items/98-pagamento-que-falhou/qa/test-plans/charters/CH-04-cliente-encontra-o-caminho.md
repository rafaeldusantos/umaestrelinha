# CH-04 · A cliente volta a cada pedido que falhou e encontra a ação certa

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-03 Cliente que voltou ao pedido                                           |
| Tour         | Feature                                                                       |
| Modo         | por cenário (J-05 e o lado da cliente de J-06)                                |
| Time-box     | 60 min · orçamento: 50 ações                                                  |
| Mudança      | Em `/pedido/:id` e `/conta`: PIX pendente oferece "Pagar com PIX"; vencido ou recusado nos 7 dias oferece "Gerar novo PIX" com a data-limite; cartão recusado ou pendente com tentativa mostra o convite para o WhatsApp, sem oferecer cartão nem PIX; cartão nunca cobrado fica fora das pendências; cancelado não oferece pagamento; avançado à mão sem pagamento não oferece pagar; pago por fora aparece pago com o meio informado e sem observação nem comprovante; cancelado por falta de pagamento diz isso e oferece o WhatsApp; tudo no tom memorial — CA-01.1, CA-01.2, CA-01.3, CA-01.4, CA-02.1, CA-02.2, CA-02.3, CA-02.4, CA-03.16, CA-04.3, CA-06.5, RNF-01, RNF-06 |
| Viewport     | 390 × 844 (toque); fonte do sistema a 130 % e 200 % numa passada             |
| Entrada      | `http://localhost:8082/conta` · logada como `cliente`; pedidos M1, M2, M3, M4, M5, M7, M10, M12, M13 nesta conta; WhatsApp da loja configurado |
| Jornadas     | J-05, J-06                                                                    |
| TC           | TC-JOURNEY-003, TC-FUNC-018, TC-FUNC-019, TC-FUNC-020, TC-FUNC-021, TC-FUNC-022, TC-FUNC-023, TC-FUNC-024, TC-FUNC-027, TC-UI-002, TC-INT-007 |

## Missão

Confirmar que a cliente em luto, voltando dias depois pelo celular, encontra em cada pedido que falhou
exatamente uma saída coerente — pagar, gerar um PIX novo ou falar com a Adri —, nunca uma oferta que não
serve, e nunca uma frase com cara de cobrança.

## Deve tentar

1. Ler as pendências de `/conta` e abrir cada pedido da massa, anotando a ação e a frase de cada estado
2. Gerar o PIX novo de M2 a partir da conta e do pedido (no local a cobrança não se cria: registrar o que a tela diz como `blocked` do Mercado Pago, não como bug)
3. Colar `/pedido/:id/pagamento` de M12 (cancelado), M10 (avançado à mão) e M7 (pago por fora) direto na barra
4. Repetir as telas principais com a fonte a 130 % e 200 %, e conferir a cópia contra o tom (sem urgência, exclamação, emoji; primeira pessoa da Adri)

## Edge cases sugeridos

- Deep link no meio do fluxo (`/pedido/:id/pagamento` de pedido que não aceita pagamento)
- Voltar depois do erro (abrir o PIX novo, voltar, abrir de novo)
- Viewport mínima 320 × 568
- Movimento reduzido
- Rede lenta ao abrir o pedido
- WhatsApp sem número configurado (pergunte à thread se dá para trocar a massa; senão, Fora da cobertura)

## Fora do escopo

- `/pagar-com-cartao` — CH-02
- O checkout da primeira compra e o QR do PIX em si (pré-existentes)
- O e-mail e o job do cancelamento automático — CH-06
- O rastreio, a jornada do material e o resto da conta que a mudança não toca
- Convidada depois dos 7 dias do token (limitação aceita na costura)
