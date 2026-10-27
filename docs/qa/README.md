# QA — Uma Estrelinha (living docs)

Árvore viva de QA do monorepo, no formato das skills `qa-report` (planeja) e `qa-execution` (executa).
Cada ciclo **acrescenta** a esta árvore; nada é recriado por rodada.

## Códigos de área (ids de cenário)

| Código | Superfície |
| --- | --- |
| `MAD` | `apps/mobile-adm` — o painel do ateliê no celular (programa `72`–`79`, `AD-056`) |
| `LOJA` | `apps/store` — a loja pública |
| `PNL` | `apps/backoffice` — o painel desktop |

Área nova entra aqui antes do primeiro cenário dela.

## Entradas e como subir

| App | Dev | Build servido (prova de PWA) |
| --- | --- | --- |
| loja | `pnpm dev:store` → http://localhost:8082 | `pnpm --filter @estrelinha/store build && … preview` |
| painel | `pnpm dev:backoffice` → http://localhost:8083/admin | — |
| ateliê (mobile-adm) | `pnpm dev:mobile-adm` → http://localhost:8084 | `pnpm --filter @estrelinha/mobile-adm build && pnpm --filter @estrelinha/mobile-adm preview` (o service worker só existe no build) |

Supabase local na faixa 54440–54449 (API :54441, Mailpit :54444). Sem Docker, a sessão intercepta
`**/auth/v1/**` e `**/rest/v1/**` no Playwright (rotas avaliadas em ordem **inversa** de registro).

**O mobile-adm é só Android.** A instalação, o `standalone` e os gestos do sistema só se provam num
aparelho: esses cenários ficam `blocked-verify` até a dona (ou quem tiver o aparelho) andar por eles.

## Política de evidência

Padrão das skills: `evidence/` e `state.csv` são **gitignored** (bloco já no `.gitignore` da raiz).
Screenshots só de checkpoint e de falha; o relatório datado é o registro durável.

## Adotado de

- `reports/2026-10-10-checkout-frete-parcelas.md` e `reports/2026-10-17-retirada-no-escritorio.md`:
  ciclos anteriores ao bootstrap completo desta árvore. Os charters citados neles (`CH-ativar-painel`,
  `CH-checkout-rs-mobile`…) nunca viraram arquivo e não foram migrados: ficam como histórico, indexados
  por aqui.
- `bugs/BUG-20260809-…` e `bugs/BUG-20260829-…`: já corrigidos, mantidos com o id original.
- Provas em navegador por feature continuam em `.specs/features/<nn>-*/prova-*.md`; esta árvore é a
  camada de jornada por persona por cima delas.

## Ciclo planejado — feature `75` (ações no pedido), nível *targeted*

Planejado em 2026-10-24 (`qa-report`), não executado. Jornada nova `J-registrar-material-e-envio`
(20 cenários `MAD-acao-*`, todos `untested`). Ordem por risco, do mais caro ao mais barato:

| # | Charter | Tour | Caixa |
| --- | --- | --- | --- |
| 1 | `CH-acoes-registrar-o-dia-no-celular` | Money | 90 |
| 2 | `CH-acoes-toque-duplo-e-corrida` | Multi-Tab | 60 |
| 3 | `CH-acoes-com-rede-ruim` | Network | 60 |
| 4 | `CH-acoes-conta-sem-acesso` | Garbage | 30 |
| 5 | `CH-acoes-voltar-do-android-na-folha` | Back-Button | 30 |
| 6 | `CH-acoes-com-fonte-grande` | Feature | 30 |
| 7 | `CH-acoes-com-leitor-de-tela` | Feature | 60 |
| canário | `CH-pedidos-achar-o-pedido-da-cliente` e `CH-pedidos-com-leitor-de-tela-e-fonte-grande` (re-run) | — | — |

Reabertos (`untested`) porque a superfície mudou: `MAD-pedido-abrir-e-entender`,
`MAD-pedido-retirada-no-escritorio`, `MAD-pedidos-fonte-grande-e-telas-estreitas`,
`MAD-pedidos-com-leitor-de-tela`. Fixturas e restauração: `.specs/features/75-mobile-adm-acoes-do-pedido/prova/`.
Sem bug aberto da `75` no registro na hora do planejamento.

## Ciclo planejado — feature `76` (Clientes), nível *targeted*

