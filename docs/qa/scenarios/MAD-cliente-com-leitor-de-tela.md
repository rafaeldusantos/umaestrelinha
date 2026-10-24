---
id: MAD-cliente-com-leitor-de-tela
area: MAD
title: Ficha pelo TalkBack
persona: Equipe com TalkBack
journey: J-ver-uma-cliente
expected: Título anunciado ao abrir, números lidos com seus rótulos, link do WhatsApp anuncia que abre outra aba, cada pedido anuncia número, total e situação; Ver mais pedidos anuncia a quantidade
entry_points: /clientes/<id>
qa_status: fail
bug_ids: [BUG-20261024-ver-mais-pedidos-foco-cai-no-body, BUG-20261024-whatsapp-da-ficha-nao-avisa-nova-aba]
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-24-clientes-leitor-de-tela.txt
last_report: reports/2026-10-24-mobile-adm-clientes-leitor-de-tela.md
overlaps: 
---

Feature `76` (Navegador: árvore de acessibilidade. TalkBack real é blocked-verify.)

Rodada QA 1 (2026-10-24): foco no `h1` ao abrir (e ao voltar do pedido), números lidos rótulo e valor, aba Clientes `aria-current`, falha de "Ver cliente" em `role="alert"`: ok. Falhou: WhatsApp sem aviso de nova aba; foco no `body` depois de "Ver mais pedidos". TalkBack real continua `blocked-verify`.
