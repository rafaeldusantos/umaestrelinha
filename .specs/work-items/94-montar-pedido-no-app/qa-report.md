# WI 94 — Montar pedido no app do ateliê — Validation Report

**Date**: 2026-11-08
**Run by**: Validation (Dev), pelo orquestrador
**Source**: `prd.md` + `spec.md` + os `Pronto quando` de `tasks/01..10`
**Worktree**: `store-worktrees/store__feature-94`, branch `feature/94`; conjunto medido depois dos commits `35d427e5` e `09b5b575`, as duas correções desta Validation

---

## Test Results

Um workspace por vez, `pnpm --filter @estrelinha/<ws> test --testTimeout=20000`, código de saída capturado fora de pipe.

| Workspace | Arquivos | Testes | Exit |
| --- | --- | --- | --- |
| core | 229 passed (229) | 5510 passed (5510) | 0 |
| functions | 41 passed (41) | 1566 passed (1566) | 0 |
| mobile-adm | 167 passed (167) | 2655 passed (2655) | 0 |
| backoffice | 288 passed (288) | 5183 passed (5183) | 0 |
| store | 378 passed (378) | 7091 passed (7091) | 0 |

**Summary**: 21.005 passed, 0 failed, 0 skipped, em 1.103 arquivos. O catalog-import não foi tocado pela fila e não foi medido.

## Build & Lint

**Build**: PASS — `pnpm build` com 3/3 apps. A primeira execução reprovou a loja com `[vite:build-html] URI malformed` no `apps/store/index.html`. A causa é do ambiente: o worktree não tem o `.env` da loja (não versionado), então `%VITE_SUPABASE_URL%` fica cru. O WI não tocou `index.html` nem `vite.config.ts`. Com as envs locais no shell (`VITE_SUPABASE_URL=http://127.0.0.1:54441` …), passa, e passou de novo depois da segunda correção.

**Tipos** (`npx tsc --noEmit`):

| Projeto | Erros | Leitura |
| --- | --- | --- |
| store | 0 | — |
| backoffice | 7 | todos em `ProposalStateBadge.test.tsx`, do commit `4c6e9a16`, anterior ao WI (ancestral de `ff5b1ba7`): pré-existentes |
| mobile-adm | 0 | — |
| store `tsconfig.server.json` | 0 | — |
| catalog-import | 0 | — |
| packages/core | 11 | os 11 herdados da baseline |

**Lint** (`npx eslint .` por app):

| App | Medido | Leitura |
| --- | --- | --- |
| store | 2/2 | igual à baseline |
| backoffice | 23/5 | igual à baseline |
| mobile-adm | 0/0 | a primeira medição deu 1/0: `no-irregular-whitespace` em `montarPedido.pecas.test.tsx:110`, da T07, corrigido em `35d427e5` |

## Acceptance Criteria Coverage

| ID | Critério (PRD) | Teste | Result | Status |
| --- | --- | --- | --- | --- |
| UC-01 | "Montar pedido" em Pedidos, a visão "Montados · N abertos" ao fim dos chips, o cartão (estado, cliente, prazo, total, peças) | `pages/__tests__/pedidosMontados.test.tsx`, `entities/order/model/__tests__/pedidosHref.test.ts`, `widgets/tab-bar/__tests__/*`, `order-proposals/__tests__/handlers.test.ts` (`list` com `lines`/`agora`) | PASS | COVERED |
| UC-02 | Montagem em tela cheia em 4 passos, a barra com o total e o motivo do bloqueio, o voltar do Android, a confirmação de fechar, o rascunho só de peças e descontos | `montarPedido.test.tsx`, `montarPedido.rascunho.test.tsx`, `rascunhoSemDadoDaCliente.test.ts`, `rascunhoComDonoUnico.test.ts`, `semDadoDeClienteNoAparelho.test.ts` | PASS | COVERED |
| UC-03 | Cliente cadastrada: a busca por nome, e-mail ou telefone, o endereço padrão ou outro salvo, "Outro endereço", "A cliente preenche no link" | `montarPedido.test.tsx`, `montagemComClientReal.test.tsx`, `leituraSoComPapel.test.ts` | PASS | COVERED |
| UC-04 | Cliente nova: contato e entrega, "Salvar no cadastro", o e-mail que já tem ficha, o CEP que completa ou não acha; CPF e endereço gravados no cadastro | `montarPedido.test.tsx`, `semDadoSensivelDeClienteNoApp.test.ts`, `linkSempreSchema.test.ts`, `probes/01-link-e-endereco.sql` | PASS | COVERED |
| UC-05 | Ler os dados de uma mensagem (IA): os dois modos, as marcas, o aviso "Preenchi N de M", o CEP que manda, "Desfazer", fora do ar e o limite | `montarPedido.colarTexto.test.tsx`, `montagem.desfazer.test.ts`, `customer-parse/__tests__/handlers.test.ts`, `core/customers/__tests__/{parse,mergeCep}.test.ts`, `claudeSoNaPorta.test.ts` | PASS | COVERED |
| UC-06 | Peças: a busca, a folha da variação (foto, chips, **promoção vigente**, teto de estoque, gravação, material), a sacola com a foto e a etiqueta de promoção | `montarPedido.pecas.test.tsx`, `montarPedido.promocao.test.tsx` (novo), `core/product-search/__tests__/*`, `core/proposals/__tests__/{photo,piece}.test.ts` | PASS | COVERED (a promoção foi MISSING na primeira medição e corrigida em `09b5b575`) |
| UC-07 | Descontos: o cupom com as regras da loja, o combinado com motivo, a recusa de zerar e o resumo vivo com o PIX | `montarPedido.descontos.test.tsx`, `order-proposals/__tests__/handlers.test.ts` (`preview`) | PASS | COVERED |
| UC-08 | Revisar: os blocos com "Alterar", a cotação, a observação, "Criar link" e o preço que mudou | `montarPedido.revisar.test.tsx`, `escritaSoPelaPorta.test.ts` | PASS | COVERED |
| UC-09 | Pedido montado: o link sempre, WhatsApp e Copiar, "Link enviado", a observação, Editar e Cancelar, Renovar só depois de vencer e "Gerar link novo" sem cifra | `pedidosMontados.test.tsx`, `montadosComClientReal.test.tsx`, `core/proposals/__tests__/{state,link}.test.ts`, `order-proposals/__tests__/handlers.test.ts` (`get`/`renew`) | PASS | COVERED |
| UC-10 | Backoffice: o link sempre, Renovar só depois de vencer e o endereço salvo pela function | `AdminProposalPage.test.tsx`, `AdminProposalBuilderPage.test.tsx`, `CustomerAddress.test.tsx`, `pedidoMontadoSchema.test.ts`, `probes/02-foto-e-link-pela-function.mjs` | PASS | COVERED |

