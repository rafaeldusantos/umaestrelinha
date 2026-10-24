---
id: MAD-inicio-precisa-de-voce-leva-a-pedidos
area: MAD
title: Tocar um bloco de Precisa de você e chegar a Pedidos
persona: Adri no celular
journey: J-acompanhar-a-loja
expected: Cada bloco mostra a mesma contagem de /admin/pedidos e leva a /pedidos com o bloco no endereço; Ver pedidos leva à visão Precisa de ação
entry_points: / → Precisa de você
qa_status: pass
bug_ids: 
fix_status: 
retest_status:
fix_commits:
evidence: evidence/2026-10-22-mobile-adm-inicio/CH-numeros-01-inicio-412-utc.png
last_report: reports/2026-10-24-mobile-adm-pedidos.md
overlaps: 
---

Feature `73` (`MAI-05`..`MAI-08`, `MAI-15`). A `74` ainda não obedece ao endereço: a aba Pedidos é "chega em breve"; o que se prova é o endereço.

Reset para `untested` em 2026-10-24 (planejamento da `74`): a lista agora obedece ao endereço do bloco. O comportamento da lista é de `MAD-pedidos-bloco-da-inicio-filtra-a-lista`; aqui fica o toque na Início e a contagem do bloco.
