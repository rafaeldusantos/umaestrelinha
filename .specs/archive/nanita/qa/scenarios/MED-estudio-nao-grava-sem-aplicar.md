---
id: MED-estudio-nao-grava-sem-aplicar
area: MED
title: Fechar o estúdio sem aplicar não deixa rastro no Storage nem em images
persona: Nana
journey: J-foto-e-alt-do-produto
expected: O estúdio abre em ~1360 px em três colunas (origem/palco/ajustes) com filmstrip, camadas e controle de saída; compor 4 renders, ajustar escala, Aplicar a todos e fechar SEM aplicar não grava nada no Storage nem em products.images
entry_points: http://localhost:8081/admin/produtos/:id/editar
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

`PMD-05` (P3.1 AC 1-3, 7-8). O estúdio rodava num dialog de 768 px — aprovar um render de 1600 px num
palco de thumb é decidir no escuro.

"Nada é salvo antes de você aplicar" é promessa escrita no rodapé da tela; se o composto vaza para o
Storage ao fechar, a promessa é falsa e o bucket acumula lixo invisível. Conferir o bucket, não a tela.
