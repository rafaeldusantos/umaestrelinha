# 73 — prova em navegador (T21)

Medida em 2026-10-22 (noite de Brasília; `lido_em` às 00:15Z do dia 23 = 21h15 do dia 22), Chromium
dirigido pelo Playwright MCP, contra o **build servido** (`pnpm --filter @estrelinha/mobile-adm build`
+ `vite preview --port 4317`, porta livre — 8082–8084 são de outras sessões), apontando para o
**Supabase local** (`VITE_SUPABASE_URL=http://127.0.0.1:54441`, o `.env` do app). Nada interceptado:
as RPCs, o Realtime e o `user_roles` são os de verdade.

Capturas em `prova/` (fora de qualquer pasta que os guardas varrem): `360-inicio.png` (página
inteira), `412-inicio-dobra.png`, `412-papel-removido-recusa.png`, e o snapshot de acessibilidade
`412-acessibilidade.yml`. **Os nomes de cliente nelas são fixturas** (`Cliente Prova N`,
`@exemplo.invalid`), apagadas no fim.

## Fixturas e restauração do banco

| | antes | durante | depois |
| --- | --- | --- | --- |
| `orders` | 54 | +12 (`P73-01`..`P73-12`, número **explícito**: a sequência não andou) | **54** |
| `order_items` | 82 | — | **82** |
| `customers` | 9 | +1 (o trigger da conta de prova) | **9** |
| `auth.users` · `auth.identities` | 9 · 9 | +1 · +1 (`prova73@exemplo.invalid`, id `7373…`) | **9 · 9** |
| `user_roles` | 3 | +1 (admin da conta de prova; removido no meio, de propósito) | **3** |
| `orders_number_seq` · `orders_order_number_seq` | 183/true · 1/false | inalteradas | **183/true · 1/false** |
| `store_visits` | 0 | 0 | 0 |

A conta `admin@umaestrelinha.dev` não foi tocada. As fixturas: 10 vendas de hoje a R$ 9.999,90
(`R$ 99.999` de faturamento, ticket `R$ 9.999,90` — o maior valor plausível de `MAI-28`), e depois
`P73-11` e `P73-12` inseridos com a tela aberta, para o Realtime.

## O bundle servido

`index-ByUXQMGT.js` depois do conserto abaixo (antes, `index-CWNvmpP5.js`), conferido pelo
`<script>` carregado. ⚠️ **O service worker serve o bundle VELHO depois de um rebuild** até ser
desregistrado (`registerType: 'autoUpdate'` vale na *próxima* abertura): a primeira medida depois do
conserto rodou sobre o bundle antigo e foi descartada. Desregistrar o SW e limpar `caches` antes de
medir.

## Os números contra o banco, no mesmo instante

| Número | Tela | Fonte | Bate |
| --- | --- | --- | --- |
| Faturamento · Vendas · Ticket · Visitas (hoje) | R$ 99.999 · 10 · R$ 9.999,90 · 0 | `store_movement()` como a conta de prova | sim |
| Aguardando material · Pago, a separar · Enviado sem rastreio · Pix aguardando | 18 · 10 · 1 · 0 | `store_overview()->fila` **e** as cadeias do painel (`toPostgrestFilter`, as mesmas de `/admin/pedidos`) por `HEAD … Prefer: count=exact` no PostgREST com o token da conta: `0-17/18`, `0-9/10`, `0-0/1`, `*/0` | sim |
| "Precisa de ação" (a união) | — (o app não desenha o número; a visão é a da `74`) | RPC 29 · PostgREST `needsActionOrFilter()` `0-28/29` | sim |
| "o mais antigo parado há 101 dias" | 101 dias | `aguardando_desde` 2026-07-13T18:13Z, `queueAge` contra o `lido_em` | sim |
| Vendas · 7 dias (total) | R$ 99.999 | `semana` da RPC | sim |
| Fat. de outubro · pedidos pagos · Clientes novas | R$ 101.055 · 15 pedidos pagos · 15 | `mes_resumo`, `clientes_novas` | sim |
| Saudação e data | "Boa noite, Adri." · "quinta-feira, 22 de outubro" | `lido_em` 00:15Z = 21h15 de Brasília; o dia 23 em UTC | sim — **pelo dia de Brasília**, não pelo UTC |
| "Atualizado às" | 21h15 | `formatStoreHour(lido_em)` | sim |

O painel **não** foi subido (a 8083 é de outra sessão); a comparação com `/admin/pedidos` é pelas
mesmas cadeias de filtro que ele monta, contra o mesmo banco.

## Layout — 360 × 800 e 412 × 915

| Medida | 360 × 800 | 412 × 915 |
| --- | --- | --- |
| `documentElement.scrollWidth` = `body.scrollWidth` = largura | 360 = 360 | 412 = 412 |
| `R$ 99.999` (faturamento) e `R$ 9.999,90` (ticket) **numa linha**, sem transbordar o card | sim (1 linha; borda direita do valor = do card, 172 px) | sim (`R$ 100.000` depois do Realtime, 1 linha) |
| "Fat. de outubro" `R$ 101.055` no card de meia largura | 1 linha, 17 px de folga | 1 linha |
| A faixa de "Precisa de você" rola **dentro de si** | `overflow-x: auto`, 868 de conteúdo em 360 | 868 em 412; `scrollLeft` vai a 456 (o máximo) com `window.scrollX` em 0, e o último bloco termina em 396 (o recuo de 16) |
| Alvos de toque abaixo de 44 px em `main` | **nenhum** | nenhum |
| Esqueleto (`aria-busy`) depois da carga | 0 | 0 |

