# Sessão CH-05 · Conta sem acesso ao ateliê nas telas novas

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-05-conta-sem-acesso.md` · exploratório · P1    |
| Status      | done                                                                   |
| Persona     | PER-05 Conta sem acesso ao ateliê · conta: `cliente-sem-papel` (troca para `admin-atelie` no fim) |
| Tour · modo | Feature · livre                                                        |
| Rodada      | exploração                                                             |
| Orçamento   | 17 ações de browser de 25                                              |
| Ambiente    | http://localhost:8084 (dev, branch feature/94) · build não exposto · Chromium headless (Playwright MCP) · viewport 390 × 844 |
| Paridade    | Supabase local (54441) e functions locais; `*.supabase.co` bloqueado; "rede cortada" simulada abortando só as requisições ao Supabase local (o app servido pelo dev server continua carregando — não há service worker em dev) |

## Missão

Confirmar que quem entra com uma conta sem papel de admin vê a recusa em toda tela nova, sem um nome, e-mail,
link ou peça de cliente em instante nenhum, e consegue sair para a conta certa.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Sem sessão, abre `/pedidos/montar` pelo link | Vai à tela de login ("Entrar no ateliê"); nada da montagem | — |
| 02 | Entra com a conta sem papel | Em 100 ms, 400 ms, 1 s e 2,5 s: "Esta conta não tem acesso ao painel." com o botão "Sair"; nenhum dado | `screenshots/CH-05-02-recusa-no-login.png` |
| 03 | Já logada, abre por link `/pedidos/montar`, `/pedidos?visao=montados` e `/pedidos/montados/<id do P-0034>`, lendo a tela a 50 ms, 300 ms, 800 ms e 2 s em cada | Nos três: só o casco "ATELIÊ · PAINEL" (splash) até ~300 ms, depois a recusa ("Esta conta não tem acesso ao painel." + Sair). Nenhuma ocorrência de "Juliana", "Prates", "P-0034"/"0034", nenhum cartão, link, peça ou histórico em nenhum quadro. Rede: só `GET rest/v1/user_roles → 200` e `GET rest/v1/customers → 200` (a própria conta) por rota; **nenhuma chamada a `order-proposals`, `customer-parse` nem à cotação** | `screenshots/CH-05-03-recusa-pedido-montado.png` |
| 04 | Volta (botão voltar) e recarrega na recusa | Continua na recusa, sem dado | — |
| 05 | Com a rede do Supabase cortada, abre `/pedidos/montar` | Splash até ~8 s, depois "Não consegui conferir seu acesso. Confira a internet do celular e tente de novo. Sua sessão continua salva." com "Tentar de novo" — **não** a recusa | `screenshots/CH-05-05-sem-rede-nao-e-recusa.png` |
| 06 | Rede de volta, toca em "Tentar de novo" | Passa à recusa da conta sem papel (correto: agora o papel foi conferido) | — |
| 07 | Toca em "Sair" e entra com `admin-atelie` | Sai para o login limpo; ao entrar, cai direto em `/pedidos/montar`, a montagem vazia ("Passo 1 de 4 · Cliente") — o destino tentado antes | `screenshots/CH-05-07-admin-cai-na-montagem.png` |
| 08 | Como admin, abre Montados e o mesmo `id` | Lista "Montados · 4 abertos", 17 pedidos montados; o P-0034 abre com "Link para Juliana" — prova que o `id` usado no passo 03 é real e que a recusa escondia dado existente | — |
| 09 | Em Pedidos, toca em "Montar pedido" | A montagem abre vazia no passo 1 de imediato | — |
| 10 | Sai da conta pelo menu "Sua conta" → Sair | Volta ao login | — |

**Edge cases tentados:**
- Link interno sem sessão: vai ao login; depois de entrar como admin, ao destino (`/pedidos/montar`)
- Voltar depois da recusa: continua na recusa
- Recarregar a recusa: continua na recusa
- Rede cortada ao abrir: falha de rede com saída, nunca a recusa
- Leitura da tela em vários instantes (50 ms a 2,5 s) para pegar dado piscando antes da recusa

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-SEC-001 | pass | 01–05 | `screenshots/CH-05-03-recusa-pedido-montado.png`, `screenshots/CH-05-05-sem-rede-nao-e-recusa.png` | recusa nas três rotas sem dado em nenhum quadro; sem rede ⇒ "Não consegui conferir seu acesso" com saída; variação sem sessão ⇒ login |
| TC-JOURNEY-006 | pass | 02–09 | `screenshots/CH-05-02-recusa-no-login.png`, `screenshots/CH-05-07-admin-cai-na-montagem.png` | recusa em < 1 s nas rotas; troca de conta pelo "Sair" da recusa; admin entra e a montagem abre vazia; J-06a pelo passo 05 |

Contagem: pass 2 · fail 0 · blocked 0 · skip 0

## Achados

nada

## Spec-gaps

nada

## Fora da cobertura

- Corte de rede **total** (app sem servidor) — em dev não há service worker; a sessão cortou só o Supabase local. O comportamento do app instalado (PWA) offline não foi visto
- Respostas das functions novas a uma chamada direta com o token da conta sem papel — fora do escopo do charter (a tela nunca as chamou)
- Android real e leitor de tela

## Debrief

- **Surpresas:** a conta sem papel nunca chega a disparar `order-proposals` nem `customer-parse`: a recusa vem antes de qualquer leitura das telas novas. A espera até "Não consegui conferir seu acesso" sem rede é de ~8 s (o teto da fundação, pré-existente)
- **Próximo charter:** nada
- **Padrão novo:** ler a tela em instantes fixos (50 ms–2 s) logo após o deep link, para pegar dado que pisca antes da recusa
