---
id: MAD-clientes-bate-com-o-painel
area: MAD
title: A contagem e as pessoas de cada recorte batem com /admin/clientes
persona: Adri no celular
journey: J-achar-uma-cliente
expected: No mesmo banco, Todas, Compraram mais de uma vez e Com pedido em aberto dão a mesma contagem do painel (Voltaram) e do SQL de customer_list
entry_points: /clientes; /admin/clientes
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence: evidence/76-clientes/sessao.json
last_report: reports/2026-10-24-mobile-adm-clientes.md
overlaps: MAD-clientes-recortes-e-selo
---

Feature `76` (`MAC-08`, `MAC-09`, `MAC-23`, `MAC-24`. Para o em aberto, o painel não tem visão equivalente: comparar com select count(*) from customer_list where orders_open >= 1 (probe).)
