---
id: PAY-cartao-sem-pan-no-backend
area: PAY
title: Dados do cartao nunca chegam ao backend da loja
persona: Léo
journey: J-compra-cartao-parcelado
expected: Nenhuma requisicao para *.supabase.* contem PAN ou CVV; só o token do Brick
entry_points: http://localhost:8080/checkout
qa_status: blocked-verify
bug_ids: BUG-20260728-edge-runtime-sem-dns
fix_status:
retest_status:
fix_commits:
evidence:
last_report: ../reports/2026-07-28-checkout-08-09.md
overlaps: 
---

PCI SAQ-A. Verificavel só com o painel de rede aberto durante um pagamento real de sandbox — não ha'
teste automatizado que prove isso.

Conferir também que o CPF do **pedido** sobrescreve o `payer.identification` que o Brick manda.
