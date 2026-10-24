-- Feature 75 · T29 — apaga as fixturas do probe 01 (idempotente).
delete from public.order_notifications where order_id::text like '00000000-0000-4000-c075-%';
delete from public.order_notes where order_id::text like '00000000-0000-4000-c075-%';
delete from public.order_status_history where order_id::text like '00000000-0000-4000-c075-%';
delete from public.order_items where order_id::text like '00000000-0000-4000-c075-%';
delete from public.orders where id::text like '00000000-0000-4000-c075-%';
delete from public.customers where email like 'probe75-%@exemplo.invalid';
delete from public.user_roles where user_id::text like '00000000-0000-4000-a075-%';
delete from auth.identities where user_id::text like '00000000-0000-4000-a075-%';
delete from auth.users where id::text like '00000000-0000-4000-a075-%';
