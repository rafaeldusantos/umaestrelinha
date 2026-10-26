# BUG-20261022-voltar-na-recuperacao-sai-do-app: o voltar do Android no meio da recuperação fecha o app em vez de voltar um passo

- **Status:** fixed <!-- na working tree, sem commit (regra do usuário); `verified` depois do commit e do reteste -->
- **Impact (user-side):** Friction
- **Severity:** High · **Priority:** P2 <!-- Friction num journey P0 ⇒ High -->
- **Persona Affected:** Adri recuperando o acesso
- **Journey Step:** J-recuperar-acesso, steps 1–2
- **Scenarios:** MAD-recuperar-acesso-por-codigo
- **Found:** 2026-10-22 · **Report:** `docs/qa/reports/2026-10-22-mobile-adm-fundacao.md`

## Summary

Na tela "Recuperar acesso" (no passo do e-mail ou no do código), a Adri aperta o voltar do Android
esperando voltar ao "Entrar no ateliê" ou ao passo anterior. O app sai inteiro (no navegador, volta à
página de antes). Ao reabrir, o passo do código se perdeu — e cai no `BUG-20261022-codigo-recebido-sem-onde-digitar`.
A tela tem "Voltar para entrar"; o gesto do sistema não faz o mesmo.

## Reproduction

- **Charter:** CH-voltar-do-android-no-atelie · **Tour:** Back-Button Tour
- **Environment:** Android emulado 390×844, Chrome (UA Android 14), pt-BR, build servido, Supabase local real

1. Abrir o app sem sessão (Login).
2. "Esqueci minha senha" (e, num segundo caso, enviar o código e chegar ao passo do código).
3. Voltar do navegador/Android.

**Expected:** voltar ao Login (ou ao passo anterior da recuperação).
**Actual:** sai do app (`about:blank` no navegador); "avançar" devolve o Login, não o passo do código. Os passos da recuperação não estão no histórico (`history.length` não muda ao abrir "Recuperar acesso").

## Evidence

- Medido em `docs/qa/reports/2026-10-22-mobile-adm-fundacao.md` (debrief do CH-voltar-do-android-no-atelie), sem screenshot: o destino é `about:blank`.

## Fix

- **Root cause:** os passos da recuperação eram estado local do `RecoveryFlow` dentro de `/login`; nenhum entrava no histórico, então o voltar do navegador saía do app.
- **Fix:** decisão do usuário, opção 1 do relatório (feature `72`, Fase 6, T18, `MAF-24`). A recuperação tem rota própria fora do guarda — `/recuperar` → `/recuperar/codigo` → `/recuperar/senha` (`apps/mobile-adm/src/features/recovery/model/passos.ts`) —, cada passo entra no histórico, e o voltar do Android volta um passo (do primeiro, ao Login). Nada é interceptado: é o voltar do navegador. O e-mail vai no `history.state`, nunca na URL.
- **Fix commit:** commit pendente (sem commit, regra do projeto).
- **Regression test:** `apps/mobile-adm/src/features/recovery/__tests__/RecoveryFlow.test.tsx` › "cada passo tem rota, e o voltar volta um passo (MAF-24)" (os três voltares, o e-mail fora do endereço, os passos do meio sem estado); `passosSaoRotas.test.ts`; `rotasSobGuarda.test.ts` com as três rotas na lista de fora-por-desenho. Mutantes M08–M10 mortos por asserção.

## Verification

- **Retested:** 2026-10-22, Adri recuperando o acesso / J-recuperar-acesso (Back-Button Tour) · **Report:** `docs/qa/reports/2026-10-22-mobile-adm-fundacao-reteste.md`
- **Result:** pass. `/recuperar` → voltar ⇒ Login; avançar ⇒ `/recuperar`. `/recuperar/codigo` → voltar ⇒ o passo do e-mail; de novo ⇒ Login. `/recuperar/senha` → voltar ⇒ o passo do código; avançar ⇒ a senha. Nenhum voltar saiu do app no meio do fluxo.
- **Achado vizinho, novo:** depois de **salvar**, o voltar da Início volta ao passo do código com a sessão já salva ⇒ `BUG-20261022-voltar-depois-de-salvar-volta-a-recuperacao` (open).
