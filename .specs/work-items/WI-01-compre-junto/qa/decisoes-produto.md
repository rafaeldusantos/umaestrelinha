# Decisões de produto — QA do WI-01, rodada 1

Respostas da página de perguntas (enviadas em 2026-11-02T21:15Z, pelo humano da sessão), às perguntas ao produto do Gate 3 (`qa/qa-result.md` › Perguntas ao produto). Nenhuma linha vira bug nem fix task deste Work Item.

| #   | Pergunta | Decisão | Destino |
| --- | -------- | ------- | ------- |
| P-01 | Com um adicional marcado e incompleto, o que o total e a contagem do conjunto mostram? (hoje "Conjunto · N peças" conta a peça incompleta, e o total e a barra fixa somam só as completas) | **Contar e somar só o que está completo** — a contagem "N peças" passa a seguir o total. Qualificação do humano: ao tentar levar o conjunto sem a variação escolhida, a página sinaliza com mensagem e marca o produto adicional que falta. (Comportamento atual: a mensagem de falta e a marcação já existem — CH-01, CH-06; o que muda é a contagem.) | `WI novo` |
| P-02 | Peça que saiu do ar depois de entrar na sacola (página aberta antes da mudança no painel): o que acontece? | **O pedido segue com ela e a dona resolve.** A sugestão clicada juntava "ou decido depois, fica pendente"; registrada como a primeira metade, que é o comportamento atual (não conferido até o checkout no CH-04). Se a intenção era deixar pendente, troque esta linha para `pendente`. | `nada` (escolhido na página: `WI novo`, sem mudança pedida) |
| P-03 | O grupo de variações do adicional deve ser uma parada de Tab só, com as setas trocando a opção? | Decido depois. | `pendente` |

Decidiu: o humano, pela página da `wi-workflow`. Nenhuma resposta escolheu `escopo deste WI`: este Work Item não muda por elas.
