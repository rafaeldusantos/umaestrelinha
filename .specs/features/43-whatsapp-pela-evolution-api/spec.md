# WhatsApp pela Evolution API — segundo canal do motor de notificações

**Antecedente**: [`levantamento.md`](../42-notificacoes-email-e-whatsapp/levantamento.md) (§4,
opções de WhatsApp) e a feature [`42`](../42-notificacoes-email-e-whatsapp/spec.md), que entrega o
motor, a tabela `order_notifications` **já com `channel`**, o laço de canais e a interface
`NotificationProvider`. **Esta feature depende da `42` fechada** e acrescenta: um adaptador, uma
coluna na aba Notificações, um opt-in no checkout e dois webhooks.

**Decisão de provedor**: Evolution API v2, integração `WHATSAPP-BAILEYS`, **no número da Adri**
(`AD-031`, usuário, 2026-09-06).

## Problem Statement

A cliente da Uma Estrelinha vive no WhatsApp — é onde ela já fala com a Adri, e ~90% dos acessos da
loja vêm do celular. O e-mail chega, mas é lido depois; o aviso de "seu material chegou em segurança"
tem outro peso quando aparece na conversa em que a pessoa já chorou. E a própria Adri descobre pedido
novo entrando no painel: o aviso dela também precisa chegar onde ela está.

O caminho escolhido (Baileys) **não é oficial** e recai sobre o número que as clientes conhecem. A
spec existe, em boa parte, para escrever as mitigações como requisito e não como intenção.

## Goals

- [ ] Toda notificação da jornada do pedido que a `42` define **sai também por WhatsApp** para quem
      autorizou, pelo mesmo motor e pela mesma memória.
- [ ] A Adri **liga e edita** o texto de WhatsApp de cada evento no painel, vê a prévia como balão, e
      **manda um teste para o próprio número** antes de ligar.
- [ ] A Adri **é avisada no WhatsApp** de pedido pago e de material a caminho.
- [ ] O painel mostra **se a instância está conectada** e **se cada mensagem chegou**.
- [ ] O risco do Baileys é **contido por requisito**: opt-in, teto por hora, `delay` aleatório, texto
      puro, alerta de desconexão, condição de revisão escrita.
- [ ] Trocar para a Cloud API é **um adaptador novo e um secret**, nada mais.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Caixa de entrada / respostas da cliente no painel | O número é o da Adri: ela responde do próprio app. Coexistência com o app é premissa do Baileys |
| Cloud API oficial (`WHATSAPP-BUSINESS`) | Adaptador futuro; a interface da `42` já o prevê. **Condição de revisão** da `AD-031`: primeira desconexão ou banimento em produção |
| Código de acesso por WhatsApp | Auth fica no GoTrue |
| Verificar se o número tem WhatsApp antes de enviar (`/chat/whatsappNumbers`) | Uma consulta a mais por envio e um padrão a mais para o antisspam; a falha do `sendText` já classifica |
| Mídia (imagem da joia, PDF) | Texto puro por decisão de tom e de antisspam |
| Lembrete de material pendente automático | Continua manual (`chargeMaterialUrl`) — e agora com o mesmo `normalizeBrPhone` |
| Botões / listas interativas | Não existem no Baileys de forma estável; e transformariam aviso em menu |
| `packages/core/src/payment/**` | Intocado; conferido por `git diff --name-only` |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| **Provedor** | Evolution API v2, `WHATSAPP-BAILEYS` | Decisão do usuário (`AD-031`) | **y** |
| **Número pareado** | **O da Adri** | Decisão do usuário, 2026-09-06. A cliente responde na conversa que já conhece; o risco de banimento passa a recair sobre o canal de atendimento, e é isso que a condição de revisão da `AD-031` cobre | **y** |
| **Chave da Evolution** | Secret `EVOLUTION_API_KEY`; a de testes foi passada em chat e **é rotacionada** antes de produção | Regra do `CLAUDE.md` + higiene | y · rotação: n |
| **URL e instância** | `EVOLUTION_API_URL`, `EVOLUTION_INSTANCE` no `.env` da raiz e em `supabase secrets` | O usuário hospeda a instância; os valores não foram informados nesta sessão — **primeiro probe da feature** | n — pendente |
| **Corpo do `sendText`** | Confirmar por **probe contra a instância real** se a versão instalada espera `{ number, text }` ou `{ number, textMessage: { text } }` | A documentação pública mostra as duas em páginas diferentes. Tipo escrito à mão é afirmação (`AD-012`) | n — design |
| **Autenticação do webhook** | Segredo na URL (`?token=<EVOLUTION_WEBHOOK_SECRET>`), comparado no handler; sem/errado → 401 | A Evolution não assina o corpo. Sem isso qualquer um marca entregue ou "derruba" a conexão no painel | y |
| **Teto de envio** | **30 mensagens/hora** por instância, contadas em `order_notifications` | Mitigação de banimento; o volume real cabe folgado | y |
| **`delay`** | Aleatório entre 1000 e 3000 ms, no campo `delay` da Evolution | Padrão menos parecido com disparo automático | y |
| **Formatação** | Texto puro; sem `*negrito*`, sem emoji, no máximo **um** link | Tom da loja + antisspam | y |
| **Rodapé de atendimento** | **Não** acrescentado — a mensagem já sai do número da Adri | Consequência direta da decisão do número | y |
| **Orçamento de tempo** | Mesmo da `42`: 2500 ms no `create-payment` no total; e-mail primeiro. O que não coube fica `failed: timeout`, reenviável | `AD-008` | y |
| **Interruptores de WhatsApp** | Todos nascem **desligados**, inclusive os que espelham e-mail ligado | A Adri lê e testa antes. Passo de operação registrado no `CLAUDE.md` | y |
| **Opt-in** | Checkbox próprio no checkout, desmarcado por padrão, gravado como snapshot `orders.whatsapp_opt_in` | Consentimento é do momento da compra (mesma razão de `customer_phone`, `35`); LGPD | y |
| **Alerta de desconexão** | Para a dona, **por e-mail** (o WhatsApp está caído, por definição), no máximo 1/hora | | y |
| **Dev** | `EVOLUTION_DEV_REDIRECT_TO` redireciona todo destinatário e prefixa `[dev → <número>]`; fora da conferência de secrets do CI | Molde de `RESEND_DEV_REDIRECT_TO` | y |

