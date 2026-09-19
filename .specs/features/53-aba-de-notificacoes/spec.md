# Aba Notificações — os 15 eventos do motor ficam alcançáveis

**Antecedente**: a feature [`42`](../42-notificacoes-email-e-whatsapp/spec.md) entregou o motor inteiro
(`send-notification`, `@estrelinha/core/notifications`) mas nunca a Phase 2 dela — `tasks.md:164`,
T19–T23, todos em aberto. Esta spec é essa Phase 2, registrada como dívida em
[`BL-033`](../../BACKLOG.md#bl-033--a-aba-notificações-nunca-foi-construída-e-11-dos-15-eventos-são-inalcançáveis)
e agora promovida a feature própria. **Os requisitos PNL-01..PNL-10 e PDC-01 do design aprovado da
`42` são a base desta spec** — não é redesenho: são as mesmas acceptance criteria, com ID novo porque
o rastreamento é desta feature, e com três ajustes que a medição de 2026-09-16/17 e 2026-09-19 trouxe
(ver *Assumptions & Open Questions*).

## Problem Statement

O motor de notificação dispara por estado e é idempotente — mas **11 dos 15 eventos nascem
desligados e não existe tela nenhuma para ligá-los.** `AdminSettingsPage.tsx` tem sete abas e nenhuma
se chama Notificações; nenhum arquivo dos dois apps lê ou grava `store_settings.notifications`; a
porta `?action=preview`, construída especificamente para esta tela, não tem um único chamador.

Consequência medida: cancelar um pedido não avisa a cliente, marcar como entregue não avisa, "em
produção" não avisa, a dona nunca é avisada de venda paga — e **o pior caso**: quem paga um pedido com
material afetivo (cinzas, leite materno, cabelo de quem morreu) não recebe e-mail nenhum, porque
`order_paid` se recusa nesse estado e `material_instructions` — o evento que deveria substituí-lo —
está desligado.

Duas precondições operacionais, medidas em produção em 2026-09-19, tornam "só ligar tudo" uma
resposta ruim:

1. **`store_settings.material` não existe como chave** (9 chaves no banco, sem ela). Ligar
   `material_instructions` sem a Adri preencher o endereço primeiro entrega um e-mail com
   `{{endereco_atelie}}` em branco — pior que não mandar nada, no campo cujo propósito é dizer para
   onde postar as cinzas.
2. **`ADMIN_PUBLIC_URL` não é secret de produção.** `{{link_pedido_admin}}` sairia
   `http://localhost:8083` nos dois e-mails "para você" (`owner_order_paid`,
   `owner_material_incoming`).

## Goals

- [ ] **Os 15 eventos ficam alcançáveis**: a Adri lê, edita, liga/desliga e vê a prévia de cada um em
      `/admin/configuracoes` → Notificações.
- [ ] **A prévia é o mesmo renderizador que envia** (`AD-019`/`PNL-05`) — `?action=preview`, nunca um
      segundo desenho de e-mail dentro do painel.
- [ ] **Nenhuma regra de tom, variável ou limite é reescrita no painel** — o painel consome
      `@estrelinha/core/notifications` e a function; recusa ao salvar é a mesma recusa que a function
      já dá ao renderizar.
- [ ] **As duas precondições medidas não produzem e-mail quebrado em silêncio**: ligar
      `material_instructions` com endereço vazio é recusado ao salvar; os dois eventos "para você"
      mostram aviso quando `general.email` ou o link do painel não estão prontos.
- [ ] **Prova em navegador em 390×844 e 1440**, feita nesta sessão (há `playwright-cli` disponível) —
      não fica registrada como dívida.

## Out of Scope

| Item | Motivo |
| --- | --- |
| **Canal WhatsApp** (coluna, campos, interruptor) | Feature `43`, decisão já tomada na `42`. O `channel` já existe na tabela e no motor; esta feature não mostra nenhuma coluna de WhatsApp |
| **Rotina que dispara `post_delivery_care`** | `BL-037`, aberto, feature própria — depende de um `pg_cron` que não existe. O evento **fica visível e editável** nesta aba (é `PDC-01` do design da `42`, e o vocabulário já o inclui), só continua sem quem o dispare automaticamente. O botão "reenviar" do histórico do pedido continua sendo o único disparo manual possível hoje |
| **Reformular o histórico do pedido / botão de reenvio** | `PNL-08` já está implementado (`AdminOrderPage.tsx` → `OrderHistory`, `onResendEmail` → `resendNotification`). Esta feature não mexe nele, só confere que continua funcionando com os eventos novos |
| **Editar a estrutura do e-mail** (casca, tabela de itens, totais, endereço, cores, destino do CTA) | Código com um dono (`render/layout.ts`). O painel edita **redação**: `subject`, `heading`, `lead`, `extra[]`, `cta_label` |
| **Preencher o endereço do ateliê ou configurar `ADMIN_PUBLIC_URL` em produção** | Ação da dona / operação, não código. Esta feature torna a lacuna **visível e não-destrutiva**; não a fecha sozinha |
| **`O3`/`O4` da feature `52`** (SMTP e templates do auth no dashboard; apagar a function zumbi `send-email`) | Pendências de outra feature, sem relação com o motor de notificação transacional |
| **Lembrete automático de carrinho abandonado, geração de texto por IA** | `BL-030`, `BL-001`/`BL-014` — fora do vocabulário de `NOTIFICATION_EVENTS` |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Agrupamento visual dos 15 eventos na aba | **Três seções, DERIVADAS de dados que já existem em `core`** — "Pedido e pagamento" (audiência `customer`, não-material), "Material" (`isMaterialEvent`), "Avisos para você" (audiência `owner`); dentro de cada seção, a ordem de `NOTIFICATION_EVENTS` é preservada | O design original da `42` (T22) propunha quatro seções (Compra · Material · Envio e entrega · Avisos para você), mas "Compra" × "Envio e entrega" não corresponde a nenhuma classificação hoje exportada por `core` — inventar essa quarta categoria seria um segundo dono da mesma informação (o "defeito 01" deste projeto). Três seções cobrem 100% dos eventos usando **só** `EVENT_AUDIENCE` e `MATERIAL_EVENTS`, que já são a fonte única. A ordem global continua sendo a de `NOTIFICATION_EVENTS` (nunca diverge do array que o guarda de schema compara com o `check` do banco) | y (decisão do agente, com razão registrada — ver rationale) |
| Endereço do ateliê vazio + `material_instructions` ligado | **Bloqueia o salvamento** (recusa nomeando o campo, com atalho para a aba Material) — mesmo molde de `FRG-12` (frete grátis "ligado, a partir de R$ 0" já é recusado hoje) | A dona **controla** este campo na mesma sessão do painel (aba Material já existe); bloquear é acionável e barato, e `BL-033` nomeia esta exata combinação como o pior caso medido. Diferente do caso do link do painel, abaixo, que ela não controla por essa tela | y |
| `ADMIN_PUBLIC_URL` não parece uma URL de produção + eventos "para você" | **Avisa, não bloqueia** — banner inline nos cards `owner_order_paid`/`owner_material_incoming` quando `?action=config-check` devolve um `admin_public_url` que não começa com `https://` ou contém `localhost`/`127.0.0.1` | É um secret de servidor, fora do alcance desta tela — bloquear a dona de ligar um evento por causa de uma env que ela não vê seria travar sem dar saída. Mesmo tratamento (aviso, não bloqueio) que a `42` já tinha decidido para `general.email` vazio nos mesmos dois eventos | y |
| Onde mora a checagem do endereço do ateliê | `useMaterialSettings()` (já existe em `@estrelinha/core/hooks`), lida na mesma sessão de settings — **não** uma nova função em `core`, porque tem um consumidor só (esta tela) | Regra de `packages/core/CLAUDE.md`: "não pertence [a `core`]... regra com um consumidor só que ninguém prevê duplicar". Vira candidata a `core` no dia em que uma segunda tela precisar da mesma pergunta | y |
| IDs de requisito desta feature | Prefixo `ABN` (Aba de Notificações), novo — **não** reaproveita `PNL-*`/`PDC-*` da `42`, que ficam com o `Status` atualizado para apontar aqui ao fechar | Evita duas specs vivas reivindicando o mesmo ID pendente; é o padrão que o projeto já usa quando uma feature completa dívida de outra (ex.: `BL-016` fechado com referência cruzada, não reescrita) | y |
| A prova em navegador fica dentro desta feature, não declarada como dívida | **Sim** — há `playwright-cli` disponível nesta sessão, e o custo de declarar dívida (como `32`..`51` tiveram de fazer por falta de navegador) não se aplica aqui | Toda feature recente do painel lista "prova em navegador" como pendência aberta; evitar mais uma entrada nessa fila quando a ferramenta está disponível é a opção prática | y |

**Open questions:** none — todas resolvidas ou registradas acima.

---

## User Stories

### P1: A Adri liga, edita e confere cada e-mail que a loja manda ⭐ MVP

**User Story**: Como dona da loja, quero ver os 15 eventos que a loja pode avisar, ligar os que eu
quero, editar o texto de cada um no meu nome, e ver exatamente como o e-mail chega — sem que uma
configuração incompleta produza um e-mail pior que nenhum — para que toda cliente receba a mensagem
certa no momento certo, e para eu mesma ser avisada de venda paga e de material a caminho.

**Why P1**: É a feature inteira — sem esta tela os 11 eventos ficam desligados para sempre, por
decisão de design da própria `42` (`PNL-06`: onze novos nascem desligados de propósito).

**Acceptance Criteria**:

1. WHEN `/admin/configuracoes` abre THEN SHALL existir a aba **Notificações**, listando os 15 eventos
   de `NOTIFICATION_EVENTS` agrupados em três seções — **Pedido e pagamento**, **Material**, **Avisos
   para você** —, cada evento aparecendo em exatamente uma seção (audiência `owner` → "Avisos para
   você"; `isMaterialEvent(event)` → "Material"; o resto → "Pedido e pagamento") e preservando, dentro
   de cada seção, a ordem de `NOTIFICATION_EVENTS`. Nenhuma coluna ou campo de WhatsApp SHALL existir.
2. WHEN um card de evento é editado THEN os campos editáveis SHALL ser exatamente `subject`,
   `heading`, `lead`, `extra[]` (até 5 linhas) e `cta_label`, cada um com contador de caracteres
   contra `COPY_LIMITS` de `@estrelinha/core/notifications`; itens, totais, endereço, rastreio, casca
   e destino do CTA SHALL NOT ser editáveis.
3. WHEN a Adri digita uma variável (`{{...}}`) THEN ela SHALL ser validada contra
   `NOTIFICATION_VARIABLES` (importado de `core`, nunca copiado); variável fora do vocabulário SHALL
   ser recusada ao tentar salvar, com a mensagem devolvida por `variablesRefusal` (a mesma função que
   a function chama), nomeando a variável.
4. WHEN o texto de um campo contém urgência fabricada, emoji, `!!`, ou (nos eventos de
   `MATERIAL_EVENTS`) `!` THEN a recusa SHALL vir de `notificationCopyRefusal` (importado de `core`,
   nunca reimplementado) e SHALL impedir o salvamento, mostrada inline junto ao campo.
5. WHEN qualquer campo excede `COPY_LIMITS` THEN a recusa SHALL vir de `limitsRefusal` (a mesma função
   de `core`) e SHALL impedir o salvamento.
6. WHEN a Adri clica em "ver prévia" num card THEN o painel SHALL chamar
   `supabase.functions.invoke('send-notification?action=preview', { body: { event, channel: 'email',
   draft, order_id? } })` com o rascunho **não salvo** e renderizar o `html` devolvido, **sem
   recompor**, dentro de um `<iframe sandbox srcdoc>`; a tela SHALL oferecer alternância entre 390px e
   600px de largura, e a versão `text` SHALL aparecer abaixo do iframe.
7. WHEN a prévia é pedida sem escolher um pedido THEN ela SHALL usar o pedido de exemplo
   (`sample: true` na resposta) e a tela SHALL indicar isso visivelmente ("prévia de exemplo"); WHEN a
   Adri informa um `order_id` real THEN a prévia SHALL refletir os dados daquele pedido.
8. WHEN a Adri liga `material_instructions` (ou salva com ele já ligado) E `useMaterialSettings().street`
   estiver vazio THEN o salvamento SHALL ser recusado com uma mensagem que nomeia o campo ausente e
   aponta para a aba Material — mesmo molde de `FRG-12` (frete grátis recusa "ligado, a partir de
   R$ 0" antes de escrever).
9. WHEN os cards `owner_order_paid` ou `owner_material_incoming` são exibidos E
   `useGeneralSettings().email` estiver vazio THEN um aviso inline SHALL aparecer nesses dois cards
   (não bloqueia salvar). WHEN o `admin_public_url` devolvido por
   `?action=config-check` não começar com `https://` ou contiver `localhost`/`127.0.0.1` THEN o mesmo
   tipo de aviso SHALL aparecer nesses dois cards, com texto distinto do de e-mail ausente.
10. WHEN a aba é aberta em viewport de 390×844 THEN nenhum alvo de toque SHALL ficar abaixo de 44px,
    nenhuma pílula ou rótulo SHALL embrulhar de forma ilegível, e `document.body.scrollWidth` SHALL
    ser igual à largura da viewport (sem rolagem horizontal) — provado em navegador real.
11. WHEN nenhum arquivo de `apps/backoffice/**` declara localmente a lista de termos de urgência, o
    regex de emoji, `NOTIFICATION_VARIABLES` ou `COPY_LIMITS` THEN um guarda de disco SHALL confirmar
    isso (zero segunda declaração) — o painel só **importa** essas réguas de `core`.
12. WHEN o card de um evento é fechado sem salvar (a Adri navega para outra aba ou sai da tela) THEN
    as edições não salvas SHALL ser descartadas — sem confirmação bloqueante — e a próxima abertura
    SHALL mostrar o último estado salvo.
13. WHEN a Adri salva as edições de UM evento THEN a escrita em `store_settings` (chave
    `notifications`) SHALL carregar o estado **resolvido de todos os 15 eventos** (via
    `resolveAllEventSettings`, de `core`), com apenas o evento editado alterado — nunca só o evento
    tocado. `useUpdateSettings` faz `upsert` substituindo o valor inteiro da chave; uma escrita
    parcial apagaria silenciosamente a customização dos outros 14 eventos na próxima leitura.

**Independent Test**: editar o `lead` de `material_instructions` com o endereço do ateliê vazio →
salvar é recusado nomeando o campo; preencher o endereço na aba Material, voltar e salvar → sucesso;
clicar "ver prévia" → o iframe mostra o texto editado, sem um segundo desenho de e-mail; digitar
`{{materia}}` (variável inexistente) → recusa nomeando `{{materia}}`; abrir a aba em 390×844 no
navegador → nenhum alvo abaixo de 44px e sem scroll horizontal.

---

## Edge Cases

- WHEN `store_settings.notifications` está ausente no banco (anterior à migration da `42`) THEN a aba
  SHALL exibir os defaults de `DEFAULT_NOTIFICATIONS` de `core` — os quatro legados ligados, os onze
  novos desligados — e salvar SHALL criar a linha.
- WHEN a chamada a `?action=preview` falha (rede, 5xx, 422 de recusa que o painel não capturou antes)
  THEN a tela SHALL mostrar um erro inline no lugar do iframe, nunca um iframe vazio ou quebrado
  silenciosamente.
- WHEN duas abas do navegador editam o mesmo evento ao mesmo tempo THEN a última a salvar vence — sem
  lock (herdado da `42`, registrado e não corrigido aqui).
- WHEN a Adri desliga um evento que já tem histórico de envios THEN os envios já registrados
  permanecem no histórico do pedido; só a próxima ocorrência passa a `skipped:disabled` (comportamento
  do motor, não desta feature — a aba só reflete o estado).
- WHEN `general.email` está preenchido E `admin_public_url` é de produção THEN nenhum aviso SHALL
  aparecer nos cards `owner_*` (estado atual medido em produção, 2026-09-19 — ambos preenchidos).
- WHEN a Adri tenta salvar um evento de material com `!` fora do vocabulário de urgência (ex.: "Chegou
  bem!") THEN a recusa SHALL ser a de exclamação em evento de material, não a de urgência — a ordem
  das réguas em `notificationCopyRefusal` já resolve isso, e o painel não reordena.

---

## Requirement Traceability

| ID | Story | O quê | Phase | Status |
| --- | --- | --- | --- | --- |
| ABN-01 | P1 | aba Notificações, três seções derivadas, ordem de `NOTIFICATION_EVENTS` preservada | Design | Verified |
| ABN-02 | P1 | campos editáveis exatos + contadores contra `COPY_LIMITS` | Design | Verified |
| ABN-03 | P1 | `NOTIFICATION_VARIABLES` importado; recusa ao salvar nomeando a variável | Design | Verified |
| ABN-04 | P1 | `notificationCopyRefusal` importado; bloqueia salvar | Design | Verified |
| ABN-05 | P1 | `limitsRefusal` importado; bloqueia salvar | Design | Verified |
| ABN-06 | P1 | `?action=preview` com rascunho não salvo; iframe sandbox srcdoc; sem recompor HTML; 390/600px + texto | Design | Verified |
| ABN-07 | P1 | prévia por pedido de exemplo (indicado) ou `order_id` real | Design | Verified |
| ABN-08 | P1 | recusa de salvar `material_instructions` ligado com endereço do ateliê vazio | Design | Verified |
| ABN-09 | P1 | aviso inline nos cards `owner_*` — e-mail da dona vazio e/ou link do painel não é de produção | Design | Verified |
| ABN-10 | P1 | prova em navegador 390×844 — alvo ≥44px, sem scroll horizontal | Design | Verified |
| ABN-11 | P1 | guarda de disco: zero segunda declaração das réguas de tom/variável/limite no painel | Design | Verified |
| ABN-12 | P1 | edição não salva é descartada ao sair do card, sem diálogo bloqueante | Design | Verified |
| ABN-13 | P1 | salvar UM evento escreve o estado resolvido dos 15 — nunca uma escrita parcial | Design | Verified |

**ID format:** `ABN-NN` (Aba de Notificações).

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 13 requisitos · 13 mapeados a tasks · 0 não mapeados — todos Verified (validation.md).

---

## Success Criteria

- [ ] Os 15 eventos de `NOTIFICATION_EVENTS` são editáveis, ligáveis e têm prévia funcionando em
      `/admin/configuracoes` → Notificações, sem SQL manual.
- [ ] Ligar `material_instructions` com o endereço do ateliê vazio é impossível pela tela (recusado
      ao salvar), e ligá-lo com o endereço preenchido funciona ponta a ponta (Mailpit mostra o texto
      certo, com o endereço).
- [ ] Zero segundo renderizador de e-mail no painel — guarda de disco (`ABN-11`) e ausência de HTML de
      e-mail hard-coded em `apps/backoffice/**`.
- [ ] Prova em navegador feita e registrada em `validation.md`, não deixada como dívida.
- [ ] Baseline "sem regressão": os cinco workspaces medidos ao fechar, comparados contra
      9742/498 · lint 26/6 · tipos 0·0·0 (entrada desta feature).
