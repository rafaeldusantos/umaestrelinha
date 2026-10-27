---
id: MAD-aovivo-grafico-por-faixas
area: MAD
title: O gráfico por faixas de 3 horas e por dia
persona: Adri no celular
journey: J-ver-a-loja-ao-vivo
expected: Hoje e Ontem: 8 colunas 0h…21h com o valor em cima; em Hoje a faixa atual em dourado (accent só como barra), as anteriores em primary e as futuras como trilho de 4 px sem número; Semana: uma coluna por dia de segunda até hoje, a de hoje marcada; as notas Faixas de 3 horas… / Desde segunda-feira.
entry_points: /ao-vivo
qa_status: untested
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report:
overlaps: 
---

Feature `83` (`LAV-52`, `LAV-53`, `LAV-61`). A faixa atual vem do servidor (`acessos.faixa_atual`), nunca do relógio do aparelho: adiantar o relógio do aparelho não pode mudar a faixa. Dia todo em 0 ⇒ barras de 4 px com "0".
