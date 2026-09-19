# Notificações por e-mail — base consertada, motor único e textos no painel

**Antecedente**: [`levantamento.md`](./levantamento.md) (2026-09-06), que mediu o que existe, listou
os processos sem notificação e comparou os caminhos de WhatsApp. Esta spec é o **WHAT** da metade de
e-mail; **o WhatsApp é a feature [`43`](../43-whatsapp-pela-evolution-api/spec.md)** — decisão do
usuário em 2026-09-06 de separar as duas para fechar e medir esta antes de tocar na Evolution API.

**O que esta feature deixa pronto para a `43`, de propósito**: a tabela de memória já nasce com
`channel`, o motor já itera canais (com um só registrado) e o vocabulário de eventos já inclui os da
dona. É o custo declarado da separação — "reabrir migration e painel na `43`" — pago aqui uma vez em
vez de lá em três.

## Problem Statement

A loja avisa a cliente em **quatro** momentos (PIX gerado, pagamento aprovado, material recebido,
pedido postado) e fica **muda** em todos os outros que importam — PIX expirado, pagamento recusado,
cancelamento, estorno, "agora é a sua parte de enviar o material", "registramos o seu rastreio". O
texto do que avisa a dona não pode ler antes nem mudar depois; e para pedido com material afetivo o
e-mail de "pagamento aprovado" **diz a coisa errada** ("entra na fila de produção", quando o próximo
passo é a cliente postar). A Adri, por sua vez, não é avisada de nada: descobre pedido novo entrando
no painel.

Medido em 2026-09-06, quatro defeitos que não quebram build, `tsc` nem teste:

| # | O quê | Onde |
| --- | --- | --- |
| **D1** | A documentação manda ligar o SMTP do auth com `acesso@send.umaestrelinha.com.br`; o único domínio verificado na conta Resend é **`loja.umaestrelinha.com.br`**. Seguir o passo escrito repete o `BUG-20260728` | `supabase/config.toml:204-258`, `.env.example`, `supabase/CLAUDE.md` |
| **D2** | `EMAIL_LABELS` rotula `order_confirmed` e `payment_approved`, que não existem no `check` de `order_emails`; os tipos reais caem no fallback *"E-mail order_received enviado"* | `apps/backoffice/src/features/order-detail/model/history.ts:33` |
| **D3** | A aba Carrinho tem *"Enviar email de lembrete automaticamente"*, horas e cupom — e **nenhum código lê** `auto_email_enabled` para enviar nada | `AdminSettingsPage.tsx:430-470` |
| **D4** | A newsletter da home confirma *"Você vai receber as novidades…"* e não persiste, não inscreve, não envia | `features/newsletter/ui/NewsletterBanner.tsx` |

E o caminho de e-mail que existe **nunca rodou ponta a ponta**: `order_emails` tem 0 linhas para 35
pedidos; os 370 testes mockam o `fetch`.

## Goals

- [ ] **Todo evento da jornada do pedido que a cliente precisa saber gera um e-mail**, dirigido por
      estado (`AD-007`), idempotente pelo banco (`AD-006`) e contido (`AD-008`).
- [ ] **A Adri lê, edita e liga/desliga cada texto no painel**, vê a prévia renderizada **pela mesma
      função que envia**, e é recusada quando o texto viola o tom da loja.
- [ ] **A Adri é avisada por e-mail** de pedido pago e de material a caminho.
- [ ] **Um dono só**: `@estrelinha/core/notifications` define eventos, pré-condições, variáveis e a
      régua de tom; `order_notifications` é a única memória de "já avisei"; o normalizador de telefone
      sobe para `core`.
- [ ] **D1–D4 consertados antes de qualquer coisa nova**, e o roteiro ponta a ponta do `sender.ts`
      executado e registrado.
- [ ] **A `43` encontra o chão pronto**: `channel` na tabela, laço de canais no motor, adaptador de
      provedor como interface.

## Out of Scope

