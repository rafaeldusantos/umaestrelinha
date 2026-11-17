# CH-02 · Achar as joias escolhidas pelo celular

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-02 Marina                                                                 |
| Tour         | Feature                                                                       |
| Modo         | com tour                                                                      |
| Time-box     | 60 min · orçamento: 50 ações                                                  |
| Mudança      | o bloco na Home passa a usar o título, a descrição e as peças escolhidas da campanha do bloco, numa fileira em fita (celular e computador, com setas), com uma vaga de esqueleto por peça — CA-01.4, CA-02.2, CA-03.2, CA-03.3, CA-04.6, RNF-02, RNF-04, RNF-06 |
| Viewport     | 390 × 844; depois 1440 × 900                                                  |
| Massa        | só lê B-1 (configurado pelo CH-01), C-VIG, P-1..P-3                            |
| Driver       | `—`                                                                           |
| Entrada      | `/` na loja (`:8082`) · sem login, sacola vazia                               |
| Jornadas     | J-02                                                                          |
| TC           | TC-JOURNEY-002, TC-FUNC-008, TC-UI-001 — 3 TC em 50 ações                     |

## Missão

Confirmar que quem nunca abriu a loja, pelo celular, encontra o bloco "Joias em oferta", entende pelo título, pela
descrição e pelo selo que há desconto, passa pelas peças que a dona escolheu — na ordem dela — e chega à página de
uma delas com o preço da campanha, sem a página pular nem rolar de lado.

## Deve tentar

1. Descer até o bloco com a rede lenta (emular rede lenta) e observar a fileira enquanto carrega: quantas vagas
   reserva e se algo salta quando as peças chegam
2. Passar as peças pelo toque em 390 px e, em 1440 × 900, pelas setas; conferir a ordem (P-3, P-1, P-2, a do CH-01)
3. Tocar numa peça e voltar; tocar em "Ver todas"
4. Bloquear a leitura de produtos (`**/rest/v1/products*`) e recarregar a Home: o resto da Home e os cartões do
   bloco ficam de pé (RNF-02); tirar o bloqueio

## Edge cases sugeridos

- Viewport mínima 320 × 568
- Girar 390 × 844 para 844 × 390
- Voltar depois de abrir a peça (a Home volta no mesmo ponto?)
- Movimento reduzido na fileira
- Fonte a 200 % no bloco (título e descrição longos não cortam)

## Fora do escopo

- a sacola e o checkout (WI 102) — só o caminho até a página da peça
- as outras fileiras e blocos da Home
- `/ofertas` além de abrir pelo "Ver todas"
- a foto da peça não carregar (o Storage hospedado está bloqueado — não é achado)
