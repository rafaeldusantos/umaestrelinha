# BUG-20261022-voltar-depois-de-salvar-volta-a-recuperacao: depois de salvar a senha nova, o voltar do Android leva a Adri de volta ao "Digite o código"

- **Status:** fixed
- **Impact (user-side):** Friction
- **Severity:** Medium · **Priority:** P2 <!-- Friction num journey P0, depois do objetivo cumprido: não impede, confunde -->
- **Persona Affected:** Adri recuperando o acesso
- **Journey Step:** J-recuperar-acesso, step 4 (salva a senha nova e chega à Início) → o primeiro voltar dali
- **Scenarios:** MAD-recuperar-acesso-por-codigo
- **Found:** 2026-10-22 · **Report:** `docs/qa/reports/2026-10-22-mobile-adm-fundacao-reteste.md`

## Summary

A Adri recupera o acesso, salva a senha nova e chega à Início. Ela faz o gesto de voltar do Android
(para sair do app, como faz em qualquer app) e o ateliê mostra de novo "Recuperar acesso — Digite o
código de 6 dígitos que enviamos. Ele vale por 10 minutos.", com "Já enviamos um código há pouco…" e
o reenvio contando. Ela já está dentro (a sessão está salva), o código já foi usado, e a tela pede um
código. A dúvida natural é "a senha não foi salva?". Mais um voltar mostra o passo do e-mail; o
terceiro volta à Início (passando por `/login`, que redireciona); só o quarto sai do app.

## Reproduction

- **Charter:** CH-voltar-do-android-no-atelie · **Tour:** Back-Button Tour
- **Environment:** Android emulado 390×844 e 360×844, Chrome (UA Android 14), pt-BR, build servido (`vite preview` :8085), Supabase local real, e-mail no Mailpit

1. Abrir o app sem sessão ⇒ Login. "Esqueci minha senha" ⇒ `/recuperar`.
2. E-mail ⇒ "Enviar código" ⇒ `/recuperar/codigo`. Colar o código do e-mail ⇒ "Conferir código" ⇒ `/recuperar/senha`.
3. Senha nova duas vezes ⇒ "Salvar e entrar" ⇒ Início (`/`), com as quatro abas.
4. Voltar do Android.

**Expected:** a recuperação terminou como um login: voltar da Início sai do app (a mesma regra de `MAF-17`, "o Login não fica no histórico"), ou, no mínimo, nunca mostra um passo de recuperação a quem já está dentro.
**Actual:** `/recuperar/codigo` com "Digite o código…", "Reenviar em 0:56" e "Voltar para entrar", sem abas, com a sessão salva (`sb-127-auth-token` no armazenamento). Voltar de novo: `/recuperar` (o passo do e-mail). De novo: Início. De novo: sai do app.

## Evidence

- `docs/qa/evidence/2026-10-22-mobile-adm-fundacao-reteste/R2-voltar-depois-de-salvar-senha-qa-1.png` (360); em 390 o mesmo percurso, medido por texto e URL
- Leitura independente: a mesma sessão, ainda no passo do código, tem a chave de sessão no armazenamento; um terceiro voltar devolve a Início sem pedir senha — ela sempre esteve dentro.

## Causa provável

Observada pela superfície e conferida no ponto de saída: ao salvar, `RecoveryFlow.tsx:139` faz
`navigate('/login', { replace: true })`, que substitui **só** a entrada `/recuperar/senha`; o Login
então troca a si mesmo pela Início. Os passos anteriores que a Fase 6 pôs no histórico (`MAF-24`:
`/login`, `/recuperar`, `/recuperar/codigo`) ficam embaixo, e as rotas `/recuperar/*` não
redirecionam quem já tem sessão de admin. O que o voltar deve fazer depois do fim do fluxo (sair do
app, voltar ao Login, ou "pular" os passos com redirecionamento) é escolha de produto e mexe na regra
"nada é interceptado", por isso foi levado a *Decisions for a Human* no relatório.

## Fix

- **Root cause:** `RecoveryFlow.tsx` trocava só a entrada `/recuperar/senha` ao gravar (`navigate('/login', { replace: true })`); os passos que `MAF-24` empilhou ficavam no histórico, e as rotas `/recuperar/*` não sabiam que a sessão já existia.
- **Fix:** cada passo guarda no `history.state` quantas entradas a recuperação empilhou sobre a do Login (`profundidade`); gravada a senha, a recuperação volta exatamente isso (`navigate(-profundidade)`), e o efeito do Login troca a entrada dele pela Início. Sem a conta (passo aberto sem ela), troca só a própria entrada, como antes. Decisão do usuário: a opção 1 (recomendada), 2026-10-22.
- **Fix commit:** pendente (sem commit, regra do projeto).
- **Regression test:** `apps/mobile-adm/src/features/recovery/__tests__/RecoveryFlow.test.tsx`, describe "gravada a senha, os passos saem do histórico" (o caminho direto, com "Trocar o e-mail" e com o reenvio; a régua é o endereço que o voltar alcança no `popstate`). Mutantes reinjetados (a gravação voltando só a própria entrada, "Trocar o e-mail" sem contar a entrada, o Login sem a conta inicial): os três mortos por asserção.


## Verification

- **Date:** 2026-10-22 · **Report:** `docs/qa/reports/2026-10-22-mobile-adm-fundacao-reteste-2.md` · **Result:** pass
- **Build:** `vite preview` :8085, bundle `index-548rgCtv.js`, Supabase local real, código lido do Mailpit.
- Histórico começando em `about:blank` → `/login`. Duas passadas (caminho direto; e com entrar/sair antes e voltar/avançar em cada passo). Salvo ⇒ Início; **um** voltar ⇒ `about:blank` (saiu do app) nas duas; "Digite o código" nunca apareceu (amostra a cada 50 ms). Leitura independente: perfil novo, senha anterior fica no Login, a nova entra.
- Evidência: `docs/qa/evidence/2026-10-22-mobile-adm-fundacao-reteste-2/R1-voltar-da-inicio-senha-qa-2.png`, `R1-voltar-da-inicio-senha-qa-1.png`.
