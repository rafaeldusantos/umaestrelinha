# BUG-20261022-sem-internet-recusa-admin: com internet que não funciona, o app diz que a Adri não tem acesso

- **Status:** fixed <!-- na working tree, sem commit (regra do usuário); `verified` depois do commit e do reteste -->
- **Impact (user-side):** Trust-Damage
- **Severity:** Medium · **Priority:** P1
- **Persona Affected:** Adri no celular
- **Journey Step:** J-sem-conexao, abertura com rede inútil
- **Scenarios:** MAD-rede-inutil-recusa-falsa
- **Found:** 2026-10-22 · **Report:** `.specs/features/72-mobile-adm-fundacao/prova-navegador.md`
- **Origin:** prova em navegador da feature `72`; dívida `BL-048` em `.specs/BACKLOG.md`

## Summary

Num Wi-Fi sem saída para a internet (o celular diz que está conectado), a Adri abre o ateliê, fica
cerca de 10 s na splash e recebe "Esta conta não tem acesso ao painel." A conta é admin. A frase é
falsa e confiante: ela pode achar que perdeu o acesso à própria loja.

## Reproduction

- **Charter:** CH-atelie-com-rede-ruim · **Tour:** Network Tour
- **Environment:** 390 × 844, Chromium, `navigator.onLine` verdadeiro, requisições ao Supabase sem resposta

1. Abrir o app com uma sessão admin salva.
2. Bloquear as requisições ao Supabase sem desligar a rede do navegador.

**Expected:** "Não consegui conferir seu acesso" com "Tentar de novo".
**Actual:** splash ~10 s e "Esta conta não tem acesso ao painel."

## Evidence

- `.specs/features/72-mobile-adm-fundacao/prova-navegador.md` (seção dos defeitos não consertados)

## Fix

- **Root cause:** o `checkAdmin` de `packages/auth/src/AuthContext.tsx` devolvia `false` quando a consulta falhava; o `isAdmin` era booleano e não distinguia "não" de "não sei". Nem a consulta do papel nem a leitura inicial da sessão tinham teto, então pacotes que somem deixavam a splash parada para sempre. A única ação da tela, "Sair", apagava a sessão salva. O Backoffice tinha o mesmo comportamento.
- **Fix:** feature `72`, Fase 6 (T16/T17, `MAF-22`/`MAF-23`), fecha a `BL-048`. O `AuthProvider` expõe `adminStatus` (`admin` · `not-admin` · `unknown`) e `retryAdminCheck()`; erro, exceção e silêncio por 8 s (`ADMIN_CHECK_TIMEOUT_MS`) são `unknown`, e a leitura da sessão tem o mesmo teto (um só na abertura). `isAdmin` continua, igual a `adminStatus === 'admin'`. `RequireAdmin` ganhou `unknownFallback`; o app mostra "Não consegui conferir seu acesso." com "Tentar de novo" e sem "Sair" (`apps/mobile-adm/src/features/access-check`), e o `AdminLoginPage` do painel diz a mesma frase (`ACCESS_UNCHECKED`, `@estrelinha/core/auth`).
- **Fix commit:** commit pendente (sem commit, regra do projeto).
- **Regression test:** `apps/mobile-adm/src/app/__tests__/papelEmTresEstados.test.tsx` (papel falhando, papel pendurado com 7.999 ms ainda na splash e 8.000 a frase, sessão pendurada, "Tentar de novo", a sessão salva intacta, a vizinha `not-admin` com a recusa); `apps/mobile-adm/src/app/__tests__/RequireAdminFallback.test.tsx` (o padrão do painel e o `unknownFallback`); `apps/backoffice/src/pages/admin/AdminLoginPage.test.tsx` › "papel não conferido (MAF-23)". Mutantes M01–M07 do sensor do autor, todos mortos por asserção.

## Re-found (2026-10-22)

