---
id: MAD-envelope-colocar-em-producao
area: MAD
title: Colocar em produção pelo bloco Material
persona: Adri no celular
journey: J-registrar-envelope-da-cliente
expected: Grava em_producao, diz Pedido em produção. com o nome, foco no título; dois toques saem uma vez; a falha diz onde foi
entry_points: /pedidos/<id> material_recebido → Colocar em produção
qa_status: blocked-decision
bug_ids: BUG-20261026-erro-de-uma-acao-aparece-em-outra
fix_status: pending
retest_status: 
fix_commits: 
evidence: evidence/2026-10-26-mobile-adm-envelope-da-cliente/s6-producao-falhou.png
last_report: reports/2026-10-26-mobile-adm-envelope-da-cliente.md
overlaps: 
---

Dois toques com a rede falhando ⇒ uma chamada. Sucesso ok. A falha aparece no rodapé, acima de "Iniciar separação" (decisão, bug compartilhado).
