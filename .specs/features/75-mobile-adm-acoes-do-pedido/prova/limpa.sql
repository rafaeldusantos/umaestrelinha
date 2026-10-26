-- Feature 75 · T31 — apaga as fixturas da prova (idempotente).
delete from public.order_notifications where order_id::text like '00000000-0000-4000-d075-%';
delete from public.order_notes where order_id::text like '00000000-0000-4000-d075-%';
delete from public.order_status_history where order_id::text like '00000000-0000-4000-d075-%';
delete from public.order_items where order_id::text like '00000000-0000-4000-d075-%';
delete from public.orders where id::text like '00000000-0000-4000-d075-%';
