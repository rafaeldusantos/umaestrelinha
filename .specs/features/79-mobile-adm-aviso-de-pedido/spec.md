# 79 — mobile-adm: aviso de pedido no celular (Web Push no Android)

> Programa mobile-adm (`AD-056`), a última feature do roteiro. Depende da `72` (o app, o service
> worker, o `RequireAdmin`) e da `74` (o detalhe do pedido, que o aviso abre). Telas: Claude Design
> `a780eec8-…`, `Ateliê Admin.dc.html`. Escopo: **Complex** — canal novo no motor de notificações,
> tabela nova, secret novo, service worker com código próprio, permissão do sistema.
>
> Spec reescrita do rascunho em 2026-10-25, com as decisões do usuário na mesma data
> (`context.md` não foi criado: as quatro decisões estão na tabela de assunções, marcadas `y`).

## Problem Statement

Hoje a Adri só sabe que vendeu se abrir o app ou ler o e-mail — e os quatro avisos por e-mail para
ela estão **desligados** em produção (medido na `57`). O app do ateliê já mostra o pedido; falta ele
**chamar** quando algo acontece. Um aviso no celular no instante em que o pedido é pago, chega, é
recusado ou tem o material postado fecha o ciclo sem ela precisar olhar.

## Goals

- [ ] Um pedido pago aparece como aviso no celular dela em segundos, **uma** vez por aparelho, mesmo
      com o webhook do Mercado Pago retentando.
- [ ] Tocar o aviso abre o detalhe daquele pedido no app.
- [ ] Ela liga e desliga cada tipo de aviso **neste celular**, sem passar pelo painel e sem depender
      do e-mail.
- [ ] Nenhum dado além do número do pedido e do valor aparece na tela de bloqueio.

## Out of Scope

| Item | Motivo |
| --- | --- |
| iPhone / Safari | `AD-056`: o app é só Android. |
| Avisos para a CLIENTE por push | A cliente não instala app; os eventos dela continuam só e-mail. |
| Horário de silêncio | Decisão do usuário (2026-10-25): o "Não perturbe" do Android cobre. |
| Editar o texto do aviso | O texto é fixo em `core`, como o histórico do pedido. Só o e-mail é editável (`PNL-02`). |
| Interruptor de push no painel (Backoffice) | Decisão do usuário: o interruptor é por aparelho, no app. A aba Notificações do painel não muda. |
| Eventos da cliente como push para a dona (cancelamento, entrega, PIX expirado…) | Só os quatro `owner_*`. Um evento novo para a dona seria outra feature. |
| Agrupar/resumir vários avisos ("3 pedidos pagos") | Cada evento é um aviso; o Android já empilha. |
| Reenviar um push pelo histórico do pedido | O reenvio do painel é por e-mail; push perdido não volta. |
| Notificação com som/vibração customizados, ações no aviso ("Marcar como enviado") | Fica para depois; o toque abre o pedido, e a ação é no app. |
| WhatsApp (feature `43`) | Continua não construído. |

---

## Assumptions & Open Questions

