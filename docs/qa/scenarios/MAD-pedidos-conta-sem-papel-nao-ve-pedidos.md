---
id: MAD-pedidos-conta-sem-papel-nao-ve-pedidos
area: MAD
title: Conta de cliente com pedidos próprios não vê pedidos no ateliê
persona: Cliente com conta da loja
journey: J-achar-um-pedido
expected: Abrindo /pedidos e /pedidos/<id de um pedido dela>, a cliente vê a recusa da 72 e nunca uma linha nem um bloco, nem o que estava na tela antes
entry_points: /pedidos; /pedidos/<id próprio>
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-pedidos.md
overlaps: MAD-conta-sem-acesso-recusada; MAD-inicio-perder-acesso-com-app-aberto
---

Feature `74` (`MAP-36`, `MAP-37`, `MAI-23`, G-A1). A RLS devolve à cliente os pedidos dela: o que impede a linha é `atelie_clock` respondendo `42501`. Também: perder o papel com a lista aberta e voltar.