| Item | Motivo |
| --- | --- |
| **Canal WhatsApp** (opt-in, adaptador Evolution, webhooks, status da instância, teto) | Feature **`43`**, por decisão do usuário. Esta deixa o `channel` na tabela e o laço no motor, e **nenhuma** tela mostra coluna de WhatsApp |
| Lembrete automático de carrinho abandonado | **Decisão da dona pendente** (levantamento §2.5). Esta feature **tira o interruptor sem motor da tela** (D3) e registra a pergunta em `BL-030` |
| Newsletter com lista real | Marketing, reputação de envio separada, double opt-in e descadastro (LGPD). Esta feature só faz a copy **parar de prometer** (D4); a lista vai para `BL-031` |
| Lembrete automático de material pendente | **Continua manual** (botão "cobrar material"). Régua automática é política de relacionamento, e é da Adri |
| Código de acesso por WhatsApp | Auth fica **inteiro no GoTrue** |
| `delivered` automático pelo rastreio do Melhor Envio | Feature própria. O evento `order_delivered` **fica definido**, mas só dispara quando alguém marca `delivered` à mão |
| Edição da **estrutura** do e-mail (casca, tabela, totais, endereço, cores) | Estrutura é código com um dono (`layout.ts`). O painel edita **redação** |
| Digest diário para a dona | Só se ela pedir |
| `packages/core/src/payment/**` e o recálculo da `mercado-pago` | Notificação não é dinheiro. A `mercado-pago` muda **só** o import do motor e os pontos de disparo — conferido por `git diff --name-only` no gate |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| **Separar e-mail (`42`) de WhatsApp (`43`)** | Sim; a `42` deixa `channel`, laço e interface prontos | Decisão do usuário, 2026-09-06. O custo de reabrir é pago aqui, uma vez | **y** |
| **Orçamento de tempo no caminho do PIX** | `create-payment` mantém **2500 ms** para notificações **no total**; webhook **8000 ms** | `AD-008`: nada em background numa edge function. O que não coube fica `failed: timeout`, **visível e reenviável** no painel | y |
| **Disparo de evento iniciado pela cliente** (`material_tracking_registered`) | O evento **é** gerado; o mecanismo (trigger no banco + `pg_net`, ou a loja chamar a function autenticada como dona do pedido) é decisão de design | A porta HTTP atual é admin-only e a cliente não é admin | y (o que) · n (o como) |
| **Onde moram os textos** | `store_settings.notifications` (JSONB), defaults em TypeScript, migration aditiva e idempotente | Molde da `37`/`39`; ~60 strings não pedem tabela; `storeSettingsDefaults.test.ts` já compara TS × SQL | y |
| **Interruptores dos 4 e-mails que já saem** | Nascem **ligados** | Desligar seria regressão silenciosa de coisa que funciona | y |
| **Interruptores de todo evento novo** | Nascem **desligados** | A Adri lê o texto antes de a primeira cliente receber. Passo de operação registrado no `CLAUDE.md`, como o frete grátis (`AD-027`) | y |
| **Auth SMTP no painel do hospedado** | Fora do código: item do `validation.md`, com o probe `from acesso@loja.umaestrelinha.com.br` | `config.toml` não é empurrado (regra do deploy) | y |
| **Variáveis desconhecidas no texto** | Recusa ao salvar (painel) **e** ao renderizar (function) | Variável que virou `undefined` no e-mail da cliente é o pior modo de falha | y |
| **`order_emails` durante a janela de deploy** | Vira **view** `security_invoker` sobre `order_notifications` (`channel = 'email'`), com `claim_order_email` delegando; remoção em migration posterior | `db push` e Vercel rodam em paralelo (lição da `39`) | y |
| **Pedidos importados da Nuvemshop (`35`)** | Nenhum e-mail retroativo | Avisar "pagamento aprovado" de 2025 seria mentira | y |
| **Endereço do ateliê e número de atendimento nos textos** | Variáveis (`store_settings.material`, `store_settings.general.whatsapp`) — nunca literais | Dois donos do mesmo dado é o defeito 01 | y |
| **`normalizeBrPhone` sobe para `core` já nesta feature** | Sim, e `chargeMaterial.ts` passa a importar de lá | O segundo consumidor (`43`) é previsível; mover agora evita a cópia | y |
| **Copy da newsletter pós-D4** | "Anotado. Quando houver novidades, escrevemos." — design pode ajustar, mantendo a régua de não prometer envio | | y |

