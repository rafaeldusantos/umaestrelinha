# BUG-20261022-menu-da-conta-nao-fecha: o menu da conta fica aberto por cima de outra aba e não fecha com o voltar nem com um toque fora

- **Status:** fixed <!-- na working tree, sem commit (regra do usuário); `verified` depois do commit -->
- **Impact (user-side):** Friction
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri no celular
- **Journey Step:** J-entrar-no-atelie, steps 4–5 (usa o voltar do Android; sai pelo menu da conta)
- **Scenarios:** MAD-navegar-pelas-quatro-abas; MAD-sair-volta-ao-login
- **Found:** 2026-10-22 · **Report:** `docs/qa/reports/2026-10-22-mobile-adm-fundacao.md`

## Summary

A Adri abre "Sua conta" para ver com que e-mail está, e quer fechar. Tocar fora não fecha; o voltar
do Android **troca de aba** (o histórico anda) e o menu continua aberto na aba nova; tocar em outra
aba também leva o menu junto. O único jeito de fechá-lo é achar de novo o ícone da conta. Com uma
mão só, o "Sair" fica pendurado embaixo do polegar em toda tela que ela abre.

## Reproduction

- **Charter:** CH-voltar-do-android-no-atelie · **Tour:** Back-Button Tour
- **Environment:** Android emulado 390×844, Chrome (UA Android 14), pt-BR, build servido, Supabase local real

1. Entrar como admin; abrir Pedidos.
2. Tocar "Sua conta" ⇒ o painel com o e-mail e "Sair".
3. Tocar no meio da tela; depois apertar Escape (teclado físico); depois o voltar; depois a aba Descontos.

**Expected:** o painel fecha ao tocar fora, com Escape, e ao sair da tela em que foi aberto.
**Actual:** o painel continua aberto em todas as quatro tentativas; depois do voltar a Início aparece com o menu aberto, e Descontos também.

## Evidence

- `docs/qa/evidence/2026-10-22-mobile-adm-fundacao/CH-voltar-03-menu-depois-de-trocar-aba.png`
- `docs/qa/evidence/2026-10-22-mobile-adm-fundacao/CH-voltar-04-menu-aberto-em-outra-aba.png`

## Fix

- **Root cause:** o painel é um estado local (`aberto`) que só o próprio botão alternava; nada o ligava à rota nem a toques fora dele. O sintoma "o voltar troca de aba" é o comportamento certo do navegador; o defeito é o painel sobreviver à troca.
- **Fix commit:** commit pendente (sem commit, regra do projeto) — aplicado na working tree (`apps/mobile-adm/src/widgets/account-menu/ui/AccountMenu.tsx`): fecha a cada mudança de `location.key`, a `pointerdown` fora da raiz e a Escape (devolvendo o foco ao botão). O voltar continua sendo do navegador — nada interceptado.
- **Regression test:** `apps/mobile-adm/src/widgets/account-menu/__tests__/AccountMenu.test.tsx` › "fecha quando ela sai dele" (4 casos: troca de aba, `history.back()`, toque fora × toque dentro, Escape com o foco) — os 4 vermelhos antes, verdes depois.

## Verification

- **Retested:** 2026-10-22, Adri no celular / J-entrar-no-atelie, sessão nova, build servido refeito · **Report:** `docs/qa/reports/2026-10-22-mobile-adm-fundacao.md`
- **Result:** voltar, tocar fora, Escape e tocar outra aba fecham o painel; tocar o e-mail dentro dele não fecha; "Sair" pelo menu segue levando ao Login; o voltar entre abas segue igual (`docs/qa/evidence/2026-10-22-mobile-adm-fundacao/RETEST-menu-aberto-dentro.png`).

## Verification (reteste, ciclo novo)

- **Retested:** 2026-10-22, Adri no celular / J-entrar-no-atelie (Back-Button Tour), perfil novo · **Report:** `docs/qa/reports/2026-10-22-mobile-adm-fundacao-reteste.md`
- **Result:** pass. Voltar fecha (e o histórico anda), toque fora fecha, Escape fecha e devolve o foco a "Sua conta", tocar outra aba fecha, tocar o e-mail dentro mantém aberto; "Sair" pelo menu ⇒ Login. Evidência: `docs/qa/evidence/2026-10-22-mobile-adm-fundacao-reteste/R5-menu-aberto.png`.
