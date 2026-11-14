# WI 100 · Perfil de estilo da loja — Validation Report

**Date**: 2026-11-14
**Run by**: Validation (Dev), rodada 1
**Source**: `prd.md` + `spec.md` + os `Pronto quando` de `tasks/01..07`
**Árvore medida**: worktree `store__feature-100`, branch `feature/100`, HEAD `b244cebc` (T01–T07 commitadas), árvore de código limpa.

---

## Re-Validation 3 — fix task 10 (rodada 2 da QA)

**Date**: 2026-11-14 · **Árvore medida**: HEAD `41f85963` (T10, BUG-005), todas as tarefas `done`. A fix task tocou `packages/core` (`home/preview.ts`), `apps/store` e `apps/backoffice`; por `core` ser lido por todos, os cinco workspaces rodaram, um por vez, exit fora de pipe, `--testTimeout=20000`.

| Workspace | Exit | Arquivos | Testes |
| --- | --- | --- | --- |
| core | 0 | 256 passed | 6104 passed (+6) |
| store | 0 | 409 passed | 7638 passed (+8) |
| backoffice | 0 | 308 passed | 5440 passed (=) — a 1ª volta saiu exit 1 por 1 caso de `AdminCampaignFormPage.test.tsx` (arquivo não tocado pela T10, WI 102); passou isolado duas vezes e na suíte remedida: exit 0 |
| mobile-adm | 0 | 176 passed | 2734 passed (=) |
| functions | 0 | 49 passed | 1705 passed (=) |

- **Tipos**: store 0 · backoffice 7 · mobile-adm 0 · core 11 — iguais à baseline (herdados).
- **Lint**: store 2/2 · backoffice 23/5, igual à baseline.
- **Build**: `pnpm build` exit 0 (env de placeholder na linha de comando).
- **BUG-005**: reproduzido em `apps/store/src/pages/__tests__/homePreview.test.tsx` (a prévia com `&home=publicada` lê `home_sections` e desenha os blocos; vermelho antes) e no palco do painel (`StyleProfileCard.test.tsx`: o `src` é `…/?preview=1&home=publicada`). Segue `open` até o reteste da QA (rodada de confirmação). Revisão adversarial: `serve`, 0 achados.
- **Fora de escopo, registrado**: as prévias da faixa (`AnnouncementLivePreview`) e do menu (`MenuLivePreview`) seguem com a Home vazia; o mesmo conserto vale para elas (`previewSrc(STORE_URL, { home: 'publicada' })`).

**Status da Re-Validation 3**: PASS

---

## Re-Validation 2 — fix tasks 08 e 09 (rodada 1 da QA)

**Date**: 2026-11-14 · **Árvore medida**: HEAD `90f751fa` (T08 `9f1d38c0` BUG-001/BUG-002, T09 `90f751fa` BUG-003/BUG-004), todas as tarefas `done`. As fix tasks tocaram `apps/backoffice` e `packages/core` (`useStoreSettings`, `useStyleProfile`, `appearance/copy.ts`); por `core` ser lido por todos, os cinco workspaces rodaram.

| Workspace | Exit | Arquivos | Testes |
| --- | --- | --- | --- |
| core | 0 | 256 passed | 6098 passed (+6) |
| store | 0 | 409 passed | 7630 passed (=) — a 1ª volta saiu exit 1 só por `[vitest-worker]: Timeout calling "onTaskUpdate"` (contenção, 0 teste falho); remedida sozinha: exit 0 |
| backoffice | 0 | 308 passed | 5440 passed (+18) |
| mobile-adm | 0 | 176 passed | 2734 passed (=) |
| functions | 0 | 49 passed | 1705 passed (=) |

- **Tipos**: store 0 · backoffice 7 · mobile-adm 0 · `tsconfig.server.json` 0 · core 11 — iguais à baseline (herdados).
- **Lint**: store 2/2 · backoffice 23/5 · mobile-adm 0/0 = 25/7, igual à baseline.
- **Build**: `pnpm build` exit 0 (com env de placeholder na linha de comando, como na rodada 1).
- **Bugs**: BUG-001..BUG-004 seguem `open` até o reteste da QA (rodada de confirmação); esta Re-Validation não muda status.

**Status da Re-Validation 2**: PASS

---

## Test Results

Um workspace por vez, `pnpm --filter @estrelinha/<w> test --testTimeout=20000`, exit capturado fora de pipe.

| Workspace | Exit | Arquivos | Testes |
| --- | --- | --- | --- |
| core | 0 | 256 passed | 6092 passed |
| store | 0 | 409 passed | 7630 passed |
| backoffice | 0 | 308 passed | 5422 passed |
| mobile-adm | 0 | 176 passed | 2734 passed |
| functions | 0 | 49 passed | 1705 passed |

**Summary**: 23583 passed, 0 failed, 0 skipped, em 1198 arquivos.

A fila tocou `apps/store`, `apps/backoffice`, `packages/core`, `packages/ui` e `packages/supabase`. O mobile-adm e as functions rodaram também, porque leem `packages/ui/src/tokens/estrelinha.ts` (identidade do Padrão, RN-02) e `packages/core`.

