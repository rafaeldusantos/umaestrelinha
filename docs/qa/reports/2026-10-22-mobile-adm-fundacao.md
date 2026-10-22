# QA Run Report — 2026-10-22 — mobile-adm-fundacao

- **Scope:** branch `feat/72-mobile-adm-fundacao` — o app `apps/mobile-adm` inteiro é superfície nova (feature `72`: splash, login, recuperação por código, quatro abas em construção, menu da conta, sem conexão, PWA). Canary adjacente: nenhum fora do app (o Backoffice e a loja não mudaram de comportamento; os guardas deles são cobertos pela suíte).
- **Cadence tier:** targeted
- **Build:** working tree sobre `b6449bd2` (sem commit da `72`), `vite build` + `vite preview` · **Environment:** http://localhost:8085 (a 8084 estava ocupada por um dev server de outra sessão; o preview subiu na seguinte), Supabase **local real** (API :54441, Mailpit :54444), auth real sem interceptação
- **Started:** 2026-10-22T12:18:43Z · **Status:** closed (2026-10-22T13:05Z)

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Adri no celular | Mobile User | Android 390×844 e 360×800, 4g/flaky, pt-BR | CH-entrar-no-atelie-pelo-celular, CH-atelie-com-rede-ruim, CH-voltar-do-android-no-atelie |
| Adri recuperando o acesso | Recovering User | Android 390×844, 4g, pt-BR | CH-recuperar-acesso-pelo-celular |
| Cliente com conta da loja | Casual User | Android 360×800, wifi, pt-BR | CH-conta-sem-acesso-no-atelie |
| Equipe com TalkBack | Accessibility-Reliant | Android 390×844, árvore de acessibilidade, pt-BR | CH-atelie-com-leitor-de-tela |

## Flows in Scope

