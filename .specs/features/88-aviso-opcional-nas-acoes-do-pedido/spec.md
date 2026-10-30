# 88 — O aviso à cliente vira escolha, e o pedido mostra que está trabalhando

**Escopo:** Large · **Apps:** backoffice, `packages/core`, `supabase/functions/send-notification` · **Migration:** sim (status `skipped` em `order_notifications`)
**Origem:** pedido do usuário em 2026-10-29: "nos pedidos, todas as alterações que enviem e-mail à
cliente devem questionar e ter a opção de desativar o envio — muitas vezes são só ajustes de status
já enviados à cliente", e "a tela não tem estados de loading para mostrar que algo está
acontecendo". Desenho no Claude Design, projeto **Uma Estrelinha - Backoffice**:
`Pedidos - Lista.html` e `Pedido - Edição.html`. **Decisões do usuário em 2026-10-29** (A-01, A-02, A-04,
A-05) aplicadas aqui e no desenho.

## Problem Statement

No painel, **dez** gestos sobre um pedido disparam e-mail para a cliente sem perguntar (inventário
abaixo). Quando a Adri só está acertando o registro — voltar um status trocado, marcar como
"Enviado" um pedido que ela já postou e avisou pelo WhatsApp, repetir "material recebido" depois de
um erro —, a cliente recebe de novo um e-mail que já recebeu, ou recebe um e-mail que descreve uma
coisa que não aconteceu agora. Para quem acabou de perder alguém, uma mensagem repetida ou fora de
hora da loja pesa mais que em qualquer outro comércio.

O dono da escrita já sabe NÃO avisar: `writeOrderStatus`, `writeTrackingCode`,
`writeMaterialStatus` e `writeMaterialTracking` (`@estrelinha/core/order-actions`) recebem
`avisar?: boolean` desde a `75`. **Nenhuma tela do painel passa `false`.** O que falta é a pergunta.

E nenhuma das ações mostra trabalho em curso: o botão só fica desabilitado, sem texto nem
indicador; o "Outro status" grava no instante em que se escolhe a opção, sem estado nenhum; o lote
de até 50 pedidos corre sem progresso; e, pior, **toda gravação no pedido chama `reload()`, que liga
`loading` e troca a página inteira por "Carregando..."** — a rolagem volta ao topo, o campo de
rastreio meio digitado some, e o único sinal de que algo aconteceu é a página piscar.

### Inventário — o que dispara e-mail à cliente hoje (medido no código em 2026-10-29)

| # | Onde | Gesto | Escrita (core) | Gatilho | E-mail da cliente que pode sair | Ligado por padrão |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Pedido · Próximo passo | botão principal ("Marcar como enviado" etc.) | `writeOrderStatus` | `order_status_changed` | Pedido postado (`shipped` + rastreio) · Pedido entregue · Pedido cancelado | postado **sim** · entregue não · cancelado não |
| 2 | Pedido · Próximo passo | "Outro status" (grava ao escolher) | `writeOrderStatus` | `order_status_changed` | idem | idem |
| 3 | Pedido · Entrega | "Salvar rastreio" | `writeTrackingCode` | `order_status_changed` | Pedido postado, se o pedido já está `shipped` (fecha o par `TRG-12`) | **sim** |
| 4 | Pedido · Material | "Marcar material como recebido" | `writeMaterialStatus` | `material_status_changed` | Material recebido no ateliê | **sim** |
| 5 | Pedido · Material | "Colocar em produção" | `writeMaterialStatus` | `material_status_changed` | Peça em produção | não |
| 6 | Pedido · Material | "Salvar" o código do envelope | `writeMaterialTracking` | `material_tracking_set` | Rastreio do material registrado (+ "Material a caminho" para a dona) | não |
| 7 | Pedido · Cancelar pedido | "Confirmar Cancelamento" | `cancelOrder` (painel) | `order_status_changed` | Pedido cancelado | não |
| 8 | Lista · barra de lote | "Marcar material recebido" (até 50) | `writeMaterialStatus` × N | `material_status_changed` | Material recebido no ateliê | **sim** |
| 9 | Lista · barra de lote | "Avançar status" (até 50) | `writeOrderStatus` × N | `order_status_changed` | Pedido postado · entregue | postado **sim** |
| 10 | Lista · cartão do celular | "Registrar recebimento" | `writeMaterialStatus` | `material_status_changed` | Material recebido no ateliê | **sim** |

