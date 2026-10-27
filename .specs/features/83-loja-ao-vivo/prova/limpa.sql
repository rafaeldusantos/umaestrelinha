-- Desfaz fixtura.sql (o contador estava ausente antes da prova).
\set ON_ERROR_STOP 1
begin;
delete from public.store_visits where visitor_id::text like '83000000-%';
delete from public.orders where order_number like 'PROVA83-%';
delete from public.store_visit_counter where id;
commit;
