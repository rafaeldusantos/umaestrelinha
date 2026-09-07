# 42 — Notificações por e-mail · Context

**Gathered:** 2026-09-06
**Spec:** `.specs/features/42-notificacoes-email-e-whatsapp/spec.md`
**Status:** Ready for design

> A pasta mantém o nome do levantamento, que cobre e-mail **e** WhatsApp. A spec desta pasta é só a
> metade de e-mail; o WhatsApp é a [`43`](../43-whatsapp-pela-evolution-api/spec.md).

---

## Feature Boundary

Base consertada (D1–D4 + roteiro ponta a ponta), motor único de notificações dirigido por estado com
memória `order_notifications` (já com `channel`), os eventos de e-mail que faltam na jornada do
pedido (inclusive os da dona), e a aba Notificações do painel com prévia pela function. **Sem canal
WhatsApp** — mas com o chão pronto para ele.

---

## Implementation Decisions

### Separação em duas features (usuário, 2026-09-06)

- `42` = e-mail; `43` = WhatsApp. O custo declarado ("reabrir migration e painel") é pago **aqui**:
  a tabela nasce com `channel in ('email','whatsapp')`, o motor itera canais registrados (um só), e a
  interface `NotificationProvider` é testada com `resend` + um dublê. A `43` acrescenta um arquivo de
  adaptador, uma coluna na aba e o opt-in.

### Textos e painel

- Textos em `store_settings.notifications` (JSONB), molde da `37`/`39`. Sem tabela própria.
- O painel edita **redação**, não estrutura: `subject`, `heading`, `lead`, `extra[]`, `cta_label`.
- A prévia é a function (`action=preview`) — regra da `25` e da `39`: o painel não desenha.
- Régua de tom em `core` (`notificationCopyRefusal`), chamada ao salvar e ao renderizar.

### Interruptores

- Os quatro e-mails que já saem nascem **ligados** com o texto atual, byte a byte.
- Todo evento novo nasce **desligado**. Passo de operação da dona, registrado no `CLAUDE.md` como o
  frete grátis foi.

### Memória

- `order_emails` → `order_notifications (order_id, event, channel)`, view de compatibilidade durante a
  janela de deploy, remoção em migration posterior.

### Telefone

- `whatsappNumber` do backoffice sobe para `core` como `normalizeBrPhone` já nesta feature;
  `chargeMaterial.ts` passa a importar de lá. O segundo consumidor (`43`) é previsível.

### Agent's Discretion

- Mecanismo de disparo dos eventos iniciados pela cliente (`material_tracking_registered`,
  `owner_material_incoming`): trigger + `pg_net`, ou a loja chamando a function autenticada como
  dona do pedido. Design escolhe e justifica.
- Se vale um drenador (`pg_cron`) para o que não coube nos 2500 ms do `create-payment`. A spec só
  exige que o que ficou de fora seja **visível e reenviável**.
- Copy exata da newsletter depois do D4 (régua: não prometer envio).
- Agrupamento visual dos eventos na aba (régua: ordem da jornada).

### Declined / Undiscussed Gray Areas → Assumptions

Todas na tabela *Assumptions & Open Questions* da spec. As da dona:

| Pendência | Trava |
| --- | --- |
| Carrinho abandonado: existe lembrete? | só `BL-030`; F0 remove o interruptor de qualquer jeito |
| Newsletter: existe lista? | só `BL-031`; F0 corrige a copy de qualquer jeito |

---

## Specific References

- O motor atual (`send-email/sender.ts`, `AD-005..008`) é o molde: contrato dirigido por estado,
  reivindicação atômica no banco, `AbortController`, `try/catch`, nunca lança.
- `renderMaterialReceived` é a referência de tom para todo evento de material — sem exclamação.
- Levantamento §4.4 traz o diagrama da arquitetura com os dois canais.

---

## Deferred Ideas

- Lembrete de carrinho abandonado (um só, opt-in, tom de disponibilidade) → `BL-030`.
- Newsletter com Resend Audiences + double opt-in → `BL-031`.
- `delivered` automático pelo rastreio do Melhor Envio → feature própria.
- Digest diário para a dona.
