---
id: IG-convite-convive-avisos
area: IG
title: Ver o convite sem brigar com a bolha do WhatsApp e o MobileNav
persona: Luciana
journey: J-conhecer-o-trabalho-no-instagram
expected: Com o convite aberto no celular, a bolha do WhatsApp (que entra aos ~2,2 s) e o MobileNav ficam sob o véu e não cobrem o botão nem o Agora não; a Home não pula (sem CLS)
entry_points: http://localhost:8082/
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence: .specs/features/65-convite-instagram-na-home/qa/evidence/2026-10-17-65-convite-instagram-na-home/CH-celular-primeira-visita-convite-02b-veu.png
last_report: .specs/features/65-convite-instagram-na-home/qa/reports/2026-10-17-65-convite-instagram-na-home.md
overlaps: IG-convite-primeira-visita-celular
---

C-07 (transversal). Medir o z-index real e o CLS. Ver também se o convite aberto vira candidato a LCP.
