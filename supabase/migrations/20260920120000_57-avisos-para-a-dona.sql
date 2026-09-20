-- Feature 57 — os dois avisos internos novos, e o endereço que os recebe.
--
-- Três coisas, todas ADITIVAS e IDEMPOTENTES. Nenhuma migration já aplicada é
-- reescrita: `AD-017` venceu em 2026-08-17, e daí em diante correção vem em
-- migration nova. A da `42` continua exatamente como está.
--
-- 1. O `check` de `event` passa a conhecer os 17 — ele é RECRIADO aqui, e a
--    partir de agora a definição vigente é ESTA, não a da 42. É o mesmo
--    movimento que a 41 fez com o `check` de `home_sections.type`, e o guarda
--    (`orderNotificationsSchema.test.ts`) foi ensinado a ler este arquivo.
--
-- 2. Os dois eventos entram em `store_settings.notifications`, por caminho, e
--    SÓ quando a chave ainda não existe. Escrever o objeto inteiro de novo
--    sobrescreveria o texto que a Adri já editou nos outros quinze.
--
-- 3. `general.notifications_email` nasce vazio — e vazio é REGRA, não dado
--    faltando: significa "use o e-mail de contato". O molde aditivo é o da 37
--    (`value || jsonb_build_object`, guardado por `NOT value ? 'chave'`).
--
-- Esta migration NÃO escreve dado de pedido, não liga evento nenhum e não
-- mexe em policy. Os dois eventos nascem DESLIGADOS (`PNL-06`, decisão da 42):
-- a Adri lê o texto e decide, e no caso do "pedido recebido" isso importa —
-- ele dispara antes do pagamento, e num PIX boa parte dos pedidos criados
-- nunca é paga.

-- ---------------------------------------------------------------------
-- 1. O `check` de `event` = NOTIFICATION_EVENTS, na ordem da jornada
--
-- Os quatro `owner_*` ficam no fim, e entre eles a ordem também é a da
-- jornada: nasce, é pago ou recusado, o material vem a caminho.
-- ---------------------------------------------------------------------
alter table public.order_notifications drop constraint if exists order_notifications_event_check;
alter table public.order_notifications
	add constraint order_notifications_event_check
	check (event in (
		'order_received',
		'order_paid',
		'material_instructions',
		'payment_rejected',
		'pix_expired',
		'order_cancelled',
		'payment_refunded',
		'material_tracking_registered',
		'material_received',
		'in_production',
		'order_shipped',
		'order_delivered',
		'post_delivery_care',
		'owner_order_received',
		'owner_order_paid',
		'owner_payment_rejected',
		'owner_material_incoming'
	));

-- ---------------------------------------------------------------------
-- 2. Os textos dos dois eventos novos
--
-- `jsonb_set` no caminho `{events,<nome>}`, com `create_missing => true`, e o
-- `where` recorta as linhas em que a chave AINDA NÃO existe. Duas garantias
-- num comando só: um `db push` repetido não faz nada, e o texto dos outros
-- quinze não é tocado.
--
-- O jsonb abaixo é `DEFAULT_NOTIFICATIONS.events[<nome>]` serializado a partir
-- do TypeScript, não escrito à mão. `storeSettingsDefaults.test.ts` faz
-- `JSON.parse` deste trecho, COMPÕE com a semente da 42 e exige igualdade com
-- o objeto — que é exatamente o que o banco fica, num banco novo e num antigo.
-- ---------------------------------------------------------------------
update public.store_settings
   set value = jsonb_set(
     value,
     '{events,owner_order_received}',
     $owner_order_received${
  "email": {
    "enabled": false,
    "fields": {
      "subject": "Pedido {{numero_pedido}} recebido — aguardando pagamento",
      "heading": "Pedido novo",
      "lead": "O pedido {{numero_pedido}} de {{primeiro_nome}} foi registrado: {{total}}. Ele ainda não foi pago — você recebe outro aviso quando o pagamento entrar.",
      "extra": [
        "Abrir no painel: {{link_pedido_admin}}"
      ],
      "cta_label": "Abrir o pedido no painel"
    }
  }
}$owner_order_received$::jsonb,
     true
   )
 where key = 'notifications'
   and not (value #> '{events}' ? 'owner_order_received');

update public.store_settings
   set value = jsonb_set(
     value,
     '{events,owner_payment_rejected}',
     $owner_payment_rejected${
  "email": {
    "enabled": false,
    "fields": {
      "subject": "Pagamento recusado — pedido {{numero_pedido}}",
      "heading": "Pagamento recusado",
      "lead": "A operadora recusou o pagamento do pedido {{numero_pedido}}, de {{primeiro_nome}}: {{total}}. Vale falar com ela e oferecer outra forma de pagar.",
      "extra": [
        "Abrir no painel: {{link_pedido_admin}}"
      ],
      "cta_label": "Abrir o pedido no painel"
    }
  }
}$owner_payment_rejected$::jsonb,
     true
   )
 where key = 'notifications'
   and not (value #> '{events}' ? 'owner_payment_rejected');

-- ---------------------------------------------------------------------
-- 3. `general.notifications_email`
--
-- Nasce `''`, e o vazio é o que faz a loja de hoje não mudar de comportamento
-- no deploy: `resolveOwnerEmail` cai no e-mail de contato. Uma cópia de
-- `general.email` aqui seria um SEGUNDO DONO do endereço — ela trocaria o de
-- contato, esqueceria este, e os avisos continuariam indo para o antigo sem
-- nada na tela dizendo por quê.
-- ---------------------------------------------------------------------
update public.store_settings
   set value = value || jsonb_build_object('notifications_email', '')
 where key = 'general'
   and not (value ? 'notifications_email');