**Open questions (travam o design, não a spec):** `EVOLUTION_API_URL` e `EVOLUTION_INSTANCE`.

---

## User Stories

### P1: A cliente recebe no WhatsApp ⭐ MVP

**User Story**: Como cliente que marcou "também pelo WhatsApp", quero receber os avisos do meu
pedido no número que informei, vindos da Adri.

**Acceptance Criteria**:

1. WHEN o checkout é renderizado THEN SHALL existir um **segundo** checkbox, desmarcado, com o texto
   "Quero receber os avisos deste pedido também pelo WhatsApp, no número acima"; marcá-lo SHALL
   exigir telefone normalizável (`normalizeBrPhone`), senão o campo de telefone SHALL acusar.
2. WHEN o pedido é criado THEN `orders.whatsapp_opt_in` SHALL ser gravado como snapshot e
   `customer_phone` normalizado (`55` + DDD + número, só dígitos) — provados por **probe HTTP** contra
   o banco local (`AD-012`).
3. WHEN `whatsapp_opt_in = false` ou o telefone não normaliza THEN nenhuma linha `channel = whatsapp`
   SHALL ser reivindicada (`skipped:no_opt_in` / `skipped:no_phone`), mesmo com o interruptor ligado.
4. WHEN o motor envia THEN SHALL chamar `POST {EVOLUTION_API_URL}/message/sendText/{EVOLUTION_INSTANCE}`
   com header `apikey`, `delay` aleatório 1000–3000, `linkPreview: false`, dentro de
   `AbortController`; 2xx com `key.id` vira `provider_message_id`; 2xx sem id → `failed:
   evolution_no_id`.
5. WHEN o texto renderizado passa de 4096 caracteres THEN o motor SHALL recusar com `invalid_body`
   antes de chamar o provedor (o painel limita a 900; este é a rede).
6. WHEN mais de **30** mensagens foram enviadas na última hora THEN a próxima SHALL ficar `failed:
   rate_limited`, reenviável.
7. WHEN o adaptador `evolution` é registrado THEN nenhum arquivo fora de
   `core/notifications/providers/**`, `.env.example`, `supabase-deploy.yml` e do `index.ts` da
   function SHALL mudar para que o canal exista — o teste da interface (`NTF-09` da `42`) passa a
   exercitar `resend`, `evolution` e o dublê.

