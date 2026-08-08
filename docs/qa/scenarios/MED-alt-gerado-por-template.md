---
id: MED-alt-gerado-por-template
area: MED
title: Gerar alt-text é template determinístico, sem nenhuma chamada de rede
persona: Nana
journey: J-foto-e-alt-do-produto
expected: Tile com alt vazio mostra "faltando" e a ação Gerar; Gerar produz "<nome do produto> — <rótulo>" e marca "gerado automaticamente" sem nenhuma requisição de rede; com produto ainda sem nome a ação fica desabilitada em vez de gerar string vazia
entry_points: http://localhost:8081/admin/produtos/:id/editar
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps: MED-alt-chega-na-loja
---

`PMD-01` (P2.4 AC 1-2) com `A20`/`AD-011`: os artboards dizem "Gerar" e "Alt gerado automaticamente",
**nunca** "com IA". Uma requisição de rede durante o `Gerar` é achado — significaria provedor de IA não
declarado no projeto.

Determinístico é verificável: gerar duas vezes dá a mesma string.
