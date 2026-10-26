---
id: PNL-variacoes-linha-nasce-ativa-com-padroes
area: PNL
title: Acrescentar valores e ver as linhas nascerem ativas com os padrões
persona: Adri cadastrando peças
journey: J-cadastrar-peca-com-variacoes
expected: Cada valor acrescentado cria no mesmo gesto as linhas novas, ativas, com preço, preço "de" e peso padrão, sem clicar em gerar
entry_points: /admin/produtos/novo; /admin/produtos/:id/editar
qa_status: pass
bug_ids: 
fix_status: 
retest_status: 
fix_commits: 
evidence: evidence/2026-10-26-opcoes-e-variacoes/81qa-grade-6-390.png;evidence/2026-10-26-opcoes-e-variacoes/81qa-grade-6-1440.png
last_report: reports/2026-10-26-opcoes-e-variacoes-reteste.md
overlaps:
---

OPV-01, OPV-02, OPV-03. Peso padrão em gramas: o peso digitado depois só vale para as linhas criadas depois (spec, Out of Scope).

Reteste 2026-10-26: 89,90 / 120,00 / 50 g → 16, 17, 18 ativas com 89,90 · 120,00 · 50 · estoque 0; segunda opção por conjunto → 6 linhas ativas, 17·Prata mantém 99,00.