- `J-entrar-no-atelie` — a Adri abre o painel da loja como um app e chega às quatro áreas em segundos (`../journeys/J-entrar-no-atelie.md`)
- `J-recuperar-acesso` — a Adri volta a entrar sozinha, com a instrução batendo com o e-mail que chegou (`../journeys/J-recuperar-acesso.md`)
- `J-sem-conexao` — sem internet, o app nunca mostra número velho e volta sozinho (`../journeys/J-sem-conexao.md`)

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue | Fix commit |
|---|---|---|---|---|---|---|---|
| 1 | CH-entrar-no-atelie-pelo-celular | J-entrar-no-atelie / MAD-entrar-e-chegar-ao-inicio | Adri no celular | Feature | Pass | | |
| 2 | CH-entrar-no-atelie-pelo-celular | J-entrar-no-atelie / MAD-reabrir-com-sessao-salva | Adri no celular | Feature | Pass | | |
| 3 | CH-entrar-no-atelie-pelo-celular | J-entrar-no-atelie / MAD-senha-errada-mantem-email | Adri no celular | Feature | Pass | | |
| 4 | CH-entrar-no-atelie-pelo-celular | J-entrar-no-atelie / MAD-sair-volta-ao-login | Adri no celular | Feature | Pass | | |
| 5 | CH-conta-sem-acesso-no-atelie | J-entrar-no-atelie / MAD-conta-sem-acesso-recusada | Cliente com conta da loja | Garbage | Pass | | |
| 6 | CH-atelie-com-rede-ruim | J-sem-conexao / MAD-abrir-sem-conexao | Adri no celular | Network | Pass | (modo avião real no aparelho: Human Verifications) | |
| 7 | CH-atelie-com-rede-ruim | J-sem-conexao / MAD-rede-cai-com-app-aberto | Adri no celular | Network | Pass | | |
| 8 | CH-atelie-com-rede-ruim | J-sem-conexao / MAD-rede-inutil-recusa-falsa | Adri no celular | Network | Blocked (human decision) | BUG-20261022-sem-internet-recusa-admin (Re-found) | |
| 9 | CH-recuperar-acesso-pelo-celular | J-recuperar-acesso / MAD-recuperar-acesso-por-codigo | Adri recuperando o acesso | Interrupt | Pass | BUG-20261022-codigo-recebido-sem-onde-digitar (abandono, decisão); BUG-20261022-voltar-na-recuperacao-sai-do-app (decisão); BUG-20261022-codigo-colado-com-espaco-recusado (fixed) | |
| 10 | CH-recuperar-acesso-pelo-celular | J-recuperar-acesso / MAD-codigo-errado-ou-vencido | Adri recuperando o acesso | Interrupt | Pass | BUG-20261022-codigo-colado-com-espaco-recusado (fixed) | working tree (sem commit) |
| 11 | CH-voltar-do-android-no-atelie | J-entrar-no-atelie / MAD-navegar-pelas-quatro-abas | Adri no celular | Back-Button | Fixed | BUG-20261022-menu-da-conta-nao-fecha (fixed) | working tree (sem commit) |
| 12 | CH-atelie-com-leitor-de-tela | J-entrar-no-atelie / MAD-entrar-e-chegar-ao-inicio (a11y) | Equipe com TalkBack | Feature | Pass | (TalkBack real: Human Verifications) | |
| 13 | CH-atelie-com-leitor-de-tela | J-entrar-no-atelie / MAD-navegar-pelas-quatro-abas (a11y) | Equipe com TalkBack | Feature | Pass | | |
| 14 | — (aparelho) | J-entrar-no-atelie / MAD-instalar-e-abrir-standalone | Adri no celular | — | Blocked (needs human verify) | instruções em Human Verifications | |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`

## Session Debriefs

### CH-entrar-no-atelie-pelo-celular — Adri no celular

- **Ran:** 12:19 → 12:22 UTC de execução no navegador, ~15 min com leitura e escrita (box de 60 min respeitado: sim). Driver: Playwright 1.64.1 dirigindo Chrome for Testing 1228 (headless), Android emulado (UA Chrome 130 Android 14, `isMobile`, `hasTouch`, DPR 2,625), pt-BR, America/Sao_Paulo. Rede local sem throttle (4g não emulado: a parity gap está em *Final Status*).
- **Walk (390×844 e 360×800, os mesmos passos):**
  1. abre `/` sem sessão ⇒ splash "Ateliê · painel" de 0 a ~620 ms, depois o Login. Login visível em **870 ms** (390) e **837 ms** (360). Nenhuma amostra a cada 100 ms mostrou o formulário antes da splash. `pass`
  2. senha errada ⇒ "E-mail ou senha inválidos" em **77 ms**, como `role=alert`; o e-mail ficou no campo (a senha errada também ficou, para ser corrigida). `pass`
  3. corrige só a senha e entra ⇒ `/` em ~100 ms; amostrando a cada 40 ms por 3 s, a frase "não tem acesso" **nunca** apareceu. Início com título, "Esta parte do app chega em breve.", rodapé "Abrir o Backoffice" e as 4 abas. `pass`
  4. recarrega a Início ⇒ continua em `/`, o Login nunca pinta (amostra de 2,5 s). `pass`
  5. fecha a aba e abre outra no mesmo navegador ⇒ direto à Início (leitura independente: um documento novo leu a sessão do armazenamento da origem). `pass`
  6. "Sua conta" ⇒ e-mail `adri.qa@exemplo.invalid` + "Sair" ⇒ `/login`; recarregar continua no Login; digitar `/pedidos` cai no Login. A rede mostra `POST /auth/v1/logout?scope=global`. `pass`
- **Edge cases tentados:** Entrar vazio; e-mail com espaços e maiúsculas (`  Adri.QA@Exemplo.invalid `) + Enter (entra); toque duplo no Entrar (um único `token`, entra); botão durante o envio (vira "Entrando…" e fica desabilitado); abandono no meio do e-mail (reabre vazio, `localStorage` vazio); paisagem 844×390 (sem rolagem lateral, o Entrar rola para dentro da tela); 320×640 com modo escuro do sistema (sem rolagem lateral, abas de 80×64, o app fica claro — não há tema escuro, coerente com a loja); splash com movimento reduzido (zero animações rodando; sem a preferência, `splash-lockup` e `splash-progresso`).
- **Findings:** nenhum que falhe uma AC. Dois *paper cuts* cegos (ver a tabela): Entrar com os campos vazios vai à rede e responde "E-mail inválido" (o campo estava vazio, não inválido); e o `/favicon.ico` dá 404 em toda abertura (console).
- **Bugs filed/updated:** nenhum.
- **Scenarios settled:** MAD-entrar-e-chegar-ao-inicio → pass · MAD-reabrir-com-sessao-salva → pass · MAD-senha-errada-mantem-email → pass · MAD-sair-volta-ao-login → pass
- **Surprises:** cada login lê `user_roles` e `customers` duas vezes (`onAuthStateChange` + `getSession`); `customers` é o cadastro da própria conta, do `AuthProvider` compartilhado. Não é dado da loja, mas é uma leitura a mais que a Início não usa.
- **Suggested next charter:** Interrupt Tour sobre a sessão longa (deixar o app aberto até o token vencer e voltar), que esta box não alcançou.

### CH-conta-sem-acesso-no-atelie — Cliente com conta da loja

- **Ran:** 12:22 → 12:23 UTC no navegador, ~6 min com escrita (box de 30 min respeitado: sim). Android emulado 360×800, wifi local, pt-BR.
- **Walk:** entra com `cliente.qa@exemplo.invalid` ⇒ fica em `/login` com "Entrar no ateliê", o aviso "Esta conta não tem acesso ao painel." (`role=alert`) e "Sair" — sem cabeçalho, sem abas, sem rolagem lateral. A rede da sessão inteira tocou **só** `user_roles` e `customers` (o papel e o cadastro da própria conta); nenhuma tabela da loja. `pass`
- **Leitura independente:** recarregar a recusa a mantém (a sessão da cliente continua; o app não finge que ela saiu); digitar `/pedidos`, `/descontos`, `/clientes` e `/qualquer-coisa` cai sempre na mesma recusa, sem abas e sem leitura nova de tabela; o voltar do navegador também. "Sair" ⇒ formulário vazio; o voltar depois de Sair continua no formulário.
- **Edge cases tentados (Garbage Tour):** toque duplo em "Sair" (o segundo `logout` responde 403 e a tela não reage — inofensivo, só ruído no console); e-mail de 10.016 caracteres + senha com emoji, NUL e `'; drop table orders;--` (resposta "E-mail ou senha inválidos", sem rolagem lateral); e-mail com tabulação no fim + senha com espaço no fim (recusado — a senha é literal, correto); recarregar na recusa; voltar depois de rotas digitadas.
- **Findings:** nenhum.
- **Bugs filed/updated:** nenhum.
- **Scenarios settled:** MAD-conta-sem-acesso-recusada → pass
- **Paper cuts:** nenhum novo. A recusa mantém o título "Entrar no ateliê" acima de uma tela onde não há como entrar — coerente com o painel, cego.
- **Surprises:** o 403 do segundo `logout` aparece no console como erro de recurso.
- **Suggested next charter:** Multi-Tab — a cliente recusada numa aba e a Adri entrando na outra (o caso "troca de conta sem SIGNED_OUT" que o `LoginPage.test.tsx` cobre em jsdom).

