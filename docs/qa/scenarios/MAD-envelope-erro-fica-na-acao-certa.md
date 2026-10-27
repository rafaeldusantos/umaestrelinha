---
id: MAD-envelope-erro-fica-na-acao-certa
area: MAD
title: O erro de uma ação aparece só onde ela foi feita
persona: Adri no celular
journey: J-registrar-envelope-da-cliente
expected: A falha do envelope ou de Colocar em produção não vira erro do botão do rodapé, e a falha do rodapé não aparece na folha do envelope
entry_points: /pedidos/<id>: rodapé, folha do envelope, Colocar em produção
qa_status: blocked-decision
bug_ids: BUG-20261026-erro-de-uma-acao-aparece-em-outra
fix_status: pending
retest_status: 
fix_commits: 
evidence: evidence/2026-10-26-mobile-adm-envelope-da-cliente/s3-erro-do-envelope-no-rodape.png;evidence/2026-10-26-mobile-adm-envelope-da-cliente/s3-erro-do-rodape-na-folha.png;evidence/2026-10-26-mobile-adm-envelope-da-cliente/s6-producao-falhou.png
last_report: reports/2026-10-26-mobile-adm-envelope-da-cliente.md
overlaps: MAD-acao-falha-de-rede-ao-salvar
---

O erro é por pedido, em módulo (`erros.ts`, `75`). Com três superfícies de ação no mesmo pedido, ele aparece na superfície errada.