**Independent Test**: pedido no sandbox com opt-in e o telefone de teste → mensagem chega no
WhatsApp de teste; `order_notifications` mostra `sent` com `provider_message_id`.

---

### P1: A Adri vê, testa e liga ⭐ MVP

**Acceptance Criteria**:

1. WHEN a aba Notificações abre THEN cada evento SHALL ganhar a coluna WhatsApp: interruptor e o campo
   `body` (texto puro, ≤ 900 caracteres), com as mesmas `NOTIFICATION_VARIABLES` e a mesma
   `notificationCopyRefusal` da `42`.
2. WHEN a prévia é pedida para `channel: 'whatsapp'` THEN `action=preview` SHALL devolver o texto
   renderizado e o painel SHALL mostrá-lo como **balão** (sem HTML), sobre o pedido de exemplo ou
   um `order_id`.
3. WHEN a Adri clica em **"enviar teste para o meu número"** THEN `action=test` (admin) SHALL mandar o
   texto do evento escolhido para `store_settings.general.whatsapp`, sem tocar em pedido nem em
   `order_notifications`; `general.whatsapp` vazio → 422 nomeando o campo.
4. WHEN a aba abre THEN SHALL mostrar o estado da instância (`open | connecting | close`) via
   `action=status` (admin, consulta `GET /instance/connectionState/{instance}`), e "desconectado
   desde <hora>" quando o último `CONNECTION_UPDATE` recebido disser ≠ `open`.
5. WHEN o histórico do pedido mostra uma linha `whatsapp` THEN SHALL indicar `delivery_status`
   (`enviado · entregue · lido`) e o botão reenviar.
6. WHEN a aba é aberta em 390×844 THEN a coluna nova SHALL NOT produzir scroll horizontal nem alvo
   abaixo de 44 px — provado em navegador.

---

### P1: Entrega e conexão chegam de volta ⭐ MVP

**Acceptance Criteria**:

1. WHEN a Evolution chama `send-notification?action=evolution-webhook&token=<secret>` com
   `MESSAGES_UPDATE` THEN `order_notifications.delivery_status` SHALL refletir `SERVER_ACK →
   sent_to_server`, `DELIVERY_ACK → delivered`, `READ → read`, pela chave `provider_message_id`;
   token ausente ou errado → 401 sem efeito; id desconhecido → 200 sem efeito.
2. WHEN chega `CONNECTION_UPDATE` com estado ≠ `open` THEN o estado e a hora SHALL ser gravados
   (`store_settings.notifications.whatsapp_connection`) e a dona SHALL receber **um** e-mail de
   alerta por hora no máximo; estado `open` de volta grava e não alerta.
3. WHEN o `sendText` falha por instância desconectada ou inexistente THEN a linha SHALL ficar `failed:
   evolution_not_connected` e o mesmo alerta SHALL sair (mesma janela de 1 h).
4. WHEN o webhook chega **antes** de `finish_order_notification` gravar o id THEN SHALL ser no-op
   (200); o próximo ack atualiza. Aceitável, registrado.
5. WHEN o webhook é configurado (`POST /webhook/set/{instance}`) THEN os eventos assinados SHALL
   ser exatamente `MESSAGES_UPDATE`, `CONNECTION_UPDATE` e `SEND_MESSAGE`; o design documenta o
   comando e o `validation.md` prova a chegada de cada um.

---

### P2: A dona é avisada no WhatsApp

**Acceptance Criteria**:

1. WHEN `owner_order_paid` ou `owner_material_incoming` disparam THEN o canal WhatsApp SHALL mandar
   para `store_settings.general.whatsapp` o texto da `42` (número do pedido, primeiro nome, total,
   material a esperar / rastreio, `{{link_pedido_admin}}`); vazio → `skipped:no_owner_contact` e o
   e-mail segue.

---

### P2: Operação e segredo

**Acceptance Criteria**:

1. WHEN `supabase-deploy.yml` roda THEN `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`
   e `EVOLUTION_WEBHOOK_SECRET` SHALL estar na conferência de secrets (**11** no total), e
   `.env.example` SHALL documentar as quatro com o probe de conexão; `EVOLUTION_DEV_REDIRECT_TO`
   fica fora, como `RESEND_DEV_REDIRECT_TO`.
2. WHEN `/politicas` é lida THEN SHALL mencionar o WhatsApp como canal de aviso de pedido,
   condicionado ao opt-in.
