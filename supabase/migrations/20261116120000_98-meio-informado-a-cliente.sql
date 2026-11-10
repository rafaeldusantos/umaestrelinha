-- =====================================================================
-- O meio do pagamento registrado à mão, na leitura da cliente com sessão.
-- =====================================================================
--
-- O registro manual (`order_manual_payments`, migration `20261112120000_98-registrar-pagamento.sql`)
-- é SÓ de admin pela RLS: a observação, o comprovante e o autor nunca chegam à cliente. Mas o MEIO
-- ("Transferência", "Dinheiro") é dela — o pedido pago por fora mostra, em "Pagamento e entrega", o
-- meio que a loja informou, e não o `orders.payment_method` do checkout, que não muda com o registro.
--
-- Duas leituras entregam o mesmo campo, no mesmo formato:
--   - a convidada lê pelo `get-order` da function `checkout` (service role, já autorizada pelo token);
--   - quem tem sessão lê por ESTA função, no molde de `customer_order_events` (feature `59`).
--
-- `security definer` com `search_path = ''`: a tabela continua fechada à cliente, e a função devolve
-- uma única coluna (`method`) do registro VIVO (`undone_at is null`) de um pedido DELA — o recorte é
-- `customers.user_id = auth.uid()`. Pedido alheio, inexistente ou sem registro vivo: zero linhas.
-- Fechada a `anon` (a convidada não tem `auth.uid()`; o caminho dela é o token).
--
-- Só leitura: nenhuma escrita de dado, nenhuma tabela nova.

create or replace function public.customer_manual_payment(p_order_id uuid)
returns table (method text)
language sql
stable
security definer
set search_path = ''
as $$
	select m.method
	from public.order_manual_payments m
	join public.orders o on o.id = m.order_id
	join public.customers c on c.id = o.customer_id
	where m.order_id = p_order_id
		and m.undone_at is null
		and c.user_id = auth.uid();
$$;

revoke all on function public.customer_manual_payment(uuid) from public;
revoke all on function public.customer_manual_payment(uuid) from anon;
grant execute on function public.customer_manual_payment(uuid) to authenticated;

comment on function public.customer_manual_payment(uuid) is
	'O MEIO do pagamento registrado a mao (registro vivo), do pedido da PROPRIA cliente. Nunca a observacao, o comprovante nem o autor. Pedido alheio, inexistente ou sem registro: zero linhas. Fechada a anon.';
