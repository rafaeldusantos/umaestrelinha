---
id: PNL-menu-remover-com-confirmacao
area: PNL
title: Remover um item do menu principal
persona: Adri montando o menu
journey: J-montar-o-menu-da-loja
expected: A confirmação nomeia o item e quantos itens de submenu saem junto, Cancelar não remove, e depois de remover a categoria continua existindo e volta a ser escolhível
entry_points: /admin/menu → ⋯ → Remover do menu
qa_status: pass
bug_ids: BUG-20261028-foco-cai-no-body-ao-fechar-dialogos-do-menu
fix_status: 
retest_status:
fix_commits:
evidence: reports/2026-10-28-backoffice-menu-montado-pela-dona.md
last_report: reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste.md
overlaps: 
---

Feature `86`. MNM-20, MNM-21, MNM-23 (tirar do submenu não pede confirmação). Foco inicial no Cancelar; Esc cancela; foco volta a um lugar com sentido depois de remover (não o body). Toque duplo no Remover não remove dois.
