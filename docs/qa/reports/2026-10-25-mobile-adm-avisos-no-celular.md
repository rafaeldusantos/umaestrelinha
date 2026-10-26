# QA Run Report — 2026-10-25 — mobile-adm-avisos-no-celular

- **Scope:** branch `feat/79-mobile-adm-aviso-de-pedido` (sem commit sobre `5e31a99b`): tela `/avisos` do app do ateliê, os quatro interruptores, o aviso de teste, "Parar avisos neste celular", o "Sair" que para os avisos, o login que volta ao destino e o canal Celular no histórico do pedido.
- **Cadence tier:** targeted
- **Build:** `apps/mobile-adm/dist` (build do código atual), servido por `vite preview` em http://localhost:8191 · **Environment:** Supabase local real (:54441), `supabase functions serve --env-file .env` (as functions `atelie-avisos` e `send-notification` reais), admin do `seed.sql`.
- **Started:** 2026-10-25T22:05Z · **Status:** closed (2026-10-25T22:45Z)

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Adri no celular | dona do ateliê | phone-large/phone-small · 4g/3g-flaky · pt-BR | CH-avisos-ligar-e-receber-o-pedido, CH-avisos-estados-e-falhas, CH-avisos-sair-e-conta-sem-acesso, canários |
| Pessoa da equipe com leitor de tela | equipe | phone-small · wifi · pt-BR | CH-avisos-com-fonte-grande-e-leitor-de-tela |

## Flows in Scope

