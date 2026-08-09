---
id: MED-alt-chega-na-loja
area: MED
title: O alt escrito no backoffice é o que a leitora de tela ouve na loja
persona: Sofia
journey: J-foto-e-alt-do-produto
expected: Na página do produto, o atributo alt da imagem é o texto gravado no jsonb quando preenchido, e o nome do produto só como fallback — não alt={product.name} genérico em todas
entry_points: http://localhost:8080/produto/<slug>
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps: MED-alt-gerado-por-template
---

`PMD-01` AC 10. É a metade da journey que vive na loja: sem ela, o alt gravado no backoffice é dado que
ninguém consome — acessibilidade e SEO pagam a conta.

Sofia usa TalkBack no celular; a verificação é o HTML servido, não a aparência.
