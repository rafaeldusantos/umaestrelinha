---
id: MAD-aovivo-linha-de-frescor
area: MAD
title: A linha de frescor diz há quanto tempo os números chegaram
persona: Adri no celular
journey: J-ver-a-loja-ao-vivo
expected: Atualizado agora abaixo de 2 s; Atualizado há {s} s de 2 a 59 s (truncado); Atualizado há {m} min a partir de 60 s; Não consegui atualizar agora. quando a releitura falhou com dado na tela; nada sem dado
entry_points: /ao-vivo
qa_status: untested
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report:
overlaps: MAD-aovivo-leitura-falha-tentar-de-novo
---

Feature `83` (`LAV-07`). A duração é contada desde a chegada da resposta: mudar o relógio do aparelho não pode mudar a frase.
