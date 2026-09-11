# 42 — Notificações por e-mail e WhatsApp: levantamento e plano

**Status**: levantamento — **não é spec**. A spec nasceu dele em 2026-09-06: [`spec.md`](./spec.md) e [`context.md`](./context.md), com a decisão de provedor (`AD-031`). Existe para que a
spec nasça de fatos medidos e de uma decisão de provedor, não de suposição.
**Data**: 2026-09-06 · **Autor**: Rafael Duarte
**Número**: `42`, o próximo depois da `41` (banner principal da home). Se a implantação for dividida
em duas features (e-mail configurável × WhatsApp), a segunda consome a `43`.

> Tudo o que está marcado **medido** foi verificado hoje contra o código, o banco local, a conta Resend
> e o projeto Supabase hospedado. O que está marcado **a conferir** não foi — e a spec não pode
> tratá-lo como fato.

---

## 1. O que existe hoje

### 1.1 Duas trilhas de e-mail, independentes

| Trilha | Motor | Quem envia | Estado |
| --- | --- | --- | --- |
| **Transacional** | edge function [`send-email`](../../../supabase/functions/send-email/) → API HTTP do Resend | `mercado-pago` (in-process) e backoffice (porta HTTP admin) | **medido**: implantada no hospedado, roteia e autentica; domínio `loja.umaestrelinha.com.br` **verificado** no Resend, `POST /emails` do `RESEND_FROM` real devolveu **200** |
| **Auth** | GoTrue → SMTP | Supabase | **medido no local**: código de acesso chega no Mailpit com o template da marca. **No hospedado o SMTP é do painel e NÃO foi conferido** (ver 1.3) |

Os quatro e-mails transacionais que existem, todos dirigidos por estado (`AD-007`), idempotentes pelo
banco (`AD-006`) e contidos (`AD-008` — falha nunca reverte estado nem vira erro):

| Tipo | Gatilho | Pré-condição relida | Disparo |
| --- | --- | --- | --- |
| `order_received` | PIX gerado | `payment_status = pending` e `mp_order_id` | `create-payment`, 2500 ms |
| `order_paid` | webhook aprovou | `paid_at` preenchido | `webhook`, 8000 ms |
| `order_shipped` | par status `shipped` + rastreio | `status = shipped` e `tracking_code` | backoffice, nas duas ordens do par |
| `material_received` | material chegou ao ateliê | `material_status = material_recebido` | backoffice |

**O caminho nunca rodou ponta a ponta.** `order_emails` tem **0 linhas** para 35 pedidos no banco
local (importados da Nuvemshop, que não passam pelo checkout). Os 370 testes de
`@estrelinha/functions` mockam o `fetch` — provam o mapeamento, não a integração. É a mesma classe
de defeito da cotação de frete (46 testes verdes, integração quebrada por meses).

### 1.2 Mensageria

Não há SMS, push nem chat. O WhatsApp aparece em dois lugares, os dois **manuais**:

- **Bolha de atendimento** (`widgets/whatsapp-float`): depende de `store_settings.general.whatsapp`,
  **vazio no banco local** — o componente nem renderiza. No hospedado: a conferir em
  `/admin/configuracoes` → Geral.
- **"Cobrar material"** no painel ([`chargeMaterial.ts`](../../../apps/backoffice/src/features/order-list/model/chargeMaterial.ts)):
  abre `wa.me` com o texto pronto e **ninguém envia nada até a Adri apertar enviar**. É decisão de
  produto declarada, não falta de código: régua automática de cobrança num negócio memorial é
  política de relacionamento, e quem decide o tom é a dona.

### 1.3 Os defeitos que a implantação precisa consertar ANTES de crescer

Nenhum quebra build, `tsc` ou teste — é o "defeito 01" do projeto em quatro roupas.

