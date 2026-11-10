# CH-01 · Registrar pagamento no celular, com comprovantes de verdade e maltratados

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-01 Adri no celular                                                        |
| Tour         | Garbage                                                                       |
| Modo         | por técnica (valor limite nos arquivos e na data)                             |
| Time-box     | 60 min · orçamento: 50 ações                                                  |
| Mudança      | Nasce a tela "Registrar pagamento" do pedido (`/admin/pedidos/:id/pagamento`) e a ação no bloco Pagamento: meio numa lista fixa, data e hora de Brasília com limites, observação, até 3 comprovantes (JPG, PNG, WebP, HEIC, PDF; 10 MB), tudo opcional; ao confirmar, o pedido fica pago, com histórico e o portão de e-mail da 88 — CA-03.1, CA-03.2, CA-03.2a, CA-03.2b, CA-03.3, CA-03.5, CA-03.6, CA-03.8, CA-03.10, RNF-01, RNF-04 |
| Viewport     | 390 × 844 (toque); uma passada final em 1440 só na tela de registrar          |
| Entrada      | `http://localhost:8083/admin/pedidos/:id` · logada como `admin`; pedidos da massa M6 e M6b (pendentes, não pagos); M12 (cancelado) e M9 (pago) para o TC-FUNC-001; arquivos M16 |
| Jornadas     | J-01                                                                          |
| TC           | TC-JOURNEY-001, TC-FUNC-001, TC-FUNC-002, TC-FUNC-003, TC-FUNC-004, TC-FUNC-005, TC-INT-001, TC-UI-001 |

## Missão

Confirmar que a Adri, com uma mão no celular, registra o PIX que a cliente mandou por fora — com a foto
do comprovante — em menos de 90 s, e que nenhum arquivo, data ou toque duplo maltratado faz a tela gravar
pela metade, aceitar o que devia recusar ou repetir o efeito.

## Deve tentar

1. Percorrer J-01 inteira num pedido M6 com um JPG e um PDF, mandando o e-mail no portão; conferir o pedido em "Pago", o bloco e o histórico, e o e-mail no Mailpit (:54444)
2. Num segundo pedido, confirmar sem preencher nada; num terceiro, pôr data de amanhã e depois uma anterior à criação do pedido (M6b)
3. Anexar, um de cada vez: o HEIC, o arquivo de mais de 10 MB, o GIF/TXT, e um quarto arquivo válido — ver a recusa e o motivo antes de qualquer gravação, e que o resto do formulário continua preenchido
4. Tocar duas vezes seguidas em confirmar; cortar a rede (offline) no meio do envio de um comprovante grande e restaurar

## Edge cases sugeridos

- Duplo clique no enviar
- Enviar vazio
- Cair e voltar (offline no envio do comprovante)
- Recarregar durante o envio
- Voltar no meio do formulário (arquivo anexado, voltar, retornar)
- Arrastar arquivo para fora da área (só em 1440)
- Viewport mínima 320 × 568
- Girar no meio do fluxo (390 × 844 → 844 × 390)
- Arquivo com nome longo e acentuado (`comprovante pix 10-11 transferência — maria.pdf`)

## Fora do escopo

- Desfazer, selos e o bloco em 1440 — CH-03
- "Avançar mesmo assim", "Outro status" e o lote — CH-05
- O fechamento da cobrança no Mercado Pago (no local responde "não fechada") — integração, TC-INT-007
- Registrar pelo app do ateliê — fora do Work Item (o app só mostra)
- O resto da página do pedido (itens, endereço, rastreio, material) que a mudança não toca — o que se vir ali é sugestão de backlog
- Estorno e reembolso — fora da costura
