---
id: CHK-um-bloco-aberto
area: CHK
title: Acordeão abre o primeiro bloco incompleto e nunca dois ao mesmo tempo
persona: Bia
journey: J-compra-pix-celular
expected: Exatamente um bloco aberto por vez; bloco completo colapsa mostrando resumo e 'Alterar'
entry_points: http://localhost:8080/checkout
qa_status: pass
bug_ids: BUG-20260728-bloco-vazio-parece-preenchido
fix_status: fixed
retest_status: pass
fix_commits: 99c90cc
evidence: docs/qa/evidence/2026-07-28-checkout-08-09/
last_report: ../reports/2026-07-28-checkout-08-09.md
overlaps: 
---

Regra de CHK-03/CHK-04. Em 390px o custo de dois blocos abertos é a página virar um formulario
infinito — que é exatamente o que o one-page veio resolver.

Conferir também que **nenhum bloco tem botão primario próprio**: a única pílula geleia da tela é o CTA
(DESIGN.md 8).
