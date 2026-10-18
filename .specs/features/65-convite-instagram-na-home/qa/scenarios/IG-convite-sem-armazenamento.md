---
id: IG-convite-sem-armazenamento
area: IG
title: Abrir a loja com o localStorage bloqueado
persona: Luciana
journey: J-conhecer-o-trabalho-no-instagram
expected: Com o localStorage indisponível, a Home não quebra, o convite abre uma vez e não reabre na mesma sessão
entry_points: http://localhost:8082/
qa_status: blocked-decision
bug_ids: BUG-20261017-loja-em-branco-sem-armazenamento
fix_status: pending
retest_status:
fix_commits:
evidence: 
last_report: .specs/features/65-convite-instagram-na-home/qa/reports/2026-10-17-65-convite-instagram-na-home.md
overlaps: IG-convite-nao-volta
---

C-02 (borda). Simular com o localStorage lançando (sobrescrever Storage.prototype no navegador antes de carregar) ou com o bloqueio de dados do site.
