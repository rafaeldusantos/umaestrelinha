-- Feature 71 · probe VIS-14 — UMA das duas sessões simultâneas (rodado por `concorrencia.sh`).
--
-- NÃO roda em begin … rollback: a corrida só existe entre transações que se comprometem. Usa a
-- migration JÁ APLICADA (`supabase migration up --local`) e um id próprio; quem limpa é o script.
-- A primeira sessão segura a transação por `:espera` segundos depois de gravar; a segunda, que
-- começa no meio dessa espera, não vê a linha ainda, tenta gravar, fica bloqueada no índice da
-- chave primária e, quando a primeira se compromete, perde a corrida (`on conflict do nothing`).
\set ON_ERROR_STOP 1
begin;
select public.record_store_visit(:'id') as r \gset
\echo RESPOSTA :r
select pg_sleep(:espera);
commit;
