# CH-05 · Conta sem acesso ao ateliê nas telas novas

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P1                                                                            |
| Persona      | PER-05 Conta sem acesso ao ateliê                                             |
| Tour         | Feature                                                                       |
| Modo         | livre                                                                         |
| Time-box     | 30 min · orçamento: 25 ações                                                  |
| Mudança      | as rotas novas dentro do guarda (`/pedidos/montar`, `/pedidos?visao=montados`, `/pedidos/montados/:id`) e as portas novas (`order-proposals`, `customer-parse`, a cotação) com a recusa só pelo `42501` (UC-01, UC-02, UC-05, UC-09; D-01, D-02, D-40) |
| Viewport     | 390 × 844                                                                     |
| Entrada      | as três rotas por deep link · logada como `cliente-sem-papel`                 |
| Jornadas     | J-06                                                                          |
| TC           | TC-SEC-001, TC-JOURNEY-006                                                    |

## Missão

Confirmar que quem entra com uma conta sem papel de admin vê a recusa em toda tela nova, sem um nome, e-mail,
link ou peça de cliente em instante nenhum, e consegue sair para a conta certa.

## Deve tentar

1. Abrir cada rota nova por deep link e tirar snapshot logo no primeiro quadro e depois de 2 s
2. Abrir o `id` de um pedido montado real (colhido antes com a conta do ateliê, por outra sessão ou pelo painel)
3. Com a rede cortada, abrir a rota: deve ser falha de rede, nunca a recusa
4. Sair e entrar com `admin-atelie`

## Edge cases sugeridos

- Link interno para deslogado (sem sessão nenhuma): vai ao login e, depois, ao destino
- Voltar depois da recusa
- Recarregar a recusa

## Fora do escopo

- As rotas pré-existentes do app (Início, Clientes, `/pedidos/:id`) — guardas da 72–76
- O painel com conta sem papel (`rotasSobGuarda` do painel, pré-existente)
- Testes de segurança além do que a tela mostra (token forjado, chamada direta à function)
