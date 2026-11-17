# 103 Joias em oferta configurável — Validation Report

**Date**: 2026-11-16
**Run by**: Validation (Dev), fechamento da corrida por ondas (`ONDAS: 01 | 02 | 03 | 04`)
**Source**: `prd.md` + `spec.md` + `tasks/01..04` (`Pronto quando`)
**Árvore medida**: worktree `store__feature-103`, branch local `feature/103`, HEAD `18d70244` (T01 `40c669a7` · T02 `d6af1b86` · T03 `0b5a21db` · T04 `18d70244`), base `7bbf4ad4`
**Banco**: Supabase local (54441/54442), migrations `20261130160000_103-campanha-vigente` e `20261130170000_103-joias-em-oferta-por-campanha` aplicadas **só no local** (`supabase migration list --local`)

---

## Test Results

Um workspace por vez, `--testTimeout=20000`, código de saída capturado fora de pipe.

| Workspace | Arquivos | Testes | Exit | Baseline (CLAUDE.md) |
| --- | --- | --- | --- | --- |
| core | 258 | 6240 passed | 0 | 5718 → +522 (WIs 99–103) |
| store | 416 | 7854 passed | 0 | 7188 → +666 |
| backoffice | 311 | 5538 passed | 0 | 5266 → +272 |
| functions | 49 | 1711 passed | 0 | 1669 → +42 |

**Summary** (store): 7854 passed, 0 failed, 0 skipped. A **primeira** rodada da loja deu os mesmos 7854 verdes com exit 1, por um `Unhandled Error: [vitest-worker]: Timeout calling "onTaskUpdate"` (RPC do worker sob carga, quatro suítes seguidas). Não é falha de teste. A segunda rodada, sozinha, saiu com **exit 0**.
**Summary** (core, backoffice, functions): tudo verde, 0 falhas.
mobile-adm e catalog-import: não foram rodados, porque a fila não os alcançou.

## Build & Lint

**Tipos** (contra os baselines da corrida, comparando arquivo e código do erro):
- store: 0.
- backoffice: 7, **iguais ao baseline**, todos em `ProposalStateBadge.test.tsx`.
- core: 11, **iguais ao baseline**.
- Nenhum erro novo.

**Lint** (`npx eslint .` em cada app):
- store: 2 erros e 2 warnings, igual ao baseline.
- backoffice: 23 erros e 5 warnings, igual ao baseline.
- Nenhum novo.

**Build**: **PASS** (store e backoffice), mas só na segunda tentativa:
- **A primeira falhou** com `[vite:build-html] URI malformed` no `apps/store/index.html`, antes de transformar o primeiro módulo.
- A causa é o ambiente do worktree. `apps/store/.env` (gitignored) não existe nele, então o placeholder `%VITE_SUPABASE_URL%` do `index.html` chega cru ao `decodeURI`.
- O WI não toca no `index.html`, no `vite.config` nem em HTML nenhum.
- Refeito com `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` do Supabase local, os dois apps deram exit 0: a loja com `dist/`, `robots.txt` e `.server/page.mjs`, o painel com `dist/`.

## Acceptance Criteria Coverage

Os testes vêm dos relatórios de cada tarefa e das revisões (`implement-log.md`), e a suíte acima prova que passam.