3. WHEN o `CLAUDE.md` da raiz é atualizado no fecho THEN a seção *Estado conhecido* SHALL registrar
   que **todo interruptor de WhatsApp nasce desligado** e onde se liga.

---

## Edge Cases

- WHEN o telefone tem 10 dígitos (fixo) THEN `normalizeBrPhone` aceita; "não tem WhatsApp" vem do
  provedor, classificado (`evolution_invalid_number`).
- WHEN `EVOLUTION_DEV_REDIRECT_TO` está preenchido THEN **todo** destinatário (cliente e dona) vai para
  ele, com prefixo.
- WHEN a instância responde 401/403 (chave errada) THEN slug `evolution_unauthorized`; alerta à dona
  na mesma janela.
- WHEN a Evolution reenvia o mesmo `MESSAGES_UPDATE` THEN o `delivery_status` SHALL só avançar
  (`sent_to_server < delivered < read`), nunca regredir.
- WHEN a Adri desliga o WhatsApp de um evento com linhas `sent` THEN elas permanecem no histórico.

---

## Requirement Traceability

| ID | Story | O quê | Status |
| --- | --- | --- | --- |
| WA-01 | P1 cliente | segundo opt-in no checkout; exige telefone normalizável | Pending |
| WA-02 | P1 cliente | `orders.whatsapp_opt_in` + `customer_phone` normalizado, por probe | Pending |
| WA-03 | P1 cliente | sem opt-in/telefone ⇒ `skipped`, sem linha | Pending |
| WA-04 | P1 cliente | adaptador Evolution: `sendText`, `apikey`, `delay`, `linkPreview:false`, `AbortController`, `no_id` | Pending |
| WA-05 | P1 cliente | teto 4096 ⇒ `invalid_body` | Pending |
| WA-06 | P1 cliente | teto 30/h ⇒ `rate_limited` | Pending |
| WA-07 | P1 cliente | adaptador só acrescenta arquivo; teste da interface com três | Pending |
| WA-08 | P1 painel | coluna WhatsApp: interruptor + `body` ≤ 900, mesmas variáveis e régua | Pending |
| WA-09 | P1 painel | prévia como balão | Pending |
| WA-10 | P1 painel | `action=test` para o número da dona; 422 se vazio | Pending |
| WA-11 | P1 painel | `action=status` + "desconectado desde" | Pending |
| WA-12 | P1 painel | histórico com `delivery_status` e reenvio | Pending |
| WA-13 | P1 painel | prova em 390×844 | Pending |
| WA-14 | P1 webhooks | `MESSAGES_UPDATE` → `delivery_status`; token; no-op; só avança | Pending |
| WA-15 | P1 webhooks | `CONNECTION_UPDATE` → estado + alerta ≤ 1/h | Pending |
| WA-16 | P1 webhooks | `evolution_not_connected` + mesmo alerta | Pending |
| WA-17 | P1 webhooks | `webhook/set` com os três eventos, documentado e provado | Pending |
| OWN-01 | P2 dona | `owner_*` por WhatsApp; vazio ⇒ `skipped`, e-mail segue | Pending |
| OPS-01 | P2 operação | 4 secrets no CI (11 total) + `.env.example` + dev redirect fora | Pending |
| OPS-02 | P2 operação | política de privacidade | Pending |
| OPS-03 | P2 operação | `CLAUDE.md`: interruptores nascem desligados | Pending |

**Coverage:** 21 requisitos · 0 mapeados a tasks ⚠️

---

## Success Criteria

- [ ] Pedido com material pago no sandbox, com opt-in → a cliente de teste recebe **um** WhatsApp
      ("agora é a sua parte") e a Adri recebe outro ("pedido pago"), os dois com `delivered` no
      histórico em menos de um minuto.
- [ ] Desligar a instância → linha `failed: evolution_not_connected`, alerta por e-mail, estado
      "desconectado desde" na aba; religar → estado `open`, sem alerta.
- [ ] Nenhum arquivo de `apps/**` ou `supabase/functions/**` monta URL da Evolution fora do adaptador
      (guarda de disco).
- [ ] `git diff --name-only` contra a `42` fechada mostra **zero** migration em `order_notifications`
      e zero mudança no laço do motor.
- [ ] `validation.md` com autor ≠ verificador, prova em navegador e os três webhooks recebidos.
