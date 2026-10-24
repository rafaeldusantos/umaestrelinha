---
id: MAD-acao-no-cartao-da-lista
area: MAD
title: Resolver a fila pelo botão do cartão sem abrir o pedido
persona: Adri no celular
journey: J-registrar-material-e-envio
expected: O cartão mostra o mesmo rótulo do rodapé, executa a mesma ação (a mesma folha para rastreio), a lista relê na mesma posição e o pedido que saiu do recorte sai da lista; tocar fora do botão ainda abre o pedido
entry_points: /pedidos?visao=precisa-acao → botão do cartão; /pedidos?bloco=<id>
qa_status: fail
bug_ids: [BUG-20261024-botao-do-cartao-sem-o-pedido-no-nome]
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-acoes-do-pedido.md
overlaps: MAD-pedidos-bloco-da-inicio-filtra-a-lista
---

Feature `75` (`MAA-36`, `MAA-37`, A13/A14b, G5). A frase do cartão (`rowSummary.blocker`) não muda. Retirada em separação: Marcar como retirado. Conferir o selo da aba e a Início descendo junto (`STORE_OVERVIEW_KEY`).
