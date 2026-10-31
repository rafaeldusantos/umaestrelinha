---
id: LOJA-montado-link-morto-ou-mudou
area: LOJA
title: Abrir link inválido, cancelado, renovado ou editado com a página aberta
persona: Cliente de luto pelo link
journey: J-concluir-pedido-montado
expected: Link inválido/cancelado/antigo diz Este link não está mais disponível… com o WhatsApp, sem dado nenhum; editado com a página aberta recusa a conclusão com A Adri atualizou seu pedido…; concluído leva ao pedido
entry_points: /pedido-montado#<token>; /pedido-montado sem fragmento
qa_status: fail
bug_ids: BUG-20261031-link-novo-na-mesma-aba-mostra-o-antigo; BUG-20261031-frete-antigo-depois-que-a-adri-atualiza; BUG-20261031-ponto-final-depois-do-link-no-whatsapp
fix_status: partial (link-novo-na-mesma-aba fixed; frete-antigo e ponto-final esperam decisão)
retest_status: pass (link-novo-na-mesma-aba)
fix_commits:
evidence:
last_report: reports/2026-10-31-pedido-montado-reteste.md
overlaps: PNL-montado-editar-renovar-cancelar
---

CON-07, CON-08, CON-10, edge case de dois aparelhos.
