---
id: MAD-envelope-copiar-e-ver-nos-correios
area: MAD
title: Copiar o código e abrir nos Correios, e voltar
persona: Adri no celular
journey: J-registrar-envelope-da-cliente
expected: Copiar põe o código exato na área de transferência com Código copiado.; Ver nos Correios abre aba nova com o código, e voltar ao app mantém a posição e o foco
entry_points: /pedidos/<id> com código
qa_status: pass
bug_ids: 
fix_status: 
retest_status: 
fix_commits: 
evidence: 
last_report: reports/2026-10-26-mobile-adm-envelope-da-cliente.md
overlaps: 
---

Aba nova com `opener === null`; voltar: mesma URL, rolagem 400 → 400, foco no link. Copiar por teclado: `role=status` "Código copiado.", foco fica no botão. A página dos Correios foi stub (captcha é deles).