### CH-atelie-com-rede-ruim — Adri no celular

- **Ran:** 12:23 → 12:28 UTC no navegador, ~15 min com escrita (box de 30 min respeitado: sim). Android emulado 390×844, perfil persistente (service worker instalado e controlando a página depois do primeiro recarregamento).
- **Walk:**
  1. **A rede cai com `/pedidos` aberta** (`context.setOffline(true)`) ⇒ em <800 ms a aba dá lugar a "Sem conexão. Os dados da loja aparecem quando a internet voltar." + "Tentar de novo", sem cabeçalho nem abas atrás. **Zero** requisições ao Supabase enquanto offline. `pass`
  2. "Tentar de novo" (duas vezes) ⇒ "Ainda sem conexão." num `role=status`. `pass`
  3. **A rede volta** ⇒ sozinha, em <2,5 s, de volta a `/pedidos` (a mesma aba), com o papel relido do servidor (`user_roles` + `customers` na rede). `pass`
  4. **Abrir frio sem rede** em `/` e direto em `/pedidos` ⇒ o documento vem do service worker (`fromServiceWorker`), a tela "Sem conexão…" aparece em ~15 ms, **zero** requisições ao Supabase; ligando a rede, `/pedidos` abre sozinha. **Ressalva de paridade:** no Playwright um documento servido pelo SW com o contexto offline vê `navigator.onLine === true`; a abertura fria foi medida com `navigator.onLine` forçado a falso (o que o aparelho em modo avião diz). Sem forçar, cai no `BL-048` (abaixo). Confirmação no aparelho em *Human Verifications Needed*. `pass`
  5. **Rede inútil** (navegador online, Supabase sem saída) ⇒ **o `BL-048` reaparece**, agora com dois agravantes. Falha rápida: splash ~7,1 s e "Esta conta não tem acesso ao painel."; sem resposta: **splash eterna** (90 s medidos, sem saída). Tocar "Sair" na recusa falsa **apaga a sessão salva**; entrar de novo ali dá a frase honesta ("Sem conexão com o servidor…"). `fail` → Re-found em `BUG-20261022-sem-internet-recusa-admin`, levado a *Decisions for a Human*.
- **Edge cases tentados (Network Tour):** Slow 3G do DevTools (400 ms / 400 kbps) na primeira abertura (5,2 s de tela sem nada antes da splash; login em 968 ms; reabrir pelo SW em 663 ms); "Tentar de novo" repetido; rede caindo no meio de uma aba; abrir offline numa rota funda (`/pedidos`, o `navigateFallback`); rede voltando com a tela aberta; rede inútil com falha rápida e com silêncio; "Sair" sem rede.
- **Bugs filed/updated:** BUG-20261022-sem-internet-recusa-admin (Re-found, dois agravantes).
- **Scenarios settled:** MAD-abrir-sem-conexao → pass · MAD-rede-cai-com-app-aberto → pass · MAD-rede-inutil-recusa-falsa → blocked-decision
- **Paper cuts:** a primeira abertura em Slow 3G mostra ~5 s de tela vazia antes da splash (o `index.html` não tem fundo nem casca inline; o tema da barra do sistema já pinta). Só acontece antes de instalar — depois o SW e a splash do manifest cobrem. Cego.
- **Surprises:** a "rede inútil" sem resposta não tem limite de tempo nenhum; a prova da `72` tinha medido ~10 s porque o dublê de lá respondia com erro.
- **Suggested next charter:** Interrupt Tour no aparelho — modo avião ligado e desligado com o app em segundo plano.

### CH-recuperar-acesso-pelo-celular — Adri recuperando o acesso

