---
id: MAD-pedido-muda-com-a-tela-aberta
area: MAD
title: Ver o pedido mudar quando o material é registrado no computador
persona: Adri no celular
journey: J-ver-um-pedido
expected: Com o detalhe aberto, registrar o material no painel faz o detalhe reler e mostrar o estado novo, e a lista relida não o mostra mais em Fila de material
entry_points: /pedidos/<id> com /admin/pedidos/<id> em outra aba
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-pedidos.md
overlaps: MAD-pedidos-lista-ao-vivo
---

Feature `74` (`MAP-39`, edge case "pedido sai do recorte"). Também sair para o WhatsApp e voltar: relê ao primeiro plano.
