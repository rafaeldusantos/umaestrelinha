---
id: MAD-envelope-painel-grava-o-mesmo
area: MAD
title: O painel grava o código pelo mesmo dono e o app mostra
persona: Adri no celular
journey: J-registrar-envelope-da-cliente
expected: O card do painel registra o código, o app relido mostra Registrado por você e o link dos Correios funciona
entry_points: /admin/pedidos/<id> → Código de rastreio do envio da cliente → Salvar
qa_status: blocked-decision
bug_ids: BUG-20261026-codigo-com-hifen-ou-espaco-gravado
fix_status: pending
retest_status: 
fix_commits: 
evidence: evidence/2026-10-26-mobile-adm-envelope-da-cliente/s7-app-depois-do-painel.png
last_report: reports/2026-10-26-mobile-adm-envelope-da-cliente.md
overlaps: 
---

Toast "Código de rastreio do material registrado", banco `set_by = admin`, app "Registrado por você agora". Mas o painel grava "PN 1234 5678 9BR" com espaços: o app mostra assim e o link vai com `%20` (decisão).