| ID | Teste | Result | Status |
| --- | --- | --- | --- |
| CA-01.1 | `CampaignOffersEditor.test.tsx` (Conteúdo) · `applyDraft.test.ts` | PASS | COVERED |
| CA-01.2 | `AdminHomePage.test.tsx` (gravação sem esqueleto) · `useAdminHomeSections.test.ts` ("revalida sem esqueleto", mutação vermelha) | PASS | COVERED |
| CA-01.3 | `core/home/__tests__/campaignOffers.test.ts` (recuos) · `CampaignOffers.test.tsx` · `HomeRenderer.test.tsx` | PASS | COVERED |
| CA-01.4 | `CampaignOffers.test.tsx` (selo acima do título, `compareDocumentPosition`) | PASS | COVERED |
| CA-01.5 | casco do editor (`sectionDraft`): `AdminHomePage.test.tsx` mantém o rascunho na falha | PASS | COVERED |
| CA-01.6 | `campaignOffers.test.ts` (recusa em ordem, teto com o número) · `CampaignOffersEditor.test.tsx` (A recusa) | PASS | COVERED |
| CA-02.1 | `CampaignOffersEditor.test.tsx` (Campanha — as opções) | PASS | COVERED |
| CA-02.2 | `campaignOffers.test.ts` (`campaignOffersShows`) · `CampaignOffers.test.tsx` (outra vigente / `null` / sem coluna) · probe `01` | PASS | COVERED |
| CA-02.3 | `HomeSectionList.ofertas.test.tsx` (a campanha e o estado) | PASS | COVERED |
| CA-02.4 | `HomeBlockTray.test.tsx` · `useAdminHomeSections.test.ts` (nasce desligado e sem campanha) · `HomeSectionList.ofertas.test.tsx` (bloco novo pede a escolha) · `CampaignOffersEditor.test.tsx` (Sem campanha) | PASS | COVERED |
| CA-02.5 | `campaignOffers.test.ts` (mesma frase) · `CampaignOffersEditor.test.tsx` (Sem campanha) · `HomeSectionList.ofertas.test.tsx` · probe `02` (apagar → `campaign_id` nulo) | PASS | COVERED |
| CA-02.6 | `CampaignOffersEditor.test.tsx` (tomada desabilitada) · `campaignOffersTaken.test.ts` · `AdminHomePage.test.tsx` (23505 do índice → a frase) · probe `02`/`03` | PASS | COVERED |
| CA-03.1 | `CampaignOffersEditor.test.tsx` (Peças) · `ProductSearchField.test.tsx` (`permitidos`) · `core/product-search` `search.test.ts` | PASS | COVERED |
| CA-03.2 | `CampaignOffersEditor.test.tsx` (ordem, subir/descer/tirar) · `CampaignOffers.test.tsx` (ordem da dona) | PASS | COVERED |
| CA-03.3 | `campaignOffers.test.ts` (teto 12) · `CampaignOffers.test.tsx` (`slider` por token, esqueletos) | PASS | COVERED |
| CA-03.4 | `ProductSearchField.test.tsx` · `CampaignOffersEditor.test.tsx` ("já está no bloco" no recorte) | PASS | COVERED |
| CA-03.5 | `CampaignOffers.test.tsx` (sem itens → 4 primeiras) | PASS | COVERED |
| CA-03.6 | `CampaignOffersEditor.test.tsx` (Trocar a campanha, Cancelar desfaz) | PASS | COVERED |
| CA-04.1 | `campaignMarks.test.tsx` (estados e frases) · `CampaignOffersEditor.test.tsx` (Os avisos) · `HomeSectionList.ofertas.test.tsx` ("N das M saíram do ar") · `CampaignOffers.test.tsx` (some sem completar) | PASS | COVERED |
| CA-04.2 | `CampaignOffers.test.tsx` (peça fora da campanha some, vaga vazia) | PASS | COVERED |
| CA-04.3 | `CampaignOffersEditor.test.tsx` (Ao abrir, inclusive leitura falhando) | PASS | COVERED |
| CA-04.4 | `core/campaigns/__tests__/price.test.ts` · `campanhaNaLoja.test.ts` (delegação) · `campaignMarks.test.tsx` · `HomeSectionList.ofertas.test.tsx` | PASS | COVERED |
| CA-04.5 | `CampaignOffers.test.tsx` (todas fora → só cartões) | PASS | COVERED |
| CA-04.6 | `CampaignOffers.test.tsx` (cartões ficam com e sem escolhidas, e na falha) | PASS | COVERED |
| CA-05.1 | `applyDraft.test.ts` · `AdminHomePage.test.tsx` (o rascunho leva a campanha à prévia) | PASS | COVERED |
| CA-05.2 | `campaignOffers.test.ts` (nota da prévia) · `CampaignOffersEditor.test.tsx` (agendada) | PASS | COVERED |
| CA-06.1 | `useLiveCampaign.test.tsx` · `cardSelect.test.ts` · `campanhasSchema.test.ts` · `campanhaVigenciaParidade.test.ts` · `campanhaNaLoja.test.ts` · probes `01-campanha-vigente.sql` (10 ok) e `-http.mjs` (5 ok, token de admin) | PASS | COVERED |
| RNF-01 | `CampaignOffers.test.tsx` (`toBeEmptyDOMElement` sem campanha e carregando) | PASS | COVERED |
| RNF-02 | `CampaignOffers.test.tsx` (falha → cartões ficam) | PASS | COVERED |
| RNF-03 | `campanhaVigenciaParidade.test.ts` (vigência pelo `now()` do banco) · `useLiveCampaign.test.tsx` | PASS | COVERED |
| RNF-04 | proxy de classe (`slider`, `min-w-0 break-words`, `h-11 w-11`) nos testes do widget, do editor e da linha. **A medida em 390 px e a fonte a 200 % não são mensuráveis no jsdom**, e o plano de QA (`pd-qa-validation`) as mede no navegador | PASS (proxy) | COVERED (proxy) — medida no QA |
| RNF-05 | `campaignOffers.test.ts` (tom: regex de `!` e urgência) | PASS | COVERED |
| RNF-06 | `campaignOffers.test.ts` (60/160) | PASS | COVERED |
| RNF-07 | `previaUnica.test.ts` (editor novo no escopo) | PASS | COVERED |
| RNF-08 | `CampaignOffersEditor.test.tsx` (rótulos, `radiogroup` "Campanha do bloco", recusa como alerta) | PASS | COVERED |

