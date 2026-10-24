---
id: MAD-acao-falha-de-rede-ao-salvar
area: MAD
title: Tentar uma ação com a rede caindo
persona: Adri no celular
journey: J-registrar-material-e-envio
expected: Com a escrita falhando por rede ou 5xx, a tela diz Não consegui salvar. Tente de novo. com o pedido como estava, nunca a recusa; offline vale Sem conexão e nenhuma ação fica guardada para depois
entry_points: /pedidos/<id> → qualquer ação com a rede cortada ou 500
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-acoes-do-pedido.md
overlaps: 
---

Feature `75` (`MAA-22`, `MAA-25`). Conferir que voltar a rede não reenvia nada sozinho (sem fila offline) e que o service worker não serve resposta de escrita.
