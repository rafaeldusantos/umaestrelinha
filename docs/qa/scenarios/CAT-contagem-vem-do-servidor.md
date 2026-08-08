---
id: CAT-contagem-vem-do-servidor
area: CAT
title: A contagem de produtos por categoria é resolvida no servidor e bate com o banco
persona: Nana
journey: J-organizar-categorias
expected: Cada categoria mostra a contagem de produtos, o número bate com a contagem no banco, e a rede mostra consulta agregada — não um select('*') do catálogo para somar no cliente
entry_points: http://localhost:8081/admin/categorias
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

`RFN-09` AC 2. Somar no cliente exigiria ler o catálogo inteiro — exatamente o defeito que a `13` matou na
listagem de produtos. Tela nova (commit `1bee074` + migration `20260801150000`), então tudo aqui é
superfície nova.