**Não disparam e-mail, e ficam como estão:** "Reenviar" no histórico (o gesto É mandar o e-mail),
nota interna, folha de separação, copiar endereço/rastreio, "Cobrar material" (abre o WhatsApp — a
mensagem é a Adri quem manda) e as etapas automáticas do pagamento (webhook do Mercado Pago).

**Achado do inventário, fora do escopo:** gerar a etiqueta no bloco Melhor Envio grava
`tracking_code` pela edge function **sem disparar gatilho nenhum** — o comentário de
`useAdminOrders.addTrackingCode` afirma que ele "cobre também o caminho do Melhor Envio", e não
cobre. Um pedido já `shipped` que ganha o rastreio pela etiqueta nunca manda "Pedido postado". Ver
`A-08` e `BL-061`.

## Goals

- [ ] Em todo gesto da tabela acima em que um e-mail à cliente **sairia de fato**, a Adri escolhe
      entre avisar e não avisar **antes** da gravação, vendo qual e-mail e para quem.
- [ ] Quando nenhum e-mail sairia (evento desligado, ou a pré-condição não fecha), o gesto **não
      ganha passo a mais** — e diz, no resultado, que nenhum aviso saiu.
- [ ] A escolha de não avisar fica registrada no histórico do pedido.
- [ ] Todo botão que grava mostra o trabalho em curso no próprio botão, e a página **nunca** é
      trocada por "Carregando..." depois de uma gravação: rolagem, foco e campos digitados ficam.
- [ ] O lote mostra progresso ("Avançando 7 de 30…") e um resumo do que mudou, do que foi recusado
      e de quantos e-mails saíram.

## Out of Scope

| Item | Motivo |
| --- | --- |
| O app do ateliê (`apps/mobile-adm`) | O pedido é do painel. O app chama o mesmo dono com `avisar` padrão `true`; levar a pergunta para lá é feature própria (folhas, alvos de toque, `runAppAction`) |
| Disparar o aviso a partir da etiqueta do Melhor Envio | É comportamento novo de e-mail, não opção de desligar um existente. `A-08` / `BL-061` |
| "Lembrar minha escolha" / preferência por gesto | Uma escolha salva é exatamente o aviso que sai (ou não sai) sem a Adri olhar. A pergunta só aparece quando um e-mail sairia, então o custo é baixo |
| Mudar quais eventos nascem ligados | É decisão de `/admin/configuracoes` → Notificações (`42`/`53`) |
| Uma caixa para os avisos à dona (`owner_*`) | A caixa vale só para a cliente; os avisos à dona seguem o interruptor de Configurações → Notificações (`A-04`) |
| Atomicidade escrita + histórico | `BL-051`, já registrada |
| O estado de carregamento das outras telas do painel | Só a lista e o pedido. O padrão (`AcaoPendente`, `FetchMode`) fica disponível para as outras |

---

## Assumptions & Open Questions

