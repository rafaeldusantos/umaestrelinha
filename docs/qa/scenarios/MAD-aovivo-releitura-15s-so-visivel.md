---
id: MAD-aovivo-releitura-15s-so-visivel
area: MAD
title: A tela relê a cada 15 s só com a aba visível
persona: Adri no celular
journey: J-ver-a-loja-ao-vivo
expected: Com a aba visível, uma leitura a cada 15 s e o frescor volta a Atualizado agora; com a aba oculta, nenhuma leitura (nem a da virada do dia); ao voltar, uma leitura na hora
entry_points: /ao-vivo
qa_status: untested
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report:
overlaps: MAD-inicio-cartao-visitas-hoje
---

Feature `83` (`LAV-08`). No Playwright, ocultar com `visibilityState` + `visibilitychange` com `bubbles: true` (achado do método na prova T13). O Android real (Chrome em segundo plano) fica `blocked-verify` até alguém andar no aparelho.
