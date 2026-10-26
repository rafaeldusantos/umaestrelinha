---
id: PNL-variacoes-modal-com-muitas-fotos
area: PNL
title: Abrir o modal num produto com 28 fotos no celular
persona: Adri cadastrando peças
journey: J-cadastrar-peca-com-variacoes
expected: O título e "Usar a principal" ficam na tela e a lista rola por dentro
entry_points: /admin/produtos/novo; /admin/produtos/:id/editar
qa_status: pass
bug_ids: BUG-20261026-modal-de-imagem-passa-da-tela
fix_status: fixed
retest_status: pass
fix_commits: working tree, sem commit
evidence: evidence/2026-10-26-opcoes-e-variacoes/81qa-bug-modal-28-imagens-390.png;evidence/2026-10-26-opcoes-e-variacoes/81qa-reteste-modal-28-100-390.png;evidence/2026-10-26-opcoes-e-variacoes/81qa-reteste-modal-28-200-390.png;evidence/2026-10-26-opcoes-e-variacoes-reteste/R7-modal-28-fotos-390-fim.png
last_report: reports/2026-10-26-opcoes-e-variacoes-reteste.md
overlaps:
---

OPV-12, OPV-28. Antes: modal de 1320 px centrado, topo em −239 px, sem rolagem.

Reteste 2026-10-26: fdc81401 (28 fotos) em 390 — caixa 16 → 828, título em 41, "Usar a principal" em 101, rola por dentro (1320/810), "Adicionar imagens" 340 × 44 alcançável; a 200 % caixa 32 → 812.
