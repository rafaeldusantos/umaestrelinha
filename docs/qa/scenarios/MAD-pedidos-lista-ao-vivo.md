---
id: MAD-pedidos-lista-ao-vivo
area: MAD
title: Ver a lista mudar sozinha quando o pedido muda no painel
persona: Adri no celular
journey: J-achar-um-pedido
expected: Com o painel em outra aba, mudar um pedido faz a lista do app reler sem voltar ao topo, e o pedido sai do recorte se deixou de pertencer a ele
entry_points: /pedidos com /admin/pedidos em outra aba
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-pedidos.md
overlaps: MAD-inicio-pedido-novo-ao-vivo
---

Feature `74` (`MAP-39`, `MAP-40`, G-A11). Um canal por montagem. Puxar no topo e voltar ao primeiro plano também releem. Sair da conta com a lista aberta fecha o canal.