| # | Assunção / decisão | Escolha | Motivo | Confirmado? |
| --- | --- | --- | --- | --- |
| A1 | Quais eventos viram push | Os quatro da dona: `owner_order_paid`, `owner_order_received`, `owner_payment_rejected`, `owner_material_incoming` | Decisão do usuário | **y** (2026-10-25) |
| A2 | Onde fica o liga/desliga | No app, **por aparelho**, um interruptor por evento, gravado na inscrição. Independe do interruptor e do endereço do e-mail | Decisão do usuário | **y** |
| A3 | Horário de silêncio | Nenhum; o aviso sai na hora | Decisão do usuário | **y** |
| A4 | Conteúdo visível | Só o número do pedido (`formatOrderNumber`) e o valor (`total`, em reais). Sem nome de cliente, sem produto, sem material | Decisão do usuário; nome da peça pode citar cinzas ou leite | **y** |
| A5 | Estado inicial dos interruptores ao ativar | Os quatro **ligados** ao ativar os avisos neste celular | Ela escolheu os quatro; desligar é um toque. "Pedido novo, aguardando o PIX" é o candidato a ruído | n — confirmar |
| A6 | Quem recebe | Todo aparelho inscrito por uma conta que **ainda é admin no momento do envio** (`has_role` relido no envio). Inscrição de conta que perdeu o papel não recebe e é apagada | `AD-056`: quem é removido em `/admin/usuarios` perde o app; o aviso não pode sobreviver ao acesso | n — confirmar |
| A7 | "Sair" no app | Apaga a inscrição **deste** aparelho antes de encerrar a sessão. Se a remoção falhar, o menu da conta **pergunta** antes de sair (`MAN-30`), e nada é removido depois de forma automática | Celular emprestado ou trocado não pode seguir recebendo pedidos; e não existe tela de saída — o "Sair" leva direto ao Login — então a escolha tem de acontecer antes | n — confirmar |
| A8 | Mesmo aparelho, outra conta | A inscrição (identificada pelo `endpoint`) passa para a conta que ativou por último; nunca duas linhas para o mesmo `endpoint` | Duas linhas = dois avisos iguais no mesmo celular | n — confirmar |
| A9 | Teto de aparelhos | 10 inscrições por conta; a 11ª substitui a usada há mais tempo | Bound contra lixo acumulado; ninguém tem 10 celulares | n — confirmar |
| A10 | Endpoint aceito | Só `https:` e host numa lista literal de serviços de push (`fcm.googleapis.com`, `updates.push.services.mozilla.com`, `*.notify.windows.com`, `web.push.apple.com`). Fora dela, a gravação é recusada | O servidor faz POST na URL que o navegador entregou: sem lista, é SSRF por uma conta admin comprometida. **A lista exata precisa ser conferida no Design** (Samsung Internet usa FCM? — não sei, verificar) | n — confirmar no Design |
| A11 | Biblioteca de Web Push no Deno | A definir no Design (assinatura VAPID ES256 + criptografia `aes128gcm`, RFC 8291/8292) | Não escrever criptografia à mão sem antes procurar uma lib mantida que rode no edge runtime | n — Design |
| A12 | Textos dos avisos | Fixos, em `core`, iguais aos da tabela de `MAN-08` | L-009: string exata na spec | n — confirmar texto |
| A13 | Histórico do pedido no painel e no app | A linha de push aparece com o canal `Celular`, no padrão de `rotuloDoCanal` (`E-mail`/`WhatsApp`); a linha que falhou **não** tem "Reenviar" e diz "O aviso no celular não chegou." | Push perdido não volta (Out of Scope); o "Reenviar" de hoje repassaria o canal e o "A cliente NÃO foi avisada" estaria errado para um aviso à dona | n — confirmar |
| A14 | Botão "Enviar um aviso de teste" | P2, só para o aparelho que toca, sem pedido e sem linha em `order_notifications` | É a única forma de ela saber que a permissão e a inscrição funcionam antes do próximo pedido | n — confirmar |
| A15 | Push com zero aparelhos querendo o evento | O motor **não** reivindica a linha (`skipped: no_device`, só log) | Reivindicar sem entregar marcaria "já avisei" e impediria a entrega se um aparelho for ativado antes da retentativa do webhook | n |
| A16 | Por onde a inscrição é gravada | **Uma porta no servidor** — RPC `security definer` ou edge function, a escolher no Design — que confere `has_role(admin)`, valida (`MAN-25`), faz o upsert pelo `endpoint` (`MAN-27`) e o despejo (`MAN-28`). A tabela **não tem policy para papel nenhum de cliente** (nem `authenticated`): nada lê ou grava direto. No app, a porta é chamada de **um** arquivo | A RLS "só as próprias" não deixa uma conta assumir o `endpoint` de outra; a validação precisa de um dono; e o app hoje não tem porta de escrita além de `gravarAcao` | n — Design |
| A17 | Voltar ao pedido depois do login (`MAN-21`) | Mudança **aditiva** em `@estrelinha/auth`: o `RequireAdmin` passa a rota de origem no `state` do `Navigate`; o `LoginPage` do app a obedece. O painel continua indo para o mesmo lugar, sem asserção tocada | Hoje o `RequireAdmin` não guarda a origem e o login do app sempre volta para `/` | n — confirmar |