**Open questions:** nenhuma que trave esta feature. As pendências da dona (carrinho, newsletter)
viram `BL-030`/`BL-031`.

---

## User Stories

### P1: A base para de mentir ⭐ MVP

**User Story**: Como dona e como dev, quero que a documentação, o histórico do pedido e o painel
digam a verdade sobre o que a loja envia, para que nenhuma decisão nasça de um interruptor falso ou de
um passo que derruba o login.

**Why P1**: Tudo o que vem depois se apoia nisso. Um interruptor sem motor no painel invalida o painel
inteiro como fonte de verdade.

**Acceptance Criteria**:

1. WHEN alguém lê `supabase/config.toml`, `.env.example` ou `supabase/CLAUDE.md` THEN o remetente do
   auth SHALL ser `acesso@loja.umaestrelinha.com.br` e nenhuma ocorrência de
   `send.umaestrelinha.com.br` SHALL existir no repositório (guarda de disco, âncora ≥ 3 arquivos).
2. WHEN o histórico de um pedido mostra um e-mail enviado THEN o rótulo SHALL vir de um
   `Record<NotificationEvent, string>` completo — `order_received` → "Confirmação do pedido enviada",
   `order_paid` → "Aviso de pagamento aprovado enviado" — e `tsc` SHALL recusar rótulo faltando.
3. WHEN a aba Carrinho de `/admin/configuracoes` é renderizada THEN ela SHALL NOT conter controle de
   lembrete automático (`auto_email_enabled`, `auto_email_hours`, `reminder_coupon_code`); os campos
   permanecem no JSONB e um teste com sensor SHALL reprovar se o controle voltar.
4. WHEN a cliente envia o formulário da newsletter THEN a confirmação SHALL NOT afirmar que ela
   receberá e-mails — coberta por `copyInstitucional.test.tsx`.
5. WHEN o roteiro manual de 8 passos de `sender.ts` é executado contra o sandbox do MP THEN
   `validation.md` SHALL registrar `order_received` e `order_paid` com `status = sent` e
   `provider_message_id` preenchido, e a captura do e-mail no Gmail do celular.

**Independent Test**: suíte do backoffice verde com os guardas novos; grep do domínio antigo devolve
zero; `/admin/configuracoes` → Carrinho sem o interruptor.

---

### P1: Um motor, memória única, pronto para dois canais ⭐ MVP

**User Story**: Como dev, quero que toda notificação passe por um único motor dirigido por estado,
com uma única tabela de "já avisei" que já conhece a noção de canal, para que a `43` acrescente o
WhatsApp registrando um adaptador — e não copiando o `send-email`.

**Why P1**: Fundação de todo o resto, e a razão de a separação em duas features não custar o defeito
01.

**Acceptance Criteria**:

1. WHEN a migration é aplicada THEN SHALL existir `order_notifications (id, order_id, event, channel,
   status, attempts, provider_message_id, delivery_status, error, created_at, sent_at)` com índice
   único **não parcial** em `(order_id, event, channel)`, `check` de `event` igual a
   `NOTIFICATION_EVENTS`, `check` de `channel in ('email','whatsapp')`, `check` de `status in
   ('pending','sent','failed')`, RLS com leitura por `has_role`, nenhum `grant` a `anon`.
2. WHEN a migration roda sobre um banco com linhas em `order_emails` THEN todas SHALL aparecer em
   `order_notifications` com `channel = 'email'`, `order_emails` SHALL passar a ser **view**
   `security_invoker` com as mesmas colunas, e `claim_order_email(uuid, text)` SHALL delegar para
   `claim_order_notification(uuid, text, text)`.
3. WHEN o motor recebe `{ orderId, event }` THEN ele SHALL reler o pedido com service role, avaliar a
   pré-condição do evento (tabela em *Eventos*) e, se falhar, devolver `{ precondition }` **sem
   reivindicar** linha nenhuma.
