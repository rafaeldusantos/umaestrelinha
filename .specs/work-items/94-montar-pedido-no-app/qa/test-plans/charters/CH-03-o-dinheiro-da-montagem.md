# CH-03 · O dinheiro da montagem: estoque, promoção, cupom, combinado e preço travado

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-01 Adri no WhatsApp                                                       |
| Tour         | Money                                                                         |
| Modo         | por técnica (valor limite)                                                    |
| Time-box     | 60 min · orçamento: 50 ações                                                  |
| Mudança      | o teto de estoque que soma a sacola (UC-06, D-22); a promoção vigente na folha e na sacola (UC-06); o cupom pela prévia do servidor, com o e-mail da cliente (UC-07, D-29, D-38); o desconto combinado e a recusa de zerar (UC-07, D-39); o resumo vivo e o PIX (UC-07); "Criar link" uma vez e o preço que mudou (UC-08, PRC-02) |
| Viewport     | 390 × 844                                                                     |
| Entrada      | `/pedidos` → "Montar pedido" · logada como `admin-atelie`; cliente escolhida  |
| Jornadas     | J-01 (passos 5–8), J-02 (passos 4–6)                                          |
| TC           | TC-FUNC-017, TC-FUNC-020, TC-FUNC-021, TC-FUNC-022, TC-FUNC-023, TC-FUNC-025, TC-FUNC-026 |

## Missão

Achar qualquer jeito de o total do pedido montado divergir do que a Adri viu na revisão: estoque estourado,
promoção perdida, cupom de primeira compra aceito para quem já comprou, combinado que zera ou fica negativo,
duas propostas no duplo toque, ou link criado com o preço velho.

## Deve tentar

1. Quantidade no limite: 3 em estoque, 2 já na sacola, tentar mais 2 na mesma variação ("Só há 3 em estoque." e botão desligado)
2. Cupons: válido em %, frete grátis, `first_order_only` com cliente que já comprou, com cliente nova e **sem e-mail** ("Este cupom pede o e-mail da cliente."), código inexistente, vazio
3. Combinado em R$ e em %: 99,99 %, 100 %, valor maior que os itens; motivo vazio; motivo com 121 caracteres
4. Com a revisão aberta, mudar o preço da peça no painel (outra aba, 1440) e tocar em "Criar link"

## Edge cases sugeridos

- Duplo toque em "Criar link"
- Recarregar durante "Criando o link…"
- Trocar a cliente depois de aplicar um cupom de primeira compra
- Cair a rede enquanto o resumo vivo recalcula; mudar a quantidade rápido várias vezes
- Peça em promoção + cupom + combinado na mesma sacola (a ordem promoção → cupom → combinado)
- Colar o código do cupom em minúsculas e com espaço

## Fora do escopo

- O pagamento em si no link (feature 89; só a TC-INT-003 olha a conclusão)
- O frete escolhido pela cliente: a revisão mostra só a prévia
- Registrar pedido já pago por fora — fora do WI
- As telas de cupom e de promoção do painel (pré-existentes): usadas só como massa
