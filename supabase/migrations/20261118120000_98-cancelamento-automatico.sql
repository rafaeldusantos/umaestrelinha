-- =====================================================================
-- O cancelamento automático do pedido não pago — a marca, a data de corte, o e-mail e o agendamento.
-- =====================================================================
--
-- O pedido que fica em Pendente, sem pagamento confirmado, é cancelado sozinho 7 dias depois de
-- criado — ou 7 dias depois do desfazer de um pagamento registrado à mão
-- (`order_manual_payments.undone_at`, migration `20261113120000_98-desfazer-registro.sql`). Quem
-- cancela é a edge function `cancel-unpaid-orders` (o recorte é `unpaidCancelDue`, de
-- `core/orders/unpaidCancel.ts`): ela fecha a cobrança aberta no Mercado Pago e dispara o e-mail
-- próprio, e um job SQL não alcança nenhum dos dois. Esta migration traz o que a function precisa:
--
-- 1. A MARCA: `orders.unpaid_cancelled_at`, o instante em que o job cancelou. Estruturada, e nunca
--    `cancel_reason` (texto livre da dona). A cliente lê o pedido inteiro (`select('*')` e o
--    `get-order`), e é por esta coluna que a loja diz "cancelado por falta de pagamento" — ela é da
--    cliente também. Nasce nula em todo pedido existente.
--
-- 2. A DATA DE CORTE: `unpaid_cancel_since()` devolve o instante em que ESTA migration foi aplicada
--    — no hospedado, a publicação da mudança. Pedido criado antes dela nunca é cancelado por este
--    prazo. Fixada aqui, uma vez: nenhuma outra migration a recria.
--
-- 3. O EVENTO `order_cancelled_unpaid` no `check` de `order_notifications.event` (recriado — a
--    definição vigente passa a ser ESTA, não a da 57) e o texto dele em `store_settings.notifications`,
--    DESLIGADO, só quando a chave ainda não existe.
--
-- 4. O AGENDAMENTO: um job do `pg_cron` a cada hora chama a function por `pg_net`, com o endereço e
--    a chave lidos do Vault (`cancel_unpaid_orders_url`, `cancel_unpaid_orders_key`). SÓ se o
--    `pg_cron` estiver instalado; esta migration não cria extensão nenhuma. Sem `pg_net` ou sem os
--    dois segredos, o job roda e avisa (`raise notice`) sem chamar nada.
--
-- Nenhuma escrita em pedido, nenhuma policy nova.

-- ---------------------------------------------------------------------
-- 1. A marca
-- ---------------------------------------------------------------------
alter table public.orders add column if not exists unpaid_cancelled_at timestamptz;

comment on column public.orders.unpaid_cancelled_at is
	'Instante em que o job cancelou o pedido por falta de pagamento (7 dias em Pendente). Nulo em todo outro pedido, inclusive o cancelado pela admin.';

-- ---------------------------------------------------------------------
-- 2. A data de corte — o instante da aplicação desta migration, gravado no corpo da função
-- ---------------------------------------------------------------------
do $corte$
begin
	execute format(
		$f$create or replace function public.unpaid_cancel_since()
		returns timestamptz
		language sql
		immutable
		set search_path = ''
		as $b$ select %L::timestamptz $b$ $f$,
		now()
	);
end $corte$;

revoke all on function public.unpaid_cancel_since() from public;
revoke all on function public.unpaid_cancel_since() from anon;
revoke all on function public.unpaid_cancel_since() from authenticated;
grant execute on function public.unpaid_cancel_since() to service_role;

comment on function public.unpaid_cancel_since() is
	'Data de corte do cancelamento automatico: o instante em que a migration 20261118120000 foi aplicada. Pedido criado antes dela nunca e cancelado por falta de pagamento.';

-- ---------------------------------------------------------------------
-- 3. O evento — o `check` de `event` = NOTIFICATION_EVENTS, na ordem da jornada
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
		'order_cancelled_unpaid',
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