## Build & Lint

**Build**: PASS. `pnpm build` com exit 0, 3 de 3 tasks (store gera `.server/page.mjs` com shell de 7391 bytes; mobile-adm gera `sw.js`).
- A primeira execução reprovou a loja com `[vite:build-html] URI malformed` em `apps/store/index.html`. A causa é ambiente: o worktree não tem `apps/store/.env`, e o placeholder `%VITE_SUPABASE_URL%` do `index.html` fica sem valor. O WI não toca o `index.html`. Remedido com env de placeholder na linha de comando (`VITE_SUPABASE_URL=http://127.0.0.1:54441` e chaves inválidas), sem o `.env` da raiz: verde.
- Conferido no bundle servido: o CSS da loja emite `html[data-perfil=black-friday]`, e as classes leem a variável preservando a opacidade (`.bg-estrelinha-primary\/10{background-color:rgb(var(--estrelinha-primary-rgb) / .1)}`). O CSS do painel e o do ateliê não têm `data-perfil` (CA-05).

**Tipos**: PASS. store 0 · backoffice 7 · mobile-adm 0 · `tsconfig.server.json` 0 · `packages/core` 11. Comparados por arquivo e código de erro com o baseline da corrida: idênticos. Os 7 do backoffice (`ProposalStateBadge.test.tsx`) e os 11 de core são herdados.

**Lint**: PASS contra a baseline. store 2 erros / 2 warnings · backoffice 23/5 · mobile-adm 0/0 (`npx eslint .` em cada app) = 25/7, igual à baseline do `CLAUDE.md`.

## Acceptance Criteria Coverage

| ID | Critério | Teste (arquivo › bloco) | Result | Status |
| --- | --- | --- | --- | --- |
| UC-01 | Card com Padrão/Black Friday, amostras, Salvar; a próxima página já vem com o perfil; quem está na loja vê ao trocar de página; o card diz o que muda e quanto tempo leva | `StyleProfileCard.test.tsx` (painel), `AdminSettingsPage.test.tsx` (card em Dados da loja), `serve.test.ts`/`head.test.ts` (perfil no HTML), `StyleProfileApplier.test.tsx` (troca só ao navegar), `copy.test.ts` | PASS | COVERED |
| UC-02 | Voltar ao Padrão pela mesma chave, sem perder dado | `StyleProfileCard.test.tsx` (grava só `appearance.profile`), `useStyleProfile.test.ts`, `storeSettingsDefaults.test.ts` | PASS | COVERED |
| UC-03 | "Ver a loja com este perfil" abre a loja no iframe com o perfil não salvo | `StyleProfileCard.test.tsx` (modal, Celular/Computador, `draft` depois do `ready`), `preview.test.ts` (canal), `StyleProfileApplier.test.tsx` (rascunho vence só na prévia) | PASS | COVERED |
| RN-01 | Mesmos tokens; exceção do desconto (`sale`/`on-sale`/`sale-bar`) | `palette.test.ts` (perfis × `App.css` × Tailwind), `accentText.test.ts` (régua do papel de desconto), `ProductCardSurface.test.tsx`, `ProductPageCampanha.test.tsx`, `CartDrawer.test.tsx` | PASS | COVERED (chip da sacola: ver H4 abaixo) |
| RN-02 | Só a loja; painel e ateliê no Padrão | `palette.test.ts` (o Padrão É `ESTRELINHA_COLORS`, identidade, também no ateliê), `perfilMontado.test.ts`; bundle conferido | PASS | COVERED |
| RN-03 | Pisos de legibilidade nos dois perfis; regras do ouro por uso | `contrast.test.ts` (pisos nos dois perfis, tetos só no Padrão), `accentText.test.ts`, `fieldBorder.test.ts` | PASS | COVERED |
| RN-04 | Sem troca de cor diante da cliente | `StyleProfileApplier.test.tsx` (atributo da carga vence até a 1ª navegação; sem escrita durante `isLoading`), `useAnnouncementBar` (util extraído `useNavigatedSinceLoad`) | PASS | COVERED (pintura: navegador, na QA) |
| RN-05 | Cache do HTML; o card avisa a demora | `serve.test.ts` (`no-store` com a leitura falhando), `copy.test.ts`, `StyleProfileCard.test.tsx` (frases H7/H8) | PASS | COVERED |
| RN-06 | `theme-color`/favicon/OG não mudam; marca desenhada segue o tom escuro | `brandAssets.test.ts`, `brand.test.tsx`, `Footer.test.tsx`, `InstagramInvite.test.tsx` | PASS | COVERED |
| RN-07 | Valor desconhecido ⇒ Padrão | `normalize.test.ts`, `serve.test.ts`, `StyleProfileApplier.test.tsx` | PASS | COVERED |
| RN-08 | Prova em navegador 390×844 e 1440×900, nos dois perfis | — (jsdom não mede pintura nem layout) | — | DEFERRED à QA real-user (`wi-qa-validation`), que roda em seguida |
| CA-01 | Padrão idêntico ao de hoje | `palette.test.ts` (hex, HSL e sombra do Padrão iguais aos de antes; `padrao === ESTRELINHA_COLORS`), testes de superfície com o Padrão | PASS | COVERED pelo guarda · captura 390/1440 na QA |
| CA-02 | Primeiro HTML servido já com o perfil | `serve.test.ts`, `head.test.ts`, `server/__tests__/page.test.ts` (`data-perfil` em toda resposta HTML; ausente + `no-store` na falha) | PASS | COVERED · rede lenta em navegador na QA |
| CA-03 | Voltar ao Padrão devolve a paleta de hoje sem perder conteúdo | `StyleProfileCard.test.tsx`, `palette.test.ts` | PASS | COVERED |
| CA-04 | Guardas passam nos dois perfis; valor reprovado reprova | `contrast.test.ts`, `accentText.test.ts`, `palette.test.ts`, `perfilDeEstiloComDonoUnico.test.ts` (sensores por mutação) | PASS | COVERED |
| CA-05 | Painel e ateliê não mudam | `palette.test.ts`; bundles do painel e do ateliê sem `data-perfil` | PASS | COVERED |
| CA-06 | Valor desconhecido ⇒ Padrão | `normalize.test.ts`, `serve.test.ts`, `StyleProfileApplier.test.tsx` | PASS | COVERED |
| CA-07 | Prévia sem salvar; fechar não muda a loja | `StyleProfileCard.test.tsx`, `StyleProfileApplier.test.tsx`, `preview.test.ts` | PASS | COVERED |