**Coverage**: 10/10 unidades de escopo cobertas (100%). Nenhuma DEFERRED.

**O que só o navegador prova** (jsdom devolve 0 para layout) fica para a QA: alvo de 44 px, nenhuma rolagem lateral em 390 a 100, 130 e 200 %, a barra fixa, o gesto real de voltar do Android, o teclado nas folhas e o `localStorage` do rascunho no PWA instalado.

## Afirmações caducadas na corrida

| Tarefa fechada | A afirmação | Quem a tornou falsa | Ainda verdadeiro no comportamento? |
| --- | --- | --- | --- |
| T05 | o CEP achado sobrescreve rua, bairro, cidade e UF do formulário | T06 (decisão 9): o efeito de CEP passou a juntar por `mergeCep`, e o CEP de cidade (sem rua) deixa de apagar a rua escrita | sim, UC-04 COVERED; o caso do CEP de cidade digitado à mão não tem teste próprio |
| T07 | a etiqueta de promoção fica para a 08 | a 08 não a fez; corrigida na Validation (`09b5b575`) | sim, agora COVERED |
| T07, T08, T09 | `apps/mobile-adm/CLAUDE.md` diz "Os passos 2 a 4 têm só o esqueleto" | a T10, dona do arquivo pelo `waves.md`, o atualizou | sim |
| T10 | a linha *Lint* das baselines com mobile-adm 1/0 | o conserto da Validation (`35d427e5`) a devolveu a 0/0 | sim |
| T01 | `core/pricing` não sobe no Deno local (os dois CLAUDE.md) | já era falso antes do WI; a T01 corrigiu os dois arquivos | sim |

## Failures & Fix Tasks

Nenhuma fix task nova: as duas falhas foram corrigidas pelo wi-impl-task da tarefa responsável, em `modo: corrigir`, sob a autorização do humano para o WI.

### Failure 1: lint do mobile-adm

**File**: `apps/mobile-adm/src/pages/__tests__/montarPedido.pecas.test.tsx:110` · **Classification**: config-issue (lint)
**Root cause**: um NBSP literal numa regex (`no-irregular-whitespace`), da T07 · **Fix**: o escape ` `, commit `35d427e5`

### Failure 2: UC-06, a promoção vigente

**File**: `FolhaDaVariacao.tsx`, `PassoDasPecas.tsx` · **Classification**: test-missing / bug-logic
**Root cause**: a T07 deixou a etiqueta para a T08 por causa do D-02, e a T08 não a desenhou · **Fix**: a prévia diz qual promoção valeu por linha, e o passo 2 a mostra; commit `09b5b575`

## Overall Verdict

**Status**: PASS

- [x] Todos os testes passam (0 falhas)
- [x] Build e lint passam, sem regressão contra a baseline; os 7 erros de tipo do backoffice são pré-existentes
- [x] Todo critério de aceite das unidades de escopo que a fila cobre está COVERED
- [x] Nenhum critério está MISSING ou FAILING
- [x] Não há bug aberto da QA (`qa/issues/` não existe)

---

## Re-Validation 2 — correções da QA, rodada 1 (2026-11-08)

**Conjunto medido**: `feature/94` em `e8b20c6c`, depois das 13 fix tasks (T11–T23, BUG-001..BUG-020), cada uma implementada, revisada e commitada só com os próprios arquivos (`ea9fab54` … `e8b20c6c`). Todas com `**Status:** done`. As correções tocaram **só `apps/mobile-adm`** (39 arquivos, +1925/−199); a suíte da loja entrou no gate porque os guardas dela varrem `apps/mobile-adm`.

| Medida | Resultado | Exit |
| --- | --- | --- |
| Tipos `apps/mobile-adm/tsconfig.app.json` | 0 erros | 0 |
| Lint `apps/mobile-adm` (`npx eslint .`) | 0/0 | 0 |
| Testes mobile-adm (`--testTimeout=20000`) | 174 arquivos · **2713** passed (eram 2655/167: +58/+7 dos testes das correções) | 0 |
| Testes store (`--testTimeout=20000`) | 378 arquivos · **7091** passed (idêntico à rodada 1) | 0 |
| Build mobile-adm | verde (`dist/sw.js` gerado) | 0 |

Core, functions e backoffice não foram tocados pelas fix tasks e não foram remedidos (valem os números da rodada 1).

**Verdict**: **PASS**. Os bugs continuam com o `status` que a triagem deu: o reteste de BUG-001..BUG-020 é da rodada de confirmação da QA.
