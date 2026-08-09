---
id: PAY-pix-tela-mostra-valor
area: PAY
title: Tela do PIX mostra quanto vai ser pago
persona: Marina
journey: J-compra-pix-celular
expected: Valor em destaque com a nota do desconto PIX, contador mm:ss em contagem regressiva, QR e botão Copiar
entry_points: http://localhost:8080/checkout
qa_status: fail
bug_ids: BUG-20260728-edge-runtime-sem-dns
fix_status:
retest_status:
fix_commits:
evidence: docs/qa/evidence/2026-07-28-checkout-08-09/
last_report: ../reports/2026-07-28-checkout-08-09.md
overlaps: 
---

A tela não mostrava o valor — o dado mais basico dela. Conferir também que **não existe** botão
'ja' paguei': a tela avanca sozinha por Realtime, e ha' um indicador de escuta ativa.

No mobile: o QR precisa caber sem scroll horizontal e o código copia-e-cola não pode empurrar o layout.