**Coverage**: 17/17 critérios das unidades da fila cobertos por teste; RN-08 e as metades de navegador de CA-01, CA-02 e RN-04 vão para a QA real-user.

**H4 (o chip de desconto da sacola)**: a T06 procurou entre `CartDrawer.tsx:267` e `CouponInput.tsx:80-93` e nenhum elemento mostra o desconto com fundo `primary`. Pela própria H4 ("se nenhum tiver fundo `primary`, nada muda e o retorno diz isso"), nada mudou. No Black Friday, dois dos três elementos de RN-01 ficam ouro (selo do cartão e da página do produto, barra do frete grátis).

## Afirmações caducadas na corrida

Nenhuma. Os sete relatórios dizem `Caducou: nenhuma` ou não registram caducidade, e as revisões não acharam afirmação de tarefa fechada tornada falsa.

## Premissas registradas na corrida (raio largo)

- **T01**: nomes do contrato C1 escolhidos pelo molde de `announcements`; o `draft` da prévia com perfil desconhecido é recusado (`null`), não normalizado; o canal tem só `draft` e `ready`.
- **T02**: `ESTRELINHA_PROFILES` como mapa plano, `padrao` = a referência de `ESTRELINHA_COLORS`; o bloco BF declara só o que muda; a camada HSL do shadcn no BF foi ampliada além da lista do R5 (secondary, muted, accent, secondary-foreground); o guarda de dono único não mede hex em `packages/core` (cores de campanha coincidem).
- **T03**: o traço da marca virou `var(--estrelinha-primary-strong, #283A4A)`; quatro testes que fixavam o hex foram atualizados.
- **T04**: `PageSettings.styleProfile` obrigatório e normalizado em `core`; `marcarFaixa` virou `marcarHtml` (faixa e perfil, uma leitura, um dono do cache); `markStyleProfile(html, null)` apaga o atributo herdado.
- **T05**: o aplicador sempre escreve o atributo (inclusive `padrao`); não toca o `<html>` enquanto a configuração carrega; na prévia o rascunho vence, e antes dele vale a regra normal.
- **T06**: sombras como valor arbitrário lendo `--estrelinha-shadow-rgb`/`--estrelinha-ink-rgb`; H4 sem chip (acima).
- **T07**: o botão é o `SettingsSaveButton` ("Salvar alterações", não "Salvar" do Design); `useSettingsSave.salvar` ganhou o 3º argumento opcional de sucesso (H8 sem mudar a frase compartilhada); o palco do modal não usa `useFullscreenStage`.

Pendência de documentação registrada pela T04, para o fecho: `apps/store/CLAUDE.md` (O HTML servido) descreve só o `data-faixa`; o `data-perfil` passou a sair em toda resposta HTML.

## Failures & Fix Tasks

Nenhuma. A reprovação do primeiro `pnpm build` é ambiente (falta de `.env` no worktree), não código; remedida verde.

Sem bugs da QA: `qa/issues/` não existe ainda.

## Overall Verdict

**Status**: PASS

- [x] Todos os testes passam (0 falhas, 5 workspaces)
- [x] Build e lint passam (lint e tipos iguais à baseline, só herdados)
- [x] Todo critério de aceite das unidades da fila está COVERED
- [x] Nenhum critério MISSING ou FAILING; DEFERRED só a prova em navegador (RN-08), que é da QA real-user
- [x] Sem bug aberto da QA

**PASS**: implementação validada → `fase: done`. A prova em navegador (390×844 e 1440×900, nos dois perfis, e CA-02 com rede lenta) fica com a QA real-user.
