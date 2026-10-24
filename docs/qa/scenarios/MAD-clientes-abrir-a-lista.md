---
id: MAD-clientes-abrir-a-lista
area: MAD
title: Abrir a lista de clientes e ver quem é quem
persona: Adri no celular
journey: J-achar-uma-cliente
expected: Cada pessoa aparece uma vez, ordenada pela atividade mais recente (nulos por último), com contagem do servidor, "N compras · última há X" e o total pago
entry_points: /clientes
qa_status: pass
bug_ids: 
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-24-mobile-adm-clientes/sessao-colar.txt
last_report: reports/2026-10-24-mobile-adm-clientes-achar-quem-me-escreveu.md
overlaps: 
---

Feature `76` (`MAC-01`..`MAC-04`, A8. Conferir contra /admin/clientes: a convidada que depois criou conta é uma linha só; quem nunca pagou diz "Sem compra paga ainda"; a contagem não é linhas.length.)

Rodada 1 (CH-clientes-achar-quem-me-escreveu, 2026-10-24): Lista aberta: 63 clientes do servidor, ordem por atividade, selo Em aberto, Sem compra paga ainda; sem nome usa o e-mail.