- **Ran:** 12:29 → 12:35 UTC no navegador (box de 30 min respeitado: sim). Android emulado 390×844 (e o reteste da senha em 360×800), Supabase local real, e-mail lido no **Mailpit** — a caixa de entrada desta rodada, então o código real entrou na jornada (nada interceptado).
- **Walk:**
  1. Login → "Esqueci minha senha" ⇒ "Recuperar acesso: Informe o e-mail da sua conta. Enviamos um código de 6 dígitos…". `adri` ⇒ "E-mail inválido" **sem** ir à rede. `pass`
  2. `  Adri.QA@Exemplo.invalid ` ⇒ em 95 ms o passo do código: "Enviamos um código de 6 dígitos para adri.qa@exemplo.invalid." (normalizado), "Ele vale por 10 minutos.", "Reenviar em 1:00" desabilitado. O e-mail chegou no Mailpit para o endereço normalizado, assunto "Redefinir sua senha — Uma Estrelinha", com o código de 6 dígitos, "expira em 10 minutos" e **nenhum link**. A instrução da tela bate com o e-mail. `pass`
  3. Campo do código: `inputmode=numeric`, `autocomplete=one-time-code`, `maxlength=6`; letras **entram** no campo (`12a3b4c56` vira `12a3b4`, cortado em 6) e o envio responde "O código tem 6 dígitos." sem rede — no teclado numérico do Android elas nem são digitáveis; 5 dígitos ⇒ a mesma frase, sem rede; `000000` ⇒ "Código inválido ou expirado. Peça um novo." e continua no passo. `pass` · **Colar o código com um espaço na frente** (` 123 456`, como sai ao copiar do corpo do e-mail) ⇒ o campo corta em ` 123 4` e responde "O código tem 6 dígitos." `friction` → `BUG-20261022-codigo-colado-com-espaco-recusado`.
  4. "Reenviar" liberou depois de **56 s** de contagem visível, virou "Reenviar código", mandou um e-mail novo e voltou a contar; o código **anterior** passou a ser recusado. `pass`
  5. Código novo ⇒ "Escolha a senha nova." Senha `abc` ⇒ "A senha precisa de pelo menos 6 caracteres"; senhas diferentes ⇒ "A confirmação não confere com a senha nova" — as duas **sem** rede. Iguais ⇒ `PUT /auth/v1/user` e a Início. `pass`
  6. **True end:** sair e entrar com a senha **antiga** ⇒ "E-mail ou senha inválidos"; com a **nova** ⇒ Início. `pass`
- **Abandono / Interrupt Tour:** fechar o app no passo do código e voltar ⇒ recomeça do **Login**; pedir o código de novo dentro do intervalo ⇒ "Aguarde alguns segundos para reenviar", ainda no passo do e-mail, sem lugar para digitar o código que já chegou. `friction` → `BUG-20261022-codigo-recebido-sem-onde-digitar`.
- **Edge cases tentados:** e-mail com espaços e maiúsculas; e-mail sem `@`; código com 5 dígitos, com letras, com espaço colado, errado; reenviar antes de 60 s (o botão nem deixa); o código antigo depois do reenvio; senha curta; senhas diferentes; fechar e reabrir no meio.
- **Bugs filed/updated:** BUG-20261022-codigo-recebido-sem-onde-digitar (novo, Friction) · BUG-20261022-codigo-colado-com-espaco-recusado (novo, Friction).
- **Scenarios settled:** MAD-recuperar-acesso-por-codigo → pass (com o achado do abandono ligado) · MAD-codigo-errado-ou-vencido → pass
- **Paper cuts:** "Aguarde alguns segundos para reenviar" não diz quantos segundos nem que um código já foi enviado — parte do bug acima.
- **Surprises:** no banco local o GoTrue aceitou dois envios a 29 s um do outro (o reenvio da tela e um pedido novo), embora o `max_frequency` seja `60s`; a tela continua mais conservadora que o servidor, o que é o lado certo.
- **Limpeza:** a senha da `adri.qa` foi devolvida a `senha-qa-1` **pelo próprio fluxo do app** (uma segunda recuperação, em 360×800, sem rolagem lateral) e conferida entrando.
- **Suggested next charter:** o mesmo fluxo com o código colado da área de transferência (Paste Tour) e com o preenchimento automático do Android (`one-time-code`).

### CH-voltar-do-android-no-atelie — Adri no celular

- **Ran:** 12:38 → 12:41 UTC no navegador (box de 30 min respeitado: sim). Android emulado 390×844. O voltar do Android é o `history.back()` do Chrome; foi exercido com o voltar do navegador (`page.goBack`), que é o mesmo evento.
- **Walk:**
  1. Início → Pedidos → Clientes → Descontos: cada aba com o próprio título e `aria-current="page"` só nela; abas de 64 px no rodapé da tela, cada uma com ícone. `pass`
  2. Voltar três vezes ⇒ Clientes, Pedidos, Início (título e marcação acompanham); avançar ⇒ Pedidos. Tocar a mesma aba três vezes empilha **uma** entrada só. `pass`
  3. Voltar na Início logo depois de entrar ⇒ sai do app (`about:blank`); o Login não fica no histórico (o login usa `replace`). A saída do app instalado é `blocked-verify` (aparelho). `pass`
  4. Voltar depois de Sair ⇒ Login, depois sai do app; nenhuma aba reaparece, nenhuma leitura de dado. `pass`
  5. **Voltar com o menu da conta aberto** ⇒ o histórico anda (Pedidos → Início) e o menu **continua aberto** na tela nova; tocar outra aba também o leva junto; tocar fora e Escape não fecham. `fail` → `BUG-20261022-menu-da-conta-nao-fecha`.
  6. **Voltar no meio da recuperação** (passo do e-mail ou do código) ⇒ **sai do app**; avançar devolve o Login, não o passo. `friction` → `BUG-20261022-voltar-na-recuperacao-sai-do-app`.
