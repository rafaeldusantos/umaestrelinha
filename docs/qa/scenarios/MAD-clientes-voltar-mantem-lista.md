---
id: MAD-clientes-voltar-mantem-lista
area: MAD
title: Voltar da ficha traz a mesma lista, busca e rolagem
persona: Adri no celular
journey: J-achar-uma-cliente
expected: Voltar (botão e Android) leva à lista no mesmo recorte, com a busca e a posição de rolagem de antes
entry_points: /clientes/<id> → voltar
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-clientes.md
overlaps: 
---

Feature `76` (`MAC-14`, `MAC-34`. Lista rolada fundo, recorte e busca ativos, abrir ficha, voltar. Link direto/F5 na ficha: voltar leva à lista sem recorte.)
