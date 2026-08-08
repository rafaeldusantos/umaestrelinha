---
id: PRD-saida-e-descarte-pedem-confirmacao
area: PRD
title: Sair com alteração não salva e Descartar pedem confirmação nomeada
persona: Dora
journey: J-nao-perder-o-trabalho-no-formulario
expected: O cabeçalho fixo mostra o badge "Alterações não salvas"; sair (navegação interna ou fechar aba) pede confirmação; e Descartar abre confirmação nomeando o que se perde, sem apagar nada antes do aceite
entry_points: http://localhost:8081/admin/produtos/:id/editar
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

`PFM-13` (AC 9-10) + `RFN-08` AC 1. `Descartar` era a **única ação destrutiva do formulário sem
confirmação** — e Dora clica nela achando que significa "fechar sem salvar".
