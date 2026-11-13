# 101 · Faixa de avisos no topo da loja — Validation Report

**Data:** 2026-11-13 · **Rodada:** validation 2 (depois das fix tasks 05 e 06; a validation 1 segue abaixo, intacta) · **Repositório:** `.` (monorepo, worktree `store__feature-101`, branch `feature/101`)
**Commits da fila:** 41de8e4a (T01) · 18d3d3c8 (T02) · 347b7c86 (T04) · d65f3151 + fe757bc5 (T03 e a correção da T03)

---

## Test Results

Um workspace por vez, `--testTimeout=20000`, exit capturado fora de pipe.

| Workspace | Arquivos | Testes | Exit | Contra a baseline do `CLAUDE.md` |
| --- | --- | --- | --- | --- |
| core | 244 | 5832 passed | 0 | 5718/238 (WI 98) → +114/+6 |
| store | 386 | 7258 passed | 0 | 7188/382 → +70/+4 |
| backoffice | 298 | 5294 passed | 0 | 5266/297 → +28/+1 |
| mobile-adm | 175 | 2729 passed | 0 (remedido sozinho) | 2729/175 |
| functions | 46 | 1669 passed | 0 | 1669/46, idêntico |

- **A suíte da loja** saiu com exit 0 e 7258/7258 nesta medição. Nas tarefas 02 e 03 ela tinha saído com exit 1 por `Timeout calling "onTaskUpdate"`, um erro do runner com zero testes reprovados, porque a 02 e a 04 rodavam em paralelo. Aqui ela rodou sozinha, sem nenhum outro workspace ao lado.
- **mobile-adm, primeira volta:** 1 caso reprovou, `useFolhaNoHistorico.test.tsx › o voltar FECHA a folha…`. É o caso que o `CLAUDE.md` já registra como contenção (WI-01). Rodado sozinho, o arquivo deu 13/13 com exit 0; a suíte remedida sozinha deu 2729/175 com exit 0. O WI não toca esse arquivo.

## Build & Lint

**Build:** PASS. `pnpm build` passou nos três apps: `Tasks: 3 successful`, `apps/store/.server/page.mjs` gerado e `dist/index.html` mantido localmente, sem a variável `VERCEL`, como manda a H-17.
- A primeira rodada falhou com `[vite:build-html] URI malformed`. A causa é de ambiente: o worktree não tem `apps/store/.env`, então o `%VITE_SUPABASE_URL%` do `index.html:33` não é substituído. O WI não tocou o `index.html`.
- Refeito com `VITE_SUPABASE_URL=http://127.0.0.1:54441` e uma chave de build fictícia, as duas só na linha de comando e sem gravar arquivo nenhum.

**Lint:** PASS contra a baseline, sem regressão:
- store: 2 erros e 2 avisos, nos arquivos `ProductInfo.tsx`, `ShareButtons.tsx` e `ShippingCalc.tsx`. São herdados e o WI não os tocou.
- backoffice: 23 erros e 5 avisos, igual à baseline.
- mobile-adm: 0/0.

**Tipos:** sem erro novo:
- store 0;
- backoffice 7, todos em `ProposalStateBadge.test.tsx`, herdados;
- mobile-adm 0;
- `apps/store/tsconfig.server.json` 0;
- `packages/core` 11, nos arquivos da baseline (`home/__tests__/carousel` 5, `pickHomeBanners` 1, `pickHomeCollections` 1, `sitemap/__tests__/urls` 2, `packages/supabase/src/client.ts` 2).

**Integração local, pelas tarefas:**
- **T02:** `apps/store/.server/page.mjs` foi rodado com `node --env-file` contra a API 54441 nos três estados da chave (ligada, desligada, ausente). A chave temporária foi apagada no fim.
- **T04:** `probes/04-faixa-no-banco.sh`, 5 `ok`: o `upsert` de admin grava, a leitura anônima vê a chave e a anônima não grava.

## Acceptance Criteria Coverage

