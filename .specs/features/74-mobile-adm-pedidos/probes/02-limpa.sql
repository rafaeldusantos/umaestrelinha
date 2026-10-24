-- Feature 74 · T10 — apaga as fixturas dos probes 02 e 03 (idempotente).
delete from public.order_notifications where order_id::text like '00000000-0000-4000-c074-%';
delete from public.order_notes where order_id::text like '00000000-0000-4000-c074-%';
delete from public.order_status_history where order_id::text like '00000000-0000-4000-c074-%';
delete from public.order_items where order_id::text like '00000000-0000-4000-c074-%';
delete from public.orders where id::text like '00000000-0000-4000-c074-%';
delete from public.customers where email like 'probe74-%@exemplo.invalid';
delete from public.user_roles where user_id::text like '00000000-0000-4000-a074-%';
delete from auth.identities where user_id::text like '00000000-0000-4000-a074-%';
delete from auth.users where id::text like '00000000-0000-4000-a074-%';
