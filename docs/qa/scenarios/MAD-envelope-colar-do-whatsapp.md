---
id: MAD-envelope-colar-do-whatsapp
area: MAD
title: Colar o código vindo do WhatsApp
persona: Adri no celular
journey: J-registrar-envelope-da-cliente
expected: O código colado chega ao campo sem espaços, sem caracteres invisíveis e em maiúsculas; o que fica gravado é o que os Correios entendem
entry_points: Folha do envelope → colar
qa_status: pass
bug_ids: BUG-20261026-codigo-colado-leva-caractere-invisivel;BUG-20261026-codigo-com-hifen-ou-espaco-gravado
fix_status: fixed
retest_status: pass
fix_commits: sem commit (pedido do usuário)
evidence: evidence/2026-10-26-mobile-adm-envelope-da-cliente/s2-codigo-invisivel.png
last_report: reports/2026-10-26-mobile-adm-envelope-da-cliente.md
overlaps: 
---

Paste Tour: espaços, NBSP, quebra de linha, minúsculas ⇒ limpos. Espaço de largura zero e marcas de direção do WhatsApp ficavam (consertado). Hífen/ponto e a frase inteira colada passam e são gravados — decisão (`BUG-20261026-codigo-com-hifen-ou-espaco-gravado`).
