---
id: IG-convite-fora-da-home
area: IG
title: Não ver o convite fora da Home nem na prévia do painel
persona: Carla
journey: J-conhecer-o-trabalho-no-instagram
expected: Entrar por /produtos/<slug>, por uma coleção ou pela prévia (iframe + ?preview=1) não mostra o convite; voltar à Home depois mostra (se ainda não visto)
entry_points: http://localhost:8082/produtos/<slug>; http://localhost:8082/?preview=1 em iframe
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence: .specs/features/65-convite-instagram-na-home/qa/evidence/2026-10-17-65-convite-instagram-na-home/CH-celular-convite-interrompido-01-avancar-produto.png
last_report: .specs/features/65-convite-instagram-na-home/qa/reports/2026-10-17-65-convite-instagram-na-home.md
overlaps: 
---

C-06. A prévia exige iframe: montar uma página de teste com um <iframe> apontando para ?preview=1, ou abrir o /admin/home do painel (:8083) se estiver de pé.