**Guardas que a feature precisa estender (com entrada literal, nunca afrouxando):**
`chaveDeServidorForaDoNavegador` (a chave privada VAPID), `escritaSoPelaPorta` (a porta de inscrição
do app é o segundo arquivo autorizado a escrever), `marcacaoSoPorAcao` (se a porta for RPC, ela entra
na lista literal), `orderNotificationsSchema`/`storeSettingsDefaults` (o `check` de canal ganha
`push`), `swSemDadosDaLoja` (o service worker ganha código próprio, e continua sem cache de dado) e
`rotasSobGuarda` do app (a rota nova).

**Open questions:** nenhuma sem assunção registrada acima. As marcadas `n` seguem com a escolha da
coluna até o usuário dizer o contrário.

---

## User Stories

### P1: Ativar os avisos neste celular ⭐ MVP

**User Story**: Como a Adri, quero ativar os avisos no meu celular com um toque, e escolher quais
quero, para que o app me chame sem eu ter que abri-lo.

**Why P1**: sem inscrição não há aviso.

**Acceptance Criteria**:

1. WHEN ela abre o app pela primeira vez THEN o sistema SHALL **não** pedir permissão de
   notificação; o pedido só nasce de um toque dela no botão "Avisar neste celular". (`MAN-10`)
2. WHEN ela toca "Avisar neste celular" e o Android concede a permissão THEN o app SHALL criar a
   inscrição Web Push com a chave pública VAPID e gravá-la no servidor ligada à conta dela, com os
   quatro eventos ligados (A5), e a tela SHALL passar a mostrar os quatro interruptores. (`MAN-11`)
3. WHEN o Android nega a permissão (agora ou antes) THEN a tela SHALL dizer
   "As notificações estão bloqueadas para o Ateliê. Para receber avisos, libere nas configurações do
   Android." e SHALL **não** mostrar os interruptores nem gravar inscrição. (`MAN-12`)
4. WHEN o navegador não oferece Web Push (sem `serviceWorker`/`PushManager`/`Notification`) THEN a
   tela SHALL dizer "Este navegador não recebe avisos." sem botão. (`MAN-13`)
5. WHEN ela desliga ou liga um interruptor THEN o sistema SHALL gravar a escolha **só desta
   inscrição**, e o próximo envio desse evento SHALL obedecê-la; a escolha SHALL sobreviver a fechar
   e reabrir o app. (`MAN-14`)
6. WHEN ela toca "Parar avisos neste celular" THEN o app SHALL cancelar a inscrição no navegador e
   apagá-la no servidor, e a tela SHALL voltar ao estado de MAN-10. (`MAN-15`)
7. WHEN a gravação no servidor falha (rede, recusa) THEN a tela SHALL dizer
   "Não consegui ativar os avisos. Tente de novo." e SHALL não mostrar os interruptores como ativos.
   (`MAN-16`)
8. WHEN a tela de avisos é aberta THEN ela SHALL ser alcançável pelo menu da conta, item
   "Avisos neste celular", e SHALL ser rota sob o `RequireAdmin`. (`MAN-17`)

**Independent Test**: no Chrome do Android (e no desktop para a prova automática), tocar o botão,
aceitar, ver os quatro interruptores; conferir a linha no banco; desligar um, reabrir, continua
desligado.

---

### P1: O aviso chega quando o pedido muda ⭐ MVP

**User Story**: Como a Adri, quero receber um aviso no celular quando um pedido é pago, chega
aguardando o PIX, é recusado ou tem o material postado.

**Why P1**: é a feature.

**Acceptance Criteria**:

1. WHEN o motor de notificações produz um dos quatro eventos `owner_*` para um pedido THEN cada
   inscrição de conta admin com aquele evento ligado SHALL receber **exatamente um** aviso. (`MAN-01`)
2. WHEN o mesmo gatilho chega de novo para o mesmo pedido (retentativa do webhook) e a linha
   `order_notifications (order_id, event, channel = 'push')` está `sent` (entregue a pelo menos um
   aparelho) THEN **nenhum** aviso adicional SHALL sair. WHEN a linha está `failed` (nenhum aparelho
   recebeu, ou `budget_exhausted`) THEN a retentativa do gatilho SHALL tentar de novo — é o
   comportamento de `claim_order_notification`, e não duplica porque ninguém recebeu. (`MAN-05`)
