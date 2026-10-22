# QA Run Report — 2026-10-22 — mobile-adm-fundacao-reteste

- **Scope:** branch `feat/72-mobile-adm-fundacao` depois da Fase 6 (`MAF-22`..`MAF-30`): o papel do admin em três estados ("Não consegui conferir seu acesso." + "Tentar de novo"), a recuperação com rotas (`/recuperar`, `/recuperar/codigo`, `/recuperar/senha`), o 429 levando ao passo do código, "Entrar" vazio, o ícone da aba, a splash estática no HTML, o título e o foco por aba e o anúncio da tela Sem conexão. Retestes dos cinco `BUG-20261022-*` (`fixed`). Canário adjacente: a loja, porque `packages/auth` mudou.
- **Cadence tier:** sanity (+ retestes)
- **Build:** working tree sobre `b6449bd2` (sem commit da `72`), `vite build` + `vite preview` (bundle servido `index-BQfleLUg.js`, conferido contra o `dist/`) · **Environment:** http://localhost:8085 (a 8084 é de outra sessão), Supabase **local real** (API :54441, Mailpit :54444), auth real
- **Started:** 2026-10-22 · **Status:** closed

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Adri no celular | Mobile User | Android 390×844, local/rede inútil/Slow 3G, pt-BR | CH-atelie-com-rede-ruim, CH-entrar-no-atelie-pelo-celular, CH-voltar-do-android-no-atelie |
| Adri recuperando o acesso | Recovering User | Android 390×844, local, pt-BR | CH-recuperar-acesso-pelo-celular |
| Cliente com conta da loja | Casual User | Android 390×844, pt-BR | CH-conta-sem-acesso-no-atelie, canário da loja |
| Equipe com TalkBack | Accessibility-Reliant | Android 390×844, árvore de acessibilidade, pt-BR | CH-atelie-com-leitor-de-tela |

## Flows in Scope

