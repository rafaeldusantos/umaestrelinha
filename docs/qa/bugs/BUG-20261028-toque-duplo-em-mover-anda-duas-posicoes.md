# BUG-20261028-toque-duplo-em-mover-anda-duas-posicoes: um toque duplo em "Mover para cima/baixo" anda o item duas casas

- **Status:** verified
- **Impact (user-side):** Friction
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri montando o menu
- **Journey Step:** J-montar-o-menu-da-loja, reordenar pelo ⋯ (caminho de toque)
- **Scenarios:** PNL-menu-reordenar-no-celular-sem-arraste; PNL-menu-conflito-entre-janelas
- **Found:** 2026-10-28 · **Report:** reports/2026-10-28-backoffice-menu-montado-pela-dona.md

## Summary

**Da `86`.** No celular o caminho para reordenar é ⋯ → "Mover para cima/baixo". Um toque duplo (comum quando o
celular demora a responder) aplica o movimento **duas vezes**: o item pula duas posições e as duas gravações vão ao
banco ("Salvo"). Não perde nada e se desfaz, mas a dona vê o item num lugar que não escolheu. Reproduzido 3 vezes,
em 1440 e em 390. Toque duplo em "Adicionar" e em "Remover do menu" (confirmação) **não** duplica — só o Mover.

## Reproduction

- **Charter:** CH-menu-duas-janelas-e-toque-duplo · **Tour:** Multi-Tab Tour
- **Environment:** 1440 × 900 e 390 × 844, painel dev, Supabase local

1. `/admin/menu` com 5 itens; ⋯ de "Nomes" (5º).
2. Duplo clique em "Mover para cima".

**Expected:** "Nomes" sobe uma posição (5º → 4º).
**Actual:** sobe duas (1440: 5º → 3º; 390: 3º → 1º). O banco confirma a ordem nova.

## Evidence

- Relatório, sessão 4 (ordens antes/depois nas duas larguras).

## Correção

- **Rodada:** correções do QA r1 da `86` (2026-10-29), sem commit.
- **O quê / onde:** `AdminMenuPage.tsx`: `mover` com trava em `ref` (o segundo toque pode chegar antes do re-render) e `MenuTree` com `moverDesabilitado={saving === 'saving'}` — "Mover para cima/baixo" do ⋯, as setas do submenu e o arraste ficam desabilitados enquanto a gravação está no ar.
- **Teste que prova:** `AdminMenuPage.test.tsx`, "Q04 — toque duplo em Mover anda uma casa só" (2 casos, com a escrita pendurada; vermelhos antes): uma gravação só e a ordem andando uma casa.


## Verification

- **Retested:** 2026-10-29, mesma persona/jornada (rodada 2) · **Report:** reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste.md
- **Result:** Duplo clique em "Mover para cima/baixo": em 390 três vezes, uma posição cada (4→3, 3→2, 2→1); em 1440 pelo mouse real, uma posição e **um** PATCH; o segundo clique, que cai sobre a linha vizinha depois que o menu fecha, não alterna a chave dela. Mover com PATCH 500: volta à posição; o Mover seguinte não fica travado (anda e grava).