3. WHEN o evento está desligado numa inscrição THEN aquele aparelho SHALL não receber nada, e os
   outros aparelhos com o evento ligado SHALL receber. (`MAN-02`)
4. WHEN o interruptor do **e-mail** daquele evento está desligado, ou o e-mail da dona está vazio
   (`no_owner_contact`) THEN o push SHALL sair do mesmo jeito: push e e-mail são canais
   independentes (A2). (`MAN-06`)
5. WHEN o serviço de push responde 404 ou 410 para uma inscrição THEN o motor SHALL apagá-la e
   SHALL seguir para as demais no mesmo envio. (`MAN-04`)
6. WHEN o serviço de push responde outra falha (429, 5xx, rede, tempo) para uma inscrição THEN o
   motor SHALL manter a inscrição, registrar a falha e seguir para as demais; **não** retenta dentro do mesmo envio.
   (`MAN-07`)
7. WHEN o aviso sai THEN o título e o corpo SHALL ser exatamente os da tabela abaixo, com
   `{n}` = `formatOrderNumber` (`#0244`) e `{v}` = `formatPrice(total)` (com centavos,
   `R$ 189,00`), sem emoji e sem exclamação.
   (`MAN-08`)

   | Evento | Título | Corpo |
   | --- | --- | --- |
   | `owner_order_paid` | `Pedido {n} pago` | `{v}` |
   | `owner_order_received` | `Pedido {n} recebido` | `{v} · aguardando o PIX` |
   | `owner_payment_rejected` | `Pagamento recusado no pedido {n}` | `{v}` |
   | `owner_material_incoming` | `Material a caminho do pedido {n}` | `A cliente registrou o envio.` |

8. WHEN o push é entregue a um ou mais aparelhos THEN a linha de `order_notifications` SHALL ser
   `sent` (terminal: nenhuma retentativa a reenvia) com a contagem `push:<X>/<Y>` em
   `provider_message_id`; WHEN falha em todos THEN `failed` com o motivo em `error`. A contagem
   "a X de Y aparelhos" SHALL ir para o log, e o histórico SHALL mostrá-la no detalhe da linha
   enviada quando X < Y (emenda do Design: `error` preenchido marca `failed`). (`MAN-09`)
9. WHEN uma inscrição pertence a uma conta que não é mais admin THEN ela SHALL não receber e SHALL
   ser apagada no envio (A6). (`MAN-18`)
10. WHEN o envio do push é chamado dentro do orçamento de tempo do caixa (`pix_created`,
    `AD-008`) THEN ele SHALL respeitar o mesmo orçamento e o mesmo contrato de nunca lançar: falha
    de push nunca vira erro no pagamento. (`MAN-19`)
11. WHEN nenhuma inscrição quer o evento THEN o motor SHALL não reivindicar a linha de push (A15).
    (`MAN-20`)

**Independent Test**: com um aparelho inscrito, aprovar um PIX pelo webhook local duas vezes —
um aviso só; desligar o evento — nenhum; inscrição com endpoint que devolve 410 — sumiu do banco.

---

### P1: Tocar o aviso abre o pedido ⭐ MVP

**User Story**: Como a Adri, quero que tocar o aviso abra aquele pedido no app.

**Acceptance Criteria**:

1. WHEN ela toca o aviso THEN o app SHALL abrir em `/pedidos/<id>` daquele pedido — focando a
   janela do app se ela já está aberta, ou abrindo uma nova. (`MAN-03`)
2. WHEN a sessão expirou THEN o app SHALL pedir o login e, depois de entrar, SHALL levar ao mesmo
   pedido (A17). A origem só SHALL ser obedecida quando for caminho do próprio app (começa com uma
   `/` e não com duas); qualquer outra vai para a Início. No painel, o destino depois do login SHALL
   continuar o de hoje. (`MAN-21`)
3. WHEN o aviso chega com o app aberto e visível THEN o Android SHALL mostrar o aviso do mesmo jeito
   (sem silenciar por estar em primeiro plano). (`MAN-22`)

---

### P1: A inscrição é segura e não vaza ⭐ MVP

**Acceptance Criteria**:

1. WHEN qualquer cliente do banco — `anon` **ou** `authenticated`, admin incluído — tenta ler,
   gravar ou apagar a tabela de inscrições pelo PostgREST THEN o banco SHALL recusar: não há policy
   nem `grant` para esses papéis. Toda leitura e escrita passa pela porta do servidor (A16), que
   recusa conta sem `has_role(admin)` e só devolve ou altera as inscrições **da própria conta** —
   com a única exceção de `MAN-27`. (`MAN-23`)
2. WHEN o código de `apps/**` é varrido THEN a chave **privada** VAPID SHALL não aparecer; as chaves
   são secret de servidor (`VAPID_KEYS`, o JSON das duas metades, e `VAPID_SUBJECT`), e o app lê a
   chave **pública** da porta do servidor — nunca de uma env própria, que seria uma segunda cópia
   (emenda do Design). Guarda estendido: `chaveDeServidorForaDoNavegador.test.ts`. (`MAN-24`)
3. WHEN uma gravação traz `endpoint` fora de `https:` ou fora da lista de A10, ou chaves `p256dh` /
   `auth` com tamanho inválido THEN a porta SHALL recusar sem gravar; a regra mora em `core` e o
   motor a confere **de novo** antes de cada POST (uma linha antiga fora da lista não recebe).
   (`MAN-25`)
4. WHEN o motor registra um envio de push no log THEN o log SHALL trazer só o host do endpoint e o
   slug do desfecho — **nunca** o `endpoint` inteiro nem as chaves (o endpoint é uma credencial de
   entrega). (`MAN-26`)
5. WHEN o mesmo `endpoint` é gravado de novo (pela mesma ou por outra conta) THEN SHALL existir uma
   linha só, da conta que gravou por último (A8). (`MAN-27`)
6. WHEN uma conta grava a 11ª inscrição THEN a usada há mais tempo SHALL sair (A9). (`MAN-28`)
7. WHEN a conta é apagada em `/admin/usuarios` THEN as inscrições dela SHALL sumir junto
   (`on delete cascade`). (`MAN-29`)
8. WHEN ela toca "Sair" no app e este aparelho tem inscrição THEN a inscrição SHALL ser apagada
   (no navegador e na porta) **antes** do `signOut`. WHEN a remoção na porta falha THEN o menu da
   conta SHALL mostrar "Não consegui parar os avisos deste celular." com os botões
   "Sair mesmo assim" (encerra a sessão; o aparelho segue recebendo enquanto a conta for admin) e
   "Tentar de novo"; WHEN o aparelho não tem inscrição THEN o "Sair" SHALL ser o de hoje, sem
   chamada a mais. (`MAN-30`)

---

### P1: A tela de avisos no celular ⭐ MVP

**Acceptance Criteria** (`CLAUDE.md`: mobile é o caso principal):

1. WHEN a tela "Avisos neste celular" é aberta em 360×800, 390×844, 412×915 e 1440×900, com a fonte
   do sistema a 100 %, 130 % e 200 % THEN SHALL não haver rolagem horizontal do `body` nem texto
   sobreposto, e nenhum rótulo de interruptor SHALL ser cortado. (`MAN-39`)
2. WHEN os interruptores são desenhados THEN cada um SHALL ter alvo de toque ≥ 44 px de altura (a
   linha inteira é tocável) e nome acessível igual ao rótulo, que é o nome do evento em
   `NOTIFICATION_EVENT_NAMES` (`Pedido novo`, `Pedido pago`, `Pagamento recusado da cliente`,
   `Material a caminho`), na ordem da jornada. Os botões "Avisar neste celular",
   "Parar avisos neste celular" e "Enviar um aviso de teste" SHALL ter ≥ 44 px. (`MAN-40`)
3. WHEN uma gravação está em curso THEN o controle tocado SHALL ficar desabilitado com
   `aria-busy`, e toda classe de movimento da tela SHALL ter par `motion-reduce:` que o desliga.
   WHEN a ação termina THEN o foco SHALL voltar ao controle que a disparou, se ele segue na tela e
   habilitado, ou ao título da página, se saiu — nunca ao `<body>` — e o foco que a pessoa levou a
   outro lugar no meio SHALL ficar onde está. (`MAN-41`) — *emenda de 2026-10-26, do QA
   (`BUG-20261025-foco-cai-no-body-nos-avisos`).*