| # | Assunção / decisão | Padrão escolhido | Por quê | Confirmado? |
| --- | --- | --- | --- | --- |
| A-01 | Perguntar sempre, ou só quando um e-mail sairia? | **Só quando sairia.** A previsão usa a mesma regra do motor: `eventsForTrigger` → público `customer` → evento ligado no canal e-mail → `orderStateFailure` sobre o pedido **depois** da escrita → **e o e-mail ainda não foi enviado neste pedido** (`order_notifications` com `status = 'sent'`). Sem e-mail previsto, o gesto grava direto e o resultado diz por quê ("nenhum aviso sai nesta mudança", ou "“Pedido postado” já tinha sido enviado, não sai de novo") | Perguntar quando nada sairia é ruído. O "já enviado" vem do motor: `claim_order_notification` nunca reenvia um evento `sent` pelo gatilho — e é exatamente o caso de "ajuste de status já avisado" que motivou a feature | **y** (2026-10-29) |
| A-02 | A forma da pergunta | **Uma caixa MARCADA** "Avisar a cliente por e-mail" (no lote: "Avisar as N clientes por e-mail"), com o nome de cada e-mail e o destinatário, e **um** botão que confirma a mudança. Desmarcar e confirmar grava sem e-mail à cliente. `Esc`, clique fora e "Voltar" **não gravam nada** | Decisão do usuário: o padrão de hoje (avisar) continua sendo o caminho de um clique; não avisar é um gesto deliberado | **y** (2026-10-29) — substituiu os dois botões |
| A-03 | O cancelamento e o lote já são diálogos | Ganham a mesma caixa **dentro** do diálogo deles, não um segundo diálogo empilhado | Diálogo sobre diálogo é o padrão que a `47` evitou | y |
| A-04 | "Não avisar" desliga o aviso interno junto? | **Não.** A caixa vale **só para os e-mails da cliente**: o gatilho continua saindo, e o motor pula apenas os eventos de público `customer`. O aviso à dona que o mesmo gatilho produz (`owner_material_incoming`, inclusive o push) sai como hoje | Decisão do usuário. Exige uma opção nova no gatilho (`customer: false`) — `avisar: false` continua significando "não dispare o gatilho", que o app do ateliê usa para não avisar duas vezes numa ação composta | **y** (2026-10-29) |
| A-05 | Onde fica o registro de "não avisei" | **No histórico do pedido, como uma linha "Aviso à cliente não enviado: <nome do e-mail>"**, com um **ícone de avião de papel** ao lado que envia aquele e-mail na hora, se a Adri mudar de ideia. A linha mora em `order_notifications` (status novo `skipped`, gravado pelo motor), a mesma memória dos e-mails enviados (`AD-032`); o avião chama a porta de reenvio que já existe (`action=send`), que reivindica a linha `skipped` e a converte em `sent` | Decisão do usuário. Uma memória só para "a cliente foi avisada?": nota interna não carrega o evento, e uma tabela nova seria o segundo dono | **y** (2026-10-29) |
| A-06 | Nome do e-mail no diálogo | `NOTIFICATION_EVENT_NAMES` (`core/notifications/catalog.ts`), nunca uma frase escrita na tela | Dono único dos nomes (`56`); o guarda `notificationSingleOwner` recusa literal de evento no painel | y |
| A-07 | "Ver o e-mail" no diálogo | Link que abre a prévia já existente (`send-notification?action=preview` com `order_id`) numa aba nova. P3 | A Adri decide melhor vendo o texto; a porta já existe desde a `53` | s — confirmado pelo usuário (2026-10-30) |
| A-08 | A etiqueta do Melhor Envio não avisa | **Fora do escopo**, registrado como `BL-061`. Corrigir o comentário errado de `addTrackingCode` entra (é documentação que mente) | Ligar o aviso pela etiqueta é comportamento novo, com a própria pergunta | s — confirmado pelo usuário (2026-10-30) |
| A-09 | A previsão pode errar | A previsão roda no navegador com o pedido, as configurações e os envios que a tela tem; o motor relê tudo no servidor. Se divergirem, **o resultado diz o que aconteceu de fato** (`emailSent`), nunca o que foi previsto | O motor é a verdade; a previsão só decide se pergunta | y |
| A-10 | Lote misto | O diálogo do lote conta por pedido: "8 pedidos · 5 enviariam e-mail" (e quantos já tinham recebido antes); a caixa vale para os 5. Com zero e-mails previstos, o lote grava direto, como `A-01` | Escolher pedido a pedido num lote de 50 seria o oposto de um lote | s — confirmado pelo usuário (2026-10-30) |
| A-11 | Spinner com `prefers-reduced-motion` | O giro do indicador fica (é progresso, não enfeite — a régua de `animacaoRespeitaMovimento` já dispensa `animate-spin`); o **texto** do botão muda em qualquer caso | Com o giro desligado, o texto é o sinal; o texto vale também para leitor de tela | y |
| A-12 | Tempo mínimo do estado "Salvo" | O botão mostra o gerúndio enquanto a escrita corre e volta ao rótulo normal ao terminar; o resultado vai no aviso (toast) e no histórico. Sem estado "Salvo ✓" de duração fixa | Um tempo cravado seria número que ninguém mediu (lição da `58`, `BATIDA_MS`) | y |
| A-13 | O avião respeita o interruptor do evento? | Sim, como o "Reenviar" de hoje: se o e-mail foi desligado em Notificações depois do pulo, o avião responde "Este e-mail está desligado em Configurações → Notificações" e a linha continua `skipped` | Mesma porta, mesma regra (`deliver` confere `enabled`) | s — confirmado pelo usuário (2026-10-30) |

