---
id: PNL-menu-conflito-entre-janelas
area: PNL
title: Duas janelas editam o menu ao mesmo tempo
persona: Adri montando o menu
journey: J-montar-o-menu-da-loja
expected: A segunda gravação é recusada com O menu mudou em outra janela — recarregue, o documento local volta, e nada da primeira janela é sobrescrito
entry_points: /admin/menu aberto em duas abas
qa_status: pass
bug_ids: BUG-20261028-toque-duplo-em-mover-anda-duas-posicoes
fix_status: 
retest_status:
fix_commits:
evidence: evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-08-conflito-aba-b-1440.png
last_report: reports/2026-10-28-backoffice-menu-montado-pela-dona.md
overlaps: 
---

Feature `86`. MNM-37. Nunca provado em navegador (prova-navegador: só probe e suíte). Conferir o banco depois. Também: duas ações rápidas na MESMA aba (fila serializada) não podem virar conflito falso.
