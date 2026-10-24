# QA Run Report — 2026-10-24 — mobile-adm-clientes-reteste-1 (rodada 2: reteste dos bugs consertados e regressão da jornada)

- **Scope:** branch `feat/76-mobile-adm-clientes` (worktree `store-76-mobile-adm-clientes`, sem commit). Reteste de B01, B02, B04, B05, B06, B07, B08, B09, B10, B11 (`tasks.md` da `76`) e regressão de `J-achar-uma-cliente` / `J-ver-uma-cliente`. B03 e B12 seguem abertos (decisão humana) e não entram.
- **Cadence tier:** targeted (rodada 2) · **Status:** closed
- **Build/Env:** `pnpm --filter @estrelinha/mobile-adm build` + `vite preview` em http://localhost:4376 (bundle conferido: contém "Nenhum resultado", "abre em outra aba", "Busca e recorte desfeitos"), Supabase local real (:54441), admin do `seed.sql`, fixturas `-d076-` (`@exemplo.invalid`). `*.supabase.co` e `**/g/collect*` abortados por rota. 360/390/412, fonte 100/130/200 %.

## Session Matrix

| # | Bug / Scenario | Result |
|---|---|---|
| 1 | B01 busca-espaco-duplo-ou-nbsp | Pass |
| 2 | B02 busca-email-colado-com-sinais | Pass |
| 3 | B04 painel-ficha-vinculo-por-email-exato | Pass |
| 4 | B05 recusa-com-papel-admin-sem-tempestade | Pass |
| 5 | B06 barra-de-abas-some-com-a-busca-em-foco | Partial (barra some; 130 %/200 % primeira linha fora da tela) |
| 6 | B07 nome-da-ficha-a-200 | Pass |
| 7 | B08 linha-do-cliente-diz-tudo | Pass |
| 8 | B09 vazio-e-limpar-anunciados | Pass (resíduo de foco: BUG novo) |
| 9 | B10 ver-mais-pedidos-foco | Pass no sucesso e na 1ª falha (resíduo: BUG novo) |
| 10 | B11 link-de-aba-nova-avisa | Pass |
| 11 | Regressão da jornada, contagens × SQL e layout | Pass |

## Walk e resultados

- **B01** (`P76  Marina   Albuquerque`, NBSP, largura zero, quebra de linha nas pontas): 1 resultado em todas as grafias.
- **B02** (`Nome <e-mail>`, `mailto:…`, aspas e `;`, `Cel: (51) 98877-6655`, `Tel 51988776655`): cada um acha 1 pessoa, e a Valéria (`VROSA_RJ`) não traz a Valdete (`VROSAXRJ`). `Telma Souza` continua nome (0 resultados, sem erro).
- **B04** (painel, `/admin/clientes/:id` em Vite local): a ficha de cada uma das duas traz só o pedido dela (P76-V01 / P76-V02); no app do ateliê idem. A busca do painel segue como estava (`BL-052`).
- **B05** (admin real; `atelie_clock` 403 `42501` + a consulta da tela 500; 10 s por rota): `/clientes`, `/clientes/:id`, `/pedidos`, `/pedidos/:id` e `/`: 1 a 2 consultas de papel e 11 a 24 requisições no total (antes: ~140 por segundo); a tela termina em "Não consegui carregar. Tentar de novo", sem splash presa.
- **B06** (390×508 = teclado, busca `p76`): a barra de abas some com o campo em foco nas três fontes; Enter e tocar fora a devolvem; um chip em foco não a esconde. **Mas** a 130 % a primeira linha mostra 70 de 204 px e a 200 % nenhum (campo, chips e contagem ocupam a tela). Ver o bug.
- **B07** (360/390/412 × 100/130/200 %, ficha de nome de 70 caracteres): nenhuma palavra do título partida no meio (medido por `Range` por palavra), sem rolagem horizontal.
- **B08**: nome acessível da linha = "nome, N compras, última há X, R$ total, em aberto"; o total do rótulo é o visível; as cinco linhas de fixtura têm compras ou "Sem compra paga ainda".
- **B09**: a região `aria-live` diz "Nenhum resultado." (busca sozinha e recorte + busca) e "Busca e recorte desfeitos." depois de "Limpar"; o campo zera e a lista volta (25). **Resíduo:** o foco cai no `<body>`.
- **B10**: "Ver mais pedidos" leva o foco à primeira linha nova (índice 20), a região viva diz "Agora são 22 pedidos na lista." e o botão some. Com a próxima página em 500: o foco vai a "Tentar de novo" e as 20 linhas ficam; com a rede de volta o retry traz as 22. **Resíduo:** se o retry falha de novo, o foco cai no `<body>`.
- **B11**: o WhatsApp da ficha ("Conversar no WhatsApp (abre em outra aba)") e o do pedido ("WhatsApp (abre em outra aba)") avisam, com `noopener noreferrer`. Não há outro `target=_blank` em `/` nem `/pedidos`; o lembrete do envio (`LembreteDoEnvio`, `75`) **não foi visto em tela** (nenhum pedido local no estado que o mostra), só pelo guarda `novaAbaAvisada`.
- **Regressão:** `percurso.cjs` da `prova/` 31/31 (Pedidos → Ver cliente → ficha → pedido → voltar nos dois sentidos, mesmo recorte/busca/posição, privacidade, rede só para o app e o banco local, menos movimento, conta sem papel recusada — a conta foi semeada por `signup` e apagada depois); `matriz.cjs` 60 medidas, 0 falhas (360/390/412/1440 × 100/130/200 %); contagens do app = SQL (todas 54, recorrentes 4, em aberto 19). Nenhum host fora de `localhost` e `127.0.0.1:54441`; nenhum erro de página.
- **Gate:** `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000`: exit 0, 111 arquivos, 1748 testes.

