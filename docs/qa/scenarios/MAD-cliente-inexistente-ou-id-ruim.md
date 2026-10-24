---
id: MAD-cliente-inexistente-ou-id-ruim
area: MAD
title: Ficha de id inexistente ou malformado
persona: Adri no celular
journey: J-ver-uma-cliente
expected: Id que não é UUID ou UUID sem linha dizem Não encontrei esta cliente. com saída para a lista; o malformado não vai à rede
entry_points: /clientes/abc; /clientes/<uuid inexistente>
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-clientes.md
overlaps: 
---

Feature `76` (`MAC-14`. Conferir na aba de rede. Cliente apagada com a ficha aberta: a releitura cai no mesmo estado.)
