---
id: MAD-aovivo-fonte-grande-e-telas-estreitas
area: MAD
title: Loja ao vivo a 130 % e 200 % de fonte e em telas estreitas
persona: Adri no celular
journey: J-ver-a-loja-ao-vivo
expected: Em 360/390/412 e 1440 a 100/130/200 %: sem rolagem horizontal do body, números sem sobreposição e na largura do cartão, a 200 % no celular uma coluna, o gráfico rola dentro do próprio cartão, alvos ≥ 44 px, cabeçalho sticky de borda a borda
entry_points: /ao-vivo
qa_status: untested
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report:
overlaps: MAD-inicio-numeros-grandes
---

Feature `83` (`LAV-63`, `LAV-07`). A T13 escalou pela raiz (`html { font-size }`), e os textos em px fixo não crescem: conferir também com a escala de texto do Android real (`blocked-verify`). BL-058 (Descontos na barra de abas a 200 %) é anterior à 83.
