# CH-05 · Levar pedidos não pagos adiante sem nenhum virar "Pago" sem registro

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P1                                                                            |
| Persona      | PER-02 Adri no computador                                                     |
| Tour         | Back-Button                                                                   |
| Modo         | com tour                                                                      |
| Time-box     | 60 min · orçamento: 50 ações                                                  |
| Mudança      | "Avançar mesmo assim", "Outro status" (Pago, Separando, Enviado, Entregue) e o lote "Avançar status" levam um pedido não pago à tela de registrar, e o lote deixa de fora os não pagos e diz quantos; pedido avançado à mão sem pagamento mostra "Pagamento não registrado"; o botão "Gerar link de cartão" (só cartão não pago e não cancelado) com copiar; cancelar pelo painel fecha a cobrança aberta e não manda o e-mail de falta de pagamento — CA-03.9, CA-03.16, CA-05.1, CA-05.4, CA-06.3, CA-06.6 |
| Viewport     | 1440                                                                          |
| Entrada      | `http://localhost:8083/admin/pedidos` · logada como `admin`; massa M1, M3, M4, M6, M9, M10, M12 |
| Jornadas     | J-03, J-04 (geração do link)                                                  |
| TC           | TC-FUNC-010, TC-FUNC-011, TC-FUNC-012, TC-FUNC-014, TC-FUNC-015, TC-REG-001, TC-INT-004 |

## Missão

Usar todo atalho de status do painel — e o voltar do navegador no meio deles — procurando o pedido não
pago que chega a Pago (ou além) sem passar pelo registro, o lote que avança em silêncio só uma parte, e o
link de cartão oferecido onde não devia.

## Deve tentar

1. "Avançar mesmo assim" e "Outro status" → Pago, Separando, Enviado e Entregue num pedido M6; em cada um, usar o voltar do navegador na tela de registrar e conferir que o status não mudou
2. Lote com pagos (M9) e não pagos (M6) misturados; depois só não pagos
3. Procurar "Gerar link de cartão" em M3 (cartão recusado), M4 (cartão pendente), M1 (PIX), M12 (cancelado), M9 (pago); gerar em M3, copiar, gerar de novo
4. Cancelar M1 pelo painel com a caixa de aviso desmarcada e, num segundo, marcada; conferir o Mailpit

## Edge cases sugeridos

- Voltar e avançar repetido (pedido → tela de registrar → voltar → avançar)
- Deep link no meio do fluxo (abrir `/admin/pedidos/:id/pagamento` de um pedido pago ou cancelado)
- Recarregar na tela de registrar
- Duplo clique em "Gerar link de cartão"
- Duplo clique em "Avançar status" do lote
- Mesma URL em duas abas (gerar link em cada uma)

## Fora do escopo

- A tela de registrar em si (campos, arquivos, datas) — CH-01
- Desfazer e selos — CH-03
- `/pagar-com-cartao` do lado da cliente — CH-02
- Os outros gestos do pedido (rastreio, material, nota) e as outras ações do lote — a mudança não os toca
- O que o Mercado Pago faz ao fechar a cobrança (no local responde "não fechada") — integração
