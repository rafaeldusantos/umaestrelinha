-- Feature 76 · T02 — apaga as fixturas do probe 01 (idempotente). Ids …-c076-…; e-mails p76…@exemplo.invalid.
delete from public.order_items where order_id::text like '00000000-0000-4000-c076-%';
delete from public.orders where id::text like '00000000-0000-4000-c076-%';
delete from public.customers where id::text like '00000000-0000-4000-c076-%';
delete from public.customers where lower(email) like 'p76%@exemplo.invalid';