| Critério | Teste | Status | Cobertura |
| --- | --- | --- | --- |
| UC-01 acima do cabeçalho, `accent`/`ink`, altura fixa por dispositivo | `AnnouncementBar.test.tsx` (vaga com `"1"` antes da configuração), `StoreLayoutFaixa.test.tsx` (antes do `<header>`), `core/announcements` (alturas em `rem`), guardas `accentText`/`contrast` | PASS | COVERED (forma). A medida em px fica para o navegador, ver abaixo |
| UC-01 um por vez, 6 s, entrada sem opacidade zero | `AnnouncementBar.test.tsx` (relógio falso), `faixaSemOpacidadeZero.test.ts` | PASS | COVERED |
| UC-01 pausa com ponteiro, foco e dedo | `AnnouncementBar.test.tsx` | PASS | COVERED |
| UC-01 setas no computador, sem setas e link inteiro no celular | `AnnouncementBar.test.tsx` | PASS | COVERED |
| UC-01 movimento reduzido | `AnnouncementBar.test.tsx` | PASS | COVERED |
| UC-01 rola com a página, cabeçalho intacto | `useScrollDirection.test.tsx` (não recolhe com a faixa na tela) | PASS | COVERED (lógica). O recolhimento real fica para o navegador |
| UC-02 duas artes, alt, `<picture>`, rendição | `AnnouncementBar.test.tsx`, `core/announcements` (vagas), `AdminAnnouncementsPage.test.tsx` (envio) | PASS | COVERED |
| UC-03 a tela, até 5, ordem, tipos, destino recusado, prévia, ajuda de tom | `AdminAnnouncementsPage.test.tsx`, `core/home|menu/__tests__/refusals.test.ts`, guardas `previaUnica`/`navItems`/`focusRoutes`/`rotasSobGuarda` | PASS | COVERED |
| UC-04 desligada ou vazia: não existe | `exists.test.ts`, `serve.test.ts` (`data-faixa="0"`), `AnnouncementBar.test.tsx` | PASS | COVERED |
| RN-01 fora de checkout, PIX, montado, cartão e 404 | `StoreLayoutFaixa.test.tsx` (layout real e `App.tsx` do disco) | PASS | COVERED |
| RN-02 o servidor diz se existe | `serve.test.ts`, `head.test.ts`, `server/page.test.ts`, `shell.test.ts`, integração local da T02 | PASS | COVERED. A Vercel servindo `/` pela função só se prova num preview (spec › Não resolvido) |
| RN-03 tom | `catalog.test.ts`, `tomDaFaixa.test.ts` | PASS | COVERED |
| RN-04 região rotulada, sem `aria-live`, setas com rótulo | `AnnouncementBar.test.tsx` | PASS | COVERED (o contraste do perfil do WI 100 não existe ainda: F12) |
| RN-05 movimento | `faixaSemOpacidadeZero.test.ts`, `animacaoRespeitaMovimento` | PASS | COVERED |
| RN-06 um dono do giro | `useHeroCarousel.test.ts` em `shared/lib`, idêntico byte a byte; `HeroCarousel.test.tsx` intocado | PASS | COVERED |
| RN-07 / CA-07 390×844 e 1440×900, duas linhas, 44 px, fonte a 200 % | — | — | **Prova de navegador → QA real-user** (jsdom devolve 0 para layout) |
| CA-01 | `StoreLayoutFaixa.test.tsx` | PASS | COVERED |
| CA-02 | `AnnouncementBar.test.tsx` | PASS | COVERED |
| CA-03 | `AnnouncementBar.test.tsx` | PASS | COVERED |
| CA-04 | `AdminAnnouncementsPage.test.tsx`, `refusals.test.ts`, `AnnouncementBar.test.tsx` (sem destino é texto) | PASS | COVERED |
| CA-05 desligada: loja idêntica em 390 e 1440 | `serve.test.ts` (`"0"`), `AnnouncementBar.test.tsx` (`"0"` não desenha) | PASS | COVERED (lógica). **A captura comparada fica para a QA em navegador** |
| CA-06 CLS da Home e do produto em rede lenta | — | — | **Prova de navegador → QA real-user** |
| CA-08 até 5 min / 1 h, sem empurrar | `serve.test.ts` (cache por ramo, `no-store` na falha), `AnnouncementBar.test.tsx` (a regra de existência H-03) | PASS | COVERED (lógica). O tempo de cache real só no deploy |