**Coverage**: 35/35 critérios cobertos (100%). O RNF-04 está coberto por proxy de classe, e a medida em layout real é do QA, como o `spec.md` › Não resolvido já previa.

Guardas do repositório tocados ou invertidos, todos verdes:
- `homeSections` (índice por campanha, `campaign_offers` fora dos tipos únicos, FK `set null`, sem escrita de dado).
- `campanhasSchema` e `campanhaVigenciaParidade` (views novas).
- `campanhaNaLoja` (a metade positiva exige `campaignLowersPrice(`).
- `catalog.test.ts` (o bloco repetível).
- `previaUnica`, `buscaDeProdutoComDonoUnico`, `animacaoRespeitaMovimento` e `toNewItems`.

## Afirmações caducadas na corrida

Nenhuma: as quatro tarefas devolveram `Caducou: nada`/`nenhuma`. A tarefa 03 **propagou** para a 04 a linha do Contrato com os nomes reais do hook (`useCampaignMarks`, `useCampaignPiecesState` e as frases), antes de a 04 rodar. É atualização prévia, não caducidade.

## Failures & Fix Tasks

Nenhuma. O exit 1 da primeira rodada da loja e o build da loja sem `.env` são ambiente, não código. Os dois foram repetidos e passaram, sem tocar código.

Bugs abertos do Work Item: nenhum, porque `qa/issues/` não existe.

## Observações para quem integra

- **Migrations novas** (`20261130160000`, `20261130170000`): um push na `master` remota as aplica em produção pelo `Supabase Deploy`. Pergunte ao humano antes do push (CLAUDE.md › CI e deploy).
- **`.specs/work-items/102-desconto-de-campanha/spec.md`** tem, fora de commit, a nota de que o WI 103 superou H-10 e I-10 (F13, escrita pela tarefa 02). É artefato de spec de outro WI e ficou para o commit de artefatos.
- **Dívida conhecida** (D-04): com sessão de admin, a loja mostra peça despublicada (policy de `products`). Pede WI próprio.
- **Revisões com "Não conferido"** que só a execução no navegador fecha (T04):
  - o aviso de peças pode piscar antes de a leitura chegar;
  - com bloco com campanha e sem peça escolhida, uma falha das marcações mostraria "Não foi possível conferir as peças escolhidas".
  - Os dois são casos para o QA olhar.

## Overall Verdict

**Status**: PASS

- [x] Todos os testes passam (0 falhas). core, store, backoffice e functions com exit 0
- [x] Build passa (com o `.env` do Supabase local), e lint e tipos estão sem erro novo sobre o baseline
- [x] Todo critério de aceite das unidades de escopo da fila está COVERED (RNF-04 por proxy, com medida no QA)
- [x] Nenhum critério MISSING ou FAILING, e nada DEFERRED
- [x] Nenhum bug aberto do Work Item

---

# Validation 2 — Re-Validation das correções da rodada 1 de QA (2026-11-17)

**Escopo:** os dois workspaces que as fix tasks tocaram — `apps/backoffice` (T05, T06, T08) e `apps/store` (T07). `packages/core` e `supabase/` não foram tocados por elas (diff `18d70244..e09d6b71`: 14 arquivos, só nos dois apps). Commits: `65d16a85` (T05 · BUG-001, BUG-004), `f414a988` (T07 · BUG-003), `845e8bfa` (T06 · BUG-002, BUG-006), `e09d6b71` (T08 · BUG-005).

