# QA Run Report — 2026-10-24 — mobile-adm-clientes (rodada 1, charter CH-clientes-com-rede-ruim)

- **Scope:** branch `feat/76-mobile-adm-clientes` (worktree `store-76-mobile-adm-clientes`, sem commit): lista de clientes e ficha do app do ateliê, com a rede falhando de cada jeito.
- **Cadence tier:** targeted (rodada 1) · **Status:** closed
- **Build/Env:** `pnpm --filter @estrelinha/mobile-adm build`, servido em http://localhost:4377 (bundle conferido: contém "Não encontrei esta cliente"), Supabase local real (:54441), admin do `seed.sql`. `*.supabase.co` e `**/g/collect*` bloqueados por rota. 390×844 (e 360/412), fonte 100/130/200 %. O banco local é compartilhado com outras sessões (as contagens de clientes e pedidos mudaram durante a rodada: 63 → 54, 22 → 23 pedidos na ficha de fixtura); nada foi escrito por esta sessão.

## Session Matrix

| # | Scenario | Result |
|---|---|---|
| 1 | MAD-clientes-leitura-falha-sem-zero | Pass |
| 2 | MAD-clientes-carregar-mais-sem-repetir | Pass |
| 3 | MAD-cliente-bloco-de-pedidos-falha | Pass |
| 4 | MAD-abrir-sem-conexao (em /clientes) | Pass |

## Walk e resultados

- **Primeira leitura da lista** com `customer_list` 500, rede cortada e `atelie_clock` 500: "Não consegui carregar as clientes." + "Tentar de novo"; nunca "Ainda não há clientes.", nunca "0 clientes", nunca recusa. Tentar de novo com a rede de volta carrega a lista. Rede cortada leva ~15,7 s até a falha (paper cut abaixo).
- **Releitura falhando com dado** (voltar ao primeiro plano via `visibilitychange`): "Não consegui atualizar agora.", as 25 linhas e a contagem mantidas, sem esqueleto, "Atualizado às" inalterado; com a rede de volta o aviso some. 500 e rede cortada se comportam igual. "Atualizado às" e "última há X" vêm do banco: com o relógio do aparelho em 2019 a tela mostrou a hora real de Brasília.
- **Busca e chip com a rede falhando:** falha honesta, sem "Não achei ninguém" nem "Ninguém com pedido em aberto" falsos; endereço só `?recorte=em-aberto`, termo fora da URL. Busca com resposta lenta seguida de outra rápida: vence o último termo.
- **Página seguinte** em 500 (cursor `last_activity_at`/`id`): 25 linhas ficam, falha no rodapé, uma única tentativa; "Tentar de novo" e rolagem até o fim: 54 linhas, 54 ids distintos, contagem do servidor.
- **Ficha:** `order_list` em 500 ⇒ só o bloco diz "Não consegui carregar os pedidos." + "Tentar de novo" (cabeçalho, números e contato seguem); `order_items` em 500 ⇒ linhas sem o item, sem erro; cabeçalho (`customer_list`) em 500 ⇒ "Tentar de novo" e recupera; "Ver mais pedidos" em 500 ⇒ 20 linhas mantidas, falha no rodapé do bloco, retry ⇒ 22 distintas; foco sem rede com a ficha aberta ⇒ "Não consegui atualizar agora." após ~15 s, dados mantidos.
- **Sem conexão:** com a lista aberta, a tela "Sem conexão" aparece e a lista volta sozinha; abertura fria em `/clientes`, na ficha e em `?recorte=…` com `navigator.onLine` forçado a falso (ressalva de paridade da `72`): "Sem conexão", zero requisições ao banco, nenhum dado de cliente; Cache Storage do service worker sem nenhuma URL de `rest`/`rpc`.
- **Layout dos estados de falha** (360/390/412 × 100/130/200 %, lista com falha, aviso, rodapé, ficha com falha de pedidos e de cabeçalho): sem rolagem horizontal do corpo, alvos ≥ 44 px, nada fora da tela exceto a faixa de chips que rola dentro de si (desenho conhecido).

## Bugs

Nenhum bug novo registrado.

## Paper Cuts

| Persona | Where | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Adri no celular | lista e ficha, primeira leitura com a rede cortada | esqueleto por ~16 s (lista) e ~22 s (bloco de pedidos da ficha) antes da falha | medium | mesmo mecanismo já registrado na `74` (retry do React Query × retry do cliente); decisão humana se vale encurtar |
| Adri no celular | ficha com nome de 70 caracteres, 360 px, fonte 200 % | nome quebra no meio da palavra | low | fixture extrema, sem corte nem estouro |

## Evidence

`docs/qa/evidence/2026-10-24-mobile-adm-clientes/`: `A-lista-500-primeira-leitura.png`, `H0`, `H1`, `H5`, `J4`, `K-ficha-pedidos-falha-360-fonte200-fixtura.png`, `I1-offline-com-lista-aberta.png`, `I2-frio-offline-sem-conexao.png` (só fixturas `@exemplo.invalid`; capturas com nomes de clientes reais foram apagadas). As demais imagens da pasta são de outras sessões de charter.

## Human Verifications Needed

- Abertura fria sem rede e foco/voltar do app em Android real (o Playwright vê `navigator.onLine` verdadeiro com documento do service worker).
- Decidir se o tempo de ~16–22 s até a falha com rede cortada é aceitável.
