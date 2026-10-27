---
id: MAD-envelope-rede-cai-ao-salvar
area: MAD
title: A rede cai no meio do Salvar
persona: Adri no celular
journey: J-registrar-envelope-da-cliente
expected: Se o servidor gravou, a tela não diz que falhou e o aviso à cliente não se perde; se não gravou, a falha é clara e dá para tentar de novo
entry_points: Folha do envelope → Salvar → rede cai
qa_status: blocked-decision
bug_ids: BUG-20261026-rede-cai-ao-salvar-diz-que-nao-salvou;BUG-20261026-erro-de-uma-acao-aparece-em-outra
fix_status: pending
retest_status: 
fix_commits: 
evidence: evidence/2026-10-26-mobile-adm-envelope-da-cliente/s3-offline-no-meio.png;evidence/2026-10-26-mobile-adm-envelope-da-cliente/s3-volta-da-rede.png;evidence/2026-10-26-mobile-adm-envelope-da-cliente/s3-falha-na-folha.png
last_report: reports/2026-10-26-mobile-adm-envelope-da-cliente.md
overlaps: 
---

Network Tour. Falha de rede pura: folha aberta com "Não consegui salvar. Tente de novo." (ok). Resposta perdida com o servidor tendo gravado: na volta, o cartão diz "Registrado por você agora" e um alerta diz que não salvou; o gatilho `material_tracking_set` nunca saiu.