4. WHEN a pré-condição passa THEN, para cada canal **registrado no motor** e **habilitado** em
   `store_settings.notifications` para o evento, o motor SHALL reivindicar `(order_id, event,
   channel)` atomicamente e enviar; canal desabilitado SHALL registrar `skipped:disabled` no log sem
   criar linha. Nesta feature o único canal registrado é `email`.
5. WHEN o mesmo `{ orderId, event }` é pedido duas vezes com a primeira em `sent` THEN a segunda
   SHALL devolver `skipped: already_sent` por canal, sem chamada ao provedor.
6. WHEN o provedor falha (HTTP ≠ 2xx, timeout, rede) THEN a linha SHALL ficar `failed` com `error`
   recortado a 500 caracteres, o log SHALL carregar um slug e **nunca** o corpo cru, e o motor SHALL
   NOT lançar.
7. WHEN o motor é chamado pela `mercado-pago` (in-process, `AD-005`) THEN a resposta do pagamento
   SHALL NOT mudar de status em função da notificação, e o tempo total em notificações SHALL ser
   ≤ 2500 ms no `create-payment` e ≤ 8000 ms no webhook.
8. WHEN um evento não está em `NOTIFICATION_EVENTS` THEN a porta HTTP SHALL responder 400 antes de
   tocar o banco.
9. WHEN a porta HTTP `send-notification?action=send` é chamada sem JWT, com a anon key, ou por
   cliente sem papel `admin` THEN SHALL responder 401 / 401 / 403 (molde `EML-03/04`).
10. WHEN um provedor é registrado no motor THEN ele SHALL implementar a interface
    `NotificationProvider { channel, send, classifyFailure }` de `core/notifications/providers/`, e um
    teste SHALL exercitar a interface com o adaptador `resend` **e** com um dublê — a prova de que a
    `43` só acrescenta um arquivo.

**Independent Test**: `@estrelinha/functions` prova cada AC com dublês; `orderNotificationsSchema.test.ts`
lê a migration; `db push` local sobre o banco com 35 pedidos não perde linha nem quebra
`order_emails` para o código antigo.

---

### P1: Os eventos que faltam na jornada do pedido ⭐ MVP

**User Story**: Como cliente, quero saber quando meu PIX venceu, quando meu cartão não passou, quando
o pedido foi cancelado ou estornado, e — se comprei uma peça com material — o que fazer depois de
pagar e que meu rastreio foi registrado.

**Why P1**: Lacunas que custam dinheiro (PIX expirado) e confiança (material). O e-mail de pagamento
aprovado hoje diz a coisa **errada** para pedido com material.

#### Eventos — o vocabulário completo (`NOTIFICATION_EVENTS`) e a pré-condição de cada um

| Evento | Pré-condição relida | Disparo | Destinatário | Nasce ligado? |
| --- | --- | --- | --- | --- |
| `order_received` | `payment_status = pending` ∧ `mp_order_id` | `create-payment` | cliente | **sim** |
| `order_paid` | `paid_at` ∧ `material_status ≠ aguardando_material` | webhook aprovado | cliente | **sim** |
| `material_instructions` | `paid_at` ∧ `material_status = aguardando_material` | webhook aprovado | cliente | não |
| `payment_rejected` | `payment_status = rejected` | webhook | cliente | não |
| `pix_expired` | `payment_status = expired` | webhook | cliente | não |
| `order_cancelled` | `status = cancelled` | backoffice | cliente | não |
| `payment_refunded` | `payment_status = refunded` | webhook | cliente | não |
| `material_tracking_registered` | `material_status = material_enviado` ∧ `material_tracking_code` | RPC `set_material_tracking` | cliente | não |
| `material_received` | `material_status = material_recebido` | backoffice | cliente | **sim** |
| `in_production` | `material_status = em_producao` | backoffice | cliente | não |
| `order_shipped` | `status = shipped` ∧ `tracking_code` | backoffice (os dois lados do par) | cliente | **sim** |
| `order_delivered` | `status = delivered` | backoffice (manual) | cliente | não |
| `post_delivery_care` | `status = delivered` há ≥ N dias | rotina (P3) | cliente | não |
| `owner_order_paid` | `paid_at` | webhook aprovado | **dona** | não |
| `owner_material_incoming` | `material_status = material_enviado` | RPC `set_material_tracking` | **dona** | não |

