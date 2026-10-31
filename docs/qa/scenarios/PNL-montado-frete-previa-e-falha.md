---
id: PNL-montado-frete-previa-e-falha
area: PNL
title: Ver a prévia do frete e a falha da cotação sem travar
persona: Adri montando uma venda
journey: J-montar-pedido-para-a-cliente
expected: Com CEP e peça aparece a cotação com A cliente escolhe a entrega no link; com a cotação falhando a tela diz que falhou e Criar link continua possível
entry_points: /admin/pedidos/montar
qa_status: pass
bug_ids: 
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-31-pedido-montado.md
overlaps: 
---

MON-10. Interceptar melhor-envio com 500 para a falha (a cotação local vai à API de produção, só leitura).
