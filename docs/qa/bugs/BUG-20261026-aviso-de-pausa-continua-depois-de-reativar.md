# BUG-20261026-aviso-de-pausa-continua-depois-de-reativar: O aviso de pausa continua nomeando a variação depois que ela é religada

- **Status:** consertado (2026-10-26, working tree, sem commit)
- **Impact (user-side):** Trust-Damage
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri cadastrando peças
- **Journey Step:** J-cadastrar-peca-com-variacoes, remover valor vendido
- **Scenarios:** PNL-variacoes-remover-valor-vendido-pausa
- **Found:** 2026-10-26 · **Report:** docs/qa/reports/2026-10-26-opcoes-e-variacoes-reteste.md

## Summary

O aviso novo (decisão de 2026-10-26) manda: "para vender de novo, ligue “Ativa” na linha da grade".
Ela liga, a linha fica ativa, e o aviso continua dizendo "Estas variações já foram vendidas e ficaram
pausadas: Folheado a Ouro." — o texto contradiz a grade logo abaixo, e só sai recarregando a página.

## Reproduction

- **Charter:** CH-variacoes-cadastrar-pecas-repetidas · **Tour:** Data
- **Environment:** painel em `pnpm dev:backoffice` (:8083), Supabase local, Chromium (Playwright), 390 × 844, pt-BR

1. Abrir `/admin/produtos/a789c7aa-a82e-4b84-a4eb-8f07bb2b4f31/editar` → Preços & variações (a linha "Folheado a Ouro" tem 1 pedido).
2. Remover o valor "Folheado a Ouro" → a linha fica pausada e o aviso aparece.
3. Ligar "Ativa" na linha.

**Expected:** o aviso nomeia só as que ainda estão pausadas; sem nenhuma, some.
**Actual:** o aviso continua com "ficaram pausadas: Folheado a Ouro." ao lado da linha ligada.

## Evidence

- `docs/qa/evidence/2026-10-26-opcoes-e-variacoes-reteste/R3-frase-da-pausa-390.png` (o aviso)
- `docs/qa/evidence/2026-10-26-opcoes-e-variacoes-reteste/R3-reativada-sem-aviso-390.png` (depois do conserto)

## Resolução

**Status: consertado** em 2026-10-26.

- **Root cause:** o aviso guardava só os rótulos das pausadas (`pausedOrphans`) e nunca perguntava à
  grade de agora se aquelas linhas continuavam pausadas.
- **Fix:** `features/product-form/model/orphans.ts` ganhou `mergePausedIds` (os ids por trás de cada
  rótulo) e `stillPausedLabels` (o rótulo só aparece se uma das linhas dele está na grade e pausada);
  a página (`AdminProductFormPage.tsx`) desenha o aviso pelos rótulos filtrados. `mergePausedLabels` e
  o literal do aviso não mudaram. Desligar de novo à mão faz o aviso voltar a nomeá-la (ela continua
  sendo a vendida que saiu das opções).
- **Regression test:** `AdminProductFormPage.variacoes.test.tsx` › "ligar \"Ativa\" na linha vendida,
  como o aviso manda, tira a linha do aviso" — vermelho antes (recebido "…pausadas: 3,5 cm, 5,5 cm."),
  verde depois; mais três casos de unidade em `orphans.test.ts`.
- **Retested:** em navegador, 390: remover o valor vendido → aviso; ligar "Ativa" → aviso some.
