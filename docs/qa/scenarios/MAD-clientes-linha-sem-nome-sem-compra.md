---
id: MAD-clientes-linha-sem-nome-sem-compra
area: MAD
title: Linha de quem não tem nome ou nunca pagou
persona: Adri no celular
journey: J-achar-uma-cliente
expected: Sem nome a linha usa o e-mail e a inicial dele; só espaços conta como sem nome; sem compra paga diz Sem compra paga ainda e R$ 0
entry_points: /clientes
qa_status: pass
bug_ids: 
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-24-mobile-adm-clientes/sessao-colar.txt
last_report: reports/2026-10-24-mobile-adm-clientes-achar-quem-me-escreveu.md
overlaps: 
---

Feature `76` (Edge cases da `76`. Também: pessoa anonimizada aparece como a view devolve; duas contas com o mesmo e-mail são duas linhas.)

Rodada 1 (CH-clientes-achar-quem-me-escreveu, 2026-10-24): Sem nome e só espaços usam o e-mail; sem compra paga diz Sem compra paga ainda e R$ 0.
