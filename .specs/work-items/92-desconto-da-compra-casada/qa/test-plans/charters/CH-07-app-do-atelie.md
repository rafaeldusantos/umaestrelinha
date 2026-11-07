# CH-07 · No app do ateliê, o pedido diz que houve desconto do Compre Junto e quanto

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P1                                                                            |
| Persona      | PER-03 Adri (ateliê)                                                          |
| Tour         | Feature                                                                       |
| Modo         | livre                                                                         |
| Time-box     | 30 min · orçamento: 25 ações                                                  |
| Mudança      | o detalhe do pedido (`BlocoItens`, `BlocoValores`) mostra a linha "Desconto do Compre Junto − R$ X" e as peças com o preço cheio, pela regra de `core/orders` (CA-05.3), com as linhas do resumo na ordem do painel — descontos e PIX antes do Frete (decisão Q-01 de 2026-11-04; hoje o app põe o Frete antes, e isso é bug); as linhas dos itens seguem o padrão de `BlocoItens` (D-38); 390 sem rolagem (RNF-05) |
| Viewport     | 390 × 844, com fonte a 100 %, 130 % e 200 %                                   |
| Entrada      | `http://localhost:8084/pedidos` · logada como `admin-painel`                  |
| Jornadas     | J-06 e o ramo J-06a                                                            |
| TC           | TC-JOURNEY-008, TC-FUNC-031                                                    |

## Missão

Abrir no celular os pedidos com desconto e confirmar que a Adri reconhece cada peça, vê o desconto e o mesmo Total
do painel, na mesma ordem, sem nada estourando a tela.

## Deve tentar

1. Abrir o pedido com linha mista e o pedido com cupom; somar o bloco de valores.
2. Comparar o Total e a ordem das linhas com os do painel para o mesmo pedido.
3. Abrir um pedido antigo (M-06).

## Edge cases sugeridos

- Fonte do sistema a 200 %
- Rede caindo ao abrir o pedido (a tela de sem conexão do app)
- Voltar à lista e reabrir o pedido
- Girar o celular

## Fora do escopo

- As ações do pedido no app (status, rastreio, envelope, avisos) e a Início.
- O Android real e o TalkBack (fora do alcance da sessão).
