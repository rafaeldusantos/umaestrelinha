# CH-04 · Quando o desconto muda no caminho, ninguém paga a mais e todos sabem como seguir

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-04 Helena                                                                 |
| Tour         | Interrupt                                                                     |
| Modo         | por cenário                                                                   |
| Time-box     | 60 min · orçamento: 50 ações                                                  |
| Mudança      | a sacola relê o percentual (CA-03.12); o pagamento recusa antes de cobrar quando o pedido ficou mais caro, segue quando igual ou mais barato, e as duas telas de "o valor mudou" (CA-04.3); o pedido já feito não muda (CA-05.4); o `create-payment` sobe no runtime local (RNF-03) |
| Viewport     | 390 × 844                                                                     |
| Entrada      | `/produtos/<slug de P>` · logada como `cliente-loja`; a mudança do percentual é feita pela thread no painel (`admin-painel`) ou no banco local, no passo que o caso indica — a persona não troca de conta |
| Jornadas     | J-04 e os ramos J-04a..J-04e                                                   |
| TC           | TC-JOURNEY-005, TC-JOURNEY-006, TC-FUNC-023, TC-FUNC-025, TC-FUNC-029, TC-INT-003 |

## Missão

Interromper a compra no meio — fechar a aba, voltar no dia seguinte pelo link ou por Minha conta — enquanto o
desconto muda, e confirmar que a cliente nunca é cobrada a mais, lê que nada foi cobrado e tem um próximo passo.

## Deve tentar

1. Baixar o percentual entre a sacola e o pagamento e confirmar o pagamento pelo checkout; seguir "Confirmar com o
   novo total" e "Voltar à sacola".
2. Criar o pedido, fechar a aba, baixar o percentual, voltar por Minha conta e tentar pagar.
3. Subir o percentual (ou pôr uma promoção maior) entre a sacola e o pagamento.
4. Depois de um pedido feito, apagar o percentual e reabrir o pedido.

## Edge cases sugeridos

- Fechar e reabrir a aba no checkout
- Voltar depois do aviso "o valor mudou"
- Duplo clique em "Confirmar com o novo total"
- Recarregar a tela do aviso
- Deep link no meio do fluxo (abrir `/pedido/:id/pagamento` direto)
- Abrir o link do pedido em outra aba, deslogada (convidada com token)

## Fora do escopo

- O contato da loja em si (WhatsApp e e-mail abrem o app externo; só se confere que os botões existem com M-08).
- Outros 422 do pagamento que não vêm do desconto (estoque, frete).
- A cobrança real no Mercado Pago: o local falha depois da guarda, e isso não é achado.