Planejado em 2026-10-24 (`qa-report`), não executado. Duas jornadas novas, `J-achar-uma-cliente` e
`J-ver-uma-cliente` (31 cenários `MAD-cliente*`, todos `untested`), mais quatro cenários da `74`/`72`
reabertos (`MAD-pedido-whatsapp-da-cliente`, `MAD-pedido-abrir-e-entender`, `MAD-pedido-voltar-mantem-recorte`,
`MAD-navegar-pelas-quatro-abas`). Banco local com as fixturas de `.specs/features/76-mobile-adm-clientes/prova/`
(ids `-d076-`, e-mails `@exemplo.invalid`); **não capturar tela com e-mail ou telefone de cliente real**.
Ordem por risco:

| # | Charter | Tour | Caixa |
| --- | --- | --- | --- |
| 1 | `CH-clientes-achar-quem-me-escreveu` | Paste | 60 |
| 2 | `CH-clientes-conta-sem-acesso` | Garbage | 30 |
| 3 | `CH-clientes-numeros-batem-com-o-painel` | Money | 60 |
| 4 | `CH-clientes-do-pedido-a-ficha-e-voltar` | Back-Button | 60 |
| 5 | `CH-clientes-com-rede-ruim` | Network | 60 |
| 6 | `CH-clientes-privacidade-no-aparelho` | Garbage | 30 |
| 7 | `CH-clientes-com-fonte-grande` | Feature | 60 |
| 8 | `CH-clientes-com-leitor-de-tela` | Feature | 60 |
| 9 | `CH-clientes-ficha-ao-vivo-e-troca-de-conta` | Multi-Tab | 30 |
| canário | `CH-pedidos-achar-o-pedido-da-cliente` (WhatsApp do pedido) e `CH-pedidos-voltar-do-android` (re-run) | — | — |

## Ciclo planejado — feature `79` (avisos no celular), nível *targeted*

Planejado em 2026-10-25 (`qa-report`) e **executado no mesmo dia** (`reports/2026-10-25-mobile-adm-avisos-no-celular.md`: 12 pass, 1 consertado, 1 decisão humana, 2 blocked-verify; canários pass). Jornada nova `J-receber-aviso-de-pedido` (16
cenários `MAD-avisos-*`; dois `blocked-verify` — a chegada do aviso e o toque — porque só um Chrome com
FCM ou o Android real os provam). No Playwright o push é dublado (`serviceWorker`, `PushManager` e
`Notification` por `addInitScript`, como em `.specs/features/79-mobile-adm-aviso-de-pedido/probes/04-layout.mjs`);
a porta `atelie-avisos` pode ser interceptada ou servida por `supabase functions serve --env-file .env`.
**Nenhum e-mail real**: a fixtura marca os e-mails do pedido como `sent` antes de disparar. Ordem por risco:

| # | Charter | Tour | Caixa |
| --- | --- | --- | --- |
| 1 | `CH-avisos-ligar-e-receber-o-pedido` | Money | 60 |
| 2 | `CH-avisos-estados-e-falhas` | Network | 60 |
| 3 | `CH-avisos-sair-e-conta-sem-acesso` | Garbage | 30 |
| 4 | `CH-avisos-com-fonte-grande-e-leitor-de-tela` | Feature | 45 |
| canário | `CH-entrar-no-atelie-pelo-celular` (o login agora volta ao destino) e `CH-acoes-registrar-o-dia-no-celular` (`gravarAcao` mudou a tradução da recusa) — re-run | — | — |

Reabertos (`untested`) porque a superfície mudou: nenhum cenário antigo muda de resultado esperado; os
dois canários cobrem `RequireAdmin`/`LoginPage` e `gravarAcao`. Sem bug aberto da `79` na hora do
planejamento.

## Ciclo — feature `82` (Envelope da cliente), nível *targeted*

Planejado e **executado** em 2026-10-26 (`reports/2026-10-26-mobile-adm-envelope-da-cliente.md`: 6 pass, 1
consertado, 9 decisão humana; canário pass). Jornada nova `J-registrar-envelope-da-cliente` (16 cenários
`MAD-envelope-*`). Fixturas: `.specs/features/82-envelope-da-cliente/prova/fixturas.sql` (P82-A..E) mais P82-F
(nome vazio, material sem tipo) e P82-G (três itens), com os mesmos prefixos de id, apagadas por `limpa.sql`. A
perda da resposta de rede se reproduz com `route.fetch()` + `context.setOffline(true)` antes de responder.

**Reteste em 2026-10-27** (mesmo relatório, seção *Reteste*): os seis bugs consertados na Fase 5 passam no
build servido; um achado novo (o foco no `<body>` depois do "Tentar de novo" do bloco do envelope) foi
consertado e retestado. Erro guardado em módulo só se reteste navegando DENTRO do app — `page.goto` recarrega e
o apaga.

