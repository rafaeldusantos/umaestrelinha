---
id: BLK-massa-categorias-e-agendar
area: BLK
title: Painel de massa muda categorias por diff e agenda com data obrigatória
persona: Nana
journey: J-reprecificar-em-massa
expected: Categorias oferece Adicionar, Remover e Substituir (com a prévia avisando que as atuais serão removidas) e escreve por diff, sem reescrever vínculo que não mudou; Status oferece Ativar, Pausar e Agendar, e Agendar exige data e tira o produto da loja até ela
entry_points: http://localhost:8081/admin/produtos
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

`RFN-04` (`14`/P1.2) — a lacuna que a `13` declarou: `buildBulkPatch` **implementava e testava** os dois
modos, faltava só a UI. Então aqui o que se testa é a **costura**: o interruptor certo, o diff certo no
banco, e o agendado fora da vitrine.

Conferir `product_categories` antes e depois: vínculo que não mudou não pode ter sido reescrito
(`updated_at`/ordem preservados).
