# BUG-20261022-codigo-colado-com-espaco-recusado: a Adri cola o código do e-mail e o app diz que ele não tem 6 dígitos

- **Status:** fixed <!-- na working tree, sem commit (regra do usuário); `verified` depois do commit -->
- **Impact (user-side):** Friction
- **Severity:** High · **Priority:** P2 <!-- Friction num journey P0 ⇒ High -->
- **Persona Affected:** Adri recuperando o acesso
- **Journey Step:** J-recuperar-acesso, step 2 (digita o código)
- **Scenarios:** MAD-recuperar-acesso-por-codigo; MAD-codigo-errado-ou-vencido
- **Found:** 2026-10-22 · **Report:** `docs/qa/reports/2026-10-22-mobile-adm-fundacao.md`

## Summary

A Adri copia o código do e-mail (no Android a seleção costuma levar um espaço ou uma quebra de linha
junto) e cola no campo "Código". O campo corta o que colou em 6 caracteres **contando o espaço**, fica
com ` 123 4`, e o app responde "O código tem 6 dígitos." — ela colou exatamente o código do e-mail e o
app diz que ele está errado. Com a confiança já baixa, é o ponto em que ela desiste.

## Reproduction

- **Charter:** CH-recuperar-acesso-pelo-celular · **Tour:** Interrupt Tour
- **Environment:** Android emulado 390×844, Chrome (UA Android 14), pt-BR, build servido, Supabase local real

1. Login → "Esqueci minha senha" → e-mail → "Enviar código".
2. No campo "Código", colar ` 123 456` (o código com um espaço antes, ou com espaço no meio).
3. "Conferir código".

**Expected:** o campo fica com `123456` e o código é conferido.
**Actual:** o campo fica com ` 123 4` (corte do `maxlength=6` sobre o texto cru) e aparece "O código tem 6 dígitos."; nenhuma conferência vai ao servidor.

## Evidence

- `docs/qa/evidence/2026-10-22-mobile-adm-fundacao/CH-recuperar-04b-codigo-com-letras.png`

## Fix

- **Root cause:** o campo tinha `maxLength={6}`, que o **navegador** aplica ao texto cru antes do `onChange`; a limpeza de espaço existia, mas só na conferência — depois do corte. O sintoma (o código certo recusado) vinha de a limpeza estar no lugar errado.
- **Fix commit:** nenhum — aplicado na working tree (`apps/mobile-adm/src/features/recovery/ui/RecoveryFlow.tsx`): sem `maxLength`, e o `onChange` guarda só os dígitos, no máximo seis.
- **Regression test:** `apps/mobile-adm/src/features/recovery/__tests__/RecoveryFlow.test.tsx` › "código colado com espaço e quebra de linha vira os 6 dígitos e confere" — vermelho antes (`maxlength="6"` presente), verde depois.

## Verification

- **Retested:** 2026-10-22, Adri recuperando o acesso / J-recuperar-acesso, sessão nova, build servido refeito (`index-DPlvJxg5.js`) · **Report:** `docs/qa/reports/2026-10-22-mobile-adm-fundacao.md`
- **Result:** o código real do Mailpit colado pela área de transferência como ` 342 641⏎` ficou `342641` no campo e abriu "Escolha a senha nova." (`docs/qa/evidence/2026-10-22-mobile-adm-fundacao/RETEST-codigo-colado.png`).

## Verification (reteste, ciclo novo)

- **Retested:** 2026-10-22, Adri recuperando o acesso / J-recuperar-acesso, colar pela área de transferência real (`ControlOrMeta+V`) · **Report:** `docs/qa/reports/2026-10-22-mobile-adm-fundacao-reteste.md`
- **Result:** pass, duas vezes (390 e 360): ` 872 088⏎` e ` 018 487⏎` viraram `872088` e `018487` no campo e abriram "Escolha a senha nova.".
