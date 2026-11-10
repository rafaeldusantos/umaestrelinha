# CH-03 · Conferir e desfazer registros em várias abas sem perder a conta da loja

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-02 Adri no computador                                                     |
| Tour         | Multi-Tab                                                                     |
| Modo         | com tour                                                                      |
| Time-box     | 60 min · orçamento: 50 ações                                                  |
| Mudança      | O bloco Pagamento de `/admin/pedidos/:id` passa a mostrar o registro manual (meio pelo nome, data em Brasília, quem registrou, observação, comprovantes por link que expira), a ação "Desfazer" com motivo (só em Pago e só no registro manual), e os selos "Pago duas vezes" e "Pago depois de cancelado"; o registro com o formulário aberto enquanto o pedido é pago diz isso e não grava; registro e desfazer entram e saem da venda, do estoque e do cupom — CA-03.3a, CA-03.4, CA-03.5b, CA-03.6, CA-03.7, CA-03.11, CA-03.12, CA-03.13, CA-03.14, CA-04.1, CA-04.2, CA-06.4, RNF-03, RNF-08 |
| Viewport     | 1440                                                                          |
| Entrada      | `http://localhost:8083/admin/pedidos/:id` · logada como `admin`; massa M6 (para registrar), M7, M8, M9, M11 |
| Jornadas     | J-02, J-01 (ramo J-01b)                                                       |
| TC           | TC-FUNC-006, TC-FUNC-007, TC-FUNC-008, TC-FUNC-009, TC-FUNC-013, TC-SEC-001, TC-INT-002, TC-INT-003 |

## Missão

Com o mesmo pedido aberto em duas ou três abas, conferir, registrar e desfazer, procurando o pagamento
que conta duas vezes, o estoque ou cupom que não volta, a venda que fica no Dashboard depois do desfazer
e o comprovante que abre para quem não devia.

## Deve tentar

1. Abrir a tela de registrar de um pedido M6 em duas abas; confirmar na aba A; confirmar na aba B — a B diz que o pedido já está pago e não grava (nem guarda o comprovante anexado)
2. Anotar estoque da peça, usos do cupom e a venda do Dashboard antes; registrar; conferir; desfazer com motivo; conferir que tudo voltou e que nenhum e-mail saiu (Mailpit)
3. Procurar "Desfazer" em M8 (Separando) e M9 (pago pela loja); desfazer na aba A enquanto a aba B (desatualizada) tenta desfazer de novo
4. Abrir os comprovantes de M7 (JPG, PDF, HEIC); copiar o link de um e abrir numa janela anônima, e de novo depois de alguns minutos (a validade é curta); conferir os selos de M11

## Edge cases sugeridos

- Mesma URL em duas abas
- Sair em outra aba (logout na aba B com o desfazer aberto na A)
- Duplo clique no confirmar do desfazer
- Enviar vazio (desfazer sem motivo)
- Voltar depois do sucesso (voltar à tela de registrar depois de registrado)
- Link interno para deslogado (o link do comprovante)
- Motivo longo e colado de outro app (aspas curvas, quebra de linha)

## Fora do escopo

- Os caminhos de status até Pago e o lote — CH-05
- A tela de registrar em 390 e as recusas de arquivo — CH-01
- Estorno ou devolução do valor "pago duas vezes" — fora da costura (o selo só avisa)
- O webhook que produz os selos (massa vem do probe 05) — integração
- O resto do Dashboard (gráficos, acessos) que a mudança não toca
