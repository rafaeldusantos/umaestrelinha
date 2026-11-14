# Sessão CH-06 · Lúcia reencontra a loja de sempre no perfil Padrão

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-06-lucia-reencontra-a-loja-de-sempre.md` · exploratório · P0 |
| Status      | done (a sacola com a peça e o checkout ficaram `blocked` por `massa`: a peça não entrou na sacola, nem na loja do WI nem na referência) |
| Persona     | PER-04 Lúcia · conta: `cliente-qa` (`QA_CLIENTE_QA_USUARIO`, entrada por código pelo Mailpit) nas duas lojas para `/conta` e `/pedido/:id`; anônima no produto e na sacola da referência |
| Tour · modo | Feature · por cenário (J-04), worktree × referência. Rodada de confirmação: só as telas do TC-REG-001 que ficaram faltando na r1 |
| Rodada      | confirmação                                                            |
| Orçamento   | 29 ações de browser de 35, mais o `close`. Conta: uma volta ao browser = uma ação (os comandos encadeados numa volta contam como uma) |
| Ambiente    | http://localhost:8182 (worktree) × http://localhost:8092 (referência, commit-base, mesmo banco) · build não exposto · Chromium (agent-browser 0.39.1) · viewports 390 × 844 · 1440 × 900 |
| Paridade    | `*.supabase.co*` e `**/g/collect*` abortados por rota antes do primeiro `open`. Faixa de avisos com aviso girando (Black Friday / frete grátis / descontos) nas duas lojas: é conteúdo do banco. Perfil salvo: S0 (chave ausente = Padrão), só lido |

## Missão

Como a cliente que volta e conhece a loja de cor, achar qualquer tom, transparência, sombra ou marca que esteja
diferente da loja de antes do Work Item quando a dona não ligou nada.

## Método

O mesmo da r1: **um** `eval` por tela em cada loja, que conta os valores computados distintos de `color`,
`background-color`, `border-top/bottom/left-color` (só com borda > 0), `box-shadow`, `fill`/`stroke` (SVG),
`outline-color` (só com outline) e gradientes dos elementos visíveis. Na gaveta, a leitura fica só dentro do
`dialog`. Depois comparei os dois conjuntos com `diff` (worktree × referência), contagens incluídas.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar na conta pelo código do e-mail e abrir "Pedidos" (`/conta`) no celular (390), nas duas lojas | O pedido #0613 "Aguardando pagamento" e o bloco "Precisa da sua atenção". 1ª leitura da referência feita durante a troca de tela (ainda tinha elementos do formulário de entrada, como os SVG do Google). Li de novo as duas depois da rede assentar: **idênticas**, 39 valores, contagens incluídas | `screenshots/2026-11-14-r2/CH-06-01-conta-wt.png` · `screenshots/2026-11-14-r2/CH-06-01-conta-ref.png` |
| 02 | Abrir a confirmação do pedido #0613 (`/pedido/:id`) em 390 | "Pagamento pendente", "Onde seu pedido está" (lista de passos), peças, pagamento e entrega. **Idênticas** nas duas lojas, 40 valores, contagens incluídas (selo de situação, passos, bordas `rgb(230, 223, 212)`, marca). Nenhum toque em "Pagar com PIX" | `screenshots/2026-11-14-r2/CH-06-02-pedido-wt.png` · `screenshots/2026-11-14-r2/CH-06-02-pedido-ref.png` |
| 03 | Pôr a "Pulseira Afetiva Esferas…" (em oferta) na sacola pelo botão "Adicionar à sacola" (barra fixa do celular) e abrir a gaveta | A gaveta abre vazia ("Escolha uma peça — eu embalo com carinho." e "Explorar joias"). Tentei 2 vezes no worktree, 1 vez na referência com a mesma peça e 1 vez na referência com a "QA Corrente Cartier" (45 cm, opção padrão marcada): a sacola fica vazia nas duas lojas. Nenhum erro no console | — |
| 04 | Comparar a gaveta (vazia) em 390 | **Idêntica** nas duas: fundo `rgb(241, 235, 225)`, botão `rgb(52, 73, 94)` com texto branco, sombra `rgba(0,0,0,.1) 0 10px 15px -3px, rgba(0,0,0,.1) 0 4px 6px -4px`, borda `rgb(230, 223, 212)`, ícone com stroke `rgb(160, 126, 76)` | `screenshots/2026-11-14-r2/CH-06-03-gaveta-vazia-wt.png` · `screenshots/2026-11-14-r2/CH-06-03-gaveta-vazia-ref.png` |
| 05 | Abrir `/checkout` com a sacola vazia (referência) | Volta para a Home com a gaveta aberta. Sem peça na sacola não há tela de checkout para comparar | — |
| 06 | Ver a confirmação do pedido #0613 no notebook (1440 × 900) | **Idêntica** nas duas lojas, contagens incluídas | `screenshots/2026-11-14-r2/CH-06-04-pedido-1440-wt.png` · `screenshots/2026-11-14-r2/CH-06-04-pedido-1440-ref.png` |
| 07 | Sair da conta nas duas lojas | "Sair da conta" → volta para "Entrar ou criar conta" no worktree e na referência | — |

**Edge cases tentados:** nada novo (rodada de confirmação). O selo de situação e a lista de passos da confirmação entraram na leitura do passo 02 e do 06

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-REG-001 | blocked | 01–06 | `screenshots/2026-11-14-r2/CH-06-01-conta-*.png` · `screenshots/2026-11-14-r2/CH-06-02-pedido-*.png` · `screenshots/2026-11-14-r2/CH-06-03-gaveta-vazia-*.png` · `screenshots/2026-11-14-r2/CH-06-04-pedido-1440-*.png` | Por `massa`: a sacola com a peça e o checkout (borda `field`, barra do frete) não abriram, porque a peça não entra na sacola nas duas lojas (passo 03). Telas que faltavam da r1 e foram comparadas, todas **iguais**: `/conta` 390, `/pedido/:id` 390 e 1440, gaveta vazia 390. Somando a r1 (Home, menu, categoria, produto, 404), nenhuma diferença de cor, sombra, transparência ou marca em nenhuma tela medida |

Contagem: pass 0 · fail 0 · blocked 1 · skip 0

## Achados

nada

## Spec-gaps

nada

## Fora da cobertura

- Sacola **com a peça** e checkout em 390 e 1440 (borda de campo `field` com erro, barra do frete grátis): `blocked` por `massa`. O "Adicionar à sacola" não põe a peça na sacola, nem no worktree nem na referência (2 peças, 4 tentativas, sem erro no console). Como acontece igual na loja de antes, não é regressão do WI 100. Não investiguei a causa (pode ser do ambiente local ou da barra fixa do celular). Para fechar o TC-REG-001, a próxima sessão precisa de uma sacola com peça pela tela (por exemplo, o botão principal do produto em 1440) ou de massa que o charter declare
- `/conta` em 1440: não lida. O briefing pedia 390 e depois 1440, e o orçamento foi para as tentativas da sacola
- A thread precisa decidir se o "Adicionar à sacola" sem efeito merece investigação fora do WI (ver Debrief). Não há nada registrado aqui como achado deste WI

## Debrief

- **Surpresas:** em 390, o "Adicionar à sacola" não faz nada nas duas lojas. Isso gastou 9 das 29 ações. Se for comportamento real e não coisa do ambiente, ele impede a compra pelo celular, e é pré-existente (a referência faz igual). Fica como sugestão para a triagem conferir fora do WI 100
- **Próximo charter:** uma sessão curta só para sacola com peça e checkout (390 e 1440), worktree × referência, começando por um caminho conhecido para pôr a peça na sacola
- **Padrão novo:** a 1ª leitura logo depois de entrar na conta pegou a tela ainda trocando (formulário de entrada). Esperar `networkidle` e o texto da tela de destino antes do `eval` resolveu
