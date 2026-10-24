---
id: MAD-clientes-carregar-mais-sem-repetir
area: MAD
title: Rolar a lista e carregar mais sem repetir nem pular
persona: Adri no celular
journey: J-achar-uma-cliente
expected: Acima de 25, Carregar mais lê por cursor; nenhum id repetido; a falha da página seguinte aparece no rodapé com Tentar de novo e a lista fica
entry_points: /clientes → fim da lista
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence: evidence/76-clientes/sessao.json
last_report: reports/2026-10-24-mobile-adm-clientes.md
overlaps: 
---

Feature `76` (`MAC-05`, `MAC-12`. Prova com 48 pessoas e com a fixtura de mais de 1000 se houver. Inserir cliente e pedido no banco entre duas páginas; cortar a rede na segunda página.)
