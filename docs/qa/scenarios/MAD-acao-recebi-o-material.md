---
id: MAD-acao-recebi-o-material
area: MAD
title: Registrar que o envelope chegou pelo rodapé do pedido
persona: Adri no celular
journey: J-registrar-material-e-envio
expected: Recebi o material grava material_recebido uma vez, mostra Material registrado. com a frase da bancada, e o painel e a Início passam a mostrar o pedido na bancada depois de recarregar
entry_points: /pedidos/<id> com material aguardando_material ou material_enviado → Recebi o material
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-acoes-do-pedido.md
overlaps: 
---

Feature `75` (`MAA-01`..`MAA-05`, A1/A11/A15). Casos: material `aguardando_material` e `material_enviado`; pagamento ainda pendente (A15, o botão aparece); o mesmo pedido já registrado pelo painel em outra aba (idempotente: confirmação **sem** citar e-mail). Conferir no banco `material_status`, `material_received_at` e a linha `material_received` em `order_notifications` — iguais às do painel. E-mail citado só com `sent === true` (com a `RESEND_API_KEY` inválida de propósito, a frase não cita e-mail, e isso é o certo).