- **Edge cases tentados (Back-Button Tour):** voltar/avançar/voltar entre abas; voltar na raiz; voltar depois de Sair; voltar com um painel aberto; voltar no meio de um fluxo de vários passos; tocar a aba atual de novo; avançar depois de sair do app.
- **Bugs filed/updated:** BUG-20261022-menu-da-conta-nao-fecha (novo, Friction) · BUG-20261022-voltar-na-recuperacao-sai-do-app (novo, Friction).
- **Scenarios settled:** MAD-navegar-pelas-quatro-abas → fail na sessão; **Fixed** depois do conserto do menu e do reteste em sessão nova (ver *What Was Fixed*).
- **Paper cuts:** o menu pendurado sob o polegar em toda aba (agudo — entrou no fix loop).
- **Surprises:** nenhuma no histórico das abas; a regra "nada é interceptado" funciona como prometido.
- **Suggested next charter:** o mesmo tour no aparelho instalado (o gesto de voltar do Android 14 com o app em `standalone`).

### CH-atelie-com-leitor-de-tela — Equipe com TalkBack

- **Ran:** 12:42 → 12:44 UTC no navegador (box de 30 min respeitado: sim). Android emulado 390×844; o leitor de tela é **aproximado pela árvore de acessibilidade** do Chromium e pela ordem de foco do teclado — o TalkBack real fica com a dona.
- **Walk:**
  1. Splash ⇒ `status` "Abrindo o painel do ateliê" com a imagem "Uma Estrelinha"; não prende o foco (o foco fica no documento). `pass`
  2. Login ⇒ um `h1`, campos "E-mail" e "Senha" rotulados, "Mostrar senha" com `aria-pressed`, ordem de foco E-mail → Senha → Mostrar senha → Entrar → Esqueci minha senha, foco visível em todos. Erro ⇒ `alert` "E-mail ou senha inválidos", o foco fica na senha. `pass`
  3. Início ⇒ `banner`, `main`, `contentinfo`, `navigation "Áreas do ateliê"`; ordem Sua conta → Abrir o Backoffice → Início → Pedidos → Clientes → Descontos; ícones das abas `aria-hidden`. `pass`
  4. Trocar de aba pelo leitor ⇒ o `h1` muda e `aria-current` acompanha. `pass`
  5. Menu ⇒ "Sua conta" com `aria-expanded`, o próximo foco é "Sair". `pass`
  6. Sem conexão ⇒ "Tentar de novo" sem rede anuncia "Ainda sem conexão." num `status`. `pass`
- **Edge cases tentados:** texto a 200% (a escala de fonte do Android aproximada por `font-size: 200%` na raiz) no Login e na aba Clientes — zero rolagem lateral, abas de 98×128 sem corte, e a reserva da barra acompanha (4rem); teclado só; foco depois do login e depois da troca de aba.
- **Findings:** nada que falhe uma AC. Dois *paper cuts* cegos (tabela): a troca de aba não é anunciada (o título do documento é o mesmo nas quatro e nada fala o `h1` novo — o leitor só ouve a aba que tocou); e, quando a rede cai, a tela inteira troca sem anúncio (o `status` só fala depois de "Tentar de novo").
- **Bugs filed/updated:** nenhum.
- **Scenarios settled:** MAD-entrar-e-chegar-ao-inicio → pass (a11y) · MAD-navegar-pelas-quatro-abas → a11y pass (o veredito da linha fica com o CH-voltar)
- **Suggested next charter:** TalkBack real no aparelho, com o gesto de exploração por toque na barra inferior.

## What Was Fixed

> **Sem commit**, por regra do usuário: os dois consertos estão na working tree da branch, cada um com o próprio teste de regressão. A coluna "Fix commit" diz isso em vez de um SHA.

### BUG-20261022-codigo-colado-com-espaco-recusado: a Adri cola o código do e-mail e o app diz que ele não tem 6 dígitos
- **Symptom:** ` 123 456` colado vira ` 123 4` e aparece "O código tem 6 dígitos."
- **Root cause:** `maxLength={6}` corta o texto CRU no navegador antes de qualquer limpeza; a remoção de espaço existia, mas só na conferência.
- **Fix:** `apps/mobile-adm/src/features/recovery/ui/RecoveryFlow.tsx` — sem `maxLength`; o `onChange` guarda só dígitos, no máximo seis. (working tree, sem commit)
- **Regression test:** `apps/mobile-adm/src/features/recovery/__tests__/RecoveryFlow.test.tsx` › "código colado com espaço e quebra de linha vira os 6 dígitos e confere" — vermelho antes (`maxlength="6"`), verde depois.
- **Retested:** J-recuperar-acesso em sessão nova (Adri recuperando o acesso), com **colar de verdade** pela área de transferência: o código real do Mailpit como ` 342 641⏎` ficou `342641` e abriu o passo da senha. Vizinho: o passo da senha nova e a recusa de senha igual à atual ("A senha nova precisa ser diferente da atual.") seguem iguais.

