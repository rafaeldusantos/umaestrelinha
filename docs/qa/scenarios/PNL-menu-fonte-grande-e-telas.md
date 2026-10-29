---
id: PNL-menu-fonte-grande-e-telas
area: PNL
title: Usar a tela com fonte 130 % e 200 % em 390, 1024 e 1440
persona: Adri montando o menu
journey: J-montar-o-menu-da-loja
expected: Sem rolagem lateral do body, nomes dos itens legíveis (não reduzidos a Joi…), controles ≥ 44px, seletor e editor cabem
entry_points: /admin/menu com html { font-size } 130/200 % em 360, 390, 1024, 1440
qa_status: pass
bug_ids: BUG-20261028-controles-do-menu-saem-da-tela-com-fonte-grande
fix_status: fixed
retest_status: verified
fix_commits:
evidence: evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-16-menu-390-fonte200.png; evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-17-linha-e-submenu-390-fonte200.png; evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-18-seletor-390-fonte200.png; evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-19-editor-390-fonte200.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste/r2-09-lista-390-fonte200.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste/r2-10-seletor-390-fonte200.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3/r3-08-seletor-categoria-390-200.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3/r3-09-seletor-pagina-390-200.png
last_report: reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3.md
overlaps: 
---

Feature `86`. MNM-06. A prova mediu só 100 %. Abaixo de 44 conhecidos e fora da 86: X do Dialog, busca do MenuIconPicker, barra do palco da prévia — anotar, não reprovar a 86 por eles. O 11rem do corpo em 1024/1440 com subtítulo embrulhando está pendente desde a 47.

**Rodada 3 (2026-10-29).** Seletor em 360/390/412 × 130/200 %: zero elementos com `text-overflow: ellipsis` nas duas abas, nada fora da tela, body = janela, diálogo sem rolagem lateral (R05).
