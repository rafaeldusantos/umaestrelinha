---
id: MAD-clientes-com-leitor-de-tela
area: MAD
title: Lista de clientes pelo TalkBack
persona: Equipe com TalkBack
journey: J-achar-uma-cliente
expected: Cada linha anuncia nome, compras, total e se está em aberto; chips anunciam o selecionado; busca tem rótulo; mudanças de contagem e erros são anunciados; foco sensato ao voltar
entry_points: /clientes
qa_status: fail
bug_ids: [BUG-20261024-linha-do-cliente-so-diz-o-nome, BUG-20261024-vazio-da-busca-nao-e-anunciado]
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-24-clientes-leitor-de-tela.txt
last_report: reports/2026-10-24-mobile-adm-clientes-leitor-de-tela.md
overlaps: 
---

Feature `76` (Navegador: árvore de acessibilidade. TalkBack real é blocked-verify.)

Rodada QA 1 (2026-10-24): campo, chips (`[pressed]`), contagem viva, `role="alert"` da falha, foco no `h1` ao voltar: ok. Falhou: linha lê só o nome; vazio não anunciado. TalkBack real continua `blocked-verify`.
