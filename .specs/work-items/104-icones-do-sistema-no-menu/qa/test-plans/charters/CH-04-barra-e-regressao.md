# CH-04 · A barra do computador e o que não podia mudar

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P1                                                                            |
| Persona      | PER-03 Cliente no computador                                                  |
| Tour         | Feature                                                                       |
| Modo         | por cenário (J-03)                                                            |
| Time-box     | 60 min · orçamento 50 ações                                                   |
| Mudança      | a barra do computador desenha o ícone do sistema e o rótulo na cor escolhida para a barra; no hover e com o painel aberto a cor se mantém, e a pista do aberto é a régua de 2 px (C-03, C-06, P-05). Regressão: item sem cor, ícones da marca já gravados, submenu e "ver tudo" continuam como antes (C-05, C-06) |
| Viewport     | 1440 × 900; 390 × 844 para a parte de regressão da folha                      |
| Massa        | só lê — o menu como CH-01 e CH-02 deixaram                                    |
| Driver       | —                                                                             |
| Entrada      | `/` na loja (`http://localhost:8082`) · anônima                               |
| Jornadas     | J-03                                                                          |
| TC           | TC-JOURNEY-003, TC-FUNC-011, TC-REG-001                                       |

## Missão

Confirmar que na barra do computador o item destacado se lê, mantém a cor no hover e aberto sem perder a pista de qual está aberto, e que tudo o que a dona não coloriu continua exatamente como antes do Work Item.

## Deve tentar

1. Item A: cor computada do rótulo `#E8C77A` parado, no hover e com foco por Tab; Etiqueta ao lado; clicar e chegar à página
2. Item B: rótulo na cor de hoje na barra (`on-primary`, `#F7F3EC`) — B só tem cor de lista —, Presente ao lado; abrir o painel e ver a régua de 2 px; filhos e "ver tudo" do painel na cor de hoje
3. Itens C e D na barra e, a 390, na folha: cor de hoje; D com o mesmo ícone da marca de antes do Work Item (compare com o screenshot de partida do CH-01, se houver)
4. Passar o mouse de A para B e de volta: a régua acompanha o aberto, a cor de A não pisca para branco

## Edge cases sugeridos

- Só teclado: Tab pela barra e Enter para abrir o painel
- Viewport enorme 2560 × 1440 (alinhamento ícone e rótulo)
- Faixa que rola (muitos itens): a seta e o degradê continuam, a cor não vaza para eles
- Voltar do navegador depois de clicar no item A
- Movimento reduzido

## Fora do escopo

- A folha do celular dos itens A e B — é do CH-03
- O desenho do painel do mega menu, banners e a rolagem da faixa — pré-existentes; só olhe se a cor ou o ícone os afeta
- Ícone e cor no submenu e no "ver tudo" — decisão P-04
- A prévia do painel — é conferida pela dona no CH-01 (TC-FUNC-004), que exige a conta `admin`
