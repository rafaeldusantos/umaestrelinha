# 43 — WhatsApp pela Evolution API · Context

**Gathered:** 2026-09-06
**Spec:** `.specs/features/43-whatsapp-pela-evolution-api/spec.md`
**Status:** Blocked for design until `EVOLUTION_API_URL` / `EVOLUTION_INSTANCE` existirem no `.env`
da raiz. Depende da `42` fechada.

---

## Feature Boundary

O canal WhatsApp do motor de notificações da `42`: adaptador Evolution (Baileys, número da Adri),
opt-in no checkout, coluna na aba Notificações, teste para o próprio número, status da instância,
webhooks de entrega e conexão, aviso da dona.

---

## Implementation Decisions

### Provedor e número (usuário, 2026-09-06)

- Evolution API v2, integração `WHATSAPP-BAILEYS`, **no número da Adri**. Registrado como `AD-031`
  com o risco aceito e a condição de revisão (primeira desconexão ou banimento em produção → adaptador
  `cloud`).
- Instância hospedada pelo usuário. URL e nome da instância **não foram informados nesta sessão** —
  vão para `EVOLUTION_API_URL` e `EVOLUTION_INSTANCE` no `.env` da raiz. É a primeira coisa que o
  design precisa para o probe do corpo do `sendText`.
- A chave de testes existe e foi passada em chat. **Não entra no repositório**: `EVOLUTION_API_KEY`
  no `.env` (gitignored) e em `supabase secrets`. **Rotacionar antes de produção.**

### Mitigações do Baileys, como requisito

- Opt-in próprio por pedido; teto de 30/h; `delay` 1–3 s; texto puro, um link; alerta de desconexão
  por e-mail (≤ 1/h); `delivery_status` no histórico.
- Sem rodapé "chame a Adri em …": a mensagem já sai do número dela.

### Painel

- Coluna WhatsApp ao lado da de e-mail, mesmo evento, mesmas variáveis, mesma régua de tom. `body`
  ≤ 900. Prévia como balão. Botão "enviar teste para o meu número".

### Agent's Discretion

- Forma exata do corpo do `sendText` (probe decide; adaptador testa as duas).
- Onde guardar o estado da conexão (`store_settings.notifications.whatsapp_connection` é o default).
- Como contar o teto de 30/h (consulta em `order_notifications` por `sent_at` é o default).

### Declined / Undiscussed → Assumptions

Todas na tabela da spec. Pendência externa única: URL/instância.

---

## Specific References

- `chargeMaterialText` — o tom de WhatsApp da loja, já escrito.
- `whatsappNumber` (backoffice) → `normalizeBrPhone` (`core`, feito na `42`).
- Evolution API v2: `POST /message/sendText/{instance}` (header `apikey`), `GET
  /instance/connectionState/{instance}`, `POST /webhook/set/{instance}` com `events`; webhooks
  `MESSAGES_UPDATE` (status `PENDING | SERVER_ACK | DELIVERY_ACK | READ`), `CONNECTION_UPDATE`
  (`open | connecting | close`), `SEND_MESSAGE`. Fontes consultadas em 2026-09-06:
  docs.evolutionfoundation.com.br e deepwiki (EvolutionAPI/evolution-api). **O corpo do `sendText`
  diverge entre fontes** — probe decide.

---

## Deferred Ideas

- Adaptador `cloud` (WhatsApp Cloud API oficial).
- Mídia na mensagem (foto da joia pronta).
- Caixa de entrada no painel.
