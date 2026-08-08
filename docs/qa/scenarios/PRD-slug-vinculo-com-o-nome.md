---
id: PRD-slug-vinculo-com-o-nome
area: PRD
title: O slug segue o nome até ser editado à mão, e a tela avisa quando o vínculo rompe
persona: Nana
journey: J-mudar-url-sem-quebrar-link
expected: Mudar o nome antes de tocar no slug regera o slug; depois de editar o slug à mão, mudar o nome não altera mais a URL — e a tela informa isso
entry_points: http://localhost:8081/admin/produtos/novo
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

`PFM-02`/`PFM-04` (P1.5 AC 2-3). O silêncio é o risco: se o vínculo romper sem aviso, a lojista renomeia
o produto, acha que a URL acompanhou, divulga a URL antiga e ela não existe. Com o toggle de 301
desligado (AC 10), nenhum registro é criado — escolha consciente, não surpresa.
