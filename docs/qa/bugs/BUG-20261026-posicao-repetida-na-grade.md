# BUG-20261026-posicao-repetida-na-grade: Tirar um valor do meio e devolver grava duas variações com a mesma posição

- **Status:** verified
- **Impact (user-side):** Trust-Damage
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri cadastrando peças
- **Journey Step:** J-cadastrar-peca-com-variacoes, acrescentar/remover valor e salvar
- **Scenarios:** PNL-variacoes-salvar-e-reabrir-sem-mudar
- **Found:** 2026-10-26 · **Report:** docs/qa/reports/2026-10-26-opcoes-e-variacoes.md

## Summary

Depois de tirar e devolver um valor, o produto salvo tem duas variações na mesma posição. A ordem da grade (e a ordem dos seletores na loja) passa a depender da ordem em que o banco devolve as linhas.

## Reproduction

- **Charter:** CH-variacoes-cadastrar-pecas-repetidas · **Tour:** Data
- **Environment:** painel em `pnpm dev:backoffice` (:8083), Supabase local, Chromium (Playwright), pt-BR

1. Novo produto, opção Aro com 16, 17, 18 e Cor com Folheado a Prata e Folheado a Ouro (6 linhas).
2. Remover o valor 18 e acrescentar 18 de novo.
3. Salvar rascunho e ler `product_variants.position` no banco.

**Expected:** posições únicas (0..5).
**Actual:** posições 0, 1, 3, 4, 4, 5 (duas linhas em 4, buraco em 2).

## Evidence

- consulta SQL no banco local (relatório, sessão 1)

## Fix

- **Root cause:** `syncGrid` dava à linha nova `position = linhas que ficaram + índice`; quando sai uma linha do meio, as que ficam guardam posições acima dessa contagem e a nova colide.
- **Fix commit:** working tree, sem commit (`gridSync.ts`: a nova vai depois da maior posição que ficou; as que ficam continuam o mesmo objeto, OPV-03).
- **Regression test:** `apps/backoffice/src/features/product-form/model/gridSync.test.ts` › "tira um valor do meio do cruzamento e devolve: as posições continuam únicas" — reprovou antes (5 posições distintas em 6), passa depois. A fixture de um caso antigo (duas linhas em 0) ganhou as posições 0 e 1 que a grade gravada tem; a asserção dele (`[2, 3]`) não mudou.

## Verification

- **Retested:** 2026-10-26 por teste de unidade e pela página real (`AdminProductFormPage.variacoes.test.tsx`, 18 verdes). O produto de teste do banco foi apagado; produtos salvos antes do conserto com posição repetida continuam assim até a próxima edição da grade.

## Retest 2026-10-26

Retestado em navegador (390 × 844 e 1440 × 900, fonte 200 % no 390) contra o bundle servido do working tree: passa. Relatório: `reports/2026-10-26-opcoes-e-variacoes-reteste.md`.
