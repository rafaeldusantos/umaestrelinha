---
id: MAD-envelope-queda-curta-com-folha-aberta
area: MAD
title: Um segundo sem rede com a folha aberta
persona: Adri no celular
journey: J-registrar-envelope-da-cliente
expected: Um piscar da rede não apaga o código que ela estava digitando
entry_points: Folha do envelope aberta → rede cai 1 s
qa_status: blocked-decision
bug_ids: BUG-20261026-queda-curta-de-rede-apaga-o-codigo
fix_status: pending
retest_status: 
fix_commits: 
evidence: 
last_report: reports/2026-10-26-mobile-adm-envelope-da-cliente.md
overlaps: 
---

1 s offline ⇒ Sem conexão desmonta o app (`MAF-19`); na volta a folha some, o digitado se perde e o foco cai no `<body>`.
