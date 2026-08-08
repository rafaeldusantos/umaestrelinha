---
id: ADR-blocos-colapsados-na-recompra
area: ADR
title: Cliente recorrente encontra Contato e Entrega já prontos e colapsados
persona: Marina
journey: J-recompra-endereco-salvo
expected: Com addresses.is_default salvo e 2+ opções cotadas, o bloco Entrega nasce COLAPSADO com a mais barata selecionada
entry_points: http://localhost:8080/checkout
qa_status: untested
bug_ids: 
fix_status:
retest_status:
fix_commits:
evidence:
last_report: ../reports/2026-07-28-checkout-08-09.md
overlaps: 
---

ADR-02. **Este AC já falhou uma vez**: colapsar exige `shipping !== null`, e semear o endereço não
selecionava frete nenhum — com 2+ opções o bloco abria expandido. Corrigido pré-selecionando a mais barata.

Andar com **2 ou mais** opções cotadas, não com uma (com uma só já funcionava antes).
