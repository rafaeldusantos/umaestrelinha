---
id: IG-convite-cartao-computador
area: IG
title: Ver o convite como cartão central no computador
persona: Carla
journey: J-conhecer-o-trabalho-no-instagram
expected: Em 1440×900, o convite é um cartão de 480px centralizado nos dois eixos, sem puxador, sobre véu escuro
entry_points: http://localhost:8082/
qa_status: pass
bug_ids: BUG-20261017-home-rola-na-horizontal-em-768
fix_status:
retest_status:
fix_commits:
evidence: .specs/features/65-convite-instagram-na-home/qa/evidence/2026-10-17-65-convite-instagram-na-home/CH-computador-convite-teclado-01-cartao-1440.png; .specs/features/65-convite-instagram-na-home/qa/evidence/2026-10-17-65-convite-instagram-na-home/CH-computador-convite-teclado-02-767.png
last_report: .specs/features/65-convite-instagram-na-home/qa/reports/2026-10-17-65-convite-instagram-na-home.md
overlaps: IG-convite-primeira-visita-celular
---

C-01 no computador. Medir a largura do cartão e o centro (getBoundingClientRect). Conferir também em 768 e 1024, onde a folha vira cartão (md).
