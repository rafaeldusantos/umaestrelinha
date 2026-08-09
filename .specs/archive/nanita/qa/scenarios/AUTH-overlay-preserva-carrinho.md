---
id: AUTH-overlay-preserva-carrinho
area: AUTH
title: Fechar o overlay de login não perde o carrinho
persona: Bia
journey: J-compra-pix-celular
expected: Ao fechar o overlay sem entrar, os itens do carrinho continuam lá
entry_points: http://localhost:8080/checkout
qa_status: pass
bug_ids: BUG-20260728-auth-local-so-entrega-ao-dono-do-resend
fix_status: fixed
retest_status: pass
fix_commits:
evidence: re-walk 390×844 (Bia) — carrinho com 1 item sobrevive ao fechar o overlay em /checkout; overlay avança para "Digite o código" sem alerta de erro
last_report: ../reports/2026-08-02-auth-otp-remetente.md
overlaps: 
---

Login é obrigatório, entao quem chega em `/checkout` deslogada vê o overlay com `returnTo=/checkout`.
Bia não esperava ter de criar conta — o caminho de saída dela não pode custar o carrinho.

Conferir também que o foco fica preso no overlay (não vaza para a página atrás) e que Esc fecha.
