---
id: MAD-pedidos-rolar-sem-repetir
area: MAD
title: Rolar um recorte longo até o fim
persona: Adri no celular
journey: J-achar-um-pedido
expected: As páginas de 25 chegam sozinhas perto do fim, nenhum pedido repete nem some, e no fim não há esqueleto
entry_points: /pedidos?visao=tudo
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-pedidos.md
overlaps: 
---

Feature `74` (`MAP-13`..`MAP-15`, G-A9). Com um pedido novo entrando entre duas páginas (inserir no banco local) a lista não repete. A contagem do topo continua sendo o total, não o restante.
