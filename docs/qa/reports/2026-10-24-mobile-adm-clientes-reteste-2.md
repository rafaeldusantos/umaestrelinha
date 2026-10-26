# QA Run Report — 2026-10-24 — mobile-adm-clientes-reteste-2 (rodada 3: reteste de B13, B14, B15 e regressão da jornada)

- **Scope:** branch `feat/76-mobile-adm-clientes` (worktree `store-76-mobile-adm-clientes`, sem commit). Reteste dos consertos B13 (`teclado-aberto-esconde-os-resultados-da-busca`, residual), B14 (`limpar-da-busca-deixa-o-foco-no-body`) e B15 (`tentar-de-novo-da-ficha-solta-o-foco-ao-falhar-de-novo`), e regressão de `J-achar-uma-cliente` / `J-ver-uma-cliente`.
- **Cadence tier:** targeted (rodada 3) · **Status:** closed
- **Build/Env:** `pnpm --filter @estrelinha/mobile-adm build` + `vite preview` em http://localhost:4376 (bundle servido conferido: `index-BL0Yvu9k.js`, com `54441` e "Busca e recorte desfeitos"; o worktree não tinha `.env`, copiado do checkout principal, gitignored), Supabase local real (:54441), admin do `seed.sql`, fixturas `-d076-` (`@exemplo.invalid`). `*.supabase.co` e `**/g/collect*` abortados por rota. 390×844 e 390×508 (teclado emulado), fonte 100/130/200 %, toque real (`touchscreen.tap`).

## Session Matrix

| # | Bug / Scenario | Result |
|---|---|---|
| 1 | B13 teclado aberto, resultados à vista (100/130/200 %) | Partial (100 % e 130 % pass; 200 %: 115 de 566 px da 1ª linha, a linha é maior que a tela) |
| 2 | B14 "Limpar" devolve o foco ao campo | Pass por teclado; **Fail por toque** (o toque não limpa: bug novo) |
| 3 | B15 "Tentar de novo" da ficha mantém o foco ao falhar de novo | Pass |
| 4 | Regressão da jornada (`percurso.cjs`) | Fail com o toque (regressão de B13); pass 31/31 com o workaround de Enter e a conta sem papel semeada |
| 5 | Matriz de layout (`matriz.cjs`, 360/390/412/1440 × 100/130/200 %) | Pass, 60 medidas, 0 falhas |
| 6 | Lente de fonte grande na lista a 200 % | Friction (bug novo, palavra partida e pílula em duas linhas) |

## Walk e resultados

- **B13** (390×508, busca `p76`, toque no campo): a barra de abas fora e o campo no topo. 1ª linha: 100 % 177–311 (134/134 px à vista), 130 % 230–434 (204/204), 200 % 393–959 (115/566). A 200 % a linha por si só é mais alta (566) que a viewport (508): aceitável, o nome e a contagem aparecem.
- **B14**: por teclado (foco em "Limpar", Enter) `activeElement` = `INPUT#busca-de-clientes`, campo vazio, 25 linhas, região viva "Busca e recorte desfeitos." Pass. **Por toque** o primeiro toque em "Limpar" não faz nada.
- **B15** (`order_list` em 500 depois da 1ª janela): 1ª falha, 2ª e 3ª tentativas falhando de novo mantêm o foco em "Tentar de novo" (500s: 1, 2, 3); com a rede de volta a ficha termina com 22 pedidos, o foco na 1ª linha nova e a região viva diz "Agora são 22 pedidos na lista.". Pass.
- **Regressão achada:** com a busca em foco, o conserto B13 (h1 `sr-only` e linha de frescor fora) devolve o layout no `focusout`. O toque num chip ou em "Limpar" perde o foco no início do gesto, a tela desce 32 px (chip de y 160 para 192) antes do clique, e o clique cai fora. Medido por toque e por mouse; por teclado funciona; /pedidos não é afetada. O `percurso.cjs` reprovou ("busca rosa em Todas": app 0, sql 3). Com Enter antes do toque (workaround) 30 de 31, e a única falha restante era a conta sem papel por falta de semente; semeada por `signup` e apagada depois: recusa no login, nenhum texto de cliente em nenhum instante, `/clientes` direto leva ao login. Efetivo: 31/31 com workaround.
- **Privacidade, rede e layout:** nenhuma saída para host fora de `localhost` e `127.0.0.1:54441`; `matriz.cjs` 60 medidas, 0 falhas; título e storage sem dado de cliente.
- **Gate:** `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000`: exit 0, 111 arquivos, 1756 testes.

## Bugs

| Id | Impact | Status |
|---|---|---|
| `BUG-20261024-primeiro-toque-em-chip-ou-limpar-se-perde-com-a-busca-em-foco` | Friction · P2 | open (novo, regressão de B13) |
| `BUG-20261024-linha-do-cliente-quebra-palavra-e-pilula-a-200` | Friction · P3 | open (novo) |
| `BUG-20261024-teclado-aberto-esconde-os-resultados-da-busca` (B06/B13) | Friction · P3 | partially fixed (200 %, linha maior que a tela; recomendação: aceitar) |
| `BUG-20261024-limpar-da-busca-deixa-o-foco-no-body` (B14) | Friction · P4 | verified por teclado; o toque cai no bug novo |
| `BUG-20261024-tentar-de-novo-da-ficha-solta-o-foco-ao-falhar-de-novo` (B15) | Friction · P4 | verified |

## Paper Cuts

| Persona | Where | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Adri no celular | /clientes, buscar e tocar um recorte | o toque "não pega" e a tela dá um pulo | high | virou o bug do primeiro toque |
| Fonte do sistema a 200 % | linha da lista | "Em / aberto" em duas linhas | low | virou o bug da linha |

## Evidence

`docs/qa/evidence/2026-10-24-mobile-adm-clientes-reteste-2/`: `B13-teclado-busca-p76-{100,130,200}.png`, `B15-tentar-de-novo-falha-de-novo.png`, `N01-toque-no-chip-com-busca-em-foco-nao-troca.png`, `N01-limpar-com-toque-nao-limpa.png`, `N02-linha-do-cliente-200.png` (só fixturas `@exemplo.invalid`, busca `p76`).

## Decisions for a Human

1. **B13 a 200 %:** aceitar que a linha, mais alta que a tela com o teclado aberto, mostre só 115 px dela. Recomendação: aceitar.
2. **B03 e B12** seguem aguardando decisão (ver `tasks.md`), não retestados.

## Human Verifications Needed

- Teclado real e TalkBack em Android: o foco depois de "Limpar" e do retry, e o toque em chip/"Limpar" com o teclado real aberto (aqui o teclado é emulado por viewport e o toque por `touchscreen.tap`).

## Final Status

Não pronto para o fecho da `76` enquanto o bug P2 do primeiro toque (regressão do próprio conserto B13) estiver aberto: nenhum Blocks-Completion, Data-Loss ou Trust-Damage, mas a ação mais comum depois de buscar (trocar o recorte ou limpar) exige dois toques. B15 e B14 (teclado) `verified`, B13 parcial aceitável. Totais por tier: Friction 4 abertos/parciais (um P2, dois P3, um P4 parcial), demais 0. Suíte do app: 1756 verdes.
