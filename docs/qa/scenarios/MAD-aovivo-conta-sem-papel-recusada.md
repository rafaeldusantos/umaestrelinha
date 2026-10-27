---
id: MAD-aovivo-conta-sem-papel-recusada
area: MAD
title: Conta sem papel não vê a Loja ao vivo, nem com a tela aberta
persona: Adri no celular
journey: J-ver-a-loja-ao-vivo
expected: Abrir /ao-vivo com conta sem papel, ou perder o papel com a tela aberta, leva à frase da recusa da 72 (Esta conta não tem acesso ao painel.) sem nenhum número, nem do cache, e o intervalo de 15 s para; erro de rede ou 500 é falha, nunca recusa
entry_points: /ao-vivo
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-27-mobile-adm-loja-ao-vivo.md
overlaps: MAD-inicio-perder-acesso-com-app-aberto, MAD-conta-sem-acesso-recusada
---

Feature `83` (`LAV-60`). Na T13 só provado sobre o client real (`aoVivoComClientReal.test.tsx`); falta navegador. Tirar o papel em begin…rollback não serve (a sessão do app não vê a transação): usar uma conta sem papel do seed ou interceptar com 403 `42501`.
