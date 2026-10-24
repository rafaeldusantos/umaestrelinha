---
id: MAD-acao-lembrete-whatsapp
area: MAD
title: Lembrar a cliente do envio do material pelo WhatsApp
persona: Adri no celular
journey: J-registrar-material-e-envio
expected: Com material aguardando e telefone válido, Lembrar do envio no WhatsApp abre wa.me do número certo com a mesma mensagem do painel, sem nomear o material e sem urgência, e nada é gravado
entry_points: /pedidos/<id> com aguardando_material → bloco Material → Lembrar do envio no WhatsApp
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-acoes-do-pedido.md
overlaps: MAD-pedido-whatsapp-da-cliente
---

Feature `75` (`MAA-17`..`MAA-19`, A17/A18/A19, `BL-015`). Comparar o `text=` decodificado com o que o painel monta para o mesmo pedido no mesmo instante (byte a byte). Idade pela hora de `atelie_clock`, não do aparelho (pedido de 84 dias). Ausente: sem telefone, telefone que não normaliza, `material_enviado`, cancelado. Abrir o WhatsApp de verdade é `blocked-verify`; o que se prova é o destino do link. Ler a mensagem com o tom da marca: memorial, primeira pessoa da Adri.
