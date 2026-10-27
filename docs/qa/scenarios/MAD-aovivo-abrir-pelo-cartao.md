---
id: MAD-aovivo-abrir-pelo-cartao
area: MAD
title: Abrir a Loja ao vivo pelo cartão Visitas hoje
persona: Adri no celular
journey: J-ver-a-loja-ao-vivo
expected: Tocar o cartão abre /ao-vivo no período escolhido na faixa da Início, sem barra de abas, com o h1 Loja ao vivo focado e o título Loja ao vivo · Ateliê
entry_points: /; /ao-vivo
qa_status: untested
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report:
overlaps: MAD-inicio-cartao-visitas-hoje
---

Feature `83` (`LAV-04`, `LAV-06`, `LAV-62`). Conferir que a URL não leva query: o período vai em `history.state` (`{ doApp: true, periodo }`).