- `J-receber-aviso-de-pedido` — a Adri fica sabendo de pedido pago sem abrir o computador (`../journeys/J-receber-aviso-de-pedido.md`)
- Canários: `J-entrar-no-atelie` (login volta ao destino), `J-registrar-o-dia` (`gravarAcao` mudou a tradução da recusa)

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue | Fix commit |
|---|---|---|---|---|---|---|---|
| 1 | CH-avisos-ligar-e-receber-o-pedido | MAD-avisos-ativar-neste-celular | Adri no celular | Money | Pass |  |  |
| 2 | CH-avisos-ligar-e-receber-o-pedido | MAD-avisos-aviso-de-pedido-chega-uma-vez | Adri no celular | Money | Blocked (needs human verify) |  |  |
| 3 | CH-avisos-ligar-e-receber-o-pedido | MAD-avisos-tocar-abre-o-pedido | Adri no celular | Money | Blocked (needs human verify) |  |  |
| 4 | CH-avisos-ligar-e-receber-o-pedido | MAD-avisos-historico-canal-celular | Adri no celular | Money | Pass |  |  |
| 5 | CH-avisos-estados-e-falhas | MAD-avisos-permissao-bloqueada | Adri no celular | Network | Pass |  |  |
| 6 | CH-avisos-estados-e-falhas | MAD-avisos-navegador-sem-suporte | Adri no celular | Network | Pass |  |  |
| 7 | CH-avisos-estados-e-falhas | MAD-avisos-falha-ao-ativar | Adri no celular | Network | Pass |  |  |
| 8 | CH-avisos-estados-e-falhas | MAD-avisos-interruptor-por-evento | Adri no celular | Network | Pass | BUG-20261025-teste-com-aparelho-descartado-deixa-a-tela-ligada (efeito colateral) |  |
| 9 | CH-avisos-estados-e-falhas | MAD-avisos-aviso-de-teste | Adri no celular | Network | Blocked (human decision) | BUG-20261025-teste-com-aparelho-descartado-deixa-a-tela-ligada |  |
| 10 | CH-avisos-estados-e-falhas | MAD-avisos-teste-antes-de-30s | Adri no celular | Network | Pass |  |  |
| 11 | CH-avisos-estados-e-falhas | MAD-avisos-parar-neste-celular | Adri no celular | Network | Pass |  |  |
| 12 | CH-avisos-sair-e-conta-sem-acesso | MAD-avisos-sair-para-os-avisos | Adri no celular | Garbage | Pass |  |  |
| 13 | CH-avisos-sair-e-conta-sem-acesso | MAD-avisos-conta-sem-acesso | Adri no celular | Garbage | Pass |  |  |
| 14 | CH-avisos-com-fonte-grande-e-leitor-de-tela | MAD-avisos-com-leitor-de-tela | Pessoa com leitor de tela | Feature | Fixed | BUG-20261025-foco-cai-no-body-nos-avisos | sem commit (pedido do usuário) |
| 15 | CH-avisos-com-fonte-grande-e-leitor-de-tela | MAD-avisos-fonte-grande-e-telas-estreitas | Pessoa com leitor de tela | Feature | Pass |  |  |
| 16 | CH-avisos-com-fonte-grande-e-leitor-de-tela | MAD-avisos-tom-memorial | Pessoa com leitor de tela | Feature | Pass |  |  |
| 17 | CH-entrar-no-atelie-pelo-celular (canário) | login volta ao destino | Adri no celular | — | Pass |  |  |
| 18 | CH-acoes-registrar-o-dia-no-celular (canário) | ação no pedido grava; recusa | Adri no celular | — | Pass |  |  |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`

**Paridade:** build de produção do app servido por `vite preview` (:8191), auth real do Supabase local com a
conta admin do `seed.sql` (senha nunca registrada), as functions `atelie-avisos` e `send-notification` **reais**
(`supabase functions serve --env-file .env`) e o **FCM real** para o teste e o gatilho. **Dublado**: só o
navegador — `navigator.serviceWorker`, `PushManager` e `Notification` por `addInitScript`, com par de chaves
P-256 de verdade (o endpoint é sintético, por isso o FCM responde 410). As falhas de rede/5xx foram injetadas por
rota no Playwright sobre a porta real. O painel (`/admin/pedidos/<id>`) foi lido num build do backoffice em
pasta de scratch servido em :8192. `**/g/collect*` interceptado; `*.supabase.co` bloqueado. Nenhum e-mail real:
o pedido de fixtura nasceu com os três e-mails marcados `sent` (as respostas dizem `already_sent`).

## Session Debriefs

### CH-avisos-ligar-e-receber-o-pedido — Adri no celular (412×915, 4g)

- **Ran:** 22:05 → 22:12 (caixa respeitada)
- **Findings:**
  - Abrir o app e o login não pedem permissão (log do dublê vazio até o toque). Menu "Sua conta" → "Avisos neste
    celular" → `/avisos`, título do documento "Avisos neste celular · Ateliê". "Avisar neste celular" ⇒
    `requestPermission` uma vez, `config` + `subscribe` na porta (corpo `endpoint, keys`), 4 interruptores
    ligados na ordem Pedido novo · Pedido pago · Pagamento recusado da cliente · Material a caminho; uma linha em
    `push_subscriptions` com os 4 eventos; F5 mantém.
  - Pedido pago (`P79-0001`) com dois disparos de `payment_approved`: **uma** linha `owner_order_paid · push`
    (`failed`, `push:0/1 — gone_410` — o FCM recusou o endpoint sintético e a inscrição foi apagada, `MAN-04`); o
    segundo disparo deu `skipped: no_device`, sem segunda linha. E-mails `already_sent`.
  - Histórico no app (390 e 360 a 200 %) e no painel (1440): "O aviso no celular não chegou." sem "Reenviar"; a
    linha `sent` (fixtura `push:1/2`) aparece "Aviso à dona de pedido novo enviado (Celular)" com "Entregue a 1
    de 2 aparelhos", distinta das linhas "(E-mail)". Sem rolagem horizontal.
  - Sessão ausente + `/pedidos/<id>` (o que o toque no aviso abre) ⇒ Login ⇒ depois de entrar, volta a
    `/pedidos/<id>`.
- **Bugs filed/updated:** —
- **Scenarios settled:** ativar → pass · historico-canal-celular → pass · chega-uma-vez → blocked-verify ·
  tocar-abre-o-pedido → blocked-verify (a metade do login provada)
- **Paper cuts:** o detalhe da linha que falhou é técnico ("push:0/1 — gone_410"); a spec manda mostrar o motivo
  gravado (`MAN-09`), então é desenho — dull.
- **Surprises:** —
- **Suggested next charter:** o mesmo percurso num Chrome real/Android com FCM (Human Verifications).

### CH-avisos-estados-e-falhas — Adri no celular (412, 3g-flaky simulado)

- **Ran:** 22:13 → 22:24 (caixa respeitada)
- **Findings:**
  - Permissão já negada ⇒ frase de `MAN-12`, nenhuma chamada à porta, sem pedir permissão. Negar agora ⇒ a
    mesma frase, nada gravado. Fechar o pedido sem responder ⇒ segue "Avisar neste celular", nada gravado. Sem
    `PushManager` ⇒ "Este navegador não recebe avisos." sem botão.
  - `subscribe` em 500 e com a rede cortada, e `config` com a rede cortada ⇒ "Não consegui ativar os avisos.
    Tente de novo.", zero interruptores, a inscrição do navegador desfeita (`unsubscribe` no log), zero linhas;
    tocar de novo com a rede boa ⇒ ligado. Duplo toque no "Avisar" ⇒ `aria-busy` + desabilitado, **um**
    `subscribe`.
  - Interruptor: `aria-busy` só no tocado, todos desabilitados durante; grava só esta inscrição; F5 mantém. 500,
    403 sem `42501` e rede cortada ⇒ volta ao que era e "Não consegui gravar esta escolha. Tente de novo." (403
    sem `42501` é falha, não recusa). Duplo toque ⇒ uma gravação.
  - Teste com dois aparelhos da mesma conta: A ⇒ "O aviso de teste não saiu." (FCM 410, linha apagada); B em
    < 30 s ⇒ "Aguarde alguns segundos para mandar outro aviso de teste." (duas vezes); B depois de 30 s ⇒ sai
    para o FCM (410, "não saiu"). Nenhuma linha em `order_notifications` pelo teste.
  - "Parar" com a porta em 500 e com a rede cortada ⇒ "Não consegui parar os avisos deste celular.", segue
    ligado e o navegador segue inscrito; com a porta boa ⇒ "Avisar neste celular", navegador desinscrito, linha
    apagada, F5 mantém.
  - Leitura ao abrir em 500 e sem rede ⇒ "Não consegui conferir os avisos deste celular. Tente de novo." +
    "Tentar de novo", que relê. Inscrição que o servidor apagou ⇒ abre em "Avisar neste celular" (`MAN-36`) e
    reativar regrava.
  - **Achado:** depois do 410 do teste, a tela segue "ligada" — o teste seguinte e os interruptores respondem 404
    com frases de "tente de novo" que nunca passam, até reabrir a tela.
- **Bugs filed/updated:** BUG-20261025-teste-com-aparelho-descartado-deixa-a-tela-ligada (Trust-Damage, decisão)
- **Scenarios settled:** permissao-bloqueada, navegador-sem-suporte, falha-ao-ativar, interruptor-por-evento,
  teste-antes-de-30s, parar-neste-celular → pass · aviso-de-teste → blocked-decision
- **Paper cuts:** o teste que sai não diz nada na tela (o aviso no sistema é o retorno) — dull, desenho.
- **Surprises:** a rede cortada responde em ~1 s aqui (sem as retentativas que a `76` media em ~16 s).
- **Suggested next charter:** o 410 num aparelho real com a permissão revogada pelo Android.

### CH-avisos-sair-e-conta-sem-acesso — Adri no celular emprestado (360×800)

- **Ran:** 22:25 → 22:31 (caixa respeitada)
- **Findings:**
  - "Sair" com inscrição e `unsubscribe` em 500 ⇒ o menu pergunta "Não consegui parar os avisos deste celular."
    com "Tentar de novo" (foco nele) e "Sair mesmo assim", e a sessão continua. "Tentar de novo" sem rede ⇒ a
    mesma pergunta. Fechar e reabrir o menu ⇒ o "Sair" de sempre. Com a porta boa ⇒ Login, linha apagada,
    navegador desinscrito — o `unsubscribe` antes do `signOut`.
  - "Sair mesmo assim" ⇒ Login, a linha e a inscrição ficam (o aparelho segue recebendo, como a spec diz); ao
    entrar de novo, `/avisos` mostra ligado.
  - "Sair" sem inscrição ⇒ zero chamadas à porta.
  - Conta sem papel (conta de teste local `@exemplo.invalid`, criada e apagada nesta sessão) em `/avisos` ⇒
    "Esta conta não tem acesso ao painel." da `72`, nenhum interruptor ou botão de avisos em nenhum dos instantes
    amostrados a cada 60 ms, nenhuma chamada à porta. Conta que perde o papel com a tela ligada e toca um
    interruptor ⇒ a recusa da `72`. O motor não manda push a quem perdeu o papel (`has_role` por dono, `MAN-18`).
- **Bugs filed/updated:** —
- **Scenarios settled:** sair-para-os-avisos, conta-sem-acesso → pass (parar-neste-celular já pass)
- **Paper cuts:** —
- **Surprises:** —
- **Suggested next charter:** —

### CH-avisos-com-fonte-grande-e-leitor-de-tela — Pessoa com leitor de tela (360, teclado)

- **Ran:** 22:31 → 22:40 (caixa respeitada)
- **Findings:**
  - Árvore de acessibilidade: `heading` "Avisos neste celular"; `group` "Avisos neste celular" com os quatro
    `switch` nomeados pelo evento e `[checked]`; o tocado `aria-busy` durante a gravação; as falhas são
    `role="alert"`.
  - **Bug:** depois de ativar, de trocar um interruptor (toque e Espaço), de testar, de parar e do "Tentar de
    novo", o foco caía no `<body>`. Consertado no QA (abaixo).
  - Layout: o probe `04-layout.mjs` da feature rodado no build servido — 144/144 medidas limpas (12 estados ×
    360/390/412/1440 × 100/130/200 %), e 36/36 de novo no build com o conserto (ligado, desligado, erro-parar):
    sem rolagem horizontal, sem sobreposição, rótulos inteiros ("Pagamento recusado da cliente" a 200 % em 360
    quebra sem passar sob o trilho), alvos ≥ 44 px.
  - Tom: nenhum emoji, exclamação ou urgência na tela, no menu e nos textos dos avisos (`core/notifications/push.ts`).
- **Bugs filed/updated:** BUG-20261025-foco-cai-no-body-nos-avisos (Friction, consertado)
- **Scenarios settled:** com-leitor-de-tela → fixed · fonte-grande-e-telas-estreitas, tom-memorial → pass
- **Paper cuts:** durante a gravação o foco ainda passa pelo `<body>` (o controle está desabilitado por
  `MAN-41`) e volta ao fim — dull.
- **Surprises:** —
- **Suggested next charter:** TalkBack real no Android.

### Canários — CH-entrar-no-atelie-pelo-celular e CH-acoes-registrar-o-dia-no-celular

- **Findings:** login com destino volta a `/pedidos/<id>` (acima); entrar sem destino vai à Início. "Iniciar
  separação" no pedido de fixtura ⇒ `separating` no banco; com a conta que perdeu o papel no meio ⇒ a recusa da
  `72` e o pedido segue `paid` (a tradução da recusa de `gravarAcao`).
- **Scenarios settled:** canários → pass.

## What Was Fixed

### BUG-20261025-foco-cai-no-body-nos-avisos: o foco cai no `<body>` depois de cada ação de `/avisos`
- **Symptom:** quem usa leitor de tela ou teclado recomeça do topo da página depois de ativar, trocar um
  interruptor, testar, parar ou "Tentar de novo".
- **Root cause:** o controle que tinha o foco sai do DOM (ativar, parar, "Tentar de novo") ou é desabilitado
  enquanto grava (`MAN-41`), e nada devolvia o foco ao fim da ação.
- **Fix:** `apps/mobile-adm/src/pages/AvisosPage.tsx` — devolve o foco ao controle de origem quando ele segue na
  tela e habilitado, senão ao título (`main h1`, `tabindex="-1"`, `preventScroll`); só quando o foco caiu no
  `<body>`. Sem commit (pedido do usuário).
- **Regression test:** `apps/mobile-adm/src/pages/__tests__/avisosPage.test.tsx` (+7; 6 reprovavam antes). 5
  mutantes reinjetados, 5 mortos por asserção, SHA-256 conferido na restauração.
- **Retested:** build refeito (`pnpm --filter @estrelinha/mobile-adm build`), teclado e toque em 360/390 —
  ativar ⇒ título, interruptor ⇒ o próprio interruptor, falha ⇒ o interruptor, teste ⇒ o botão, parar ⇒
  título, sem rolagem; vizinhos re-andados: o "Sair" do menu (pergunta e saída), o layout (36/36) e os
  canários.

## Paper Cuts

| Persona | Where (journey/step) | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Adri no celular | histórico do pedido | "push:0/1 — gone_410 — o que é isso?" | dull | watching (a spec manda mostrar o motivo, `MAN-09`) |
| Adri no celular | J-receber-aviso step 3 | o teste que sai não diz nada na tela | dull | watching (o aviso no sistema é o retorno) |
| Pessoa com leitor de tela | step 2 | o foco passa pelo `<body>` enquanto grava | dull | watching (`MAN-41` exige desabilitar) |

## Runtime Errors Observed

- Nenhum erro de console nem `pageerror` nas sessões no build servido.

## Human Verifications Needed

- [ ] **Chegada real do aviso** (row #2): num Chrome com FCM ou no Android, ativar em `/avisos`, rodar o script
  de fixtura (`criar`, depois `disparar <id>` — ele marca os e-mails como `sent` antes) e conferir **um** aviso
  "Pedido #NNNN pago" / valor; na tela de bloqueio só número e valor; com "Pedido pago" desligado, nenhum.
- [ ] **Tocar o aviso** (row #3): tocar o aviso abre `/pedidos/<id>` (foca a janela aberta ou abre uma); com a
  sessão vencida, o Login volta ao pedido. A metade do Login foi provada aqui; o toque e o service worker não.
- [ ] **Aviso de teste chegando** ("Avisos ligados" / "É assim que os pedidos vão chegar.", tocar abre a Início).
- [ ] **TalkBack real** em `/avisos`: o nome e o estado de cada interruptor anunciados, e o foco depois de
  ativar/parar.

## Decisions for a Human

### O aparelho descartado pelo serviço de push segue "ligado" na tela (BUG-20261025-teste-com-aparelho-descartado-deixa-a-tela-ligada)
- What's broken: depois de o teste responder 410 (inscrição apagada pelo servidor), `/avisos` segue com os 4
  interruptores ligados; o teste seguinte e cada interruptor respondem 404 com "tente de novo" que nunca passa,
  até reabrir a tela. Evidência: `evidence/2026-10-25-mobile-adm-avisos-no-celular/S3-teste-1-412.png`.
- Why not auto-fixed: trade-off de produto — a spec manda a frase de `MAN-32` para "o teste falha" e só cobre o
  estado "não conhecido pelo servidor" na abertura (`MAN-36`); que frase e que estado mostrar depois do `gone` é
  decisão de desenho.
- Options:
  1. Em `gone`/`not_found` (teste ou interruptor), voltar ao estado de `MAN-10` ("Avisar neste celular"),
     desfazer a inscrição do navegador e mostrar uma frase nova, ex.: "Este celular deixou de receber avisos.
     Ative de novo." — honesto, uma frase a aprovar.
  2. Voltar ao estado de `MAN-10` em silêncio, sem frase nova — mais simples, mas a Adri não sabe por que o
     estado mudou.
  3. Manter como está (a frase de `MAN-32`) — a tela segue afirmando "ligado".
- Recommendation: 1 — a tela deixa de mentir, e o "ativar de novo" que `MAN-36` já prevê vira o caminho óbvio.
- **Decisão (2026-10-26): opção 1**, consertada sem commit; reteste em navegador pendente (ver o bug).

## Final Status

**Pronto para seguir com itens bloqueados**: 16 linhas da jornada + 2 canários, zero `Pending` — 14 Pass, 1
Fixed, 1 Blocked (human decision), 2 Blocked (needs human verify). Por impacto: **Trust-Damage 1** (aberto,
decisão humana), **Friction 1** (consertado, sem commit), Blocks-Completion 0, Data-Loss 0. A chegada real do
aviso, o toque e o TalkBack seguem pendentes de um Chrome com FCM/Android.

Exit gate (depois do conserto, um workspace por vez, exit fora de pipe):

- `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` ⇒ `Test Files 125 passed (125)` · `Tests 2005 passed (2005)`, exit 0
- `pnpm --filter @estrelinha/store test --testTimeout=20000` ⇒ `Test Files 323 passed (323)` · `Tests 5985 passed (5985)`, exit 0
- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` ⇒ 0 · `eslint` dos dois arquivos tocados ⇒ 0 · `pnpm --filter @estrelinha/mobile-adm build` ⇒ verde

Fixturas apagadas (pedido `P79-0001` com as notificações e o histórico, a conta de teste local, as inscrições e
os `push_test_claims`); contagens iguais às do começo: orders 78 · order_notifications 11 · push_subscriptions 0
· push_test_claims 0 · order_status_history 22 · auth.users 9 · customers 11 · user_roles 3. Servidores parados.
