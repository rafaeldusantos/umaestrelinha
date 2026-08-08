---
id: PAY-cpf-obrigatorio-e-valido
area: PAY
title: PIX exige CPF do pagador, validado por dígito verificador
persona: Bia
journey: J-compra-pix-celular
expected: CPF invalido mostra erro no campo e mantem o CTA desabilitado; valido libera
entry_points: http://localhost:8080/checkout
qa_status: pass
bug_ids: 
fix_status:
retest_status:
fix_commits:
evidence: docs/qa/evidence/2026-07-28-checkout-08-09/
last_report: ../reports/2026-07-28-checkout-08-09.md
overlaps: 
---

A API do Mercado Pago exige `payer.identification` para PIX no Brasil. Antes da 08 o CPF era coletado
e **jogado fora**.

Bia é a persona certa aqui: ela não entende por que a loja quer o CPF dela. Conferir se a
justificativa ao lado do campo responde essa pergunta.