## As releituras

| O quê | Resultado |
| --- | --- |
| **Puxar** (toque real por CDP, `touchStart` em y=200 e `touchMove` até 330): "Solte para atualizar" durante o gesto; `role=status` "Atualizando…" ao soltar; some ao terminar | sim · `store_movement` + `store_overview` saíram, uma de cada; a marca posta em `window` antes do gesto **sobreviveu** (a página não recarregou). `overscroll-behavior-y: contain` no `body` medido. Instalado (standalone) não foi medido: a instalação num Android real fica com o usuário |
| **Realtime**: `INSERT` de `P73-11` no banco com a tela aberta | o faturamento foi a `R$ 100.000`, vendas a 11 e o pedido entrou no topo de "Últimos pedidos" ("agora") antes de o `waitForFunction` começar (< 1 s) |
| **Um canal** | `realtime.subscription` com **1** linha para `public.orders`, da conta de prova, criada às 00:15:21 e a mesma depois de puxar, trocar de período e receber dois avisos |
| **Trocar de aba fecha o canal** | em Pedidos, a linha some do `realtime.subscription` (≤ 8 s, a limpeza é do servidor) e um `UPDATE` em `orders` não fez sair **nenhuma** requisição; voltar à Início relê as duas RPCs |
| **Rede cai e volta** (depois do conserto) | sem rede, a tela "Sem conexão"; de volta, os números reaparecem com "Atualizado às" e as duas RPCs saem de novo (21h22 → 21h23). O Realtime volta a avisar (`P73-12` entrou pela tela) |
| **Perder o papel com o app aberto**: `delete from user_roles` da conta, e a volta ao primeiro plano (`visibilitychange`) | `store_movement 403` e `store_overview 403`, **uma** chamada cada (sem repetição), `user_roles` relido, e em < 100 ms o Login com "Esta conta não tem acesso ao painel." e "Sair" (captura). Em nenhum quadro intermediário houve número na tela |

## Leitor de tela

Pela árvore de acessibilidade do próprio Chromium (`Accessibility.getFullAXTree`):

- grupos: "Faturamento, hoje, R$ 100.000", "Vendas, hoje, 11", "Ticket médio, hoje, R$ 9.090,91",
  "Visitas, hoje, 0" (`MAI-30`), "Faturamento de outubro", "Clientes novas";
- regiões: "Movimento da loja", "Precisa de você", "A semana e o mês", "Últimos pedidos", "Vendas · 7
  dias", "O mês", "Joias mais pedidas no mês";
- os blocos da fila são links com o nome inteiro ("Aguardando material 18 o mais antigo parado há
  101 dias Ninguém pode fazer nada até o envelope chegar") e o endereço de `pedidosHref`
  (`/pedidos?bloco=aguardando`; "Ver pedidos" ⇒ `/pedidos?visao=precisa-acao`).

O snapshot do Playwright (`412-acessibilidade.yml`) mostra as regiões nomeadas por `aria-labelledby`
**sem** nome — é limitação do snapshot, não da página: os ids são únicos e o Chromium os nomeia.

## Defeitos achados

| # | Defeito | O que foi feito |
| --- | --- | --- |
| D1 | **Depois de a rede cair e voltar, a Início nunca mais relia** — voltava com os números velhos e "Atualizado às" parado; o puxar, o "Tentar de novo" e o Realtime também ficavam mudos. Causa: o `onlineManager` do React Query só ouve `online`/`offline` enquanto há um `QueryClient` montado, e o `QueryClientProvider` estava **dentro** do ramo de "sem conexão" do `<App />`. O `offline` chegava, o provider desmontava, o `online` não era ouvido, e toda leitura ficava **pausada**. Nenhum teste pegava: jsdom nunca derrubava a rede com a Início aberta | **Consertado com teste**: o provider subiu para fora do ramo (`app/App.tsx`). O caso "a rede cai e volta" (`InicioPage.test.tsx`) reprovou antes (1 chamada em vez de 2) e passa depois; o mutante que devolve o provider ao ramo morre por asserção. Remedido no navegador (tabela acima) |
| — | Observação, não defeito: com a tela "Sem conexão", o client do Supabase segue tentando reabrir o websocket do Realtime (erros `ERR_INTERNET_DISCONNECTED` no console). Não é leitura de dado (`MAF-19` fala das chamadas da API), e o canal da Início está fechado | registrado |

O laço da vigia da recusa (o papel ainda `admin` com a RPC recusando) foi achado na T18 pelo `<App />`
real, não aqui; está no `design.md` (decisões da T18).

## O que NÃO foi medido

- O app **instalado** (standalone) num Android real: o puxar sem o gesto nativo e a volta ao primeiro
  plano de verdade. Fica com o usuário, como na `72`.
- A virada do dia de Brasília com a tela aberta (o timer por duração é provado na suíte, com o relógio
  do processo noutro dia).
- Rede lenta (3G) e o esqueleto em navegador; `prefers-reduced-motion`.
