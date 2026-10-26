# BUG-20261026-modal-de-imagem-passa-da-tela: No celular, o modal de imagem da variação perde o topo num produto com muitas fotos

- **Status:** verified
- **Impact (user-side):** Blocks-Completion
- **Severity:** High · **Priority:** P1
- **Persona Affected:** Adri cadastrando peças
- **Journey Step:** J-cadastrar-peca-com-variacoes, modal de imagem
- **Scenarios:** PNL-variacoes-modal-com-muitas-fotos
- **Found:** 2026-10-26 · **Report:** docs/qa/reports/2026-10-26-opcoes-e-variacoes.md

## Summary

Num produto com as 28 fotos do maior produto do catálogo, abrir a imagem de uma variação em 390 × 844 mostra o meio da lista: o título e "Usar a principal" ficam acima da tela, e o modal não rola. A Adri não consegue voltar a variação para a foto principal.

## Reproduction

- **Charter:** CH-variacoes-cadastrar-pecas-repetidas · **Tour:** Data
- **Environment:** painel em `pnpm dev:backoffice` (:8083), Supabase local, Chromium (Playwright), pt-BR

1. Abrir `/admin/produtos/fdc81401-a839-4ec0-bc82-958c5133bf1b/editar` (Pingente Complementar, 28 fotos) em 390 × 844.
2. Aba Preços & variações → tocar no botão de imagem da primeira linha.

**Expected:** o modal cabe na tela e a lista de fotos rola por dentro, com o título e "Usar a principal" alcançáveis.
**Actual:** o modal mede 1320 px, centrado por `translate`: topo em −239 px, título em −214 px, e nenhuma rolagem (`scrollHeight` = `clientHeight`). A 200 % de fonte o mesmo acontece com 2 fotos.

## Evidence

- `docs/qa/evidence/2026-10-26-opcoes-e-variacoes/81qa-bug-modal-28-imagens-390.png` (antes)
- `docs/qa/evidence/2026-10-26-opcoes-e-variacoes/81qa-reteste-modal-28-100-390.png`, `81qa-reteste-modal-28-200-390.png` (depois)

## Fix

- **Root cause:** o `DialogContent` compartilhado não tem altura máxima, e o do seletor não pedia uma; com conteúdo maior que a viewport, o centro fica no meio e o topo sai da tela.
- **Fix commit:** working tree, sem commit (`VariantImagePicker.tsx`: `max-h-[calc(100dvh-2rem)] overflow-y-auto`).
- **Regression test:** `apps/backoffice/src/features/product-form/ui/VariantImagePicker.test.tsx` › "tem altura máxima da viewport e rola por dentro" — reprovou antes, passa depois.

## Verification

- **Retested:** 2026-10-26 · 390 a 100 %: caixa 16 → 828, título em 41, "Adicionar imagens" alcançável depois de rolar (803); a 200 %: 32 → 812. Sem rolagem horizontal.

## Retest 2026-10-26

Retestado em navegador (390 × 844 e 1440 × 900, fonte 200 % no 390) contra o bundle servido do working tree: passa. Relatório: `reports/2026-10-26-opcoes-e-variacoes-reteste.md`.
