---
id: MAD-inicio-abrir-e-entender-o-dia
area: MAD
title: Abrir a Início e ler o dia
persona: Adri no celular
journey: J-acompanhar-a-loja
expected: Saudação e data de Brasília, os quatro números de Hoje iguais a store_movement e Atualizado às com a hora do servidor
entry_points: /
qa_status: untested
bug_ids: BUG-20261022-situacao-fala-com-a-cliente-no-atelie
fix_status: fixed
retest_status: pass
fix_commits: working tree, sem commit
evidence: evidence/2026-10-23-mobile-adm-inicio-reteste-2/ultimos-412-100.png; evidence/2026-10-23-mobile-adm-inicio-reteste-2/ultimos-360-enviado-estornado.png
last_report: reports/2026-10-23-mobile-adm-inicio-reteste-2.md
overlaps: 
---

Derivado do fluxo; feature `73` (`MAI-01`, `MAI-04`, `MAI-18`). Conferir também com o aparelho em outro fuso.

QA 2026-10-22: o selo "Aguardando seu material" era a voz da loja
(`BUG-20261022-situacao-fala-com-a-cliente-no-atelie`); os números passaram.

Reteste 2026-10-23: o selo passou a falar com o ateliê (`orderSituation(pedido, 'atelie')`): "Aguardando
material" e "Material a caminho" separam o #0181 do #0182, sem o "seu" da cliente. A loja não mudou.

Reset para `untested` em 2026-10-24 (planejamento da `74`): as linhas de Últimos pedidos viraram links para `/pedidos/<id>` (`MAP-52`); o toque é de `MAD-pedido-ultimos-pedidos-abre-detalhe`, aqui fica a leitura do dia.