| A-14 | A leitura de `order_notifications` falha na página do pedido (decisão aberta da r3, observada no QA: `BUG-20261030-leitura-de-envios-falha-em-silencio`) | **O gesto que dependeria da previsão é RECUSADO** com "Não consegui conferir os e-mails já enviados. Nada foi alterado." — a mesma frase do lote e do cartão (`SENT_EMAILS_READ_FAILED`, um dono). "Depende da previsão" = `customerNoticeFor` daria algum e-mail (sem saber o que já saiu, a pergunta e a frase do resultado seriam inventadas). Gestos sem e-mail previsto (nota, rastreio fora do Enviado, voltar para Pago) seguem. O cancelamento recusa dentro do diálogo. O Histórico diz "Não consegui ler os e-mails deste pedido." com "Tentar de novo", nunca "Nada por aqui ainda." | Recomendação do QA (opção b): é o que as outras duas superfícies já fazem, e evita as duas frases falsas (o diálogo perguntando por e-mail já enviado, e "anotado no histórico" sem anotação) | **s — confirmado pelo usuário** (2026-10-30) |
| A-15 | O avião que falha (`BUG-20261030-aviao-que-falha-apaga-a-escolha`; AVS-13 × design) | **O motor não muda**: a linha `skipped` reivindicada pelo `action=send` vira `failed` quando o envio falha. A linha de falha mostra **"A tentativa de envio falhou"** (frase legível) com **"Reenviar"**; o erro técnico cru do provedor vai para um **detalhe técnico recolhido** (`<details>`), nunca para a linha principal. Como a linha `failed` não distingue a origem (avião ou gatilho), a regra vale para **toda** linha de e-mail que falhou no Histórico do painel | Recomendação do QA: manter o motor (claim → finish) e acertar a letra. Ajustar AVS-13 custa menos que um estado novo no motor | **s — confirmado pelo usuário** (2026-10-30) |

**Open questions:** nenhuma em aberto. As assunções que estavam `n — confirmar` (A-07, A-08, A-10,
A-13, A-14, A-15) foram confirmadas pelo usuário em 2026-10-30, como estão.

---

## User Stories

### P1: Perguntar antes de avisar ⭐ MVP

**User Story**: Como Adri, quero escolher se a cliente recebe o e-mail quando mudo algo no pedido,
para acertar o registro sem mandar de novo uma mensagem que ela já recebeu.

**Why P1**: É o pedido. Sem isso, todo ajuste manual é um e-mail.

**Acceptance Criteria**:

1. **AVS-01** — WHEN a Adri aciona um dos gestos 1–7 da tabela num pedido em que a previsão (`A-01`)
   indica **pelo menos um** e-mail à cliente THEN o painel SHALL abrir o diálogo de aviso **antes**
   de qualquer requisição de escrita, e nenhuma escrita SHALL ocorrer enquanto o diálogo estiver
   aberto.
