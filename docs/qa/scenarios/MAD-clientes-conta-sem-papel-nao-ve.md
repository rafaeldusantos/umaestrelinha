---
id: MAD-clientes-conta-sem-papel-nao-ve
area: MAD
title: Conta sem papel de admin não vê nenhuma cliente
persona: Cliente com conta da loja
journey: J-achar-uma-cliente
expected: Com sessão válida sem papel, lista e ficha dão a recusa da 72 e nenhum texto de cliente aparece, nem a linha dela mesma; a recusa vence mesmo com a consulta em 500
entry_points: /clientes e /clientes/<id> com conta de cliente
qa_status: pass
bug_ids: BUG-20261024-recusa-com-papel-admin-vira-tempestade-de-requisicoes
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-24-mobile-adm-clientes/
last_report: reports/2026-10-24-mobile-adm-clientes.md
overlaps: MAD-pedidos-conta-sem-papel-nao-ve-pedidos
---

Feature `76` (`MAC-11`, A4. A RLS devolve à conta a linha DELA em customer_list sem erro: conferir que ela não aparece em nenhum instante. Rede caída não é recusa.)