---

### P2: Testar o aviso

**User Story**: Como a Adri, quero mandar um aviso de teste para este celular, para saber que vai
funcionar antes do próximo pedido.

**Acceptance Criteria**:

1. WHEN ela toca "Enviar um aviso de teste" THEN só **este** aparelho SHALL receber o aviso
   "Avisos ligados" / "É assim que os pedidos vão chegar.", sem pedido, sem linha em
   `order_notifications`, e tocá-lo SHALL abrir a Início. (`MAN-31`)
2. WHEN o teste falha no servidor THEN a tela SHALL dizer "O aviso de teste não saiu. Tente de novo."
   — **exceto** quando o servidor não conhece mais o aparelho (`gone`, 410: o serviço de push o
   descartou e a porta apagou a linha; ou `not_found`, 404): THEN a tela SHALL desfazer a inscrição do
   navegador, voltar ao estado de `MAN-10` ("Avisar neste celular", sem interruptor) e dizer "Este
   celular deixou de receber avisos. Ative de novo."; o `not_found` de um interruptor (`MAN-14`) SHALL
   fazer o mesmo. Ativar de novo SHALL apagar a frase. (`MAN-32`) — *emenda de 2026-10-26, decisão do
   usuário sobre `BUG-20261025-teste-com-aparelho-descartado-deixa-a-tela-ligada`: o "tente de novo"
   nunca passaria, e a tela seguia afirmando "ligado".*
3. WHEN ela toca o botão de novo antes de 30 s — neste ou noutro aparelho da conta, inclusive depois
   de o aparelho testado ter sido descartado pelo serviço de push — THEN o servidor SHALL recusar
   (teto por conta) e a
   tela SHALL dizer "Aguarde alguns segundos para mandar outro aviso de teste.", nunca a frase de
   `MAN-32`. (`MAN-33`)

---

### P2: O histórico mostra o canal

**Acceptance Criteria**:

1. WHEN um pedido tem linha de push em `order_notifications` THEN o histórico do pedido (painel e
   app, `buildHistory` em `core`) SHALL mostrá-la com o canal `Celular`, distinta da de e-mail do
   mesmo evento (A13). (`MAN-34`)
2. WHEN a linha de push está `failed` THEN o **título** da linha no histórico SHALL ser
   "O aviso no celular não chegou." (o detalhe segue mostrando o motivo gravado em `error`, `MAN-09`)
   e o histórico SHALL **não** oferecer "Reenviar" — no painel nem no app; as linhas de e-mail seguem com o
   "Reenviar" de hoje. (`MAN-38`)

---

## Edge Cases

- WHEN dois gatilhos do mesmo pedido chegam ao mesmo tempo THEN o `claim` serializa: um aviso só
  por evento (`MAN-05`).
- WHEN o mesmo celular tem o app instalado e a permissão é revogada pelo Android depois THEN o
  serviço de push devolve 410 no envio seguinte e a inscrição some (`MAN-04`); a tela de avisos,
  ao abrir, mostra o estado de `MAN-12`.
- WHEN a inscrição do navegador muda sozinha (`pushsubscriptionchange`) THEN a inscrição antiga
  SHALL ser apagada pelo 410 do envio seguinte (`MAN-04`) e a tela de avisos SHALL mostrar o estado
  de `MAN-10` ao abrir; ativar de novo regrava. O service worker **não** regrava sozinho: ele não tem
  a sessão, e a porta exige papel admin (emenda do Design). (`MAN-35`)
- WHEN o app abre a tela de avisos e o navegador tem inscrição que o servidor não conhece (apagada
  por 410, por Sair que falhou ao meio, por troca de conta) THEN a tela SHALL mostrar o estado de
  `MAN-10` e ativar de novo SHALL regravar. (`MAN-36`)
- WHEN o pedido do aviso foi apagado ou a conta não o enxerga THEN o detalhe abre no estado de
  "pedido não encontrado" da `74`.
- WHEN o secret VAPID falta no servidor THEN o canal push SHALL ficar fora da lista de canais
  (`no_provider`), sem derrubar o e-mail. (`MAN-37`)

---

## Dimensões implícitas (varredura)

