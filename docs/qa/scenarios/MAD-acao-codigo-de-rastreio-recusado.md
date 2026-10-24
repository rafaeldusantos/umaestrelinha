---
id: MAD-acao-codigo-de-rastreio-recusado
area: MAD
title: Digitar um código curto ou com espaços na folha do rastreio
persona: Adri no celular
journey: J-registrar-material-e-envio
expected: Código com menos de 8 caracteres mostra Confira o código — ele costuma ter 13 caracteres. no campo sem ir à rede; espaços e minúsculas viram o código em maiúsculas sem espaço
entry_points: folha do rastreio → Salvar
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-acoes-do-pedido.md
overlaps: 
---

Feature `75` (`MAA-12`, A8). Garbage: vazio, só espaços, 7 caracteres, colado com espaço no meio e no fim, minúsculas, emoji, 60 caracteres. Conferir na rede que a recusa não gera requisição.
