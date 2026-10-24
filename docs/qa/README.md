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
