---
id: MAD-acao-toque-duplo-trava
area: MAD
title: Tocar duas vezes na ação sem gravar duas vezes
persona: Adri no celular
journey: J-registrar-material-e-envio
expected: Do toque à resposta o controle fica Salvando… e travado, e dois toques seguidos (ou cartão e detalhe juntos) produzem uma só escrita e uma só linha de histórico
entry_points: /pedidos/<id> → rodapé; /pedidos → botão do cartão
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-acoes-do-pedido.md
overlaps: 
---

Feature `75` (`MAA-20`, A20). Dois toques em eventos separados (não no mesmo `act`, lição da `72`), com a rede lenta (3G simulado) para alargar a janela. Contar as requisições de escrita e as linhas de `order_status_history`.
