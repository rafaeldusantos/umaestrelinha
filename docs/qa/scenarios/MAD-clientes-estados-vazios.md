---
id: MAD-clientes-estados-vazios
area: MAD
title: Ver o vazio certo para cada caso, sem esqueleto eterno
persona: Adri no celular
journey: J-achar-uma-cliente
expected: Base vazia, recorte vazio e busca sem achado dizem frases próprias e calmas, com Limpar quando houver filtro; nunca zero como se fosse dado
entry_points: /clientes?recorte=em-aberto; busca sem resultado
qa_status: pass
bug_ids: 
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-24-mobile-adm-clientes/sessao-colar.txt
last_report: reports/2026-10-24-mobile-adm-clientes-achar-quem-me-escreveu.md
overlaps: 
---

Feature `76` (`MAC-10`. Frases: Ainda não há clientes. / Ninguém com pedido em aberto agora. / Não achei ninguém com o termo. Sem emoji nem exclamação.)

Rodada 1 (CH-clientes-achar-quem-me-escreveu, 2026-10-24): Base vazia, recorte vazio, busca sem achado e falha 500 dizem frases próprias; Limpar presente. Termo de 2500 caracteres é ecoado inteiro (paper cut).