## Bugs

| Id | Impact | Status |
|---|---|---|
| `BUG-20261024-teclado-aberto-esconde-os-resultados-da-busca` (B06) | Friction · P3 | partially fixed: re-found a 130 % e 200 % |
| `BUG-20261024-limpar-da-busca-deixa-o-foco-no-body` | Friction · P4 | open (novo) |
| `BUG-20261024-tentar-de-novo-da-ficha-solta-o-foco-ao-falhar-de-novo` | Friction · P4 | open (novo) |

Os outros nove (B01, B02, B04, B05, B07, B08, B09, B10, B11) passaram a `verified`. B03 (busca sem acento) e B12 (material no nome do item) seguem `open`, decisão humana, não retestados.

## Paper Cuts

| Persona | Where | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Adri com fonte grande | busca em foco com teclado, 200 % | o campo sobe mas nenhum resultado cabe na tela | medium | virou o re-found de B06 |

## Evidence

`docs/qa/evidence/2026-10-24-mobile-adm-clientes-reteste-1/`: `B02-vazio-telma-390.png`, `B05-clientes-papel-admin-403-500.png`, `B06-teclado-busca-p76-{100,130,200}.png`, `B07-ficha-{360-200,390-100,390-200}.png` (só fixturas `@exemplo.invalid`, busca `p76`; nenhuma tela com cliente real). A matriz regenerou as imagens de `.specs/features/76-mobile-adm-clientes/prova/`.

## Decisions for a Human

1. **B06 residual:** aceitar (teclado aberto com fonte de 130 % ou mais é raro) ou compactar chips e contagem com a busca em foco. Recomendação: compactar, pelo custo baixo, só quando a busca está em foco.
2. **B03 e B12** seguem aguardando decisão (ver `tasks.md`).

## Human Verifications Needed

- Teclado real, TalkBack (foco depois de "Limpar" e do retry) e o gesto de voltar em Android; o teclado aqui é emulado por viewport.
- O lembrete do envio como link de aba nova, num pedido que o mostre.

## Final Status

Pronto com ressalvas para o fecho da `76` quanto a estes bugs: 9 de 11 retestes `verified`, 1 parcial (B06, Friction), 2 resíduos novos de foco (Friction, P4). Nenhum Blocks-Completion, Data-Loss ou Trust-Damage novo. Totais por tier: Friction 3 abertos/parciais, demais 0.