- `J-entrar-no-atelie` (`../journeys/J-entrar-no-atelie.md`)
- `J-recuperar-acesso` (`../journeys/J-recuperar-acesso.md`)
- `J-sem-conexao` (`../journeys/J-sem-conexao.md`)
- Canário: a conta e o checkout da loja (`apps/store`), com sessão de cliente, na volta da aba

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue | Fix commit |
|---|---|---|---|---|---|---|---|
| 1 | CH-atelie-com-rede-ruim | J-sem-conexao / MAD-rede-inutil-recusa-falsa (reteste) | Adri no celular | Network | Pass | BUG-20261022-sem-internet-recusa-admin (retest pass) | |
| 2 | CH-recuperar-acesso-pelo-celular | J-recuperar-acesso / MAD-recuperar-acesso-por-codigo (reteste do abandono) | Adri recuperando o acesso | Interrupt | Pass | BUG-20261022-codigo-recebido-sem-onde-digitar (retest pass) | |
| 3 | CH-voltar-do-android-no-atelie | J-recuperar-acesso / MAD-recuperar-acesso-por-codigo (reteste do voltar) | Adri recuperando o acesso | Back-Button | Pass | BUG-20261022-voltar-na-recuperacao-sai-do-app (retest pass) | |
| 4 | CH-recuperar-acesso-pelo-celular | J-recuperar-acesso / MAD-codigo-errado-ou-vencido (reteste do colar) | Adri recuperando o acesso | Interrupt | Pass | BUG-20261022-codigo-colado-com-espaco-recusado (retest pass) | |
| 5 | CH-voltar-do-android-no-atelie | J-entrar-no-atelie / MAD-navegar-pelas-quatro-abas (reteste do menu) | Adri no celular | Back-Button | Pass | BUG-20261022-menu-da-conta-nao-fecha (retest pass) | |
| 6 | CH-entrar-no-atelie-pelo-celular | J-entrar-no-atelie / MAD-entrar-e-chegar-ao-inicio + MAD-sair-volta-ao-login | Adri no celular | Feature | Pass | | |
| 7 | CH-entrar-no-atelie-pelo-celular | J-entrar-no-atelie / MAD-senha-errada-mantem-email (Entrar vazio, `MAF-26`) | Adri no celular | Feature | Pass | | |
| 8 | CH-entrar-no-atelie-pelo-celular | J-entrar-no-atelie / ícone da aba (`MAF-27`) | Adri no celular | Feature | Pass | | |
| 9 | CH-atelie-com-rede-ruim | J-entrar-no-atelie / primeira pintura em Slow 3G (`MAF-28`) | Adri no celular | Network | Pass | | |
| 10 | CH-atelie-com-leitor-de-tela | J-entrar-no-atelie / MAD-navegar-pelas-quatro-abas (a11y, `MAF-29`) | Equipe com TalkBack | Feature | Pass | | |
| 11 | CH-atelie-com-leitor-de-tela | J-sem-conexao / MAD-rede-cai-com-app-aberto (anúncio, `MAF-30`) | Equipe com TalkBack | Network | Pass | | |
| 12 | CH-conta-sem-acesso-no-atelie | J-entrar-no-atelie / MAD-conta-sem-acesso-recusada | Cliente com conta da loja | Garbage | Pass | | |
| 13 | — (canário) | loja / a conta na volta da aba | Cliente com conta da loja | Interrupt | Pass | | |
| 14 | — (canário) | loja / o checkout na volta da aba | Cliente com conta da loja | Interrupt | Pass | | |
| 15 | CH-voltar-do-android-no-atelie | J-recuperar-acesso / MAD-recuperar-acesso-por-codigo (o voltar depois de salvar) | Adri recuperando o acesso | Back-Button | Blocked (human decision) | BUG-20261022-voltar-depois-de-salvar-volta-a-recuperacao (novo) | |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`

## Session Debriefs

> Driver: Playwright (Chrome for Testing 1228, headless), Android emulado (UA Chrome 130 Android 14, `isMobile`, `hasTouch`, DPR 2,625), pt-BR, America/Sao_Paulo. Scripts no scratchpad da sessão (`qa2/s1.js`…`s5.js`). Nada do produto interceptado, salvo o bloqueio deliberado do host do Supabase nas sessões de rede.

### CH-atelie-com-rede-ruim (reteste de `BUG-20261022-sem-internet-recusa-admin`) — Adri no celular

- **Ran:** ~6 min de navegador (box de 30 min respeitado: sim). Perfil persistente com o service worker controlando a página; sessão admin salva.
- **Walk:** com `navigator.onLine` verdadeiro e **só** `127.0.0.1:54441` bloqueado, abrir `/pedidos`:
  1. **Falha rápida** (conexão recusada) ⇒ splash e, em **7,1 s**, "Não consegui conferir seu acesso." / "Confira a internet do celular e tente de novo. Sua sessão continua salva." / "Tentar de novo". `pass`
  2. **Sem resposta** (pacotes que somem) ⇒ a mesma frase em **8,07 s** contados do toque (o teto de 8 s mais a carga do documento; na rodada anterior era splash eterna). `pass` — ver nota no Final Status.
  3. Nas duas: "não tem acesso" **nunca** apareceu (amostra a cada 100 ms), **nenhum** "Sair" (botão ou link), e a chave `sb-127-auth-token` igual antes, depois da frase e depois de "Tentar de novo" sem rede. `pass`
  4. Com a rede de volta, "Tentar de novo" ⇒ `/pedidos` com cabeçalho e abas em ~50 ms; recarregar continua em `/pedidos` (leitura independente). `pass`
- **Findings:** nenhum que falhe AC. Paper cut: "Tentar de novo" sem rede devolve a splash por 7–8 s e depois a mesma frase (o "Conferindo…" do botão nunca aparece).
- **Bugs filed/updated:** `BUG-20261022-sem-internet-recusa-admin` — `## Verification` (pass).
- **Scenarios settled:** MAD-rede-inutil-recusa-falsa → pass (retest pass)
- **Evidence:** `docs/qa/evidence/2026-10-22-mobile-adm-fundacao-reteste/R1-falha-rapida.png`, `R1-sem-resposta.png`, `R1-*-voltou.png`, `R1-tentar-de-novo-sem-rede-2s.png`

### CH-recuperar-acesso-pelo-celular + CH-voltar-do-android-no-atelie (retestes da recuperação) — Adri recuperando o acesso