### BUG-20261022-menu-da-conta-nao-fecha: o menu da conta fica aberto por cima de outra aba
- **Symptom:** o painel "Sua conta" sobrevive ao voltar, à troca de aba, ao toque fora e a Escape.
- **Root cause:** estado local alternado só pelo botão; nada o ligava à rota nem a toques fora.
- **Fix:** `apps/mobile-adm/src/widgets/account-menu/ui/AccountMenu.tsx` — fecha a cada `location.key` novo, a `pointerdown` fora da raiz e a Escape (foco volta ao botão). O voltar continua do navegador. (working tree, sem commit)
- **Regression test:** `apps/mobile-adm/src/widgets/account-menu/__tests__/AccountMenu.test.tsx` › "fecha quando ela sai dele" (4 casos) — os 4 vermelhos por asserção antes, verdes depois.
- **Retested:** J-entrar-no-atelie em sessão nova (Adri no celular): voltar, toque fora, Escape e troca de aba fecham; tocar dentro não fecha. Vizinhos: "Sair" pelo menu → Login; entrar de novo → Início; o voltar entre abas segue igual.

## Paper Cuts

| Persona | Where (journey/step) | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Adri no celular | J-entrar-no-atelie step 2 | "toquei Entrar sem querer e ele disse que meu e-mail é inválido — eu nem tinha escrito" (o formulário é `noValidate` e o vazio vai ao servidor) | dull | watching |
| Equipe com TalkBack | J-entrar-no-atelie step 3 | "toquei em Clientes e ele só repetiu 'Clientes, atual'; não sei se a tela mudou" (sem anúncio de página nova; `<title>` igual nas quatro abas) | dull | watching |
| Equipe com TalkBack | J-sem-conexao step 1 | "a internet caiu e o app não disse nada; só descobri passando o dedo" (a troca para a tela Sem conexão não é anunciada) | dull | watching |
| Adri no celular | J-entrar-no-atelie step 1 (primeira abertura, Slow 3G) | "abri o endereço e ficou tudo branco uns cinco segundos" (5,2 s antes da splash; só antes de instalar) | dull | watching |
| Adri no celular | J-entrar-no-atelie step 1 | invisível para ela: `/favicon.ico` 404 em toda abertura; na aba do Chrome antes de instalar aparece o ícone genérico | dull | watching |

## Runtime Errors Observed

Nenhum `pageerror` (exceção JavaScript) em nenhuma sessão. Erros de recurso no console:

- `404 /favicon.ico` em toda abertura — o `index.html` não declara ícone de aba. Paper cut cego; não registrado como bug.
- `400 /auth/v1/token` — senha errada e Entrar vazio: resposta esperada do GoTrue, mostrada como frase.
- `403 /auth/v1/logout` — o segundo toque em "Sair"; inofensivo.
- `429 /auth/v1/recover` — pedir código dentro do intervalo ("Aguarde alguns segundos para reenviar"; ver `BUG-20261022-codigo-recebido-sem-onde-digitar`).
- `422 /auth/v1/user` — senha nova igual à atual ("A senha nova precisa ser diferente da atual.").
- `net::ERR_INTERNET_DISCONNECTED` em série — só nos cenários de rede (`BL-048`).

## Human Verifications Needed

Tudo abaixo é no **Android da Adri**, com o app publicado (ou o build servido na rede local) e a conta admin dela.