| # | Defeito | Onde | Por que importa |
| --- | --- | --- | --- |
| **D1** | **O SMTP do auth prescreve um domínio que não existe na conta.** `config.toml`, `.env.example` e `supabase/CLAUDE.md` mandam ligar com `acesso@send.umaestrelinha.com.br` e registram a pendência C-08 ("não verificado, medido em 2026-08-08"). **Medido hoje**: `GET /domains` devolve **um** domínio, `loja.umaestrelinha.com.br`, verificado em 2026-08-11. `send.` nunca foi criado. | `supabase/config.toml:204-258`, `.env.example` | Seguir o passo documentado repete o `BUG-20260728` (403, login por código derrubado). E **se o SMTP de produção estiver desligado no painel**, o GoTrue usa o SMTP compartilhado do Supabase — poucos e-mails por hora — e o login da loja quebra sob qualquer volume |
| **D2** | **Dois rótulos mortos no histórico do pedido.** `EMAIL_LABELS` mapeia `order_confirmed` e `payment_approved`, que **não existem** no `check` de `order_emails`. Os dois tipos que ocorrem de fato caem no fallback: a admin lê *"E-mail order_received enviado"* | [`history.ts:33-38`](../../../apps/backoffice/src/features/order-detail/model/history.ts#L33) | Nenhum teste cobre os rótulos. Vocabulário escrito à mão fora do `Record<EmailType, …>` é afirmação, não verificação (`AD-012`) |
| **D3** | **Interruptor sem motor.** A aba Carrinho do painel tem *"Enviar email de lembrete automaticamente"*, *"Enviar lembrete após (horas)"* e *cupom do lembrete* (`auto_email_enabled`, `auto_email_hours`, `reminder_coupon_code`). **Nenhum código lê esses campos para enviar nada**, e nada escreve `abandoned_carts.reminder_sent_at` | [`AdminSettingsPage.tsx:430-470`](../../../apps/backoffice/src/pages/admin/AdminSettingsPage.tsx#L430), `useAdminAbandonedCarts.ts` | A dona liga, acredita que a loja lembra a cliente, e a loja não lembra. É pior que não ter o interruptor |
| **D4** | **A newsletter promete e não entrega.** O formulário da home só faz `setSubmitted(true)` e mostra *"Você vai receber as novidades da loja no seu e-mail"*. Não persiste, não inscreve, não envia | [`NewsletterBanner.tsx`](../../../apps/store/src/features/newsletter/ui/NewsletterBanner.tsx) | O componente documenta a ausência de destino, mas a **copy** afirma o contrário para a cliente |

---

## 2. Levantamento: todo processo que precisa de notificação

Critério de inclusão: **um evento que a cliente (ou a Adri) precisa saber que aconteceu e não está
olhando a tela quando acontece**. Cada linha tem o **estado que prova o evento** — o contrato dirigido
por estado do `AD-007` exige que a function releia o pedido e confirme antes de mandar, e essa coluna
é o que a pré-condição vai checar.

Canal: **E** = e-mail · **W** = WhatsApp · **E+W** = os dois, cada um com opt-in próprio.
Prioridade: **P0** já existe e precisa ficar configurável · **P1** lacuna que afeta dinheiro ou
confiança · **P2** melhora a experiência · **P3** depende de decisão da dona.

### 2.1 Jornada da cliente — acesso

| Evento | Estado que prova | Canal | Hoje | Prio | Observação |
| --- | --- | --- | --- | --- | --- |
| Código de acesso (login por OTP) | GoTrue | E | ✅ template da marca | P0 | **Fica no GoTrue**, não entra no painel: o template usa `{{ .Token }}` e é configurado no Supabase. Só o D1 precisa de conserto |
| Confirmação de cadastro (e-mail novo) | GoTrue | E | ✅ | P0 | idem |
| Recuperação de senha | GoTrue | E | ✅ (`AuthResetCodeStep` → `AuthNewPasswordStep`) | P0 | idem |
| Código de acesso por WhatsApp | GoTrue | W | ❌ | P3 | A Cloud API tem categoria *authentication*; **não recomendado agora** — é segundo canal para o mesmo segredo e dobra a superfície do login |

### 2.2 Jornada da cliente — compra e pagamento

| Evento | Estado que prova | Canal | Hoje | Prio | Observação de tom / conteúdo |
| --- | --- | --- | --- | --- | --- |
| Pedido recebido, aguardando PIX | `payment_status = pending` ∧ `mp_order_id` | E+W | ✅ `order_received` | P0 | É **recibo, não canal de pagamento** (TRG-11): sem QR nem copia-e-cola — a retentativa cancela a order anterior e o código nasceria vencido |
| Pagamento aprovado | `paid_at` | E+W | ✅ `order_paid` | P0 | **Conteúdo errado para pedido com material**: diz "entra na fila de produção", mas para `material_status = aguardando_material` o próximo passo é **a cliente postar o material**. O e-mail precisa **bifurcar** por `material_status`: sem material → produção; com material → "agora é a sua parte", com o link do guia (`MATERIAL_GUIDE_PATH`) e o endereço do ateliê (`store_settings.material`) |
| Pagamento **recusado** (cartão) | `payment_status = rejected` | E | ❌ | P1 | Hoje a cliente só vê na tela, se ainda estiver nela. Texto sem culpa e sem urgência: "não deu certo, o pedido continua reservado, dá para tentar de novo em `/pedido/:id`" |
| PIX **expirado** | `payment_status = expired` | E+W | ❌ | P1 | O webhook aplica a transição e **não avisa ninguém**. É a perda de venda mais silenciosa da loja. Um aviso só, sem contagem regressiva, com o link para gerar PIX novo |
| Pedido **cancelado** (pela loja ou pela cliente) | `status = cancelled` | E | ❌ | P1 | Hoje o cancelamento é mudo. Precisa dizer **o que acontece com o material**, se já foi enviado (devolução) — é a pergunta que a cliente vai fazer |
| **Estorno** | `payment_status = refunded` | E | ❌ | P1 | Prazo de estorno é do MP/emissor; o e-mail informa que foi solicitado e o prazo típico, sem prometer data |

### 2.3 Jornada da cliente — material afetivo

É o trecho mais delicado da loja, e o único em que **o tom é requisito**, não estilo. Vale a regra de
`renderMaterialReceived`: sem exclamação, sem "chegou!", sem comemoração. Vocabulário de referência em
`../landing-pages/src/content/categorias/uma-estrelinha.json`.

| Evento | Estado que prova | Canal | Hoje | Prio | Observação |
| --- | --- | --- | --- | --- | --- |
| Orientação de envio do material | `paid_at` ∧ `material_status = aguardando_material` | E+W | ⚠️ parcial (é o `order_paid` errado acima) | P1 | Pode ser a bifurcação do `order_paid` **ou** um tipo próprio `material_instructions`. Recomendação: **tipo próprio**, porque a Adri vai querer editar esse texto separado do de pagamento, e porque a pré-condição é diferente |
| Cliente informou o rastreio do material | `material_status = material_enviado` (RPC `set_material_tracking`) | E | ❌ | P2 | Confirma que a loja **registrou** e vai acompanhar. Tom calmo. Hoje a cliente informa e não recebe nada de volta |
| Material recebido | `material_status = material_recebido` | E+W | ✅ `material_received` | P0 | Já tem o tom certo; vira modelo para os demais desta seção |
| Lembrete de material pendente (X dias) | `aguardando_material` ∧ `queueAge.tier = stale` | W (E?) | ❌ **de propósito** | P3 | **Continua manual** (botão "cobrar material"). Se um dia for automático, é **opt-in da dona por pedido**, nunca régua global, e o texto é o de `chargeMaterialText` — que já existe e já tem o tom |
| Entrou em produção | `material_status = em_producao` | E | ❌ | P2 | Para pedido **com** material é o momento em que o "excedente volta com a joia" faz sentido ser dito; para pedido sem material, é o `order_paid` |

### 2.4 Jornada da cliente — envio e entrega

| Evento | Estado que prova | Canal | Hoje | Prio | Observação |
| --- | --- | --- | --- | --- | --- |
| Pedido postado com rastreio | `status = shipped` ∧ `tracking_code` | E+W | ✅ `order_shipped` | P0 | Código como texto selecionável, sem link de transportadora (texto livre) |
| Pedido **entregue** | `status = delivered` | E | ❌ | P2 | Hoje `delivered` só muda à mão. A action `tracking` da `melhor-envio` existe mas **não atualiza `orders.status`** — automatizar a entrega é feature própria (polling ou webhook do Melhor Envio) e fica **fora** desta |
| Pós-entrega: cuidados com a joia | `delivered` + N dias | E | ❌ | P3 | Único e-mail "de conteúdo" que faz sentido nesta loja. Sem venda cruzada |

### 2.5 Relacionamento (fora do pedido)

| Evento | Estado que prova | Canal | Hoje | Prio | Observação |
| --- | --- | --- | --- | --- | --- |
| Carrinho abandonado | `abandoned_carts.status = abandoned` ∧ `consent` ∧ `reminder_sent_at is null` | E | ❌ (D3: interruptor sem motor) | P3 | **Decisão da dona antes de código.** Num negócio memorial, "você esqueceu as cinzas no carrinho" é ofensa, não lembrete. Se for feito: **um** lembrete só, tom de "ficamos à disposição", só com `consent = true` do checkout (o checkbox já existe e já diz "lembretes e novidades"). Até a decisão: **apagar o interruptor da tela** — botão que não faz nada é pior que ausência |
| Newsletter | inscrição confirmada (double opt-in) | E | ❌ (D4) | P3 | Precisa de tabela, double opt-in e descadastro (LGPD). **Não é transacional** — motor e reputação separados (Resend Audiences/Broadcasts, ou remover a faixa até haver lista). Fora do escopo desta feature; entra aqui só para a copy parar de prometer |

### 2.6 Operação — avisos para a Adri

Hoje **nenhum** existe. A descoberta é entrar no painel.

| Evento | Estado que prova | Canal | Prio | Observação |
| --- | --- | --- | --- | --- |
| Pedido pago | `paid_at` | E+W | P1 | É o que faz a loja "existir" fora do painel. Um WhatsApp para o número da dona é o canal natural — ela já vive nele |
| Cliente informou rastreio do material | `material_enviado` | W | P2 | Para ela saber que tem encomenda chegando |
| E-mail/WhatsApp para a cliente **falhou** | `order_notifications.status = failed` | E | P2 | Hoje só aparece no histórico do pedido; um aviso evita a cliente ficar sem saber por dias |
| Provedor de WhatsApp **desconectou** | webhook `connection.update` do provedor | E | P1 (se WhatsApp for feito) | Sem isso a instância cai e toda notificação passa a falhar em silêncio — é o modo de falha nº 1 de qualquer solução baseada em sessão |
| Resumo diário (pedidos, fila de material, falhas) | cron | E | P3 | Só se a dona quiser. Digest é o oposto de urgência |

**Resumo do levantamento:** 4 existem · **8 lacunas P1/P2** na jornada do pedido · 3 decisões da
dona (P3) · 1 conteúdo errado no que já existe (`order_paid` com material).

---

## 3. E-mails configuráveis pelo painel

### 3.1 O que é editável e o que é fixo — a decisão que evita o segundo desenho

O molde é o que a feature `25` fez com a home e a `39` com o menu: **o painel não desenha o e-mail,
ele edita o texto e vê a loja renderizar**. Estrutura (casca, tabela de itens, totais, endereço, CTA,
caixa de destaque) continua em código, em [`layout.ts`](../../../supabase/functions/send-email/layout.ts) —
um só dono, testado, escapado. O painel edita **só o que é redação**:

| Campo | Editável | Por quê |
| --- | --- | --- |
| `enabled` (por evento × canal) | ✅ | É o interruptor que a `37` mostrou que precisa existir — e nascer **ligado** para os quatro que já saem hoje, senão o deploy desliga e-mail que funciona |
| `subject` | ✅ | |
| `heading` (título) | ✅ | |
| `lead` (parágrafo de abertura) | ✅ | É onde o tom mora |
| `extra[]` (linhas da versão texto / observações) | ✅ | |
| `cta_label` | ✅ | O destino **não**: é sempre `/conta` (o e-mail é lido sem sessão; `/pedido/:id` daria "não encontrado") |
| itens, totais, endereço, rastreio, casca, cores | ❌ | Estrutura. Dado do pedido não se redige |
| destinatário, remetente | ❌ | Vêm do banco e do secret (`EML-01`). O painel **nunca** escolhe para quem manda |

**Variáveis** no texto, resolvidas no servidor: `{{primeiro_nome}}`, `{{numero_pedido}}`,
`{{rastreio}}`, `{{transportadora}}`, `{{prazo_pix}}`, `{{link_guia_material}}`,
`{{endereco_atelie}}`. Vocabulário **fechado** em `@estrelinha/core/notifications` — variável
desconhecida é recusa ao salvar, não `undefined` no e-mail da cliente.

### 3.2 Onde mora o dado

Duas opções, e a escolha é entre "poucos textos" e "muitos textos com histórico":

| | A · `store_settings.notifications` (JSONB) | B · tabela `notification_templates` |
| --- | --- | --- |
| Molde existente | `37` (frete grátis) e `39` (menu): `value ||` aditivo, `NOT value ?` idempotente | `home_sections`, `faqs`: RLS por `has_role`, `grant` sem `anon` |
| Leitura pela function | `select value from store_settings where key = 'notifications'` — 1 leitura, service role | 1 leitura filtrada por `(event, channel)` |
| Versão anterior / "desfazer" | não | possível (`updated_at`, ou linha por versão) |
| Quantidade prevista | ~12 eventos × 2 canais × 5 campos ≈ 120 strings | idem, em linhas |
| Guarda de disco | `storeSettingsDefaults.test.ts` já compara defaults TS × migration | novo guarda lendo a migration |

**Recomendação: A**, pelo mesmo motivo que a `39` não criou `menu_order`: um JSONB por chave já é o
padrão de toda configuração da loja, os hooks `useXSettings()` já existem, e 120 strings não pedem
tabela. Migrar para B quando (se) houver pedido de versão anterior. **Os defaults em TypeScript são a
fonte**, e a migration semeia os mesmos textos — `storeSettingsDefaults.test.ts` ganha o bloco.

### 3.3 A prévia É a function

O painel **não** renderiza e-mail. Ele chama `send-email?action=preview` com `{ type, channel,
draft }` (admin, `has_role`) e recebe `{ subject, html, text }` renderizados **pela mesma função** que
envia — sobre um pedido de exemplo fixo (`sample.ts`, sem dado de cliente real) **ou** sobre um
`order_id` escolhido. O HTML entra num `<iframe sandbox srcdoc>`, em 390 px e em 600 px. É o
`MenuLivePreview` da `39` para e-mail: **um** renderizador, e o que a dona vê é o que a cliente recebe.

O rascunho (`draft`) vai no corpo justamente para a prévia refletir o que ainda não foi salvo — e
**nunca é persistido pela function** (a porta `preview` só lê).

### 3.4 Guarda de tom, em `core`

A regra de produto do `CLAUDE.md` — nada de urgência fabricada, emoji comemorativo, contagem
regressiva — hoje vive em comentário e em `orderList.test.ts` (que recusa urgência no texto de
cobrança). Ao virar texto editável, ela precisa virar **código que os dois lados chamam**:

```
notificationCopyRefusal(text, { channel, event }): string | null
```

- devolve **`string | null`** — o formato de `menuTargetRefusal`, porque `strictNullChecks` está
  `false` e união por booleano não estreita;
- recusa: `últimas unidades`, `corra`, `só hoje`, `restam`, `⏰`, `🎉` e a família de emoji
  festivo, `!!`, caixa alta longa; e, para os eventos de material, **qualquer exclamação**;
- **o painel chama ao salvar** (mostra o motivo inline) **e a function chama ao renderizar**
  (recusa 422 e loga) — duas chamadas da mesma função, não duas regras. Um texto que passou pelo
  painel e reprova na function é bug, e o log diz qual.

O guarda de disco correspondente (`notificationCopyGuard.test.ts`) assere que os **defaults**
semeados passam pela régua — para a migration não nascer com o que a régua proíbe.

### 3.5 A tabela de idempotência ganha canal

`order_emails (order_id, type)` vira `order_notifications (order_id, event, channel)`, com a mesma
RPC de reivindicação atômica (`claim_order_notification`) e a mesma razão de ser (`AD-006`: o índice
único não parcial, o `on conflict … where status <> 'sent'` que `supabase-js` não expressa).

Regra de deploy, aprendida na `39`: **`db push` e Vercel rodam em paralelo**, e por alguns minutos a
function antiga ainda escreve em `order_emails`. Então a migration:

1. cria `order_notifications` e copia as linhas (`channel = 'email'`);
2. **não apaga** `order_emails` — transforma numa **view** `security_invoker` sobre a nova, com
   `channel = 'email'`, e uma RPC `claim_order_email` que delega para a nova. A janela fecha sem
   perda;
3. a remoção da view fica para uma migration posterior, quando nenhum deploy vivo a lê.

O guarda `orderNotificationsSchema.test.ts` lê a migration e reprova: `grant` a `anon`; policy sem
`has_role`; índice virar parcial; a view perder `security_invoker`; o vocabulário de `event` divergir
de `NOTIFICATION_EVENTS` do TypeScript (que também fecha o D2: `Record<NotificationEvent, string>`
não compila com rótulo faltando).

---

## 4. WhatsApp — opções e recomendação

### 4.1 O que a Meta exige de quem manda mensagem de negócio

Vale para **qualquer** caminho oficial, e é o que separa as opções:

- **Opt-in explícito** da cliente para receber mensagens do negócio no WhatsApp — coletado pela loja,
  registrado, revogável. O checkbox do checkout hoje diz *"por e-mail"*; precisa de **um segundo**
  checkbox, específico ("também pelo WhatsApp, no número acima"), gravado como snapshot no pedido
  (`orders.whatsapp_opt_in`), pelo mesmo motivo de `customer_phone` (`35`): o consentimento é do
  momento da compra.
- **Mensagem iniciada pelo negócio = template aprovado** pela Meta, em uma de três categorias:
  *utility* (transacional: pedido, pagamento, envio — é o nosso caso), *authentication*, *marketing*.
  Texto livre só é permitido **dentro de 24 h** depois da última mensagem **da cliente** (janela de
  atendimento).
- **Preço por mensagem** (desde 2025-07-01, substituiu o "por conversa"). Ordem de grandeza para o
  Brasil, **a conferir na tabela vigente da Meta antes de orçar**: *utility* ≈ US$ 0,008 ·
  *authentication* ≈ US$ 0,03 · *marketing* ≈ US$ 0,06. Conversa iniciada pela cliente é **gratuita**,
  e template *utility* enviado **dentro** da janela de 24 h também. Para o volume da loja (dezenas de
  pedidos/mês × ~4 mensagens) o custo é **irrelevante** — a decisão não é de preço.
- **Número**: uma linha só pode estar em um lugar. O número que hoje está no app WhatsApp Business
  da Adri **ou** migra para a Cloud API (e sai do app) **ou** usa o recurso de **coexistência**
  (Cloud API + app no mesmo número, lançado pela Meta em 2024–25, com disponibilidade por região e
  por BSP) — **a conferir para o Brasil e para o parceiro escolhido**. Alternativa sem risco: um
  **segundo número** só para notificações, com o texto dizendo "para conversar, chame a Adri em …".

### 4.2 As opções

| | **A · Evolution API + Baileys** (o que a conta atual provavelmente usa) | **B · Evolution API como gateway da Cloud API** | **C · Cloud API direto (Meta)** | **D · BSP** (360dialog, Twilio, Zenvia, Take Blip, Gupshup) |
| --- | --- | --- | --- | --- |
| Oficial? | **Não.** Baileys emula o WhatsApp Web; viola os termos de uso | Sim (a Evolution só intermedeia) | Sim | Sim |
| Risco de **banimento do número** | **Real**, e recai sobre o número que as clientes conhecem. Mensagem automática de negócio para quem não salvou o contato é exatamente o padrão que o WhatsApp mira | nenhum além do normal | nenhum além do normal | idem |
| Templates aprovados | não precisa (texto livre) — e é por isso que é de graça | precisa | precisa | precisa; alguns BSPs ajudam na aprovação |
| Opt-in | não é cobrado por ninguém — **mas a LGPD cobra igual** | obrigatório | obrigatório | obrigatório |
| Infra a manter | **instância com sessão viva** (QR code), Postgres, Redis, Docker. Sessão cai → tudo falha em silêncio até alguém reparear | a instância continua existindo, mas sem sessão frágil | **nenhuma**: a edge function faz `POST graph.facebook.com/…/messages` como faz com `api.resend.com` | nenhuma; painel do parceiro |
| Custo mensal | hospedagem da instância (ou plano cloud da Evolution) | hospedagem + Meta por mensagem | **só a Meta por mensagem** | assinatura (360dialog ≈ € 49/mês flat; Twilio ≈ US$ 0,005/msg de markup) + Meta |
| Webhooks de entrega/leitura/resposta | sim (formato Evolution) | sim (formato Evolution) | sim (formato Meta) | sim (formato do BSP) |
| Onboarding | pareia o QR e sai mandando | Meta Business verificada + número + templates | idem | idem, guiado |
| Esforço no repositório | pequeno | pequeno | pequeno-médio (auth de app Meta, templates) | pequeno |
| Encaixe com o `CLAUDE.md` | conflita com **"frescor acima de cache e risco"**: falha silenciosa é o pior modo de falha do projeto | ok | **melhor**: mesmo padrão da `send-email`, zero componente novo para operar | ok, mas adiciona um terceiro e uma fatura para resolver o que C resolve |

### 4.3 Recomendação

**C — Cloud API direto**, com **B como caminho de transição** se a conta Evolution já estiver paga e
a Adri quiser a caixa de entrada unificada dela.

Por quê, na ordem que pesa:

1. **O ativo em risco é o número da Adri.** Numa loja em que o WhatsApp é o canal de atendimento e
   de "cobrança" manual, perder o número por banimento é perder o relacionamento com quem está de
   luto. A economia da opção A não paga esse risco.
2. **Falha silenciosa é o modo de falha que este projeto mais paga para evitar** (frete por meses,
   `PGRST204`, o interruptor D3). Uma sessão Baileys que cai não avisa; a Cloud API responde HTTP e
   pronto — e a edge function já sabe classificar HTTP (`classifyResendFailure` vira
   `classifyProviderFailure`).
3. **Zero infraestrutura nova.** A `send-email` é o molde exato: secret + `fetch` + `AbortController`
   + `try/catch` + tabela de idempotência. Trocar `api.resend.com` por `graph.facebook.com` é a
   mesma forma.
4. **Templates aprovados são restrição bem-vinda aqui.** O tom memorial precisa ser fechado antes de
   sair; a aprovação da Meta força exatamente isso.

**Quando A é aceitável:** um **piloto** de duas semanas, com um **número secundário** (nunca o da
Adri), só para a Adri ver as mensagens chegando e ajustar textos — com a instância monitorada por
webhook `connection.update` e o piloto encerrado por data. Não como produção.

**O que a Evolution API dá, se ficar:** a v2 suporta as duas integrações (`WHATSAPP-BAILEYS` e
`WHATSAPP-BUSINESS`, esta última sendo a Cloud API). Ou seja, a **interface de provedor** proposta
em 4.4 permite começar por B e terminar em C sem tocar na loja — só no adaptador.

### 4.4 Arquitetura proposta

```
apps/backoffice ──(admin, has_role)──► send-notification?action=send|preview|test
mercado-pago ────(in-process)────────► sendNotification({ orderId, event })       ← AD-005, sem hop HTTP
                                              │
                                              ├─ relê o pedido, confere pré-condição do evento (AD-007)
                                              ├─ lê store_settings.notifications (enabled, textos)
                                              ├─ para cada canal habilitado ∧ opt-in da cliente:
                                              │     claim_order_notification(order, event, channel)   ← AD-006
                                              │     provider.send(rendered)  →  finish(...)
                                              │         email:    Resend  (o que existe)
                                              │         whatsapp: CloudApiProvider | EvolutionProvider  ← uma interface, um adaptador ativo
                                              └─ nunca lança; falha não toca estado (AD-008)
```

- **`send-email` é renomeada, não duplicada.** Duas functions com a mesma máquina de reivindicação
  seriam o defeito 01. A `mercado-pago` passa a importar `../send-notification/sender.ts`.
- **Provedor de WhatsApp é `interface`** em `core/notifications/providers/`: `send(to, template,
  vars)`, `classifyFailure(status, body)`, `parseWebhook(body)`. O ativo vem do secret
  `WHATSAPP_PROVIDER = cloud | evolution`. Trocar de provedor é trocar env, e a spec pede um teste
  que instancia os dois adaptadores contra o mesmo caso.
- **Templates da Cloud API são referenciados por nome + idioma**, e o texto editável do painel vira
  os **parâmetros** (`{{1}}`, `{{2}}`…) — porque o corpo do template é o que a Meta aprovou, e o
  painel não pode reescrevê-lo. Logo, para WhatsApp o painel edita **menos** que para e-mail
  (`enabled`, e os parâmetros livres do template); a spec precisa deixar isso explícito para a Adri
  não esperar edição livre.
- **Webhook de entrega** (`delivered`, `read`, `failed`) grava `order_notifications.delivery_status`
  — é a única forma de saber que a mensagem *chegou*, e é o que o histórico do pedido mostra.
- **Respostas da cliente** ao número de notificação: **fora de escopo** nesta feature. Se o número
  for o da Adri (coexistência), ela responde do app; se for secundário, o template diz onde chamar.

### 4.5 O que precisa ser verdade antes de codificar o WhatsApp

| Pré-requisito | Quem | Estado |
| --- | --- | --- |
| Meta Business da Uma Estrelinha verificada | Adri | a conferir |
| Decisão do número (migrar · coexistência · secundário) | Adri | **aberta** — é a decisão de produto desta parte |
| Conta Evolution: qual integração está ativa hoje (Baileys ou Cloud) e onde está hospedada | Rafael | a conferir |
| Templates *utility* redigidos no tom da loja e submetidos (aprovação leva de minutos a ~24 h) | Adri + Rafael | não iniciado |
| Segundo checkbox de opt-in no checkout + `orders.whatsapp_opt_in` | código | não iniciado |
| Política de privacidade (`/politicas`) menciona WhatsApp como canal de notificação | Adri | a conferir |

---

## 5. Plano de implantação

Quatro fases, cada uma com "pronto quando" **medido**, não afirmado. As fases 1 e 2 são a feature
`42`; a 3 pode ser a `43`. A regra de commits do projeto vale (um lote por fase, não por task).

### Fase 0 — Consertar a base (antes de qualquer coisa nova)

| # | O quê | Pronto quando |
| --- | --- | --- |
| 0.1 | **D1**: trocar `send.` por `loja.umaestrelinha.com.br` em `config.toml`, `.env.example`, `supabase/CLAUDE.md`; conferir o SMTP do auth **no painel do hospedado** e ligá-lo com `acesso@loja.umaestrelinha.com.br` | probe `POST /emails` com `from acesso@…` devolve 200; pedir código na **loja publicada** e ele chegar |
| 0.2 | **D2**: `EMAIL_LABELS` vira `Record<EmailType, string>` com os quatro tipos reais | `tsc` recusa rótulo faltando; teste em `orderDetail.test.ts` renderiza os quatro |
| 0.3 | **D3**: remover da aba Carrinho o interruptor, as horas e o cupom **até** existir motor (ou a decisão da dona em 2.5). Os campos ficam no JSONB (aditivo), só saem da tela | `AdminSettingsPage.test.tsx` assere ausência; sensor: reinjetar o campo reprova |
| 0.4 | **D4**: a copy da newsletter para de prometer ("Anotado. Quando houver novidades, escrevemos.") ou a faixa sai do catálogo de blocos até haver lista | `copyInstitucional.test.tsx` cobre a frase |
| 0.5 | **Rodar o roteiro manual de 8 passos** do `sender.ts` uma vez, ponta a ponta, contra o sandbox do MP — e registrar em `validation.md` | `order_emails` com linhas `sent` para `order_received` e `order_paid`; e-mail visto no Gmail do celular |

### Fase 1 — As notificações que faltam, no motor que existe (só e-mail)

| # | O quê | Pronto quando |
| --- | --- | --- |
| 1.1 | Migration: `order_notifications` + view de compatibilidade `order_emails` + RPCs (3.5) | `orderNotificationsSchema.test.ts` verde com sensores; `db push` local sobre banco com dados não perde linha |
| 1.2 | `NOTIFICATION_EVENTS` em `@estrelinha/core/notifications`, com pré-condição por evento (a função `preconditionFailure` move para `core`, para o backoffice mostrar "por que não saiu" **sem** chamar a function) | `Record<NotificationEvent, …>` fecha o vocabulário; teste de disco compara com o `check` da migration |
| 1.3 | Eventos novos: `payment_rejected`, `pix_expired`, `order_cancelled`, `payment_refunded`, `material_instructions` (bifurcando o `order_paid`), `material_tracking_registered`, `in_production` | cada um com template, pré-condição, disparo e teste; **nenhum** com exclamação na seção de material |
| 1.4 | Disparos: webhook do MP para `rejected/expired/refunded`; backoffice para `cancelled`, `em_producao`; RPC `set_material_tracking` → `material_tracking_registered` (a loja chama a porta HTTP? **não** — a cliente não é admin. Solução: trigger no banco enfileira em `order_notifications` com `status = pending` e a `mercado-pago`/um cron drena? **Decisão de design para a spec**; o caminho mais simples é a loja chamar `send-notification?action=notify-self` autenticada como a **dona do pedido**, com `has_role` substituído por "é o `customer_id` do pedido") | cada disparo com teste; o de `set_material_tracking` com probe HTTP |
| 1.5 | Avisos para a Adri: `owner_order_paid` para o e-mail de `store_settings.general.email` | sai junto com o `order_paid`, idempotente por `(order, event, channel)` com `event` próprio |

### Fase 2 — O painel

| # | O quê | Pronto quando |
| --- | --- | --- |
| 2.1 | `store_settings.notifications`: defaults em TS (= textos atuais), migration aditiva e idempotente, `useNotificationSettings()` | `storeSettingsDefaults.test.ts` compara TS × SQL; os quatro que existem nascem **ligados** |
| 2.2 | `notificationCopyRefusal` em `core` + guarda de disco sobre os defaults | sensor: default com "corra" reprova |
| 2.3 | `send-notification?action=preview` (admin) sobre pedido de exemplo ou `order_id` | `handlers.test.ts`: preview não grava nada, não reivindica, recusa não-admin |
| 2.4 | Aba **Notificações** em `/admin/configuracoes`: lista de eventos × canal, interruptor, campos de texto com variáveis, recusa inline, **prévia em iframe** 390/600 | teste de componente para forma; **prova em navegador em 390×844** (jsdom não mede iframe) |
| 2.5 | Histórico do pedido mostra canal e `delivery_status`; reenvio por canal | `orderDetail.test.ts` |

### Fase 3 — WhatsApp (feature `43`, condicionada às decisões de 4.5)

| # | O quê | Pronto quando |
| --- | --- | --- |
| 3.1 | Segundo opt-in no checkout, `orders.whatsapp_opt_in` (snapshot), política atualizada | probe HTTP mostra a coluna gravada (`AD-012`) |
| 3.2 | `WhatsAppProvider` interface + `CloudApiProvider` (+ `EvolutionProvider` se B); secrets `WHATSAPP_PROVIDER`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`; conferência no `supabase-deploy.yml` | teste com os dois adaptadores no mesmo caso; secrets na lista do CI |
| 3.3 | Templates *utility* aprovados para: `order_received`, `order_paid`, `material_instructions`, `material_received`, `order_shipped`, `pix_expired`, `owner_order_paid` | os 7 com status *approved* no Business Manager |
| 3.4 | Webhook de entrega → `delivery_status`; alerta de desconexão/erro de token para a Adri (e-mail) | reentrega do webhook é no-op; token inválido gera **um** aviso |
| 3.5 | Piloto: 10 pedidos reais com a Adri lendo cada mensagem antes de ligar o interruptor para todos | `validation.md` com autor ≠ verificador |

### O que fica de fora, e por quê

- **Carrinho abandonado automático** e **newsletter**: dependem de decisão da dona (2.5) e são de
  outra natureza (marketing, reputação de envio separada). Entram no `BACKLOG.md` como `BL-030` e
  `BL-031` com as perguntas que precisam de resposta.
- **Entrega automática** (`delivered` pelo rastreio do Melhor Envio): feature própria.
- **Código de acesso por WhatsApp**: não.
- **Chat/caixa de entrada de respostas** no painel: não. A Adri responde do próprio WhatsApp.

---

## 6. O que espera decisão da dona, não código

| Pergunta | Opções | Consequência |
| --- | --- | --- |
| Lembrete de carrinho abandonado: existe? | não · um lembrete só, opt-in, tom de disponibilidade | define se o D3 é remoção ou motor |
| Newsletter: existe lista? | não (tirar a faixa) · sim (Resend Audiences + double opt-in) | define o D4 |
| Número do WhatsApp para notificações | o da Adri (coexistência) · secundário | define se as clientes respondem para ela ou leem "chame em …" |
| Evolution API: manter? | manter como gateway (B) · desligar e ir direto (C) | define um secret e um adaptador |
| Lembrete automático de material pendente | nunca · opt-in por pedido | hoje é "nunca"; o texto já existe se mudar |
| Aviso de "pedido pago" para ela: e-mail, WhatsApp ou os dois | — | define `owner_*` |

---

## 7. Riscos

| Risco | Mitigação |
| --- | --- |
| Texto editável introduz urgência/festa sem ninguém notar | `notificationCopyRefusal` nos dois lados (3.4) |
| Interruptor novo nasce desligado e apaga e-mail que hoje sai | defaults **ligados** para os 4 existentes; `storeSettingsDefaults.test.ts` assere |
| Janela de deploy quebra a idempotência (`order_emails` × `order_notifications`) | view de compatibilidade + RPC delegando (3.5) |
| Cliente sem opt-in recebe WhatsApp | opt-in é **pré-condição** relida na function, como `paid_at` é para `order_paid` |
| Token da Cloud API vence / instância Evolution cai | webhook + alerta para a dona; `delivery_status` no histórico; **nunca** retry em laço dentro da requisição (`RSD-02`) |
| Template aprovado diverge do texto que a Adri editou no painel | para WhatsApp o painel edita **parâmetros**, não o corpo — a spec deixa explícito |
| Baseline de testes envelhece | medir por workspace ao fechar cada fase, exit code capturado, e atualizar o `CLAUDE.md` |

---

## 8. Referências internas

- `AD-005` (duas portas, um motor) · `AD-006` (idempotência é do banco) · `AD-007` (contrato dirigido
  por estado) · `AD-008` (falha de e-mail nunca altera pagamento) — em [`STATE.md`](../../STATE.md)
- Feature `10` (arquivo Nanita): [`spec.md`](../../archive/nanita/features/10-emails-transacionais/spec.md)
  — a origem do motor atual, com os requisitos `EML-*`, `TRG-*`, `RSD-*`
- Feature `22`, `MAT-09`/`MAT-11`: o e-mail de material e a RPC de rastreio
- Feature `25` e `39`: "a prévia É a loja" — o molde da aba de prévia
- Feature `37`: interruptor que nasce desligado e o custo disso (`AD-027`)
- `BL-015`: por que nenhuma notificação pode **nomear** o material a partir de `material_kinds`