- **Ran:** duas passadas completas, 390×844 (troca para `senha-qa-2`) e 360×844 (devolve `senha-qa-1`), ~4 min cada; e-mail lido no Mailpit.
- **Walk:**
  1. Login → "Esqueci minha senha" ⇒ `/recuperar`. Voltar ⇒ Login; avançar ⇒ `/recuperar`. `pass`
  2. `  Adri.QA@Exemplo.invalid ` ⇒ `/recuperar/codigo` em ~60 ms, "Enviamos um código de 6 dígitos para adri.qa@exemplo.invalid.", "Reenviar em 1:00". Voltar ⇒ o passo do e-mail; de novo ⇒ Login. `pass` (o voltar não sai mais do app)
  3. **Abandono:** fechou o app, reabriu, "Esqueci minha senha", o mesmo e-mail **5 s** depois ⇒ o servidor respondeu **429**, nenhum e-mail novo, e o app foi a `/recuperar/codigo` com "Já enviamos um código há pouco para adri.qa@exemplo.invalid." e "Reenviar em 0:59". `pass`
  4. Colou o código do **primeiro** e-mail pela área de transferência como ` 872 088⏎` ⇒ o campo ficou `872088` ⇒ "Escolha a senha nova." `pass`
  5. No passo da senha, voltar ⇒ o passo do código; avançar ⇒ a senha. Salvou ⇒ Início. `pass`
  6. **True end:** perfil novo, senha antiga ⇒ "E-mail ou senha inválidos"; nova ⇒ Início. `pass`
  7. **Voltar da Início logo depois de salvar** ⇒ `/recuperar/codigo` ("Digite o código…", "Reenviar em 0:56") com a sessão já salva; depois o passo do e-mail; depois a Início; só o quarto voltar sai do app. `friction` → **novo** `BUG-20261022-voltar-depois-de-salvar-volta-a-recuperacao`.
- **Edge cases tentados:** e-mail com espaços e maiúsculas; pedir de novo dentro de 60 s; colar com espaço e quebra de linha; voltar/avançar em cada passo; voltar depois do fim; 360 de largura (zero rolagem lateral).
- **Bugs filed/updated:** `codigo-recebido-sem-onde-digitar`, `voltar-na-recuperacao-sai-do-app`, `codigo-colado-com-espaco-recusado` — `## Verification` (pass). Novo: `BUG-20261022-voltar-depois-de-salvar-volta-a-recuperacao` (Friction, open).
- **Scenarios settled:** MAD-recuperar-acesso-por-codigo → blocked-decision (os três retestes pass; o achado novo em decisão) · MAD-codigo-errado-ou-vencido → pass (retest pass)
- **Limpeza:** a senha da `adri.qa` voltou a `senha-qa-1` pelo próprio fluxo (segunda passada) e foi conferida entrando na sessão seguinte. `admin@umaestrelinha.dev` não foi tocada.
- **Surprises:** no 429, o reenvio conta 0:59 a partir da reabertura, não do primeiro envio — conservador, o lado certo.

### CH-entrar-no-atelie-pelo-celular + CH-voltar (sanity e reteste do menu) — Adri no celular

- **Ran:** ~2 min de navegador, perfil novo, 390×844.
- **Walk:** "Entrar" vazio ⇒ "Informe o e-mail e a senha." (`alert`), **zero** chamadas a `/auth/`; só espaços ⇒ a mesma frase, sem rede; e-mail sem senha ⇒ a mesma frase, o e-mail fica no campo. `pass` · `<link rel=icon>` → `/icons/icon-192.png` (200) e **nenhuma** resposta ≥ 400 na sessão inteira (o 404 do `/favicon.ico` sumiu). `pass` · entrar ⇒ Início. `pass` · menu da conta: voltar fecha, toque fora fecha, Escape fecha e devolve o foco a "Sua conta", tocar outra aba fecha, tocar o e-mail dentro mantém aberto. `pass` · "Sair" ⇒ Login; recarregar continua no Login; `/pedidos` ⇒ Login. `pass`
- **Scenarios settled:** MAD-entrar-e-chegar-ao-inicio → pass · MAD-sair-volta-ao-login → pass · MAD-senha-errada-mantem-email → pass · MAD-navegar-pelas-quatro-abas → pass (retest pass)
- **Bugs filed/updated:** `BUG-20261022-menu-da-conta-nao-fecha` — `## Verification (reteste, ciclo novo)` (pass).

### CH-atelie-com-rede-ruim (primeira pintura em Slow 3G, `MAF-28`) — Adri no celular

- **Ran:** ~1 min, perfil novo sem service worker, CDP 400 ms / 400 kbps.
- **Walk:** a splash **estática** (`#splash-estatica`, fundo `#283A4A`, o lockup) pintou em **~1,9 s** (na rodada anterior: 5,2 s de tela vazia); o bundle chegou e a splash do React a substituiu em ~5,2 s com o lockup em **y 351 → 350** (sem salto; daí ele desliza ~8 px na animação de entrada da splash do React); Login em ~5,8 s. `pass`
- **Evidence:** `docs/qa/evidence/2026-10-22-mobile-adm-fundacao-reteste/R9-slow3g-splash-estatica.png`, `R9-slow3g-login.png`

### CH-atelie-com-leitor-de-tela (`MAF-29`, `MAF-30`) — Equipe com TalkBack