-- O texto do e-mail novo, desligado. `DEFAULT_NOTIFICATIONS.events.order_cancelled_unpaid`
-- serializado a partir do TypeScript (`storeSettingsDefaults.test.ts` compõe e compara). Só quando a
-- chave ainda não existe: não religa o que a Adri desligou, nem reescreve o que ela editou.
update public.store_settings
   set value = jsonb_set(
     value,
     '{events,order_cancelled_unpaid}',
     $order_cancelled_unpaid${
  "email": {
    "enabled": false,
    "fields": {
      "subject": "Pedido {{numero_pedido}} cancelado por falta de pagamento",
      "heading": "Seu pedido foi cancelado",
      "lead": "{{saudacao}}O pedido {{numero_pedido}} foi cancelado porque o pagamento não foi concluído em 7 dias. Se ainda quiser a peça, fale comigo pelo WhatsApp {{whatsapp_atendimento}} e eu te ajudo a retomar.",
      "extra": [
        "Status: cancelado por falta de pagamento"
      ],
      "cta_label": "Acompanhar em Minha conta"
    }
  }
}$order_cancelled_unpaid$::jsonb,
     true
   )
 where key = 'notifications'
   and not (value #> '{events}' ? 'order_cancelled_unpaid');

-- ---------------------------------------------------------------------
-- 4. O agendamento
-- ---------------------------------------------------------------------
create or replace function public.request_unpaid_cancellation()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_url text;
	v_key text;
begin
	if not exists (select 1 from pg_catalog.pg_extension where extname = 'pg_net') then
		raise notice 'pg_net ausente: o cancelamento automatico nao foi chamado';
		return;
	end if;

	if not exists (select 1 from pg_catalog.pg_extension where extname = 'supabase_vault') then
		raise notice 'Vault ausente: o cancelamento automatico nao foi chamado';
		return;
	end if;

	execute $q$select decrypted_secret from vault.decrypted_secrets where name = 'cancel_unpaid_orders_url'$q$ into v_url;
	execute $q$select decrypted_secret from vault.decrypted_secrets where name = 'cancel_unpaid_orders_key'$q$ into v_key;

	if coalesce(btrim(v_url), '') = '' or coalesce(btrim(v_key), '') = '' then
		raise notice 'cancel_unpaid_orders_url ou cancel_unpaid_orders_key ausente no Vault: o cancelamento automatico nao foi chamado';
		return;
	end if;

	execute $q$select net.http_post(
		url := $1,
		body := '{}'::jsonb,
		headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || $2),
		timeout_milliseconds := 60000
	)$q$ using v_url, v_key;
end;
$$;

revoke all on function public.request_unpaid_cancellation() from public;
revoke all on function public.request_unpaid_cancellation() from anon;
revoke all on function public.request_unpaid_cancellation() from authenticated;
revoke all on function public.request_unpaid_cancellation() from service_role;

comment on function public.request_unpaid_cancellation() is
	'Chamada pelo job do pg_cron: dispara a edge function cancel-unpaid-orders por pg_net, com URL e chave do Vault. Sem pg_net, sem Vault ou sem os segredos, avisa e nao chama nada.';

do $$
begin
	if exists (select 1 from pg_extension where extname = 'pg_cron') then
		perform cron.schedule(
			'cancel-unpaid-orders',
			'17 * * * *',
			$job$ select public.request_unpaid_cancellation() $job$
		);
		if not exists (select 1 from pg_extension where extname = 'pg_net') then
			raise notice 'pg_net ausente: o job cancel-unpaid-orders foi agendado, mas so chama a function depois que a extensao existir';
		end if;
	else
		raise notice 'pg_cron ausente: o cancelamento automatico nao foi agendado — a function cancel-unpaid-orders so roda chamada a mao';
	end if;
end $$;

notify pgrst, 'reload schema';
