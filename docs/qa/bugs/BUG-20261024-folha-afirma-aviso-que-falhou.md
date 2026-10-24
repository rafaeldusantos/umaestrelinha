# BUG-20261024-folha-afirma-aviso-que-falhou: "Alterar rastreio" diz que a cliente já recebeu o aviso de postagem quando ele falhou

- **Status:** verified (retestado em navegador, 2026-10-24, rodada 2 — reports/2026-10-24-mobile-adm-acoes-do-pedido-reteste.md)
- **Impact (user-side):** Trust-Damage
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri no celular
- **Journey Step:** J-registrar-material-e-envio — Entrega → "Alterar" (pedido `shipped` com código)
- **Scenarios:** MAD-acao-rastreio-informar-ou-alterar
- **Requirements:** A10 (frase 2), A11, `AD-008`
- **Found:** 2026-10-24 · **Report:** reports/2026-10-24-mobile-adm-acoes-do-pedido.md

## Summary

A frase da folha "Alterar rastreio" é escolhida só pelo par (status, código anterior): "A cliente já recebeu
o aviso de postagem. O código novo aparece no pedido dela, mas não gera outro e-mail." Com o `order_shipped`
em `failed` (o histórico, na mesma tela, diz "Falha ao enviar o aviso: Pedido postado (E-mail)"), as duas
metades são falsas: ela não recebeu, e cada "Alterar" REENVIA o aviso que falhou
(`order_notifications.attempts` subiu de 1 para 3 com dois "Alterar") — se o envio der certo, sai um e-mail.
A confirmação "Rastreio salvo. · O código ficou no pedido." também não diz que o aviso saiu.

## Reproduction

- **Charter:** CH-acoes-registrar-o-dia-no-celular · **Tour:** Money Tour
- **Environment:** `pnpm dev:mobile-adm` (:8084), Supabase local, `send-notification` servida com
  `RESEND_API_KEY` inválida (todo envio falha)

1. Pedido em separação (`P75-N1`) → "Marcar como enviado" → código válido → Salvar.
2. Histórico: "Falha ao enviar o aviso: Pedido postado (E-mail)".
3. Entrega → "Alterar".

**Expected:** a folha não afirma que a cliente recebeu um aviso que o histórico mostra como falho (ex.: frase
neutra "O código aparece no pedido dela." quando o `order_shipped` não está `sent`).
**Actual:** "A cliente já recebeu o aviso de postagem. … não gera outro e-mail."; no banco `order_shipped`
`failed`, `attempts = 3`.

## Notes

O comportamento é o que A10 especifica (critério só por status e código), por isso é decisão de spec: a folha
precisaria ler o estado do `order_shipped` (o detalhe já lê `order_notifications` para o histórico).

## Fix (2026-10-24, task C02)

- **Causa:** `trackingSheet` escolhia a frase 2 só pelo par (status, código) — a letra de A10 —, sem saber
  se o `order_shipped` saiu.
- **Conserto (em `core`, o dono):** `shippedNoticeSent(rows)` em `packages/core/src/orders/appAction.ts`
  (o `order_shipped` em `sent`) e `trackingSheet(row, origem, { avisoDePostagemSaiu })`: a frase 2 só com o
  aviso saído; falho, pendente, ausente ou desconhecido ⇒ "O código aparece no pedido dela." (a neutra de
  `delivered`). O detalhe (`apps/mobile-adm/src/entities/order/api/usePedido.ts`) calcula
  `avisoDePostagemSaiu` das mesmas linhas de `order_notifications` que o histórico lê (`false` se a leitura
  falhou) e a página o passa a "Alterar" (`EditarRastreio` → `useFolhaNoHistorico`). A confirmação segue sem
  citar e-mail no "Alterar". SPEC_DEVIATION em A10, declarado no código.
- **Prova:** 4 testes reprovaram antes (core, folha e a página pelo `<App />` real com o `order_shipped` em
  `failed`); 5 mutantes reinjetados no arquivo real (o defeito original incluso), SHA-256 conferido, todos
  mortos por asserção. Suítes: mobile-adm 1089/76, core 4219/166, store 5885/320, backoffice 3696/212;
  `tsc` 0 nos três apps (core 11 herdados).
- **Fica de fora:** o "Alterar" com o aviso falho continua REENVIANDO o `order_shipped` (o disparo do fim é
  o do painel, `claim_order_notification` retoma o `failed`); a folha agora não nega nem promete esse e-mail.
  Reteste em navegador: repetir o percurso da Reproduction e ver a frase neutra.

## Retest (2026-10-24, rodada 2)

Verificado em navegador real (Chromium via Playwright, 390×844, `pnpm dev:mobile-adm` do worktree, Supabase
local sem interceptar o banco). Detalhe e números em `reports/2026-10-24-mobile-adm-acoes-do-pedido-reteste.md`.