| Dimensão | Onde ficou |
| --- | --- |
| Validação e limites | `MAN-25` (endpoint e chaves), `MAN-28` (10 por conta), `MAN-33` (teste a cada 30 s) |
| Falha / falha parcial | `MAN-04`, `MAN-07`, `MAN-09` (parcial), `MAN-16`, `MAN-32`, `MAN-37` |
| Idempotência / retentativa | `MAN-05` (claim por pedido × evento × canal), `MAN-27` (upsert por endpoint), `MAN-20` |
| Auth e rate limit | `MAN-23`, `MAN-24`, `MAN-18`, `MAN-33` |
| Concorrência / ordem | `MAN-05`; ordem cliente → dona e o orçamento compartilhado (`MAN-19`) |
| Ciclo de vida / expiração | `MAN-04`, `MAN-15`, `MAN-18`, `MAN-28`, `MAN-29`, `MAN-30`, `MAN-35`, `MAN-36` |
| Observabilidade | `MAN-09`, `MAN-26`, `MAN-34` |
| Dependência externa | `MAN-07`, `MAN-19`, `MAN-37` — o serviço de push nunca derruba o pagamento nem o e-mail |
| Mobile, layout e acessibilidade | `MAN-39`..`MAN-41` |
| Persistência e publicação | Tabela nova + o `check` de `order_notifications.channel` recriado com `push` (migration nova, `AD-017`); secrets `VAPID_KEYS`/`VAPID_SUBJECT` no servidor (o app lê a chave pública da porta). **Ordem de publicação: migration → secrets → functions → bundle do app** (o bundle chama a porta e o motor grava `channel = 'push'`, que o `check` antigo recusa) (`MAN-42`) |
| Transição de estado | N/A como regra nova: as pré-condições de cada evento `owner_*` são as que o motor já relê (`preconditionFailure`), **menos** a do e-mail da dona, que não vale para o push (`MAN-06`) |

---

## Requirement Traceability

| ID | Story | Phase | Status |
| --- | --- | --- | --- |
| MAN-01 | P1 aviso chega | Execute | Verified (suíte e probes; a chegada num Chrome real e no Android real segue pendente) |
| MAN-02 | P1 aviso chega | Execute | Verified |
| MAN-03 | P1 tocar abre | Execute | Verified |
| MAN-04 | P1 aviso chega | Execute | Verified |
| MAN-05 | P1 aviso chega | Execute | Verified |
| MAN-06 | P1 aviso chega | Execute | Verified |
| MAN-07 | P1 aviso chega | Execute | Verified |
| MAN-08 | P1 aviso chega | Execute | Verified |
| MAN-09 | P1 aviso chega | Execute | Verified |
| MAN-10..17 | P1 ativar | Execute | Verified |
| MAN-18..20 | P1 aviso chega | Execute | Verified |
| MAN-21..22 | P1 tocar abre | Execute | Verified |
| MAN-23..30 | P1 segurança | Execute | Verified |
| MAN-31..33 | P2 teste | Execute | Verified |
| MAN-34 | P2 histórico | Execute | Verified |
| MAN-35..37 | Edge cases | Execute | Verified |
| MAN-38 | P2 histórico | Execute | Verified |
| MAN-39..41 | P1 tela | Execute | Verified |
| MAN-42 | Publicação | Execute | Pending — só o deploy prova a ordem |

**Coverage:** 42 total, todos mapeados a tasks (`tasks.md`). Verificador independente: rodada r1 (2026-10-25) FAIL por cobertura, consertada; rodada do ciclo `81-79` (2026-10-26) FAIL só por esta rastreabilidade (D1–D3), emendada aqui. Fora da suíte: MAN-42 (deploy) e a prova em aparelho real.

---

## Success Criteria

- [ ] Prova no **Android real**: PIX aprovado → aviso na tela de bloqueio com só número e valor →
      toque → detalhe do pedido. Webhook repetido → nenhum aviso a mais.
- [ ] Prova em Chrome de desktop (o que a automação alcança): inscrição, interruptores, 410 apagando
      a linha, recusa de conta sem papel.
- [ ] Nenhum e-mail deixou de sair por causa do canal novo (suíte do motor sem asserção afrouxada).
- [ ] `packages/core/src/payment/**` sem alteração; baselines sem regressão.
