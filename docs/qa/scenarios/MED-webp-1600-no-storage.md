---
id: MED-webp-1600-no-storage
area: MED
title: Todo WebP gravado no Storage tem no máximo 1600 px no maior lado
persona: Nana
journey: J-foto-e-alt-do-produto
expected: Uma imagem de 3 MB aceita é convertida para WebP com no máximo 1600 px no maior lado, verificável no arquivo servido por /storage/v1/object/public/product-images/
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

`PMD-02` AC 5. Eram 1200 px — pequeno demais para o zoom de uma vitrine que vende detalhe de estampa. A
verificação é no **arquivo**, não na tela: baixar o objeto do Storage e medir.