O que só um navegador mede (RN-07, CA-05, CA-06, CA-07 e o teto conjunto de 90 caracteres a 390 e a 200 %, premissa H-05) está declarado desde a costura (spec › Testes e Não resolvido) e vai para a QA real-user. Não é critério sem teste esquecido.

## Afirmações caducadas na corrida

Nada. Nenhuma tarefa registrou `Caducou`.

## Failures & Fix Tasks

Nenhuma. A única correção depois das ondas foi o commit `fe757bc5`. O commit da T03 (`d65f3151`) já importava `useHeroCarousel` de `@/shared/lib`, mas tinha deixado fora o arquivo movido e a suíte dele. Corrigido com os caminhos explícitos, e as suítes da loja e do painel, verdes depois dele, provam o efeito.

## Overall Verdict

**Status:** PASS

- [x] Todos os testes passam (0 falhas, com mobile-adm remedido sozinho)
- [x] Build e lint passam, sem erro novo contra a baseline
- [x] Todo critério de aceite que a fila cobre está COVERED. O que é só de navegador está declarado para a QA
- [x] Nenhum critério MISSING ou FAILING
- [x] Sem bugs da QA (`qa/issues/` não existe)

**Observações para a QA real-user:**
- Medir em 390×844 e em 1440×900: rolagem lateral, as duas linhas, as setas de 44 px, a fonte a 200 % e o teto de 90 caracteres.
- Medir o CLS da Home e da página de produto com a faixa ligada.
- Conferir a captura com a faixa desligada (CA-05).
- Na prévia do painel, conferir as setas depois de "mostre o aviso N".
- **Ponto conhecido:** o `InfoBanner` de erro de leitura do painel nunca aparece, porque `fetchAllSettings` cai nos padrões em vez de devolver erro. A tela está ligada a `isError` e está registrada em `apps/backoffice/CLAUDE.md`.

---

# Validation 2 — depois das fix tasks da QA (rodada 1)

**Data:** 2026-11-13 · **Commits:** `0d547f0d` (T05, BUG-002) · `f649a843` (T06, BUG-001) · **Tarefas:** 01–06 todas `done`

| Medida | Resultado |
| --- | --- |
| Testes | core **5838/244** · store **7262/386** · backoffice **5295/298** · functions 1669/46 · mobile-adm 2729/175. Todos com exit 0, rodados um workspace por vez, com o exit capturado fora de pipe e `--testTimeout=20000`. Contra a validation 1: core +6, store +4, backoffice +1 |
| Tipos | store 0 · backoffice 7 (herdados, `ProposalStateBadge.test.tsx`) · `tsconfig.server.json` 0 · core 11 (herdados). Nenhum erro novo |
| Lint | store 2/2 · backoffice 23/5, iguais à baseline |
| Build | `pnpm build` verde, 3 de 3, com as variáveis locais só na linha de comando |

## Bugs da QA

- **BUG-002 (T05):** está **aguardando o reteste do QA**.
  - **Resultado da tarefa:** nenhuma mudança de produção. Só testes novos, em `AnnouncementBar.test.tsx`.
  - **Por quê:** quem executou não reproduziu o defeito no código da HEAD, nem no jsdom nem num Chromium com o build servido e o `<html data-faixa>` injetado. Nas quatro combinações, a decisão passa à configuração depois da troca de rota.
  - **Hipótese registrada:** a reprodução da QA vem do método de interceptação no dev server.
  - **Mutantes:** os dois do hook morreram por asserção.
  - **Pedido para a rodada de confirmação:** reproduzir de novo, de preferência no build servido, antes de qualquer conclusão. Detalhes em `implement-log.md` › T05.
- **BUG-001 (T06):** está **aguardando o reteste do QA**.
  - **Correção:** a recusa do aviso de imagem passou a reunir os motivos que valem, em `packages/core/src/announcements/refusals.ts`, e o painel os mostra juntos.
  - **Veredito de validade:** o mesmo de antes para a loja e para a função.

**Status:** PASS