**Acceptance Criteria**:

1. WHEN o webhook aprova um pedido com `material_status = aguardando_material` THEN o motor SHALL
   enviar `material_instructions` e SHALL NOT enviar `order_paid` — e o inverso quando
   `nao_aplicavel`. Os dois textos SHALL ser editáveis separadamente.
2. WHEN o webhook aplica `expired`, `rejected` ou `refunded` (`applied = true`) THEN o evento
   correspondente SHALL ser disparado **uma** vez; reentrega (`applied = false`) SHALL NOT disparar.
3. WHEN a cliente registra o rastreio pela RPC `set_material_tracking` THEN
   `material_tracking_registered` (para ela) e `owner_material_incoming` (para a dona) SHALL ser
   gerados; o mecanismo é do design, e o teste SHALL provar o par por **probe HTTP** contra o banco
   local, não por mock.
4. WHEN qualquer texto de evento de material (`material_instructions`,
   `material_tracking_registered`, `material_received`, `in_production`) é renderizado THEN ele
   SHALL NOT conter `!` — régua de `renderMaterialReceived`, agora em `notificationCopyRefusal`.
5. WHEN `pix_expired` é renderizado THEN SHALL conter `{{link_pedido}}` (gerar PIX novo) e SHALL NOT
   conter contagem regressiva, "últimas", "corra" ou prazo em minutos.
6. WHEN `order_cancelled` é renderizado para pedido com `material_status ∈ {material_enviado,
   material_recebido}` THEN SHALL conter o parágrafo sobre devolução do material; caso contrário
   SHALL NOT.
7. WHEN `material_instructions` é renderizado THEN SHALL conter `{{link_guia_material}}` e
   `{{endereco_atelie}}`, e SHALL NOT conter "fila de produção".
8. WHEN `owner_*` dispara THEN o destinatário SHALL ser `store_settings.general.email`, **nunca** a
   cliente; destino vazio ⇒ `skipped:no_owner_contact`. O texto SHALL conter número do pedido,
   primeiro nome da cliente, total, se há material a esperar (e o rastreio, no `incoming`) e
   `{{link_pedido_admin}}`.
9. WHEN a `mercado-pago` dispara qualquer evento THEN o gate SHALL provar que
   `packages/core/src/payment/**` e o recálculo não foram tocados (`git diff --name-only`).

**Independent Test**: pedido com material pago no sandbox → e-mail "agora é a sua parte" no Mailpit,
sem "entra na fila de produção", e um segundo e-mail para `general.email`; expirar um PIX → e-mail de
PIX expirado; reentregar o webhook → nada.

---

### P1: A Adri edita os textos e vê a prévia da loja ⭐ MVP

**User Story**: Como dona, quero ler cada e-mail que a loja manda, mudar o que está no meu nome,
ligar e desligar, e ver exatamente como vai chegar — para que nenhuma cliente receba um texto que eu
não aprovei.

**Why P1**: Sem isso os eventos novos ficam desligados para sempre, por decisão.

**Acceptance Criteria**:

1. WHEN `/admin/configuracoes` abre THEN SHALL existir a aba **Notificações**, listando os eventos de
   `NOTIFICATION_EVENTS` **na ordem da jornada** (tabela acima), cada um com interruptor de e-mail e
   os campos editáveis. Nenhuma coluna de WhatsApp SHALL existir nesta feature.
2. WHEN um evento é editado THEN os campos editáveis SHALL ser exatamente `subject`, `heading`,
   `lead`, `extra[]` e `cta_label`; itens, totais, endereço, rastreio, casca e destino do CTA SHALL
   NOT ser editáveis.
