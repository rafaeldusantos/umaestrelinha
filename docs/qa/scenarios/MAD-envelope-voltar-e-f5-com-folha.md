---
id: MAD-envelope-voltar-e-f5-com-folha
area: MAD
title: Voltar do navegador e F5 com a folha aberta
persona: Adri no celular
journey: J-registrar-envelope-da-cliente
expected: Voltar fecha a folha sem sair do pedido e sem gravar; F5 fecha a folha e o voltar seguinte sai do pedido, sem voltar morto
entry_points: Folha do envelope aberta → voltar / F5
qa_status: pass
bug_ids: 
fix_status: 
retest_status: 
fix_commits: 
evidence: 
last_report: reports/2026-10-26-mobile-adm-envelope-da-cliente.md
overlaps: MAD-acao-folha-e-voltar-do-android
---

Voltar: folha fechada, mesma URL, foco em Alterar, nada gravado. F5: folha fechada, voltar ⇒ /pedidos. Paper cut: avançar depois do voltar não reabre a folha e deixa um voltar morto (herança da `75`, dull). O gesto do Android real: blocked-verify.
