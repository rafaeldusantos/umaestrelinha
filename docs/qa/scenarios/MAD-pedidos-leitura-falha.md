---
id: MAD-pedidos-leitura-falha
area: MAD
title: Ver a lista quando a rede falha
persona: Adri no celular
journey: J-achar-um-pedido
expected: Primeira leitura falha: Não consegui carregar. + Tentar de novo, nunca Nada por aqui.; releitura falha com dado: o dado fica com Atualizado às e Não consegui atualizar agora.; página seguinte falha: Tentar de novo no fim
entry_points: /pedidos
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-pedidos.md
overlaps: MAD-inicio-leitura-falha-sem-numero
---

Feature `74` (`MAP-34`, `MAP-35`, `MAP-38`, `MAP-41`). 5xx e sem rede são falha, nunca recusa. Offline total: a tela Sem conexão da `72`; nada vem do service worker.