3. WHEN a Adri digita uma variável THEN ela SHALL vir do vocabulário fechado `NOTIFICATION_VARIABLES`
   (`{{saudacao}}`, `{{primeiro_nome}}`, `{{numero_pedido}}`, `{{rastreio}}`, `{{transportadora}}`,
   `{{link_conta}}`, `{{link_pedido}}`, `{{link_pedido_admin}}`, `{{link_guia_material}}`,
   `{{endereco_atelie}}`, `{{whatsapp_atendimento}}`, `{{total}}`); variável fora dele SHALL ser
   recusada ao salvar, com a mensagem nomeando a variável. **`{{saudacao}}`** resolve para
   "Oi, {primeiro nome}! " (ou "" sem nome) e, nos eventos de material, para "Oi, {primeiro nome}. "
   — é a regra de `greet`/`greetCalm` de `templates.ts`, e é o que permite os quatro textos legados
   serem defaults byte a byte. (Precisão acrescentada em 2026-09-06, antes da T7.)
4. WHEN o texto contém urgência fabricada, emoji, `!!` ou — nos eventos de material — `!` THEN
   `notificationCopyRefusal` SHALL devolver o motivo, o painel SHALL mostrar inline e **não salvar**,
   e a function SHALL recusar renderizar (422) o mesmo texto — **uma** função em `core`, chamada nos
   dois lados.
5. WHEN a Adri clica em "ver prévia" THEN o painel SHALL chamar `send-notification?action=preview`
   com `{ event, channel: 'email', draft }` e renderizar o HTML devolvido num `<iframe sandbox
   srcdoc>` em 390 px e 600 px, sobre um **pedido de exemplo fixo** sem dado de cliente real, ou
   sobre um `order_id` que ela escolher; a prévia SHALL refletir o rascunho **não salvo**.
6. WHEN `action=preview` é chamada THEN a function SHALL NOT gravar em `order_notifications`, SHALL
   NOT chamar provedor, e SHALL exigir papel `admin`.
7. WHEN os defaults de `store_settings.notifications` são semeados THEN os quatro e-mails que já saem
   SHALL nascer `enabled: true` com textos **idênticos** aos de `templates.ts` de hoje; todos os
   demais `enabled: false`; `storeSettingsDefaults.test.ts` SHALL comparar TS × migration.
8. WHEN a Adri desliga um evento THEN a próxima ocorrência SHALL registrar `skipped:disabled` e
   SHALL NOT criar linha; os já enviados permanecem no histórico.
9. WHEN o histórico do pedido mostra uma notificação THEN SHALL indicar o canal e o botão
   **reenviar** por linha (`PED-28` mantido).
10. WHEN a aba é aberta em 390×844 THEN nenhum controle SHALL ter alvo abaixo de 44 px, nenhuma
    pílula SHALL embrulhar, e o `body` SHALL NOT produzir scroll horizontal — provado em navegador.

**Independent Test**: editar o `lead` do `order_paid`, ver a prévia mudar sem salvar, tentar salvar
com "corra" e ser recusada, salvar sem, e receber o e-mail no Mailpit com o texto novo.

---

### P3: Pós-entrega

**User Story**: Como cliente, quero receber, dias depois de a joia chegar, como cuidar dela e o que
fazer com o excedente de material que voltou.

**Why P3**: Único e-mail "de conteúdo" que faz sentido nesta loja; depende de `order_delivered` ser
marcado e de a dona escrever o texto.

**Acceptance Criteria**:

1. WHEN `status = delivered` há ≥ N dias (`N` em `store_settings.notifications`, default 7) THEN
   `post_delivery_care` SHALL ser elegível; o disparo é por rotina (design), **uma** vez por pedido,
   e SHALL NOT conter oferta, cupom ou venda cruzada (régua adicional em `notificationCopyRefusal`
   para este evento).

---

## Edge Cases

- WHEN `customer_email` do pedido é inválido ou vazio THEN o canal e-mail SHALL ser
  `skipped:no_email` e nenhuma linha SHALL ser criada.
