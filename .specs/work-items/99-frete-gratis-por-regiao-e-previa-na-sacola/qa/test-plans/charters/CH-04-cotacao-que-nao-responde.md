# CH-04 · A cotação que não responde

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | exploratório |
| Prioridade   | P1 |
| Persona      | PER-01 Luana |
| Tour         | Network |
| Modo         | com tour |
| Time-box     | 30 min · orçamento: 25 ações |
| Mudança      | a gaveta mostra a falha da cotação com "Tentar de novo", mantém o Total sem frete e o "Finalizar Pedido" funcionando, sem "Frete padrão"; e o "nenhuma opção para este CEP" (CA-11; UC-06 do PRD 97) |
| Viewport     | 390 × 844 |
| Massa        | só lê `store_settings` e o catálogo; sacola e rascunho próprios |
| Driver       | — |
| Entrada      | `/` · anônima, sacola com uma peça; a rota `**/functions/v1/melhor-envio*` **abortada** (`network route … --abort`) no começo, depois respondendo `[]`, depois a **fixture A** |
| Jornadas     | J-01 (ramo J-01b) |
| TC           | TC-FUNC-010 |

## Missão

Como Luana, com a rede ruim do celular, ver o que a sacola diz quando a consulta do frete falha ou não traz opção, e
se ela ainda consegue seguir para o checkout sem que a sacola invente um frete.

## Deve tentar

1. Calcular com a cotação abortada: a mensagem, o "Tentar de novo", o Total, o botão "Finalizar Pedido".
2. Liberar a rota (fixture A) e tocar "Tentar de novo": as opções aparecem e a mais barata é marcada.
3. Responder `[]` e calcular: "Nenhuma opção de frete disponível para este CEP…".
4. Seguir ao checkout depois da falha: o checkout cota de novo e oferece o que ele já oferecia.

## Edge cases sugeridos

- `set offline on` no meio do cálculo e `off` depois.
- Duplo toque em "Tentar de novo".
- Recarregar a página com a mensagem de falha na tela.
- Falha com o frete já escolhido antes (cotação que cai na segunda consulta): a escolha não some.

## Fora do escopo

- Resposta lenta (o "calculando" com esqueleto): o `network route` não atrasa resposta; vai para Fora da cobertura.
- O "Frete padrão" do **checkout** quando a cotação falha (`SHP-05`) é comportamento anterior e continua: só na gaveta
  ele é proibido.
- Região, cupom, retirada — outros charters.