- **Ran:** ~2 min; leitor aproximado pela árvore de acessibilidade e por `document.activeElement`.
- **Walk:** Início/Pedidos/Clientes/Descontos ⇒ `document.title` "Pedidos · Ateliê" etc., o foco vai ao `h1` da aba, `aria-current` só na aba atual; o voltar do navegador também leva título e foco. `pass` · A rede cai em Clientes ⇒ `alert` com `aria-live="assertive"` contendo "Sem conexão. Os dados da loja aparecem quando a internet voltar."; a rede volta ⇒ Clientes de novo. `pass`
- **Paper cut (dull):** com a tela Sem conexão na frente, o título do documento continua "Clientes · Ateliê".
- **Scenarios settled:** MAD-navegar-pelas-quatro-abas (a11y) → pass · MAD-rede-cai-com-app-aberto → pass

### CH-conta-sem-acesso-no-atelie — Cliente com conta da loja

- **Walk:** `cliente.qa` entra ⇒ `/login` com "Esta conta não tem acesso ao painel." e "Sair", sem abas — o "não" de verdade continua dizendo "não", e **não** virou "Não consegui conferir". Recarregar e digitar `/pedidos` mantêm a recusa; a rede tocou só `user_roles` e `customers`. "Sair" ⇒ formulário vazio. `pass`
- **Scenarios settled:** MAD-conta-sem-acesso-recusada → pass

### Canário — a loja com uma cliente logada (rows 13–14)

- **Ran:** `vite` da loja na **:8086** (a 8082 é de outra sessão; não foi tocada), Supabase local real, `cliente.qa` entrando por "Prefere usar senha?".
- **Walk:** em `/conta`, três trocas de aba (`visibilitychange` com `bubbles`, `visibilityState` hidden → visible) ⇒ "Carregando..." **nunca** apareceu (amostra a cada 50 ms e `MutationObserver`). Variante discriminante: recarregar a conta com `/rest/v1` recusando (o papel fica "não sei") e trocar de aba com a rede de volta ⇒ a volta **repergunta** `user_roles` e `customers` e mesmo assim nenhum "Carregando...". `pass` · Pôs a placa "Árvore da Vida com cabelo" na sacola pela página do produto, abriu `/checkout`, digitou o nome, três trocas de aba ⇒ nenhum "Carregando...", o nome digitado ficou no campo. `pass`
- **Evidence:** `docs/qa/evidence/2026-10-22-mobile-adm-fundacao-reteste/R13-loja-conta-depois-da-volta.png`, `R14-loja-checkout-depois-da-volta.png`
- **Surprise:** no topo da página do produto em 390, o Playwright não conseguiu tocar "Adicionar à sacola" ("fora da área visível"); depois de rolar ~900 px tocou. Provavelmente a barra fixa que entra com a rolagem; não investigado (fora do escopo deste ciclo).

## What Was Fixed

Nada neste ciclo. O único achado novo pede decisão de produto (abaixo); nenhum código foi alterado.

## Paper Cuts

| Persona | Where (journey/step) | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Adri no celular | J-sem-conexao, "Tentar de novo" com a rede ainda inútil | "toquei Tentar de novo e o app pareceu reabrir do zero; esperei uns 7 segundos e veio a mesma frase" (a splash volta inteira; o "Conferindo…" do botão nunca aparece) | dull | watching |
| Adri no celular | J-sem-conexao, rede sem resposta | "demorou 8 segundos" — 8,07 s contados do toque, no limite de `MAF-23` | dull | watching |
| Equipe com TalkBack | J-sem-conexao step 1 | o título da aba do Chrome segue "Clientes · Ateliê" com a tela Sem conexão na frente | dull | watching |
| Adri no celular | J-entrar-no-atelie step 1 (Slow 3G) | antes: 5 s de tela vazia. Agora: ~1,9 s até a splash | — | resolvido (`MAF-28`) |
| Adri no celular | J-entrar-no-atelie step 2 | antes: "E-mail inválido" com o campo vazio. Agora: "Informe o e-mail e a senha." sem rede | — | resolvido (`MAF-26`) |

## Runtime Errors Observed

Nenhum `pageerror` em nenhuma sessão (mobile-adm e loja). Console:

- `net::ERR_CONNECTION_REFUSED` em série — só na sessão de rede inútil (bloqueio deliberado).
- `429 /auth/v1/recover` — o pedido de código dentro do intervalo, esperado (`MAF-25`).
- Loja (dev): avisos de "React Router Future Flag" — ruído do modo dev, pré-existente.
- **Nenhum** `404 /favicon.ico` (era o paper cut da rodada anterior).

## Human Verifications Needed

