---
id: MAD-envelope-com-leitor-de-tela
area: MAD
title: Envelope com leitor de tela
persona: Equipe com TalkBack
journey: J-registrar-envelope-da-cliente
expected: Nomes acessíveis, aviso anunciado em role=status, erro em role=alert, foco previsível depois de cada ação
entry_points: /pedidos/<id> pela árvore de acessibilidade e teclado
qa_status: blocked-decision
bug_ids: BUG-20261026-idade-da-espera-sem-contexto
fix_status: pending
retest_status: 
fix_commits: 
evidence: 
last_report: reports/2026-10-26-mobile-adm-envelope-da-cliente.md
overlaps: 
---

"Alterar o código do envelope", "Ver nos Correios (abre em outra aba)", diálogo nomeado "Código do envelope" com descrição, campo rotulado; aviso `role=status`, recusa e falha `role=alert`; foco: campo ao abrir, quem abriu ao fechar, `h1` quando o botão some. A espera é lida "há 10 dias" sem contexto. TalkBack real: blocked-verify.
