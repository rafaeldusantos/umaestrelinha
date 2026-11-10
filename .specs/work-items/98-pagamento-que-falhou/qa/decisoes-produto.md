# Decisões de produto — QA do WI 98

| # | Rodada | Pergunta | Resposta | Destino | Data |
| - | ------ | -------- | -------- | ------- | ---- |
| QA-P1 | 1 | Pedido gravado fora da loja (sem cobrança calculada pela loja; total gravado ≠ itens + frete, ex.: #0563 com R$ 10,00) e não pago: a cliente pode gerar um PIX novo? Por qual valor? | **Não oferece pagar de novo: o pedido mostra que a Adri combina o pagamento e o botão do WhatsApp** (opção 1). A primeira resposta pela página foi "gera pelo valor gravado"; reaberta no chat por risco de segurança — pedido gravado direto no banco com total qualquer é indistinguível de um forjado enquanto as policies de `INSERT` em `orders` seguem abertas (BL-030) — e o humano escolheu a opção 1. | escopo deste WI — fix task 19 (complementa CA-01.6) | 2026-11-10 |
