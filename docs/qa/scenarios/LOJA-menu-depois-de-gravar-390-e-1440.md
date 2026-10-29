---
id: LOJA-menu-depois-de-gravar-390-e-1440
area: LOJA
title: Navegar pelo menu depois da gravação, no celular e no notebook
persona: Cliente navegando pelo menu
journey: J-navegar-pelo-menu-da-loja
expected: A barra, o mega menu e a folha do celular mostram exatamente o que a prévia mostrava para cada dispositivo, cada item leva a uma página com conteúdo, sem rolagem lateral
entry_points: http://localhost:8082/ em 390x844 e 1440x900
qa_status: pass
bug_ids: BUG-20261028-voltar-depois-da-folha-perde-a-rolagem;BUG-20261028-outro-endereco-aceita-pagina-que-nao-existe
fix_status: 
retest_status:
fix_commits:
evidence: reports/2026-10-28-backoffice-menu-montado-pela-dona.md; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3/r3-12-loja-depois-1440.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3/r3-12-loja-depois-390.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4/r4-04-loja-1440.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4/r4-04-loja-390.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4/r4-12-loja-depois-1440.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4/r4-12-loja-depois-390.png
last_report: reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4.md
overlaps: PNL-menu-desligar-celular
---

Feature `86`. MNM-15, MNM-17, MNM-27, MNM-28, MNM-29. Item sem submenu nem banner no dispositivo é link direto (sem seta). Tocar cada item e cada filho: nenhum 404. Página já aberta durante a gravação: recarregar mostra o novo.

**Rodada 4 (2026-10-29).** Barra de 1440 e folha de 390 iguais às prévias Computador/Celular; itens gravados pela forma curta (Colares, Aneis, Nomes no submenu) abrem as coleções certas a partir do menu da loja, com query e fragmento preservados; `scrollWidth` = janela.
