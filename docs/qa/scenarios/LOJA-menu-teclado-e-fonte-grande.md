---
id: LOJA-menu-teclado-e-fonte-grande
area: LOJA
title: Navegar pelo menu com teclado e com fonte 200 %
persona: Cliente navegando pelo menu
journey: J-navegar-pelo-menu-da-loja
expected: No notebook o mega menu abre, percorre e fecha por teclado (Esc volta o foco ao item); no celular a 200 % a folha é legível e o body não rola de lado por causa do menu
entry_points: http://localhost:8082/ 1440 teclado; 390 com html { font-size: 200% }
qa_status: fail
bug_ids: BUG-20261027-rodape-da-loja-rola-de-lado-com-fonte-200
fix_status: pending
retest_status: failed
fix_commits:
evidence: evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-20-loja-folha-390-fonte200.png
last_report: reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste.md
overlaps: 
---

Feature `86`. Re-found possível: o cabeçalho da loja a 390/200 % ainda rola (BUG-20261027-rodape-da-loja-rola-de-lado-com-fonte-200, anterior à 86) — atualizar esse bug, não abrir outro, se o sintoma for o mesmo.