- WHEN a Adri edita um texto **enquanto** um envio está em curso THEN o envio usa o texto lido no
  início da requisição; sem lock. Registrado, não corrigido.
- WHEN `store_settings.notifications` está ausente (banco anterior à migration) THEN o motor SHALL
  usar os defaults do TypeScript — nunca deixar de enviar os quatro que já saem.
- WHEN o mesmo webhook do MP chega duas vezes em paralelo THEN `claim_order_notification` garante um
  envio por canal; a colisão no índice único SHALL ser tratada como `already_sent`.
- WHEN o `check` de `event` na migration e `NOTIFICATION_EVENTS` divergem THEN o guarda de disco
  SHALL reprovar nos dois sentidos.
- WHEN `RESEND_DEV_REDIRECT_TO` está preenchido THEN o e-mail SHALL ser redirecionado e o assunto
  prefixado, como hoje — a `43` cria o equivalente para WhatsApp.
- WHEN `extra[]` tem mais de 5 linhas ou `lead` mais de 600 caracteres THEN o painel SHALL recusar
  ao salvar (limites em `core`, lidos pelo painel e pela function).

---

## Requirement Traceability

| ID | Story | O quê | Phase | Status |
| --- | --- | --- | --- | --- |
| FIX-01 | P1 base | D1: domínio do auth corrigido nos três arquivos + guarda | Design | Pending |
| FIX-02 | P1 base | D2: rótulos por `Record<NotificationEvent,string>` | Design | Pending |
| FIX-03 | P1 base | D3: interruptor sem motor sai da tela, com sensor | Design | Pending |
| FIX-04 | P1 base | D4: copy da newsletter | Design | Pending |
| FIX-05 | P1 base | roteiro ponta a ponta do `sender.ts` executado e registrado | Design | Pending |
| NTF-01 | P1 motor | `order_notifications` + RPCs + view de compatibilidade | Design | Pending |
| NTF-02 | P1 motor | `send-email` → `send-notification`; `mercado-pago` importa o novo motor | Design | Pending |
| NTF-03 | P1 eventos | `NOTIFICATION_EVENTS` e `preconditionFailure` em `core` | Design | Pending |
| NTF-04 | P1 motor | laço de canais registrados ∧ habilitados; `skipped:*` sem linha | Design | Pending |
| NTF-05 | P1 motor | idempotência por `(order, event, channel)`; `already_sent` | Design | Pending |
| NTF-06 | P1 motor | classificação de falha por slug; nunca corpo cru; nunca lança | Design | Pending |
| NTF-07 | P1 motor | orçamento 2500/8000 ms; pagamento imune | Design | Pending |
| NTF-08 | P1 motor | auth da porta HTTP (401/401/403) e 400 para evento inválido | Design | Pending |
| NTF-09 | P1 motor | interface `NotificationProvider`; teste com `resend` + dublê | Design | Pending |
| NTF-10 | P1 eventos | bifurcação `order_paid` × `material_instructions` | Design | Pending |
| NTF-11 | P1 eventos | `pix_expired`, `payment_rejected`, `payment_refunded` pelo webhook, uma vez | Design | Pending |
| NTF-12 | P1 eventos | `order_cancelled` com parágrafo condicional de material | Design | Pending |
| NTF-13 | P1 eventos | `material_tracking_registered` + `owner_material_incoming` pela RPC, provado por probe | Design | Pending |
| NTF-14 | P1 eventos | `in_production`, `order_delivered` | Design | Pending |
| NTF-15 | P1 eventos | `owner_order_paid` por e-mail (conteúdo, destino, `skipped:no_owner_contact`) | Design | Pending |
| NTF-16 | P1 eventos | `payment/**` intocado | Design | Pending |
| PNL-01 | P1 painel | aba Notificações, eventos na ordem da jornada, interruptor de e-mail | Design | Implemented by 53 |
| PNL-02 | P1 painel | campos editáveis exatos | Design | Implemented by 53 |
| PNL-03 | P1 painel | `NOTIFICATION_VARIABLES` fechado; recusa ao salvar e ao renderizar | Design | Implemented by 53 |
| PNL-04 | P1 painel | `notificationCopyRefusal` em `core`, chamado nos dois lados | Design | Implemented by 53 |
| PNL-05 | P1 painel | `action=preview` (admin, sem efeito), iframe 390/600, rascunho não salvo | Design | Implemented by 53 |
| PNL-06 | P1 painel | defaults: 4 ligados com texto idêntico, demais desligados; TS × SQL | Design | Implemented by 42 |
| PNL-07 | P1 painel | `normalizeBrPhone` em `core`; backoffice deixa de ter cópia | Design | Implemented by 42 |
| PNL-08 | P1 painel | histórico com canal e reenvio por linha | Design | Implemented by 42 |
| PNL-09 | P1 painel | limites de tamanho em `core`, lidos pelos dois lados | Design | Implemented by 53 |
| PNL-10 | P1 painel | prova em 390×844 (navegador) | Design | Implemented by 53 |
| PDC-01 | P3 pós-entrega | `post_delivery_care` elegível por N dias, uma vez, sem venda | – | Partial — motor pronto (42); rotina automática de elegibilidade segue aberta em `BL-037` |

