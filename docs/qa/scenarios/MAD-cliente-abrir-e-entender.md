---
id: MAD-cliente-abrir-e-entender
area: MAD
title: Abrir a ficha e entender quem é a cliente
persona: Adri no celular
journey: J-ver-uma-cliente
expected: Cabeçalho com inicial, nome (ou e-mail), cidade/UF omitida sem separador quando nenhum pedido a tem, e cliente desde mês e ano; foco no título
entry_points: /clientes/<id>
qa_status: pass
bug_ids: 
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-24-mobile-adm-clientes/sessao-colar.txt
last_report: reports/2026-10-24-mobile-adm-clientes-achar-quem-me-escreveu.md
overlaps: MAD-cliente-numeros-so-pagos
---

Feature `76` (`MAC-15`, A6, A7. Comparar com /admin/clientes/<id>.)

Rodada 1 (CH-clientes-achar-quem-me-escreveu, 2026-10-24): Ficha de convidada longa, sem nome, com telefone e de Valéria: números iguais ao painel; cidade/UF omitida sem separador; foco no h1 ao abrir pela lista.