| Medida | Comando | Exit | Resultado | Baseline / Validation 1 |
| --- | --- | --- | --- | --- |
| Tipos · store | `npx tsc --noEmit -p apps/store/tsconfig.app.json` | 0 | 0 erros | 0 = igual |
| Tipos · backoffice | `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` | 2 | 7 erros, todos em `features/order-proposal/ui/__tests__/ProposalStateBadge.test.tsx` | 7 = igual (pré-existentes) |
| Lint · store | `npx eslint .` em `apps/store` | 1 | 2 erros / 2 warnings | 2/2 = igual |
| Lint · backoffice | `npx eslint .` em `apps/backoffice` | 1 | 23 erros / 5 warnings | 23/5 = igual |
| Testes · backoffice | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` | 0 | 312 arquivos · 5557 passed · 0 failed | 311/5538 → +1 arquivo, +19 testes |
| Testes · store | `pnpm --filter @estrelinha/store test --testTimeout=20000` | 0 | 417 arquivos · 7855 passed · 0 failed | 416/7854 → +1 arquivo, +1 teste |
| Tipos · core | `npx tsc --noEmit -p packages/core/tsconfig.json` | 2 | 11 erros | 11 = igual (pré-existentes) |
| Testes · core | `pnpm --filter @estrelinha/core test` | 0 | 258 arquivos · 6240 passed · 0 failed | 258/6240 = igual (não tocado) |
| Testes · functions | `pnpm --filter @estrelinha/functions test` | 0 | 49 arquivos · 1711 passed · 0 failed | 49/1711 = igual (não tocado) |
| Build · store | `pnpm --filter @estrelinha/store build` (com `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` do Supabase local) | 0 | PASS | PASS |
| Build · backoffice | `pnpm --filter @estrelinha/backoffice build` (idem, e `VITE_STORE_URL`) | 0 | PASS | PASS |

Cada workspace rodou sozinho, fora de pipe, com o exit capturado. Saídas em disco na pasta temporária da sessão (`val2/`).

**Critérios que os bugs da rodada 1 quebravam** — cobertos por teste nas fix tasks (a medida no browser é do reteste):

| Bug | Critério | Fix task · commit | Prova automatizada |
| --- | --- | --- | --- |
| BUG-001 | CA-01.2 | T05 · `65d16a85` | `CampaignOffersEditor.test.tsx` — gravar com peça acrescentada termina em "Salvo" |
| BUG-004 | RNF-04 (editor) | T05 · `65d16a85` | `FormPageHeader.test.tsx` — a barra quebra em vez de forçar largura (jsdom não mede layout; medida real no reteste) |
| BUG-003 | RNF-04, CA-03.3 | T07 · `f414a988` | `CampaignOffersRecorte.test.tsx` — o texto do preço riscado fica contido no cartão (idem) |
| BUG-002 | CA-02.3, CA-02.4 | T06 · `845e8bfa` | `HomeSectionList.ofertas.test.tsx` — bloco sem campanha, agendado, desligado ou encerrado não diz "No ar" nem conta |
| BUG-006 | CA-04.1 | T06 · `845e8bfa` | `HomeSectionList.ofertas.test.tsx` / `CampaignOffersEditor.test.tsx` — a peça apagada entra em "N das M saíram do ar" |
| BUG-005 | CA-04.3 | T08 · `e09d6b71` | `CampaignOffersEditor.conferencia.test.tsx` — leitura das marcações falhando ⇒ aviso, sem tirar peça |

**Bugs:** BUG-001..BUG-006 seguem `open` — o reteste e o `resolved` são da rodada de confirmação da QA.

**Status**: PASS

---

# Validation 3 — Re-Validation da correção da rodada 2 de QA (2026-11-17)

**Escopo:** só `apps/backoffice`, o único workspace que a fix task 09 tocou (`FormPageHeader.tsx` e o teste dele). Commit: `656bb5ce` (T09 · BUG-007). Revisão adversarial (`pd-impl-review`): serve, sem achados.

| Medida | Comando | Exit | Resultado | Validation 2 |
| --- | --- | --- | --- | --- |
| Testes · backoffice | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` | 0 | 312 arquivos · 5566 passed · 0 failed | 312/5557 → +9 testes |
| Tipos · backoffice | `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` | 2 | 7 erros, todos em `ProposalStateBadge.test.tsx` | 7 = igual (pré-existentes) |
| Lint · backoffice | `npx eslint .` em `apps/backoffice` | 1 | 23 erros / 5 warnings | 23/5 = igual |
| Build · backoffice | `pnpm --filter @estrelinha/backoffice build` (env do Supabase local) | 0 | PASS | PASS |

| Bug | Critério | Fix task · commit | Prova automatizada |
| --- | --- | --- | --- |
| BUG-007 | RNF-04 (editor) | T09 · `656bb5ce` | `FormPageHeader.test.tsx` › "a barra só gruda enquanto cabe na tela" — 345 px em 844 ⇒ sem `sticky` (vermelho antes do fix); 73 e 162 px ⇒ gruda; `ResizeObserver` e `resize` nos dois sentidos; sem `ResizeObserver` gruda; desliga ao desmontar. 4 mutantes mortos. A medida em navegador real (390 × 844 a 200 %) é do reteste |

**Bugs:** BUG-007 segue `open` até a rodada de confirmação da QA.

**Status**: PASS
