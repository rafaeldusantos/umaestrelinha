---
id: MAD-instalar-e-abrir-standalone
area: MAD
title: Instalar o app no Android e abrir em tela cheia
persona: Adri no celular
journey: J-entrar-no-atelie
expected: O ícone Ateliê aparece na tela inicial e abre sem barra de endereço, com a splash do manifest no primary-strong
entry_points: Chrome Android → Instalar app
qa_status: blocked-verify
bug_ids: 
fix_status: 
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-22-mobile-adm-fundacao.md
overlaps: 
---

Só no aparelho (MAF-01, MAF-02). Em navegador há a prova de instalabilidade do Chromium (`Page.getInstallabilityErrors` vazio), na `prova-navegador.md` da `72`.
