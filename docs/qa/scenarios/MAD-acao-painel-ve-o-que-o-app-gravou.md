---
id: MAD-acao-painel-ve-o-que-o-app-gravou
area: MAD
title: Conferir no painel o que foi registrado no celular
persona: Adri no celular
journey: J-registrar-material-e-envio
expected: Depois de cada ação no celular, /admin/pedidos/<id> recarregado mostra o mesmo status, material, rastreio, histórico e e-mails que o app, e a Início e o selo da aba refletem a mudança
entry_points: app /pedidos/<id> → ação; painel /admin/pedidos/<id>
qa_status: untested
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report:
overlaps: 
---

Feature `75` (`MAA-27`, `MAA-28`, `MAA-41`, A21). É o **true end state** da jornada: o dado novo vem do banco, nunca de um patch local. Recarregar o app também (F5) e ver o mesmo estado.
