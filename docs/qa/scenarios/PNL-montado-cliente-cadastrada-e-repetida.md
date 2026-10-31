---
id: PNL-montado-cliente-cadastrada-e-repetida
area: PNL
title: Escolher cliente cadastrada e recusar e-mail repetido
persona: Adri montando uma venda
journey: J-montar-pedido-para-a-cliente
expected: Buscar cliente preenche contato e endereços; Cliente nova com e-mail já existente oferece a ficha existente e nunca cria uma segunda
entry_points: /admin/pedidos/montar
qa_status: pass
bug_ids: 
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-31-pedido-montado.md
overlaps: 
---

MON-02, MON-03. Conferir em customers que só há uma ficha por lower(trim(email)); testar com espaço e maiúscula.
