---
id: MAD-cliente-pedidos-batem-com-o-total
area: MAD
title: Os pedidos da ficha somam orders_total, inclusive a convidada
persona: Adri no celular
journey: J-ver-uma-cliente
expected: Para qualquer pessoa, os pedidos listados (com Ver mais pedidos) são tantos quantos orders_total; mais que 20 mostra Pedidos · total e o botão; ordem do mais recente ao mais antigo; cada linha tem número, primeiro item, data, total e situação
entry_points: /clientes/<id> → Ver mais pedidos
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence: evidence/76-clientes/sessao.json
last_report: reports/2026-10-24-mobile-adm-clientes.md
overlaps: 
---

Feature `76` (`MAC-18`, `MAC-19`, A10. Fixtura da convidada com 22 pedidos: 20 → 22 e o botão some. Os itens vêm de uma leitura por janela; se falha, linhas sem item.)
