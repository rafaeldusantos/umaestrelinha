---
id: MAD-pedidos-bloco-da-inicio-filtra-a-lista
area: MAD
title: Tocar um bloco da Início e ver exatamente aqueles pedidos
persona: Adri no celular
journey: J-achar-um-pedido
expected: A lista mostra a faixa Filtro com o rótulo do bloco, nenhum chip marcado, e a contagem igual à do bloco na Início e ao mesmo recorte em /admin/pedidos
entry_points: / → Precisa de você → bloco; /pedidos?bloco=<id>
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-24-mobile-adm-pedidos/390-bloco-aguardando.png
last_report: reports/2026-10-24-mobile-adm-pedidos.md
overlaps: MAD-inicio-precisa-de-voce-leva-a-pedidos
---

Feature `74` (`MAP-01`, `MAP-03`, `MAP-05`, A3/A4). Os quatro blocos, um por vez. Conferir R2 (Pix pendente com `status ≠ pending` entra em Pix aguardando) e R1 (pago com material nulo entra em Precisa de ação e em nenhum bloco). Limpar filtro leva a `?visao=tudo`, alvo de 44 px. `?bloco=` e `?visao=` juntos: vale o bloco.
