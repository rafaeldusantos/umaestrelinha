---
id: MAD-rede-inutil-recusa-falsa
area: MAD
title: Abrir com Wi-Fi sem internet e não ser chamada de sem acesso
persona: Adri no celular
journey: J-sem-conexao
expected: Com a rede inútil, o app diz que não conseguiu conferir o acesso, nunca que a conta não tem acesso
entry_points: Wi-Fi sem saída
qa_status: pass
bug_ids: BUG-20261022-sem-internet-recusa-admin
fix_status: fixed
retest_status: pass
fix_commits: working tree, sem commit
evidence: evidence/2026-10-22-mobile-adm-fundacao-reteste/R1-falha-rapida.png; evidence/2026-10-22-mobile-adm-fundacao-reteste/R1-sem-resposta.png; evidence/2026-10-22-mobile-adm-fundacao-reteste/R1-sem-resposta-voltou.png
last_report: reports/2026-10-22-mobile-adm-fundacao-reteste.md
overlaps: 
---

Defeito conhecido, `BL-048`, com prazo antes da `73` (`MAI-08`). Medido na prova em navegador da `72`; ainda não andado por esta árvore.
