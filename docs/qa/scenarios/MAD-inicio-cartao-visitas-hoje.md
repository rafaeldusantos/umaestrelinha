---
id: MAD-inicio-cartao-visitas-hoje
area: MAD
title: O cartão Visitas hoje na Início
persona: Adri no celular
journey: J-acompanhar-a-loja
expected: Abaixo da faixa escura e acima de Precisa de você, o cartão mostra o mesmo Visitas de Hoje da faixa (0 quando zero, nunca some); carregando mostra traço e o toque abre /ao-vivo; falha mostra Não consegui carregar. e o toque relê sem navegar; a Início relê a cada 30 s só visível
entry_points: /
qa_status: untested
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report:
overlaps: MAD-aovivo-abrir-pelo-cartao, MAD-inicio-abrir-e-entender-o-dia
---

Feature `83` (`LAV-04`, `LAV-05`). Nome acessível por estado: "Visitas hoje, {n}. Abrir loja ao vivo" / "…carregando…" / "Visitas hoje: não consegui carregar. Tentar de novo". Sem "pessoas", sem sacola, sem mini gráfico, sem "Ao vivo em breve".
