---
id: MAD-cliente-bloco-de-pedidos-falha
area: MAD
title: Os pedidos falham sem derrubar a ficha
persona: Adri no celular
journey: J-ver-uma-cliente
expected: Falha na leitura dos pedidos mostra Não consegui carregar os pedidos. + Tentar de novo só no bloco; cabeçalho, números e contato seguem; falha dos itens deixa as linhas sem o item
entry_points: /clientes/<id> com rede ruim
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-clientes.md
overlaps: MAD-pedido-bloco-secundario-falha
---

Feature `76` (`MAC-18`, `MAC-22`. Cortar só order_items; cortar só orders; sem rede na releitura por foco.)