**Coverage:** 32 requisitos · 0 mapeados a tasks · 32 não mapeados ⚠️ (Design/Tasks pendentes)

> **Nota de fecho (feature `53`, 2026-09-19).** As onze linhas acima ficaram `Pending` desde que
> esta spec foi escrita — a Phase 2 dela (`tasks.md:164`, T19–T23) nunca saiu, virou `BL-033`, e foi
> concluída pela feature `53`. Ao atualizar o `Status`, três delas (`PNL-06`, `PNL-07`, `PNL-08`) se
> revelaram **já implementadas na Phase 1 desta própria feature** (`defaults.ts`, `phone.ts` e o
> reenvio de `AdminOrderPage.tsx`, todos do commit `7707ade`) — marcá-las "Implemented by 53" seria
> uma afirmação falsa de rastreabilidade, então ficam creditadas a `42`. `PDC-01` continua **parcial**
> de propósito: a régua de copy e a pré-condição existem, mas nada dispara o evento automaticamente
> — é exatamente o que `BL-037` (aberta) nomeia. As outras sete (`PNL-01..05`, `09`, `10`) são o
> trabalho de painel que só existia como Phase 2 pendente, e são genuinamente de `53`.

---

## Success Criteria

- [ ] Um pedido com material pago no sandbox produz **um** e-mail para a cliente — o de instruções —
      e um para a dona, e o texto do primeiro foi lido e salvo pela Adri no painel antes.
- [ ] Um PIX que expira produz **um** aviso, e a reentrega do webhook não produz nenhum.
- [ ] A Adri consegue, em 390×844, editar um texto, ver a prévia, ser recusada por "corra", e salvar.
- [ ] `order_notifications` é a **única** tabela que responde "já avisei?"; nenhum arquivo de
      `apps/**` ou `supabase/functions/**` lê `order_emails` diretamente (guarda de disco).
- [ ] `grep -r "send.umaestrelinha.com.br"` no repositório devolve zero.
- [ ] A `43` acrescenta o WhatsApp **sem** migration nova em `order_notifications` e **sem** mexer no
      laço do motor — só um adaptador, uma coluna na aba e o opt-in do checkout.
- [ ] Baselines remedidas por workspace, exit code capturado, `CLAUDE.md` atualizado; `payment/**`
      sem uma linha alterada.
- [ ] `validation.md` com **autor ≠ verificador**, incluindo prova em navegador e o probe do SMTP do
      auth no hospedado.

---

## Phase plan (proposta, refinada em `tasks.md`)

| Fase | Requisitos | Depende de |
| --- | --- | --- |
| **F0 — base** | FIX-01..05 | nada |
| **F1 — motor e eventos** | NTF-01..16, PNL-07 | F0 |
| **F2 — painel** | PNL-01..06, PNL-08..10 | F1 |
| **F3 — pós-entrega** | PDC-01 | F2, texto da dona |
