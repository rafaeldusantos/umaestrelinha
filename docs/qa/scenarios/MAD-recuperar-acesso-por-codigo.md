---
id: MAD-recuperar-acesso-por-codigo
area: MAD
title: Recuperar o acesso com o código de 6 dígitos
persona: Adri recuperando o acesso
journey: J-recuperar-acesso
expected: O código do e-mail abre o passo da senha nova, e a senha gravada leva à Início
entry_points: /login → Esqueci minha senha
qa_status: pass
bug_ids: BUG-20261022-codigo-recebido-sem-onde-digitar; BUG-20261022-codigo-colado-com-espaco-recusado; BUG-20261022-voltar-na-recuperacao-sai-do-app; BUG-20261022-voltar-depois-de-salvar-volta-a-recuperacao
fix_status: fixed
retest_status: pass
fix_commits: working tree, sem commit
evidence: evidence/2026-10-22-mobile-adm-fundacao-reteste/R2-codigo.png; evidence/2026-10-22-mobile-adm-fundacao-reteste/R2-ja-enviamos.png; evidence/2026-10-22-mobile-adm-fundacao-reteste/R2-senha.png; evidence/2026-10-22-mobile-adm-fundacao-reteste/R2-voltar-depois-de-salvar-senha-qa-1.png; evidence/2026-10-22-mobile-adm-fundacao-reteste-2/R1-voltar-da-inicio-senha-qa-2.png; evidence/2026-10-22-mobile-adm-fundacao-reteste-2/R1-voltar-da-inicio-senha-qa-1.png
last_report: reports/2026-10-22-mobile-adm-fundacao-reteste-2.md
overlaps: 
---

O código chegando por e-mail de verdade é externo: com Supabase interceptado, a sessão prova os passos; o e-mail real fica `blocked-verify` numa rodada com o banco local (Mailpit :54444).