Continuam as seis do ciclo anterior (`reports/2026-10-22-mobile-adm-fundacao.md`, *Human Verifications Needed*), no Android da Adri: instalar e abrir em tela cheia; voltar na raiz sai do app; barra de gestos; modo avião; TalkBack; código no e-mail de produção. Duas ganharam o que conferir a mais:

- [ ] **TalkBack**: ao trocar de aba, ele deve ler o título da tela nova ("Pedidos"); com a internet caindo, deve falar "Sem conexão…" sem ela passar o dedo.
- [ ] **Wi-Fi sem internet** (um roteador sem saída, ou dados móveis sem crédito): abrir o app ⇒ "Não consegui conferir seu acesso." em até ~8 s, sem "Sair"; com a internet de volta, "Tentar de novo" entra.

## Decisions for a Human

### Depois de salvar a senha nova, o voltar leva de volta ao "Digite o código" (BUG-20261022-voltar-depois-de-salvar-volta-a-recuperacao)
- What's broken: a recuperação termina na Início, mas os passos ficam no histórico; o primeiro voltar mostra o passo do código a quem já está dentro (sessão salva, código já usado), o segundo o do e-mail, o terceiro a Início, só o quarto sai do app. Evidência: `docs/qa/evidence/2026-10-22-mobile-adm-fundacao-reteste/R2-voltar-depois-de-salvar-senha-qa-1.png`.
- Why not auto-fixed: o que o voltar faz depois do fim do fluxo é escolha de produto e de histórico (governor: *no product trade-off*), e a regra registrada é "o voltar do Android é o do navegador: nada é interceptado".
- Options:
  1. **Ao salvar, desfazer os passos do histórico** (voltar até a entrada do Login e então trocá-la pela Início, como o login faz) — o voltar da Início sai do app, igual a `MAF-17`; precisa saber quantos passos a recuperação empilhou (estado da rota), e é a forma mais fiel ao "o login não fica no histórico".
  2. **Rotas `/recuperar/*` redirecionam para a Início quando já há sessão de admin** — simples e sem contar passos, mas o voltar vira "não faz nada" três vezes seguidas (cada passo redireciona de volta).
  3. **Deixar** — ela chega à Início e o voltar só confunde; custo baixo, mas é o momento de menor confiança dela no app.
- Recommendation: **1**, com o mesmo teste de histórico que provou `MAF-24`.

## Learnings

- **Dar endereço a um fluxo cria o problema da saída do fluxo.** `MAF-24` consertou o voltar *dentro* da recuperação e deixou os passos para depois do fim. Pergunta fixa para todo fluxo com rotas: "e o voltar depois do último passo?".
- **"Tentar de novo" que reusa a splash apaga o próprio feedback.** O estado "Conferindo…" do botão existe e nunca é visto.
- **O canário da loja precisa de um estado discriminante.** Com o papel já conhecido, trocar de aba não repergunta nada (zero requisições) e a ausência de "Carregando..." seria verdadeira nos dois mundos; só com o papel em "não sei" a volta repergunta e o teste mede alguma coisa.

## Final Status

- **Exit gate:** nenhum código foi alterado neste ciclo; a suíte do app afetado rodou mesmo assim: `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` → `Test Files 26 passed (26) · Tests 261 passed (261)`, **exit 0** (capturado fora de pipe). Loja e painel não rodaram: nenhum conserto tocou fora do app (o ciclo da Fase 6 tem as próprias medições).
- **Issues by user impact (neste ciclo):** Blocks-Completion 0 · Data-Loss 0 · Trust-Damage 0 · Friction 1 (novo, aberto, em decisão) · Cosmetic 0. Retestes: 5/5 pass. Paper cuts: 3 dull novos, 2 da rodada anterior resolvidos.
- **Coverage:** 15 linhas — 14 Pass, 1 Blocked (human decision), 0 Skipped. As três jornadas andadas; canário da loja (conta e checkout) andado.
- **Parity:** Supabase **local** com auth real e e-mail no Mailpit; Chrome for Testing headless com UA de Android, não um aparelho; preview do ateliê na **:8085** e dev da loja na **:8086** (8084 e 8082 são de outras sessões, não tocadas); rede inútil emulada por bloqueio do host; Slow 3G por CDP; a troca de aba da loja emulada por `visibilitychange` (o headless não troca visibilidade sozinho); o leitor de tela aproximado pela árvore de acessibilidade.
- **Fidelity:** nenhum texto de avaliação entrou no produto; o banco não foi consultado para decidir passo nenhum.
- **Verdict:** **ready with blocked items** — os cinco consertos se sustentam e as superfícies novas fazem o que prometem; antes de a Adri usar o app, decida o voltar depois de salvar a senha (recomendação: opção 1) e faça no aparelho as verificações listadas.
