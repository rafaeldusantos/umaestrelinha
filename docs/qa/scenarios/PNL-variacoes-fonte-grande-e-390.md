---
id: PNL-variacoes-fonte-grande-e-390
area: PNL
title: Usar a aba em 390 com a fonte a 130 % e 200 %
persona: Adri cadastrando peças
journey: J-cadastrar-peca-com-variacoes
expected: Nenhuma rolagem horizontal do body e alvos >= 44 px nos controles da feature
entry_points: /admin/produtos/novo; /admin/produtos/:id/editar
qa_status: pass
bug_ids: BUG-20261026-aba-de-precos-rola-com-fonte-grande;BUG-20261026-alvos-pequenos-no-editor-de-opcoes
fix_status: fixed
retest_status: pass
fix_commits: working tree, sem commit
evidence: evidence/2026-10-26-opcoes-e-variacoes/81qa-fonte-200-390.png;evidence/2026-10-26-opcoes-e-variacoes/81qa-reteste-fonte-200-390.png;evidence/2026-10-26-opcoes-e-variacoes-reteste/R9-conjunto-longo-200pct-390.png
last_report: reports/2026-10-26-opcoes-e-variacoes-reteste.md
overlaps:
---

OPV-28. 200 %: body em 466 px antes, 390 depois. Os alvos pequenos do editor (chip 16 px, mover 24 px) são anteriores à 81 e esperam decisão de desenho.

Reteste 2026-10-26: 200 % em 390, produto novo e produto de 28 fotos: scrollWidth 390. Paper cut: a 200 % o botão de conjunto fica com 96 px de largura (aninhamento de cartões) e embrulha palavra por palavra.