2. **AVS-02** — WHEN o diálogo abre THEN ele SHALL mostrar: a mudança em uma linha ("O pedido #1042
   passa de Em Separação para Enviado"), a caixa **marcada** "Avisar a cliente por e-mail", o **nome**
   de cada e-mail que sairia, vindo de `NOTIFICATION_EVENT_NAMES`, o **e-mail da cliente**
   (`customer_email`) e **um** botão que confirma, com o verbo da mudança ("Mudar para Enviado").
3. **AVS-03** — WHEN a Adri confirma com a caixa marcada THEN a escrita SHALL ser chamada como hoje
   (gatilho disparado, e-mail da cliente incluído).
4. **AVS-04** — WHEN a Adri desmarca a caixa e confirma THEN o gatilho SHALL ser disparado com
   `customer: false`, o motor SHALL **não** enviar nenhum evento de público `customer` e SHALL gravar
   cada um deles em `order_notifications` com `status = 'skipped'`; os eventos de público `owner` do
   mesmo gatilho SHALL sair normalmente (`A-04`). Com a caixa desmarcada, o diálogo SHALL dizer que a
   cliente não recebe e-mail e que fica anotado no histórico, com o avião para enviar depois.
5. **AVS-05** — WHEN a Adri fecha o diálogo por "Voltar", `Esc` ou clique fora THEN nenhuma escrita
   SHALL ocorrer e o pedido SHALL continuar como estava; no "Outro status", o seletor SHALL voltar
   ao vazio.
6. **AVS-06** — WHEN a previsão indica **zero** e-mails à cliente THEN o gesto SHALL gravar sem
   diálogo, e o resultado SHALL dizer que nenhum aviso saiu (ex.: "Status: Em Separação · nenhum
   aviso sai nesta mudança").
7. **AVS-07** — WHEN a gravação termina THEN o aviso de resultado SHALL refletir o desfecho real
   (`emailSent`): "a cliente foi avisada por e-mail" só quando `emailSent === true`; com a caixa
   desmarcada, "sem e-mail à cliente (anotado no histórico)"; com a caixa marcada e
   `emailSent === false`, "o e-mail não saiu — o pedido foi alterado" (`A-09`, `AD-008`); sem diálogo
   por "já enviado", "“<nome>” já tinha sido enviado, não sai de novo". **`emailSent` significa "um
   e-mail À CLIENTE saiu"** (Verifier r1): o motor responde `customer_sent` à parte de `sent`, porque
   `sent` também conta o aviso à dona e faria a tela dizer "a cliente foi avisada" sem ter sido.
8. **AVS-08** — WHEN a Adri cancela um pedido cujo e-mail "Pedido cancelado" sairia THEN o diálogo
   de cancelamento SHALL mostrar a caixa marcada "Avisar a cliente por e-mail" acima do botão
   "Confirmar cancelamento", com o motivo continuando obrigatório; e, quando o e-mail **não** sairia,
   SHALL dizer numa linha que ele está desligado em Configurações → Notificações, sem caixa.
9. **AVS-09** — WHEN `cancelOrder` é chamado com a caixa desmarcada THEN ele SHALL disparar o gatilho
   com `customer: false` (o `cancelOrder` do painel ganha `avisarCliente`, padrão `true`).

**Independent Test**: num pedido `separating` com rastreio salvo, "Marcar como enviado" abre o
diálogo nomeando "Pedido postado" e o e-mail da cliente; "Mudar sem avisar" grava `shipped` e a
`send-notification` não recebe requisição nenhuma.

---

### P1: Registrar quando não houve aviso, e enviar depois ⭐ MVP

**User Story**: Como Adri, quero ver no histórico do pedido que a cliente não recebeu um e-mail por
escolha minha, e poder enviá-lo dali se eu mudar de ideia.

**Acceptance Criteria**:

1. **AVS-10** — WHEN o motor recebe um gatilho com `customer: false` THEN, para cada evento de
   público `customer` que **teria saído** (ligado no canal e-mail, pré-condição satisfeita,
   destinatário presente, ainda não `sent`), ele SHALL gravar a linha `(order_id, event, 'email')` em
   `order_notifications` com `status = 'skipped'` por uma RPC `security definer` executável só pela
   `service_role`; evento que não teria saído SHALL não gravar nada.
2. **AVS-11** — WHEN já existe linha `sent` para o evento THEN o `skipped` SHALL não sobrescrevê-la;
   WHEN existe linha `failed` ou `skipped` THEN ela SHALL passar a `skipped`; WHEN existe linha
   `pending` (envio em curso) THEN ela SHALL ficar como está.
3. **AVS-12** — WHEN o Histórico do pedido lê uma linha `skipped` THEN `buildHistory` SHALL produzir
   "Aviso à cliente não enviado: <nome do e-mail>" com o detalhe "Você escolheu não avisar", na hora
   **da escolha** (a RPC renova `created_at` ao virar `skipped`, Verifier r1), e o painel SHALL mostrar ao lado um botão com o ícone de avião de papel (alvo de 44 px,
   nome acessível "Enviar agora o e-mail “<nome>” para a cliente").
4. **AVS-13** — WHEN a Adri toca o avião THEN o painel SHALL chamar a porta de reenvio
   (`action=send`, evento e canal da linha), mostrar o estado de `CRG-01` só naquele botão, e, no
   sucesso, a linha SHALL virar o e-mail enviado (a mesma linha de `order_notifications` passa a
   `sent`); na falha, SHALL dizer que o e-mail não saiu e a linha SHALL mostrar **"A tentativa de
   envio falhou"** com **"Reenviar"** (a linha passa a `failed` no motor; o erro técnico cru fica num
   detalhe recolhido, nunca na linha principal — emendado pelo conserto do QA, `A-15`; a letra
   anterior dizia "a linha SHALL continuar `skipped`"); com o evento desligado em Notificações,
   SHALL dizer isso e a linha continua `skipped` (`A-13`).
5. **AVS-23** — WHEN o gesto grava sem diálogo (`AVS-06`) THEN nenhuma linha `skipped` SHALL ser
   gravada — não houve escolha.
6. **AVS-24** — WHEN um gatilho **sem** `customer: false` encontra uma linha `skipped` do mesmo
   evento THEN o motor SHALL tratá-la como hoje trata `failed`: reivindicável, e enviada se a
   pré-condição fechar.

**Independent Test**: "Marcar como enviado" → desmarcar → confirmar: o Histórico mostra "Aviso à
cliente não enviado: Pedido postado" com o avião; tocar o avião envia, e a linha vira "E-mail
“Pedido postado” enviado". No banco, a mesma linha foi de `skipped` a `sent`.

---

### P1: A previsão tem um dono ⭐ MVP

**User Story**: Como quem mantém o painel, quero que "este gesto manda e-mail?" seja respondido
pela mesma regra do motor, para a pergunta nunca aparecer quando nada sai, nem faltar quando sai.

**Acceptance Criteria**:

1. **AVS-14** — `customerNoticeFor(trigger, orderAfter, settings, sentEvents)` SHALL existir em
   `@estrelinha/core/notifications`, pura, e SHALL devolver `{ send, alreadySent }`: `send` é a lista
   ordenada de eventos de público `customer` que o gatilho produziria (`eventsForTrigger`), filtrada
   por evento **ligado** no canal e-mail (`resolveEventSettings`), por
   `orderStateFailure(evento, orderAfter) === null` e por **não** estar em `sentEvents`;
   `alreadySent` são os que passariam nos filtros e já estão em `sentEvents`.
2. **AVS-15** — WHEN `trigger = order_status_changed`, `orderAfter.status = 'shipped'` e
   `tracking_code` vazio THEN SHALL devolver `[]` (o par `TRG-12` ainda não fecha); com
   `tracking_code` preenchido e `order_shipped` ligado, SHALL devolver `['order_shipped']`.
3. **AVS-16** — WHEN o pedido é de retirada (`isPickupOrder`) e o gatilho é a mudança para
   `shipped` THEN SHALL devolver o que `orderStateFailure` decide para retirada, sem regra própria.
4. **AVS-17** — Nenhum arquivo de `apps/backoffice/src` SHALL decidir "este gesto avisa?" por conta
   própria (comparar `status === 'shipped'`, ler `enabled` de configurações de notificação, ou
   listar eventos por nome) fora da chamada a `customerNoticeFor`. Um guarda lê o disco e recusa;
   a metade positiva exige a chamada nos três pontos de entrada (`AdminOrderPage`,
   `AdminOrdersPage`, o diálogo de cancelamento).
5. **AVS-18** — `customerNoticeFor` SHALL ser alcançável pelo Deno (todo especificador relativo
   com `.ts`, `import type` incluso), para o motor poder reusá-la depois.

---

### P1: A página não pisca, e o botão mostra o que está fazendo ⭐ MVP

**User Story**: Como Adri, quero ver que a mudança está sendo gravada sem perder o que estou
fazendo na página.

**Acceptance Criteria**:

1. **CRG-01** — WHEN uma gravação começa a partir de um botão THEN **aquele** botão SHALL mostrar um
   indicador de progresso e o rótulo no gerúndio ("Salvando rastreio…", "Marcando como enviado…",
   "Registrando recebimento…", "Cancelando…", "Reenviando…", "Salvando nota…"), com
   `aria-busy="true"`.
2. **CRG-02** — WHEN uma gravação está em curso no pedido THEN os **outros** controles que gravam
   no mesmo pedido SHALL ficar desabilitados (inclusive o "Outro status"), e um segundo clique no
   mesmo botão SHALL não produzir segunda requisição.
3. **CRG-03** — WHEN a gravação termina (sucesso ou falha) THEN a releitura do pedido SHALL usar o
   modo `revalidar` (`shared/lib/fetchMode.ts`): **sem** ligar `loading`, sem trocar a página por
   "Carregando...", mantendo a posição de rolagem, o foco e o texto dos campos que não foram
   gravados.
4. **CRG-04** — WHEN a releitura em `revalidar` falha THEN o pedido que estava na tela SHALL
   permanecer, e um aviso SHALL dizer "Não consegui atualizar o pedido. O que está na tela pode estar
   desatualizado." com "Tentar de novo".
5. **CRG-05** — WHEN a gravação falha THEN o botão SHALL voltar ao rótulo normal, o campo digitado
   SHALL manter o texto, e o aviso de erro SHALL dizer o que **não** mudou ("O rastreio não foi
   salvo.").
6. **CRG-06** — WHEN o pedido abre pela primeira vez THEN a página SHALL mostrar um esqueleto com a
   mesma grade (coluna principal + lateral de 330) no lugar de "Carregando...".
7. **CRG-07** — WHEN o diálogo de aviso **de um pedido** ou o de cancelamento confirma THEN o botão escolhido SHALL
   mostrar o estado de `CRG-01`, os outros botões do diálogo SHALL ficar desabilitados, e o diálogo
   SHALL fechar **só depois** do desfecho; em falha, SHALL continuar aberto com o motivo digitado.
   (Hoje o cancelamento fecha e apaga o motivo mesmo quando falha.) **O diálogo do LOTE é a exceção
   declarada** (protótipo aprovado, Verifier r1): ele fecha ao confirmar e o andamento vai para a
   barra de lote (`CRG-10`), que o diálogo cobriria; o desfecho vai no resumo (`CRG-11`).
8. **CRG-08** — WHEN o "Reenviar" de uma linha do histórico está em curso THEN só aquele botão SHALL
   mostrar o estado de `CRG-01`; a nota e as outras linhas SHALL ficar desabilitadas sem indicador.
9. **CRG-09** — WHEN o indicador aparece THEN uma região viva (`aria-live="polite"`) SHALL anunciar o
   gerúndio uma vez e, ao terminar, o resultado. **Um anúncio por desfecho** (conserto do QA,
   paper cut): o resultado que vai no aviso flutuante é anunciado pela região viva do aviso (o
   `Toaster` do sonner, `aria-live="polite"`), e a região do gesto não o repete; a falha que fica
   dentro de um diálogo é anunciada pelo `role="alert"` dele; o resumo do lote, pela região `status`
   que fica na lista (`CRG-11`); o que não tem aviso flutuante ("Nota salva") vai na região do gesto.

**Independent Test**: com a rede em Slow 3G, digitar a transportadora, rolar até o Histórico e
clicar em "Marcar como enviado": o botão diz "Marcando como enviado…", o resto não pisca, a
rolagem e a transportadora continuam lá ao terminar.

---

### P2: O lote mostra progresso e pergunta uma vez

**User Story**: Como Adri, quero avançar 30 pedidos de uma vez sabendo quantos e-mails vão sair e
acompanhando o andamento.

**Acceptance Criteria**:

1. **AVS-19** — WHEN a Adri aciona "Avançar status" ou "Marcar material recebido" na barra de lote
   THEN o painel SHALL ler, numa consulta só, os envios `sent` dos pedidos selecionados, calcular
   `customerNoticeFor` para cada um com o estado de destino, e WHEN a soma de `send` for maior que
   zero SHALL abrir o diálogo de lote com: a lista do que muda, quantos enviariam e-mail, quantos já
   tinham recebido aquele e-mail antes, o nome dos e-mails (agrupado), a caixa marcada "Avisar as N
   clientes por e-mail" e um botão "Avançar N pedidos" (ou "Registrar N recebimentos").
2. **AVS-20** — WHEN a soma é zero THEN o lote SHALL gravar sem diálogo (`A-10`).
3. **CRG-10** — WHEN o lote corre THEN a barra de lote SHALL mostrar "Avançando 7 de 30…" (ou
   "Registrando 7 de 30…") com uma barra de progresso determinada, e todas as ações da barra e da
   lista SHALL ficar desabilitadas.
4. **CRG-11** — WHEN o lote termina THEN o resumo SHALL dizer quantos mudaram, quantos foram
   recusados (com o motivo de `bulkSummary`), quantos falharam, e quantos e-mails saíram de fato
   (soma de `emailSent`). O resumo **fica na lista, numa região `status`, até ser dispensado**, e diz
   o motivo dos que ficaram como estavam ("já no fim do caminho") — conserto do QA
   (`BUG-20261030-resumo-do-lote-some-em-quatro-segundos`; era um aviso de ~4 s).
5. **CRG-12** — WHEN a lista relê depois do lote ou de uma ação de linha THEN a tabela SHALL
   continuar na tela (modo `revalidar`), com um indicador discreto "Atualizando…" no cabeçalho da
   lista, e a página e o tamanho da página SHALL ser mantidos.
6. **CRG-13** — WHEN a lista abre pela primeira vez THEN SHALL mostrar linhas-esqueleto (tabela no
   computador, cartões no celular) no lugar de "Carregando...".
7. **AVS-21** — WHEN o "Registrar recebimento" do cartão do celular é tocado THEN SHALL passar pela
   mesma pergunta (`AVS-01`), mostrar o estado de `CRG-01` **só naquele cartão**, e mostrar o
   resultado em aviso — hoje ele não tem estado, não mostra erro e ignora o desfecho da RPC.

---

### P3: Ver o e-mail antes de decidir

**Acceptance Criteria**:

1. **AVS-22** — WHEN o diálogo de aviso mostra um e-mail THEN SHALL haver "Ver o e-mail" ao lado do
   nome, abrindo a prévia daquele evento com o `order_id` do pedido numa aba nova, sem fechar o
   diálogo nem gravar nada.

---

## Edge Cases

- WHEN o pedido muda em outra aba entre abrir o diálogo e confirmar THEN a escrita segue a guarda de
  hoje; o resultado diz o desfecho real (`AVS-07`), e a releitura mostra o estado novo.
- WHEN a leitura das configurações de notificação ainda não chegou THEN a previsão SHALL usar os
  padrões (`DEFAULT_NOTIFICATIONS`) — os mesmos que o motor usa sem linha gravada —, nunca "nenhum
  e-mail".
- WHEN a cliente não tem e-mail no pedido THEN a previsão SHALL devolver `[]` (o motor pularia com
  `skipped:no_email`), e o gesto grava sem diálogo.
- WHEN a Adri volta um status (ex.: Enviado → Em Separação) THEN nenhum e-mail sai pela regra de
  hoje (`order_status_changed` só avisa cancelado/enviado/entregue) e não há diálogo.
- WHEN o lote passa de 50 THEN vale o teto de hoje (`BULK_LIMIT`), avisado antes, e o diálogo conta
  só os 50.
- WHEN o botão "Avançar mesmo assim" (com bloqueio) é usado THEN segue `AVS-01` igual — o bloqueio é
  informação, não muda a pergunta.

## Implicit-requirement sweep

| Dimensão | Requisito |
| --- | --- |
| Validação de entrada | Motivo do cancelamento continua obrigatório (`AVS-08`); rastreio vazio não grava (hoje) |
| Falha / falha parcial | `CRG-04`, `CRG-05`, `CRG-07`, `AVS-12`; lote com resumo por desfecho (`CRG-11`) |
| Idempotência / repetição | `CRG-02` (sem segunda requisição); a RPC de material já é idempotente |
| Autorização | N/A — nada muda de quem pode gravar; a RLS e `has_role` continuam iguais |
| Concorrência / ordem | `CRG-02`; diálogo não grava aberto (`AVS-01`); a previsão pode divergir do motor e o resultado reporta o real (`A-09`) |
| Ciclo de vida do dado | As notas de "sem aviso" são permanentes como qualquer nota interna |
| Observabilidade | O Histórico mostra a escolha, como linha de `order_notifications` (`AVS-10`, `AVS-12`); o motor registra `skipped: 'admin_opt_out'` no log |
| Dependência externa | Com a caixa desmarcada, o Resend não é chamado para a cliente; a falha do motor segue contida (`AD-008`) e o resultado diz o real |
| Transição de estado | Nenhuma transição nova; as guardas de `writeOrderStatus`/`set_material_status` ficam |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| AVS-01..09 | P1: Perguntar antes de avisar | Design | Pending |
| AVS-10..13, AVS-23..24 | P1: Registrar quando não houve aviso, e enviar depois | Design | Pending |
| AVS-14..18 | P1: A previsão tem um dono | Design | Pending |
| CRG-01..09 | P1: A página não pisca | Design | Pending |
| AVS-19..21, CRG-10..13 | P2: O lote | Design | Pending |
| AVS-22 | P3: Ver o e-mail | Design | Pending |

**Coverage:** 37 total, 0 mapped to tasks, 37 unmapped ⚠️ (Design feito; Tasks vem depois)

## Success Criteria

- [ ] Nos dez gestos do inventário, desmarcar a caixa grava, a cliente não recebe e-mail, o aviso à
      dona sai, e o Histórico mostra a linha com o avião — provado pela página real (corpo do
      `functions.invoke` com `customer: false`) e por probe contra o motor servido no banco local.
- [ ] Um status já avisado e ajustado de volta não pergunta nem reenvia (o caso "Ajuste · já foi
      postado antes" do desenho).
- [ ] Nos gestos em que nenhum e-mail sairia, o número de cliques é o mesmo de hoje.
- [ ] Nenhuma gravação no pedido ou na lista troca a página por "Carregando..." (prova em navegador
      em 390×844 e 1440, Slow 3G).
- [ ] Mudar de status com a transportadora digitada e a página rolada mantém as duas coisas.
- [ ] Baselines sem regressão: lint 25/7, tipos 0 · core 11, testes por workspace medidos na entrada.
