---
id: PNL-menu-falha-de-rede-ao-gravar
area: PNL
title: A gravação falha por rede
persona: Adri montando o menu
journey: J-montar-o-menu-da-loja
expected: Com o PATCH de store_settings abortado ou em 500, a tela volta ao estado anterior e diz que não salvou — nunca Salvo
entry_points: /admin/menu com **/rest/v1/store_settings* interceptado
qa_status: pass
bug_ids: BUG-20261028-resposta-perdida-tela-diz-que-nao-salvou;BUG-20261028-erro-de-leitura-do-menu-mostra-typeerror; BUG-20261029-incerteza-de-gravacao-com-titulo-nao-salvou
fix_status: fixed
retest_status: verified
fix_commits:
evidence: evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-05-conflito-falso-apos-resposta-perdida-390.png; evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-06-leitura-falhou-390.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste/r2-04-nao-deu-para-confirmar-390.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3/r3-07-incerto-titulo-neutro-390.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4/r4-05-incerteza-390-incerto.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4/r4-05-incerteza-390-relido.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4/r4-05-incerteza-1440-incerto.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4/r4-05-incerteza-1440-relido.png
last_report: reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4.md
overlaps: 
---

Feature `86`. MNM-38. Testar em adicionar, mover, remover, chave e editor. Rede que cai DEPOIS do servidor gravar (route.fetch + offline) — o que a tela diz? Recarregar e comparar com o banco. Leitura que falha ao abrir: faixa de erro com Tentar de novo, nunca o vazio (MNM-05).

**Rodada 3 (2026-10-29).** Incerteza com o título "Não deu para confirmar", sem variante de erro; PATCH 500 segue "Não salvou".

**Rodada 4 (2026-10-29).** Gravou com a resposta perdida: "Não deu para confirmar" (~7 s, retentativas do supabase-js), tela no valor de antes; com a rede de volta a tela se corrige sozinha em 3,9 s (390) / 11,9 s (1440, depois de 75 s sem rede), `Salvo`, sem conflito, zero PATCH novo. Não gravou: tela fica no de antes, sem `Salvo`, sem conflito. Releituras sem rede: rajadas de 1+3 GETs nas esperas 0·1·2·4·8·15 s e depois a cada ~15 s (23 GETs em 75 s); depois de resolver, **0** requisições a `store_settings` em 60 s (1 GET no caso "não gravou", a releitura que resolve). Menu estável: 0 em 30 s. Ação seguinte grava sem conflito; recarregar mostra o banco.
