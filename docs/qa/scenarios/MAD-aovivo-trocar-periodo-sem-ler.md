---
id: MAD-aovivo-trocar-periodo-sem-ler
area: MAD
title: Trocar Hoje, Ontem e Semana não faz leitura nova
persona: Adri no celular
journey: J-ver-a-loja-ao-vivo
expected: Os três cartões e o gráfico trocam no toque, só o período tocado fica aria-pressed, e nenhuma chamada a store_movement sai na troca
entry_points: /ao-vivo
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-27-mobile-adm-loja-ao-vivo.md
overlaps: MAD-inicio-trocar-periodo
---

Feature `83` (`LAV-50`, `LAV-08`). Contar as requisições a `/rest/v1/rpc/store_movement` no momento do toque.
