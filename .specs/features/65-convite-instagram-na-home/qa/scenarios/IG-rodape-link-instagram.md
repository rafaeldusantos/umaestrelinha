---
id: IG-rodape-link-instagram
area: IG
title: Abrir o Instagram pelo rodapé (canário)
persona: Carla
journey: J-conhecer-o-trabalho-no-instagram
expected: O link do rodapé aponta para https://www.instagram.com/umaestrelinha.adri, igual ao do convite
entry_points: http://localhost:8082/ (rodapé)
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence: 
last_report: .specs/features/65-convite-instagram-na-home/qa/reports/2026-10-17-65-convite-instagram-na-home.md
overlaps: IG-convite-abre-perfil
---

Canário: a constante saiu do rodapé para shared/config. Mudança visível: a URL ganhou www.
