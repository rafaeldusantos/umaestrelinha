---
id: PNL-montado-copiar-e-whatsapp
area: PNL
title: Copiar o link e abrir o WhatsApp com a mensagem pronta
persona: Adri montando uma venda
journey: J-montar-pedido-para-a-cliente
expected: Copiar põe o link completo na área de transferência; WhatsApp abre wa.me com a mensagem da spec sem emoji nem urgência; sem telefone diz Sem telefone — copie o link; o histórico ganha Link enviado
entry_points: /admin/pedidos/montados/:id
qa_status: fail
bug_ids: BUG-20261031-ponto-final-depois-do-link-no-whatsapp
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-31-pedido-montado.md
overlaps: 
---

LNK-01..LNK-03. Ler o text= decodificado no tom da marca.
