# CH-06 · O que o registro e o cancelamento automático deixam no app e no painel

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P1                                                                            |
| Persona      | PER-01 Adri no celular                                                        |
| Tour         | Feature                                                                       |
| Modo         | livre                                                                         |
| Time-box     | 30 min · orçamento: 25 ações                                                  |
| Mudança      | O detalhe do pedido no app do ateliê mostra o pagamento registrado à mão (meio, data, observação), sem comprovante e sem ação; o evento "Pedido cancelado por falta de pagamento" entra em Notificações, desligado; o job cancela só o pedido pendente não pago de 7 dias criado depois da publicação, recomeça do desfazer, não é adiado pelo link e manda o e-mail próprio quando ligado — RNF-09, RNF-08, CA-03.15, CA-05.8, CA-06.1, CA-06.1a, CA-06.2, CA-06.6 |
| Viewport     | 390 × 844 (toque)                                                             |
| Entrada      | app `http://localhost:8084/pedidos/:id` e painel `http://localhost:8083/admin/configuracoes/notificacoes` · logada como `admin`; massa M7 e, depois de a thread rodar o job, os pedidos do recorte e os poupados (ver TC-INT-008) |
| Jornadas     | J-07, J-06                                                                    |
| TC           | TC-FUNC-025, TC-FUNC-026, TC-INT-008, TC-INT-009 |

## Missão

Confirmar, no celular, que o app do ateliê conta que o pedido foi pago por fora sem expor o comprovante, e
que o cancelamento automático cancelou só quem devia e deixou a marca e o e-mail certos.

## Deve tentar

1. Abrir M7 no app: ler o bloco de valores; procurar comprovante e ação de registrar/desfazer
2. Desfazer M7 no painel (outra aba) e puxar para reler no app
3. Em Notificações, achar o evento novo, conferir que nasce desligado e abrir a prévia
4. Depois de a thread rodar o job: abrir no painel os pedidos do recorte (cancelados, com a marca) e os poupados (continuam como estavam); com o e-mail ligado, conferir o Mailpit

## Edge cases sugeridos

- Voltar depois do sucesso
- Rede lenta no app
- Fonte do sistema a 200 % no app
- Girar no meio do fluxo
- Movimento reduzido

## Fora do escopo

- Registrar ou desfazer pelo app — fora da costura
- O texto do e-mail além do tom (é a Adri quem revisa antes de ligar)
- O resto do app do ateliê (Início além da venda, Clientes, Loja ao vivo)
- `pg_cron` no hospedado — trava só o deploy (Decisão 13)
