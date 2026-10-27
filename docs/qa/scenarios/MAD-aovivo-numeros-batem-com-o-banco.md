---
id: MAD-aovivo-numeros-batem-com-o-banco
area: MAD
title: Visitas, Vendas e Conversão batem com o banco nos três períodos
persona: Adri no celular
journey: J-ver-a-loja-ao-vivo
expected: Em Hoje, Ontem e Semana os três cartões mostram store_movement.periodos[p] e a conversão com uma casa em pt-BR (— com zero visitas); a variação segue a régua da spec (vs ontem até as {h}h, vs anteontem, nenhuma na Semana) e nunca é vermelha
entry_points: /ao-vivo
qa_status: untested
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report:
overlaps: MAD-inicio-trocar-periodo
---

Feature `83` (`LAV-51`, `LAV-73`). Comparar com `prova/le-movimento.sql` (begin…rollback). O Visitas de cada período é o mesmo da faixa da Início naquele período. Conversão acima de 100 % aparece como calculada (decisão n — confirmar).
