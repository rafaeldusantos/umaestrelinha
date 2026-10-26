# BUG-20261022-codigo-recebido-sem-onde-digitar: a Adri fecha o app com o código no e-mail e, ao voltar, não tem onde digitá-lo

- **Status:** fixed <!-- na working tree, sem commit (regra do usuário); `verified` depois do commit e do reteste -->
- **Impact (user-side):** Friction
- **Severity:** High · **Priority:** P2 <!-- Friction num journey P0 (recuperar o acesso à própria loja) ⇒ High -->
- **Persona Affected:** Adri recuperando o acesso
- **Journey Step:** J-recuperar-acesso, step 1 → 2 (abandono "o e-mail demora; ela fecha o app" e a retomada)
- **Scenarios:** MAD-recuperar-acesso-por-codigo
- **Found:** 2026-10-22 · **Report:** `docs/qa/reports/2026-10-22-mobile-adm-fundacao.md`

## Summary

A Adri pede o código, vai ao e-mail buscá-lo e o Android fecha o app (ou ela fecha). Quando volta, o
ateliê abre no Login — o passo do código não sobreviveu. Ela toca "Esqueci minha senha", digita o
e-mail de novo e toca "Enviar código": aparece "Aguarde alguns segundos para reenviar" e ela continua
no passo do **e-mail**. O código de 6 dígitos que está aberto no e-mail dela — e que ainda vale por
10 minutos — não tem onde ser digitado. A única saída é esperar e pedir outro, o que **invalida** o
que ela tem na mão (medido: o código anterior passa a responder "Código inválido ou expirado").

## Reproduction

- **Charter:** CH-recuperar-acesso-pelo-celular · **Tour:** Interrupt Tour
- **Environment:** Android emulado 390×844, Chrome (UA Android 14), pt-BR, build servido, Supabase local real, e-mail no Mailpit

1. Login → "Esqueci minha senha" → e-mail → "Enviar código" ⇒ passo do código, "Enviamos um código de 6 dígitos para …".
2. Fechar o app (fechar a aba) antes de digitar o código.
3. Reabrir o app em menos de 60 s ⇒ Login.
4. "Esqueci minha senha" → o mesmo e-mail → "Enviar código".

**Expected:** chegar ao passo do código (com o reenvio contando), para digitar o código que já chegou.
**Actual:** "Aguarde alguns segundos para reenviar", ainda no passo do e-mail; o `POST /auth/v1/recover` responde 429. Depois de esperar, um código novo invalida o anterior.

## Evidence

- `docs/qa/evidence/2026-10-22-mobile-adm-fundacao/CH-recuperar-03-pedido-antes-de-60s.png`
- Leitura independente: o Mailpit mostra o primeiro e-mail com o código válido (`12:31:26Z`) e nenhum segundo envio no momento da recusa.

## Fix

- **Root cause:** o passo da recuperação morava só em estado de memória do `RecoveryFlow` (sumia ao fechar o app), e o passo do e-mail tratava o 429 do GoTrue como erro de envio em vez de "já enviamos há pouco".
- **Fix:** decisão do usuário, opção 1 do relatório (feature `72`, Fase 6, T18/T19, `MAF-24`/`MAF-25`). No 429 do envio (reconhecido pela frase do mapper, `AUTH_RATE_LIMITED`), o app vai ao passo do código mesmo assim, com "Já enviamos um código há pouco para <e-mail>." e o reenvio contando. E cada passo ganhou rota (`/recuperar`, `/recuperar/codigo`, `/recuperar/senha`), com o e-mail e o prazo do reenvio no `history.state` da entrada (nunca na URL) — o passo sobrevive ao recarregar a aba; passo do meio aberto sem estado volta ao primeiro.
- **Fix commit:** commit pendente (sem commit, regra do projeto).
- **Regression test:** `apps/mobile-adm/src/features/recovery/__tests__/RecoveryFlow.test.tsx` › "o código já enviado há pouco (MAF-25)" (o 429 leva ao passo do código com a frase, e o código que ela já tem confere; a vizinha 500 continua no passo do e-mail). Mutante M11 morto por asserção.

## Verification

- **Retested:** 2026-10-22, Adri recuperando o acesso / J-recuperar-acesso (Interrupt Tour), 390×844 e 360×844, Mailpit · **Report:** `docs/qa/reports/2026-10-22-mobile-adm-fundacao-reteste.md`
- **Result:** pass. Pediu o código, fechou o app, reabriu e pediu de novo **5 s** depois: o servidor respondeu 429, nenhum e-mail novo saiu, e o app foi a `/recuperar/codigo` com "Já enviamos um código há pouco para adri.qa@exemplo.invalid." e "Reenviar em 0:59". O código do **primeiro** e-mail (do Mailpit) entrou e abriu "Escolha a senha nova."; salvar levou à Início; a senha antiga passou a ser recusada e a nova entrou (leitura independente, perfil novo). Repetido em 360 para devolver a senha a `senha-qa-1`.
- **Evidence:** `docs/qa/evidence/2026-10-22-mobile-adm-fundacao-reteste/R2-ja-enviamos.png`, `R2-senha.png`
