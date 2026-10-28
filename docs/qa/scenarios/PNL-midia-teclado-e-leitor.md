---
id: PNL-midia-teclado-e-leitor
area: PNL
title: Zoom e modal Mídia só pelo teclado e pela árvore de acessibilidade
persona: Equipe com TalkBack
journey: J-ver-e-cuidar-das-fotos-da-peca
expected: Cada imagem é botão 'Ampliar imagem n de N'; o +N anuncia 'Ver mais N imagens'; o foco fica preso no zoom e no modal e volta à origem ao fechar (imagem / Editar mídia); progresso e falha de envio são anunciados; o véu Solte para enviar não rouba foco
entry_points: Resumo
qa_status: fail
bug_ids: BUG-20261028-foco-cai-no-body-quando-a-pendencia-de-imagem-se-resolve;BUG-20261028-envio-de-fotos-nao-e-anunciado-ao-leitor;BUG-20261028-ordenar-fotos-so-arrastando;BUG-20261026-fechar-do-modal-em-ingles
fix_status: pending
retest_status:
fix_commits:
evidence: reports/2026-10-28-backoffice-resumo-com-imagens.md
last_report: reports/2026-10-28-backoffice-resumo-com-imagens.md
overlaps: 
---

ZOM-01, ZOM-05, consertos 2 e 3 da prova-navegador.md (foco do modal no body; plural do +1). TalkBack real só no aparelho.