- [ ] **Instalar e abrir em tela cheia** (row #14, `MAF-01`/`MAF-02`): no Chrome do Android, abrir o endereço do ateliê → menu ⋮ → "Instalar app". Confirma: o ícone "Ateliê" aparece na tela inicial; tocado, abre **sem barra de endereço**, primeiro com a splash do sistema no azul-escuro da marca, depois a splash do app ("Ateliê · painel").
- [ ] **Voltar na raiz sai do app** (row #11, metade de `MAF-17`): no app instalado, na aba Início, fazer o gesto de voltar. Confirma: o app vai para o fundo, sem abrir o Login nem uma tela branca.
- [ ] **Barra de gestos** (`MAF-15`): com navegação por gestos, as quatro abas ficam inteiras **acima** da barrinha do sistema e tocáveis com o polegar.
- [ ] **Modo avião** (row #6): com o app já aberto uma vez, ligar o modo avião e abrir pelo ícone. Confirma: "Sem conexão. Os dados da loja aparecem quando a internet voltar." aparece na hora; desligar o modo avião faz o app sair da tela sozinho. Se ficar ~10 s na splash e disser "Esta conta não tem acesso ao painel.", anotar: é o `BL-048` também no modo avião.
- [ ] **TalkBack** (rows #12–13): com o TalkBack ligado, entrar e passar pelas quatro abas só por gestos. Confirma: os campos se anunciam "E-mail" e "Senha", o erro de senha é lido sozinho, cada aba se anuncia com o nome e o estado atual. Anotar se, ao trocar de aba, ele fica mudo (paper cut registrado).
- [ ] **Código no e-mail de verdade** (row #9, o template de produção): "Esqueci minha senha" com o e-mail real dela. Confirma: chega "Redefinir sua senha — Uma Estrelinha" com **6 dígitos** e sem link; o código copiado do Gmail (segurar → copiar) e colado entra no campo e abre "Escolha a senha nova.".

## Decisions for a Human

### Com a internet que não funciona, o app diz que a Adri não tem acesso — e o "Sair" dela apaga a sessão (BUG-20261022-sem-internet-recusa-admin, `BL-048`, Re-found)
- What's broken: com o celular "conectado" mas sem saída (Wi-Fi sem internet), o ateliê fica ~7 s na splash e diz "Esta conta não tem acesso ao painel." — ou fica na splash **para sempre** (90 s medidos) quando a rede some sem responder. A única ação oferecida, "Sair", apaga a sessão salva. Evidência: `docs/qa/evidence/2026-10-22-mobile-adm-fundacao/CH-rede-ruim-07-*.png`.
- Why not auto-fixed: a causa é o `checkAdmin` de `packages/auth/src/AuthContext.tsx` (booleano que não distingue "não" de "não sei"), **compartilhado com o Backoffice** — fora deste ciclo por instrução e por decisão registrada (`BL-048`); o conserto também muda a API do provider (governor: *low-risk* e *no API contract change*).
- Options:
  1. **Três estados no `AuthProvider`** (`admin | sem-papel | não-sei`) com teto de tempo na consulta do papel; o app mostra "Não consegui conferir seu acesso" + "Tentar de novo" e nunca oferece "Sair" nesse estado — conserta os dois apps; mexe no pacote compartilhado e pede a suíte do painel como gate.
  2. **Só no app**: trocar a recusa pela frase honesta quando a consulta falha — rápido, mas é "quem é admin?" escrito duas vezes (o defeito 01) e deixa o Backoffice igual.
  3. **Deixar até a `73`** — o prazo que o `BL-048` já registra (`MAI-08`); o risco é a Adri usar o app antes disso num Wi-Fi ruim.
- Recommendation: **1**, antes da `73`, como o `BL-048` prevê — com o agravante novo na AC ("Sair" não pode ser a única saída de um estado que não é recusa).

### O código que chegou não tem onde ser digitado depois de fechar o app (BUG-20261022-codigo-recebido-sem-onde-digitar)
- What's broken: fechar o app no passo do código e voltar recomeça do Login; pedir de novo dentro do intervalo dá "Aguarde alguns segundos para reenviar", ainda no passo do e-mail. O código válido no e-mail fica sem campo; esperar e pedir outro **invalida** o primeiro. Evidência: `CH-recuperar-03-pedido-antes-de-60s.png`.
- Why not auto-fixed: a forma da saída é decisão de produto (governor: *no product trade-off*).
- Options:
  1. **No 429 do envio, ir ao passo do código mesmo assim**, com "Já enviamos um código há pouco para <e-mail>" e o reenvio contando — nenhuma tela nova; se o primeiro e-mail nunca chegou, o reenvio continua ali.
  2. **Um link "Já tenho um código"** no passo do e-mail — explícito, mas é mais uma opção para quem está com a confiança baixa.
  3. **Guardar o passo em `sessionStorage`** — sobrevive ao recarregar, não ao Android matar a aba; e é estado de auth fora do provider.
- Recommendation: **1**.

### O voltar do Android no meio da recuperação fecha o app (BUG-20261022-voltar-na-recuperacao-sai-do-app)
- What's broken: os passos da recuperação não entram no histórico; o gesto de voltar sai do app e o passo se perde (levando ao bug acima).
- Why not auto-fixed: muda a regra registrada "o voltar do Android é o do navegador: nada é interceptado" (`apps/mobile-adm/CLAUDE.md`); dar endereço à recuperação é decisão de produto e de rotas.
- Options:
  1. **Dar rota à recuperação** (`/login/recuperar`, com o passo na URL ou no `history.state`) — o voltar passa a voltar um passo sem interceptar nada; a rota nova entra nos guardas de rotas.
  2. **Deixar como está** — "Voltar para entrar" existe na tela; o gesto continua saindo do app.
- Recommendation: **1**, junto com a opção 1 do bug anterior — os dois são o mesmo estado que só existe na memória.

## Experiential Lens Pass (Step 5)

Re-walk de **J-entrar-no-atelie** e **J-recuperar-acesso** (as de maior superfície nova), 12:45 → 12:55 UTC, com o modo escuro do sistema e o movimento reduzido ligados e a auth atrasada em 700 ms.

| Lens | J-entrar-no-atelie | J-recuperar-acesso |
|---|---|---|
| Usability | **friction** — o menu da conta não fechava (consertado); Entrar vazio responde "E-mail inválido" | **friction** — o código que chegou fica sem campo depois de fechar; o voltar sai do app |
| Accessibility | **friction** — troca de aba e queda de rede sem anúncio; o resto limpo (rótulos, `alert`, `status`, foco visível, texto a 200%) | **pass** — rótulos, `alert` em cada recusa, `status` em "Enviamos…", `one-time-code` |
| Perceived performance | **friction** — 5,2 s sem nada na primeira abertura em Slow 3G (antes de instalar); depois: "Entrando…" em 31 ms, login ~100 ms, reabrir pelo SW 663 ms | **pass** — "Enviando…" imediato; passo do código em 826 ms com 700 ms de latência |
| Compatibility | **pass** — Android Chrome em 320/360/390, paisagem, escuro (o app fica claro, como a loja), movimento reduzido (zero animações). Safari/Firefox fora do escopo (só Android) | **pass** — o mesmo; colar código consertado |
| Error recoverability | **fail** — `BL-048`: recusa falsa ou splash eterna com rede inútil, e "Sair" apaga a sessão (Decisions for a Human) | **friction** — "Aguarde alguns segundos para reenviar" sem dizer que um código já foi; o resto preserva o que ela digitou e diz o próximo passo |
| Production parity | **friction** — Supabase **local**, Chrome for Testing headless com UA de Android, porta 8085, sem extensões, `navigator.onLine` da emulação diferente do aparelho | **pass** com ressalva — GoTrue real e o template do repositório pelo Mailpit; o template **colado no dashboard de produção** não é medido por nada daqui |

## Learnings

- **"Sem resposta" e "falha rápida" são duas redes inúteis diferentes.** A prova da `72` viu ~10 s porque o dublê respondia com erro; com pacotes que somem, a splash nunca sai. Charter de rede deve provar os dois.
- **A ação oferecida numa tela de erro é parte do erro.** O "Sair" da recusa falsa transformava um diagnóstico errado em perda de sessão — só apareceu porque a sessão seguinte começou no Login.
- **`maxLength` em campo de código é armadilha de colar**: o navegador corta antes do `onChange`, e jsdom não aplica `maxlength` a `change` — o teste mede o atributo além do valor.
- **Estado de fluxo só em memória quebra duas jornadas de uma vez** (abandono e voltar). Pergunta fixa para o planejamento de toda tela de vários passos: "e se o Android matar a aba aqui?".
- **No banco local o GoTrue aceitou dois envios a 29 s** apesar do `max_frequency = "60s"`; o servidor local não prova o limite de reenvio.
- Tour candidato ao catálogo: **Popover Tour** (todo painel aberto × voltar, toque fora, Escape, troca de rota) — o menu passou por todas as suítes.

## Final Status

- **Exit gate (suíte automatizada, um workspace por vez, exit code fora de pipe):**
  - `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` → `Test Files 18 passed (18) · Tests 140 passed (140)`, **exit 0** (eram 135 na entrada; +5 são os testes de regressão dos dois consertos). `pnpm --filter @estrelinha/mobile-adm lint` exit 0; `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` exit 0.
  - Os consertos ficaram dentro de `apps/mobile-adm/**`, mas os guardas da loja e do painel varrem `apps/**`, então os dois rodaram também: `pnpm --filter @estrelinha/store test --testTimeout=20000` → `Test Files 313 passed (313) · Tests 5743 passed (5743)`, **exit 0**; `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` → `Test Files 207 passed (207) · Tests 3648 passed (3648)`, **exit 0**.
- **Issues by user impact (achados neste ciclo):** Blocks-Completion 0 · Data-Loss 0 · Trust-Damage 1 (o `BL-048`, Re-found, aberto) · Friction 4 (2 consertados e retestados, 2 abertos em decisão) · Cosmetic 0. Paper cuts cegos: 6, só observados.
- **Coverage:** 3/3 jornadas andadas pelas personas atribuídas; 6/6 charters; 14 linhas na matriz — 11 Pass, 1 Fixed, 1 Blocked (human decision), 1 Blocked (needs human verify), 0 Skipped. Nada cortado.
- **Parity:** Supabase **local** (auth real, e-mail real pelo Mailpit, nada interceptado do produto); Chrome for Testing headless com UA de Chrome Android, não um aparelho; preview na porta **8085** (a 8084 estava ocupada por outra sessão); sem extensões nem perfil real; Slow 3G do DevTools só numa medição; a abertura fria sem rede foi medida com `navigator.onLine` forçado, porque a emulação não o acompanha em documento servido pelo SW. Toda verificação de instalação, gesto e TalkBack fica com a dona.
- **Fidelity:** nenhum texto de avaliação entrou no produto; o banco foi consultado só antes (as contas de QA) e depois (a limpeza da senha), nunca para decidir um passo.
- **Verdict:** **ready with blocked items** — a fundação faz o que promete em navegador e a suíte está verde, mas, antes de a Adri depender do app no dia a dia, decida o `BL-048` (a recusa falsa sem internet, agora com o "Sair" apagando a sessão) e as duas saídas da recuperação, e faça no aparelho as seis verificações listadas.
