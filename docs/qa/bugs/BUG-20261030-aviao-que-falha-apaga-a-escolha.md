# BUG-20261030-aviao-que-falha-apaga-a-escolha: Quando o avião falha, a linha "não enviado" vira "Falha ao enviar" e a escolha some do histórico

- **Status:** verified (2026-10-30, reteste em navegador; working tree, sem commit) — A-15 segue n — confirmar
- **Impact (user-side):** Trust-Damage
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri despachando pedidos
- **Journey Step:** J-mudar-pedido-com-ou-sem-aviso, passo 'toca o avião'
- **Scenarios:** PNL-aviso-aviao-envia-depois
- **Found:** 2026-10-30 · **Report:** reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos.md
- **AC:** AVS-13

## Summary

A Adri desmarcou o aviso, depois mudou de ideia e tocou o avião. O provedor de e-mail estava fora: o aviso diz "O e-mail “Pedido postado” não saiu. Tente de novo.", mas a linha "Aviso à cliente não enviado · Você escolheu não avisar" desaparece e no lugar fica "Falha ao enviar o aviso: Pedido postado (E-mail)" com o erro técnico cru do provedor e um botão "Reenviar" (o avião sumiu). A spec manda a linha continuar skipped na falha (AVS-13); o design (claim → finish) a leva a failed. O comportamento é coerente com o motor e oferece Reenviar, mas a anotação da escolha da Adri deixa de existir.

## Reproduction

- **Charter:** CH-aviso-acertar-o-registro-sem-reavisar · **Tour:** Money Tour
- **Environment:** Chromium 1440×900; motor servido com o provedor inalcançável (desvio do probe 02)

1. Pedido Em Separação com rastreio; Marcar como enviado; desmarcar a caixa; confirmar.
2. No Histórico, tocar o avião da linha "Aviso à cliente não enviado: Pedido postado" com o provedor de e-mail fora do ar.

**Expected:** (AVS-13) "o e-mail não saiu" e a linha continua "não enviado" com o avião.
**Actual:** A linha vira failed no banco (attempts 2) e no Histórico aparece "Falha ao enviar…" com o texto 'error sending request for url (https://api.resend.com/emails)…' e "Reenviar".

## Evidence

- order_notifications de QA88-02: skipped → failed, attempts 2
- toast: O e-mail “Pedido postado” não saiu. Tente de novo.

## Fix (2026-10-30)

Decisão `A-15` (pela recomendação do QA — **n — confirmar**): o motor não muda (a linha vai a
`failed`). A letra de AVS-13 foi emendada: na falha, a linha mostra "A tentativa de envio falhou" com
"Reenviar"; o erro cru do provedor vai para um "Detalhe técnico" recolhido (`<details>`). Vale para
toda linha de e-mail que falhou (a linha `failed` não distingue a origem).

- Arquivo: `features/order-detail/ui/OrderHistory.tsx`.
- Teste (vermelho antes): `AdminOrderPage.aviso.test.tsx`, "conserto do QA — a falha do avião fica
  legível". Mutante Q4 morto por asserção.

## Verification

- **Retested:** 2026-10-30, Adri despachando pedidos, Chromium 1440×900 e 390×844, motor servido com o desvio do probe 02 · **Report:** reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos-reteste.md
- **Result:** QA88R-02 (1440) e QA88R-10 (390): desmarcar → linha "Aviso à cliente não enviado: Pedido postado · Você escolheu não avisar" com o avião (44×44 em 390). Tocar o avião: "Enviando…", aviso "O e-mail “Pedido postado” não saiu. Tente de novo."; a linha vira "Falha ao enviar o aviso: Pedido postado (E-mail)" com **"A tentativa de envio falhou"** e "Reenviar"; o erro cru ("error sending request for url (https://api.resend.com/emails)…") só aparece dentro de "Detalhe técnico", um `<details>` fechado por padrão. Banco: `failed`, attempts 2 (motor inalterado, A-15). Evidência `evidence/2026-10-30-aviso-opcional-reteste/r4-linha-nao-enviado-antes-do-aviao-1440.png`, `evidence/2026-10-30-aviso-opcional-reteste/r4-aviao-falhou-1440.png`, `evidence/2026-10-30-aviso-opcional-reteste/r4-aviao-falhou-detalhe-aberto-1440.png`, `evidence/2026-10-30-aviso-opcional-reteste/r9-aviao-falhou-390.png`.
