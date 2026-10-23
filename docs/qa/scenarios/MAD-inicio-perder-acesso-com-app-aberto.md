---
id: MAD-inicio-perder-acesso-com-app-aberto
area: MAD
title: Perder o papel admin com a Início aberta
persona: Adri no celular
journey: J-acompanhar-a-loja
expected: Ao voltar ao app ou na próxima releitura, a recusa Esta conta não tem acesso ao painel. com Sair, sem número em nenhum quadro
entry_points: /
qa_status: pass
bug_ids: 
fix_status: 
retest_status:
fix_commits:
evidence: evidence/2026-10-22-mobile-adm-inicio/CH-acesso-01-recusa-412.png; evidence/2026-10-22-mobile-adm-inicio/CH-acesso-02-recusa-ao-puxar-360.png
last_report: reports/2026-10-22-mobile-adm-inicio.md
overlaps: MAD-conta-sem-acesso-recusada
---

Feature `73` (`MAI-22`). O papel é tirado apagando a linha de `user_roles` da conta de QA (equivale a outra admin revogar em `/admin/usuarios`) e devolvido no fim.

QA 2026-10-22: pela volta ao app e pelo puxar, a recusa em ~70 ms, uma chamada de cada RPC (403) e
nenhum número depois. **Pelo Realtime, nada acontece**: sem o papel, a RLS de `orders` deixa de
entregar o aviso, e a tela fica com os números da última leitura boa (com a hora deles) até o próximo
foco, puxar ou virada. Registrado como aprendizado, não como defeito.
