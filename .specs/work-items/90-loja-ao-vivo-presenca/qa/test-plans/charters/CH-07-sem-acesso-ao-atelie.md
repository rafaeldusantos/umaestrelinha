# CH-07 · Sem acesso ao ateliê, nenhum número da loja

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | exploratório |
| Prioridade   | P0 |
| Persona      | PER-05 Marina |
| Tour         | Back-Button |
| Modo         | com tour |
| Time-box     | 30 min · orçamento 25 ações |
| Mudança      | a leitura ao vivo nova é só de admin e a recusa cai no episódio único de recusa do app, no cartão do Início e na Loja ao vivo (LAV-60, D-10) |
| Viewport     | 390 × 844 |
| Entrada      | http://localhost:8084/ logada como `admin-secundaria` |
| Jornadas     | J-06a, J-06b |
| TC           | TC-SEC-006, TC-SEC-007 |

**Ambiente:** massa — a conta `admin-secundaria` criada pela Adri em `/admin/usuarios` (painel :8083). Para
TC-SEC-007 a Marina começa com acesso e a Adri, noutro contexto, a tira com "Remover do painel"; para TC-SEC-006
ela entra já sem acesso. Uma cliente presente na loja (como no CH-01), para que haja número a vazar.

## Missão

Confirmar que a Marina, sem acesso, nunca vê o número de pessoas na loja — nem por um instante, nem pelo voltar
do navegador.

## Deve tentar

1. Entrar sem acesso e abrir o Início e `/ao-vivo` direto pela URL
2. Com a Loja ao vivo aberta, ter o acesso retirado e esperar a próxima leitura (até 15 s)
3. Voltar e avançar pelo navegador depois da recusa
4. Screenshot nos primeiros instantes de cada carga

## Edge cases sugeridos

- Deep link em `/ao-vivo` sem acesso
- Voltar depois da recusa
- Recarregar na tela de recusa
- Acesso retirado com o app em segundo plano, e voltar
- Rede caindo e voltando sem acesso (falha não pode virar recusa, nem o contrário)

## Fora do escopo

- O login e a recuperação de senha do app (feature 72)
- O painel além do "Remover do painel"
