# QA Run Report — 2026-10-24 — mobile-adm-clientes-reteste-3 (rodada 4: reteste de bug-16, bug-17 e regressão da jornada)

- **Scope:** branch `feat/76-mobile-adm-clientes` (worktree `store-76-mobile-adm-clientes`, sem commit). Reteste de `bug-16` (primeiro toque em chip ou "Limpar" com a busca em foco) e `bug-17` (linha do cliente a 200 %), e regressão de `J-achar-uma-cliente` / `J-ver-uma-cliente`.
- **Cadence tier:** targeted (rodada 4) · **Status:** closed
- **Build/Env:** `pnpm --filter @estrelinha/mobile-adm build` + `vite preview` em http://localhost:4376 (bundle servido conferido: `index-B2-1-LGG.js` com `54441`, "Busca e recorte desfeitos" e o código novo de `pointerdown`/`pointercancel`), Supabase local real (:54441), admin do `seed.sql`, fixturas `-d076-` (`@exemplo.invalid`). `*.supabase.co` e `**/g/collect*` abortados por rota. 390×844 com toque.

## Session Matrix

| # | Item | Result |
|---|---|---|
| 1 | bug-16: primeiro toque em chip ("Todas") com a busca em foco | **Fail** (toque, clique e mouse; o conserto está no bundle e não pega) |
| 2 | bug-16: "Limpar" por toque / por teclado | **Fail** por toque; Pass por teclado (campo vazio e foco no campo) |
| 3 | bug-17: linha do cliente a 130 % e 200 % | Pass |
| 4 | Regressão da jornada (`percurso.cjs`) | Fail sem workaround (mesma falha do item 1); **31/31** com Enter antes do toque, inclusive a conta sem papel (semeada por `signup` e apagada depois) |
| 5 | Matriz de layout (`matriz.cjs`, 360/390/412/1440 × 100/130/200 %) | Pass, 60 medidas, 0 falhas |

## Walk e resultados

- **bug-16 reprovado.** Em /clientes, recorte "Compraram mais de uma vez", busca `rosa` (o foco fica no campo), toque em "Todas" (chip em y 160): `aria-pressed` continua `false`, URL `?recorte=recorrentes`, campo `rosa`, 0 linhas. Igual com `touchscreen.tap`, `click()` e mouse com down/400 ms/up. "Limpar" depois de buscar `Telma Souza` não limpa por toque; limpa por teclado e devolve o foco ao campo (B14 por teclado ok).
- **Causa medida** com ouvintes de captura e `MutationObserver` (`evidence/.../diag-ordem-dos-eventos.cjs`): ordem `pointerdown, touchstart, pointerup, touchend, mousedown, focusout (input), focusin (BUTTON)`, o `h1` volta a `text-2xl` na mesma passada (chip 160 para 192 px) e `mouseup`/`click` caem num `DIV`. O hook segura o `focusout`, mas o `focusin` no botão tocado chama `entrou`, que zera o pendente e aplica `setEmFoco(false)`. O teste de unidade não cobre o foco passando para um botão.
- **bug-17 aprovado.** A 200 %: nenhuma linha com rolagem horizontal (`scrollWidth` 390), nome inteiro ("Albuquerque", "Vasconcelos"), pílula "Em aberto" com 32 px (uma linha; a 130 %, 21 px), bloco de texto desce e usa a largura inteira.
- **Matriz de layout:** 60 medidas, 0 falhas. **Privacidade/rede** (do percurso): título e storage sem dado de cliente, nenhuma saída para host fora de `localhost`/`127.0.0.1:54441`; conta sem papel: recusa no login, `/clientes` direto leva ao login.
- **Gate:** `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000`: exit 0, 111 arquivos, 1763 testes.

## Bugs

| Id | Impact | Status |
|---|---|---|
| `BUG-20261024-primeiro-toque-em-chip-ou-limpar-se-perde-com-a-busca-em-foco` | Friction · P2 | **open (regressed)**: o conserto bug-16 não resolve no navegador |
| `BUG-20261024-limpar-da-busca-deixa-o-foco-no-body` | Friction · P4 | teclado verified; por toque cai no bug acima |
| `BUG-20261024-linha-do-cliente-quebra-palavra-e-pilula-a-200` | Friction · P3 | **verified** |

Nenhum bug novo; o P2 é reaberto com `## Regressed` e a causa medida.

## Paper Cuts

| Persona | Where | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Adri no celular | /clientes, trocar o recorte ou limpar depois de buscar | o toque "não pega" e a tela dá um pulo de 32 px | high | bug P2 reaberto |

## Evidence

`docs/qa/evidence/2026-10-24-mobile-adm-clientes-reteste-3/`: `B16-depois-do-toque-em-todas.png`, `B16-limpar-com-toque.png`, `B17-lista-fonte-130.png`, `B17-lista-fonte-200.png`, `B17-primeira-linha-200.png`, `diag-ordem-dos-eventos.cjs` (só fixturas `@exemplo.invalid`).

## Decisions for a Human

1. **B13 a 200 %** (aceitar que a linha, mais alta que a tela com o teclado aberto, mostre só parte dela): recomendação aceitar, não retestado aqui.
2. **B03 e B12** seguem aguardando decisão (ver `tasks.md`), não retestados.

## Human Verifications Needed

- Android real (Chrome com teclado real e TalkBack): foco depois de "Limpar" e do retry, e o toque em chip/"Limpar" com o teclado aberto. Nota: no iOS o botão não recebe foco no toque, então o defeito pode não aparecer lá; no Android/Chromium ele aparece.

## Final Status

**Não pronto para o fecho da `76`.** O bug P2 do primeiro toque continua aberto: o conserto `bug-16` está no bundle e não funciona porque o `focusin` no botão cancela a espera; sugestão e teste necessário registrados no bug. Sem Blocks-Completion, Data-Loss ou Trust-Damage. Totais por tier: Friction 2 abertos (um P2, um P4 dependente dele), 1 verificado (P3). Suíte do app: 1763 verdes (a suíte não vê o defeito).