| # | Charter | Tour | Caixa |
| --- | --- | --- | --- |
| 1 | `CH-envelope-registrar-o-codigo-da-cliente` | Paste | 60 |
| 2 | `CH-envelope-com-rede-ruim` | Network | 60 |
| 3 | `CH-envelope-voltar-e-outra-aba` | Back-Button | 30 |
| 4 | `CH-envelope-conta-sem-acesso` | Garbage | 30 |
| 5 | `CH-envelope-com-leitor-de-tela` | Feature | 45 |
| canário | folha do rastreio de saída (`J-registrar-material-e-envio`) — `normalizeTrackingCode` mudou | — | — |

## Ciclo planejado — feature `83` (Loja ao vivo, Fase 1: Acessos), nível *targeted*

Planejado em 2026-10-27 (`qa-report`), não executado. Duas jornadas novas, `J-ver-a-loja-ao-vivo` (14
cenários `MAD-aovivo-*`) e `J-ler-a-politica-de-privacidade` (`LOJA-politica-hora-cheia`), mais
`MAD-inicio-cartao-visitas-hoje` em `J-acompanhar-a-loja`; os 16 nascem `untested`. Subir o build servido
do mobile-adm (`vite preview` numa porta livre — 8082–8084 são de outras sessões) contra o banco local
com a migration `20261029120000_83-loja-ao-vivo.sql`, login com o admin do seed. Fixturas em
`.specs/features/83-loja-ao-vivo/prova/` (`fixtura.sql` → sessão → `limpa.sql`; conferir contra
`le-movimento.sql`); o banco local é **compartilhado**: nada de `db reset`/`migration up`, e o que não
couber na fixtura (teto do dia, visitas sem hora, resposta sem `acessos`, `42501`) é interceptado no
Playwright. Fonte por `html { font-size }` a 100/130/200 %, em 360/390/412 e 1440. Ordem por risco:

| # | Charter | Tour | Caixa |
| --- | --- | --- | --- |
| 1 | `CH-aovivo-numeros-certos-do-dia` | Money | 90 |
| 2 | `CH-aovivo-conta-sem-acesso` | Garbage | 30 |
| 3 | `CH-aovivo-com-rede-ruim` | Network | 45 |
| 4 | `CH-aovivo-ligada-enquanto-trabalho` | Interrupt | 60 |
| 5 | `CH-aovivo-do-inicio-e-voltar` | Back-Button | 30 |
| 6 | `CH-aovivo-com-fonte-grande` | Feature | 45 |
| 7 | `CH-aovivo-com-leitor-de-tela` | Feature | 45 |
| 8 | `CH-loja-politica-hora-cheia` | Feature | 15 |
| canário | `CH-inicio-numeros-certos-do-dia` e `CH-inicio-ao-vivo-e-atualizado` (re-run: a Início ganhou o cartão, o período controlado e a releitura de 30 s) | — | — |

Reabertos (`untested`) porque a superfície mudou: `MAD-inicio-abrir-e-entender-o-dia`,
`MAD-inicio-trocar-periodo`, `MAD-inicio-numeros-grandes`, `MAD-inicio-com-leitor-de-tela`.
Ficam `blocked-verify` até o Android real: o Chrome em segundo plano de verdade, o gesto de voltar, o
puxar com o dedo e a escala de texto do sistema (a prova T13 escalou pela raiz). Fora do ciclo: a
aprovação do texto da política pela Adri (pré-condição do deploy, não de QA) e `BL-059` (Descontos na
barra de abas a 200 %, anterior à `83`). Sem bug aberto da `83` no registro na hora do planejamento.

**Executado em 2026-10-27** (`reports/2026-10-27-mobile-adm-loja-ao-vivo.md`): 5 Pass, 2 `blocked-verify` (Android e TalkBack reais), 3 esperando decisão. Três bugs de atrito: `BUG-20261027-tentar-de-novo-da-loja-ao-vivo-solta-o-foco`, `BUG-20261027-f5-desfaz-o-periodo-escolhido-na-loja-ao-vivo` e `BUG-20261027-rodape-da-loja-rola-de-lado-com-fonte-200` (anterior à `83`).

**Reteste em 2026-10-27** (`reports/2026-10-27-mobile-adm-loja-ao-vivo-reteste.md`): o foco do "Tentar de novo" consertado (`5b23601d`) passa em 390 e 1440 a 100 e 200 %; o arroba do rodapé (`49f8bbb5`) não passa mais da borda, mas a loja ainda rola de lado a 390/200 % pelo **cabeçalho** (`scrollWidth` 434, decisão pendente). O F5 que desfaz o período segue aberto, esperando decisão.
