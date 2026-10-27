---
id: MAD-envelope-conta-sem-papel
area: MAD
title: Conta sem papel não vê nem grava o envelope
persona: Cliente com conta da loja
journey: J-registrar-envelope-da-cliente
expected: A conta da loja recebe Esta conta não tem acesso ao painel. sem nada do pedido; a admin que perde o papel com a folha aberta é recusada e nada é gravado
entry_points: /login com conta de cliente; /pedidos/<id> com papel removido
qa_status: pass
bug_ids: 
fix_status: 
retest_status: 
fix_commits: 
evidence: evidence/2026-10-26-mobile-adm-envelope-da-cliente/s5-perdeu-papel-com-folha.png
last_report: reports/2026-10-26-mobile-adm-envelope-da-cliente.md
overlaps: MAD-acao-conta-sem-papel-nao-grava
---

`cliente.qa`: recusa, nada do pedido, zero escritas. `adri.qa` perdendo o papel com a folha aberta: RPC `not_allowed` → `atelie_clock` 42501 → Login com a recusa; nenhuma confirmação em instante nenhum (lido a cada 60 ms); banco intacto. Papel devolvido com o mesmo `id`.
