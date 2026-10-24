---
id: MAD-clientes-teclado-e-voltar-do-android
area: MAD
title: Teclado aberto: o campo e o resultado seguem visíveis e o voltar fecha o teclado primeiro
persona: Adri no celular
journey: J-achar-uma-cliente
expected: Com o teclado virtual aberto a busca e as linhas continuam visíveis; o primeiro voltar fecha o teclado, o segundo sai da tela
entry_points: /clientes → busca
qa_status: fail
bug_ids: BUG-20261024-teclado-aberto-esconde-os-resultados-da-busca
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-24-clientes/390-teclado-busca.png
last_report: reports/2026-10-24-mobile-adm-clientes.md
overlaps: 
---

Feature `76` (`MAC-34`. Aparelho real é blocked-verify; em navegador, teclado emulado.)

QA r1: teclado emulado reprova (viewport 508). O voltar do Android e o teclado real ficam blocked-verify; o voltar do navegador de ficha para lista manteve busca "p76" e 5 linhas.
