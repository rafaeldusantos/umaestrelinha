-- Feature 76 · T30 — apaga as fixturas do probe 03 (idempotente). A conta sem papel e o pedido dela;
-- as fixturas de 01-banco.sql são apagadas por 01-limpa.sql.
delete from public.order_items where order_id::text like '00000000-0000-4000-c076-%';
delete from public.orders where id::text like '00000000-0000-4000-c076-%';
delete from public.customers where email like 'probe76-%@exemplo.invalid';
delete from public.user_roles where user_id::text like '00000000-0000-4000-a076-%';
delete from auth.identities where user_id::text like '00000000-0000-4000-a076-%';
delete from auth.users where id::text like '00000000-0000-4000-a076-%';