- **Persona:** Adri no celular · **Charter:** CH-atelie-com-rede-ruim (Network Tour) · **Report:** `docs/qa/reports/2026-10-22-mobile-adm-fundacao.md`
- **Environment:** build servido (`vite preview`), Android emulado 390×844, Supabase local **real** (sem interceptar o produto); a "rede inútil" é o host do Supabase bloqueado com `navigator.onLine` verdadeiro.
- **O mesmo sintoma, medido de três jeitos — e dois agravantes que a prova da `72` não tinha visto:**
  1. **Falha rápida** (conexão recusada, como DNS que não resolve): splash por **~7,1 s** e depois "Esta conta não tem acesso ao painel." em `/login`.
  2. **Sem resposta** (pacotes somem, como um Wi-Fi com portal): **splash eterna** — medida por **90 s** sem sair, sem botão, sem frase. Nenhum timeout no caminho do papel.
  3. **Abertura fria pelo service worker no Playwright** (o documento vê `navigator.onLine` verdadeiro mesmo com o contexto offline): recusa falsa em ~12 s. É artefato da emulação para o *modo avião*, mas é exatamente o caso real do Wi-Fi sem saída.
  - **Agravante A — "Sair" na recusa falsa apaga a sessão salva.** A única ação que a tela oferece é "Sair"; tocada sem rede, a chave `sb-…-auth-token` some do armazenamento e a Adri passa a precisar da senha para voltar, mesmo depois de a rede voltar. A frase falsa convida exatamente a ação que piora o estado.
  - **Agravante B — entrar de novo ali dá a frase CERTA**: com a rede ainda inútil, o login responde "Sem conexão com o servidor. Verifique sua internet e tente de novo." Ou seja, o app já sabe escrever a frase honesta; só o caminho do papel (`checkAdmin`) não usa.
- **Leitura independente:** com a rede de volta, abrir `/` na mesma sessão (quando ela não tocou Sair) leva direto à Início — a conta sempre foi admin.
- **Evidence:** `docs/qa/evidence/2026-10-22-mobile-adm-fundacao/CH-rede-ruim-07-inutil-falha-rapida.png`, `CH-rede-ruim-07-inutil-sem-resposta-90s.png`, `CH-rede-ruim-04-frio-sem-forcar.png`, `CH-rede-ruim-08-inutil-tenta-entrar.png`
- **Disposição neste ciclo:** não consertado — a causa mora em `packages/auth/**`, que este ciclo não toca (decisão registrada, `BL-048`). Levado a *Decisions for a Human* no relatório.

## Verification

- **Retested:** 2026-10-22, Adri no celular / J-sem-conexao (Network Tour), perfil novo, build servido · **Report:** `docs/qa/reports/2026-10-22-mobile-adm-fundacao-reteste.md`
- **Result:** pass. Com o navegador dizendo online e só `127.0.0.1:54441` bloqueado, abrindo `/pedidos` com a sessão admin salva: **falha rápida** (conexão recusada) ⇒ "Não consegui conferir seu acesso." em **7,1 s**; **sem resposta** ⇒ a mesma frase em **8,07 s** contados do toque (o teto de 8 s mais a carga do documento). Nas duas: zero "não tem acesso", zero "Sair", "Tentar de novo" presente, a chave `sb-127-auth-token` intacta antes e depois de tocar "Tentar de novo" sem rede. Com a rede de volta, "Tentar de novo" ⇒ `/pedidos` com as abas em ~50 ms; recarregar continua dentro (leitura independente).
- **Observação (paper cut, dull):** "Tentar de novo" ainda sem rede devolve a splash "Abrindo o painel do ateliê" por 7–8 s e depois a mesma frase; o "Conferindo…" do botão nunca aparece. Evidência: `docs/qa/evidence/2026-10-22-mobile-adm-fundacao-reteste/R1-tentar-de-novo-sem-rede-2s.png`.
- **Evidence:** `docs/qa/evidence/2026-10-22-mobile-adm-fundacao-reteste/R1-falha-rapida.png`, `R1-sem-resposta.png`, `R1-falha-rapida-voltou.png`, `R1-sem-resposta-voltou.png`
