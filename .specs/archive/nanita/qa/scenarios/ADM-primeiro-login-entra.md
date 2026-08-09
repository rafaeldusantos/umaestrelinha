---
id: ADM-primeiro-login-entra
area: ADM
title: Entrar no backoffice na primeira tentativa, com credenciais válidas
persona: Nana
journey: J-cadastrar-produto-com-grade
expected: Digitar e-mail e senha corretos leva ao painel na PRIMEIRA tentativa; credencial errada mostra mensagem de erro
entry_points: http://localhost:8081/admin/login
qa_status: pass
bug_ids: BUG-20260802-primeiro-login-do-admin-volta-para-a-tela
fix_status: fixed
retest_status: pass
fix_commits: f620217
evidence: docs/qa/evidence/2026-08-02-backoffice-catalogo-11-14/login-primeira-tentativa-entra-corrigido.png
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

**Lacuna de planejamento que a execução encontrou.** O ciclo mapeou nove journeys de catálogo e nenhuma
delas cobria o passo 0 — entrar. O login estava tratado como pré-condição de ambiente, não como
comportamento visível para uma persona. Ele é o passo 0 de **todas** as journeys de backoffice, então
mora na área `ADM` e é referenciado por elas.

A journey associada é `J-cadastrar-produto-com-grade` por ser a de maior valor entre as que ele bloqueia —
não porque ele pertença só a ela.
