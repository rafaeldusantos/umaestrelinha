# CH-03 · Achar a oferta pelo celular

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | exploratório |
| Prioridade   | P0 |
| Persona      | PER-02 Marina |
| Tour         | Feature |
| Modo         | com tour |
| Time-box     | 60 min · orçamento: 50 ações |
| Mudança      | a faixa da campanha no cartão no lugar dos selos do canto, com as miniaturas acima (CA-03, CA-11, R-07); o selo em linha e os preços na página do produto (CA-03, CA-05); `/ofertas` com chips por percentual e o redirect de `/black-friday` (CA-09, R-03); o bloco "Joias em oferta" (R-04); filtros e ordenação pelo preço com desconto (R-06) |
| Viewport     | 390 × 844 (a maior parte); 1440 × 900 para conferir o cartão de 220 px e os chips numa linha |
| Massa        | só lê: a Black Friday, M-A..M-D, o bloco da Home |
| Driver       | — |
| Entrada      | `http://localhost:8082/` · sem login, sacola vazia |
| Jornadas     | J-03 |
| TC           | TC-FUNC-004, TC-FUNC-007, TC-FUNC-011, TC-FUNC-018, TC-FUNC-020, TC-UI-001, TC-JOURNEY-001 |

## Missão

Como quem nunca abriu a loja e chegou pelo celular, confirmar que dá para achar as peças em oferta pela Home e por
`/ofertas` e entender, sem fazer conta, quanto cada uma custa — procurando cartão e página discordando do preço,
faixa cobrindo o que a cliente quer tocar, e promessa que a tela faz e não cumpre.

## Deve tentar

1. Da Home, pelo bloco "Joias em oferta": cada cartão de percentual leva a `/ofertas?percentual=<p>` com o chip
   certo pressionado; "Ver todas" leva a `/ofertas` (procurar o "Ver todas" também no celular)
2. Em `/ofertas`: a contagem de cada chip bate com os cartões; "Com desconto", a faixa de preço e "menor preço"
   usam o preço com desconto
3. No cartão de M-D: tocar nas miniaturas de cor troca a foto sem navegar; a faixa não cobre as miniaturas; nenhum
   selo do canto (Novo, Últimas, Destaque, −X%) junto da faixa
4. Comparar o preço de M-A, M-B e M-C no cartão, na página do produto (por variação em M-B) e no mini-carrinho ao
   acrescentar — sem finalizar compra

## Edge cases sugeridos

- Deep link: abrir `/ofertas?percentual=15` direto, e `/ofertas?percentual=50` (percentual que não existe)
- Abrir `/black-friday` (link antigo)
- Voltar e avançar entre `/ofertas` filtrada e a página do produto (o chip volta certo?)
- Girar no meio (390 × 844 → 844 × 390)
- Viewport mínima (320 × 568) na vitrine
- Rolagem infinita da vitrine até o fim
- Movimento reduzido ao abrir o bloco da Home

## Fora do escopo

- Sacola e checkout além de acrescentar a peça (CH-04)
- O resto da Home, os filtros da categoria comum e a busca: a mudança não os toca — o que se vir ali é sugestão de backlog
- As fotos que não carregam por virem do Storage hospedado (bloqueado de propósito): não é achado
- Fonte a 200 % e a medida de layout fina do selo (CH-08); conferência contra o protótipo (CH-07)
- O feed do Google (CH-05)
