---
id: CHK-recarrega-nao-duplica-pedido
area: CHK
title: Recarregar no meio do checkout não cria um segundo pedido pending
persona: Rui
journey: J-compra-pix-celular
expected: Depois do reload, o order_id em curso volta do sessionStorage e o CTA reusa o mesmo pedido
entry_points: http://localhost:8080/checkout
qa_status: untested
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report:
overlaps: 
---

O rascunho e o `order_id` vivem em **sessionStorage**. Sem isso, um reload criaria pedido pending novo
a cada tentativa — lixo no painel do MP e risco de cobrança dupla.

Prova no banco: `SELECT count(*) FROM orders WHERE payment_status='pending'` antes e depois do reload.
