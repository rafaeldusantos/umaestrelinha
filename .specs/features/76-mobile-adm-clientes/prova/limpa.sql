-- Feature 76 · T32 — apaga as fixturas da prova em navegador (idempotente). Também a conta sem papel, se semeada.
delete from public.order_items where order_id::text like '00000000-0000-4000-d076-%';
delete from public.orders where id::text like '00000000-0000-4000-d076-%';
delete from public.customers where id::text like '00000000-0000-4000-d076-%';
delete from public.order_items where order_id in (select id from public.orders where order_number = 'P76-CLI');
delete from public.orders where order_number = 'P76-CLI';
delete from public.customers where email like 'probe76-%@exemplo.invalid';
delete from public.user_roles where user_id::text like '00000000-0000-4000-a076-%';
delete from auth.identities where user_id::text like '00000000-0000-4000-a076-%';
delete from auth.users where id::text like '00000000-0000-4000-a076-%';
