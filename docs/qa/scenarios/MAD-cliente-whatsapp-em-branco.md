---
id: MAD-cliente-whatsapp-em-branco
area: MAD
title: Conversar no WhatsApp abre a conversa em branco no número certo
persona: Adri no celular
journey: J-ver-uma-cliente
expected: O botão (44 px, largura inteira) existe só com telefone válido; abre wa.me com 55 e o número normalizado em nova aba, sem texto pronto; o telefone aparece mascarado; sem telefone válido, nem botão nem linha
entry_points: /clientes/<id> → Conversar no WhatsApp
qa_status: blocked-verify
bug_ids: 
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-24-mobile-adm-clientes/sessao-colar.txt
last_report: reports/2026-10-24-mobile-adm-clientes-achar-quem-me-escreveu.md
overlaps: MAD-pedido-whatsapp-da-cliente
---

Feature `76` (`MAC-17`, `MAC-26`, A12, A13. Verificar o href, não só a existência; +55 e máscara na entrada. O BlocoCliente do pedido mantém a mesma saída (ver MAD-pedido-whatsapp-da-cliente). Abrir o app do WhatsApp é blocked-verify.)

Rodada 1 (CH-clientes-achar-quem-me-escreveu, 2026-10-24): href conferido (https://wa.me/55…, _blank, noopener) em máscara, +55, com 55 e fixo; sem telefone válido nem botão. Abrir o app do WhatsApp num aparelho fica para a dona.
