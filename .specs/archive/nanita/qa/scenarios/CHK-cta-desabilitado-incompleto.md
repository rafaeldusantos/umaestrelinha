---
id: CHK-cta-desabilitado-incompleto
area: CHK
title: CTA fica desabilitado enquanto houver bloco incompleto
persona: Bia
journey: J-compra-pix-celular
expected: CTA desabilitado com qualquer bloco incompleto; habilita só quando os três estao completos
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

Critério de 'completo' por bloco (CHK-03): Contato = nome + e-mail valido + WhatsApp de 10/11 dígitos;
Entrega = CEP de 8 dígitos + 5 campos + **opção de frete selecionada**; Pagamento = metodo habilitado
+ CPF valido.
