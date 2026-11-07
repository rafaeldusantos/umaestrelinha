# Decisões de produto — QA do WI 92 · Desconto da compra casada

| ID | Pergunta | Resposta | Destino | Data |
| --- | --- | --- | --- | --- |
| P-01 | Na Adesão, conta como "levada junto" a unidade a preço cheio de uma peça que veio pelo bloco? É o caso do #0360: a 2ª unidade do Berloque saiu a preço cheio e o pedido não lhe pôs a marca "Acompanha". Origem: CA-06.1, CH-06, TC-FUNC-032 | **Só a unidade com desconto conta** (corrigir a Adesão). A marca do pedido está certa: só a unidade com desconto a leva. Quem diverge é a Adesão, que conta também a unidade sem a marca | **WI novo** (o padrão, escolhido explicitamente) | 2026-11-04 (página) |

O destino é **WI novo**, então a decisão **não** vira fix task deste Work Item. Ela fica registrada aqui para abrir um Work Item próprio: a Adesão passa a contar só as linhas com a marca "acompanha". O BUG-001..013 desta rodada não muda.
