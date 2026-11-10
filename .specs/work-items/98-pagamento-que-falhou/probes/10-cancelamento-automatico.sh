#!/usr/bin/env bash
# Probe do cancelamento automático do pedido não pago (WI 98, tarefa 07, UC-01/UC-06) contra o banco
# LOCAL (migration `20261118120000_98-cancelamento-automatico.sql`) e a function `cancel-unpaid-orders`:
#
#  1. a migration: a marca `orders.unpaid_cancelled_at`, a data de corte `unpaid_cancel_since()` (só a
#     service role a executa), o evento novo no `check` (e o que não existe continua recusado), o texto
#     dele DESLIGADO em `store_settings`, o job do `pg_cron` e o chamador que avisa sem `pg_net` — numa
#     transação desfeita;
#  2. a porta servida: sem a chave 401; com a chave de serviço, 200 — a consulta real (os filtros do
#     PostgREST) e a data de corte lidas de verdade; nenhum pedido do banco local venceu ainda;
#  3. o job (o handler real, pelo supabase-js e o motor reais, com o relógio 10 dias à frente) cancela
#     SÓ o recorte: o pedido vencido e o de desfazer antigo; nunca o de 5 dias, o anterior ao corte, o
#     de material enviado, o pago, o de desfazer recente nem o importado. Grava a marca e o histórico,
#     fecha a cobrança aberta de cada um, e a segunda rodada não repete nada.
#
# Pré-condição: Supabase local de pé (API :54441, Postgres :54442) com a migration aplicada, e a
# function `cancel-unpaid-orders` servida. As fixturas da parte 3 são gravadas no banco LOCAL e
# apagadas no fim (trap), inclusive em falha. Gate: exit 0 e só linhas "ok —".
#   bash .specs/work-items/98-pagamento-que-falhou/probes/10-cancelamento-automatico.sh
set -euo pipefail
cd "$(dirname "$0")/../../../.."

DB="${DB:-postgresql://postgres:postgres@127.0.0.1:54442/postgres}"
URL="${URL:-http://127.0.0.1:54441}"
SERVICE="${SERVICE:-$(supabase status -o json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["SERVICE_ROLE_KEY"])')}"
PREFIXO=00000000-0000-4000-c098-0000000010

sql() { psql "$DB" -X -q -At -v ON_ERROR_STOP=1 -c "$1"; }
falha() { echo "falhou — $*" >&2; exit 1; }
confere() { if [ "$1" = "$2" ]; then echo "ok — $3"; else falha "$3 (esperado '$2', veio '$1')"; fi; }

limpa() {
  psql "$DB" -X -q -v ON_ERROR_STOP=1 >/dev/null 2>&1 <<SQL || true
delete from public.order_status_history where order_id::text like '$PREFIXO%';
delete from public.order_notifications where order_id::text like '$PREFIXO%';
delete from public.order_manual_payments where order_id::text like '$PREFIXO%';
delete from public.orders where id::text like '$PREFIXO%';
SQL
}
trap limpa EXIT

sql "select 1" >/dev/null || falha "o banco local não responde em $DB"
[ -n "$SERVICE" ] || falha "não consegui ler a chave de serviço do Supabase local"

# ── 1. a migration, numa transação desfeita ───────────────────────────────────────────────────
SAIDA="$(psql "$DB" -X -q -At -v ON_ERROR_STOP=1 2>&1 <<'SQL'
begin;
select 'coluna:' || data_type from information_schema.columns
 where table_schema = 'public' and table_name = 'orders' and column_name = 'unpaid_cancelled_at';
select 'corte:' || (public.unpaid_cancel_since() <= now() and public.unpaid_cancel_since() > now() - interval '30 days');
select 'corte_service:' || has_function_privilege('service_role', 'public.unpaid_cancel_since()', 'execute');
select 'corte_anon:' || has_function_privilege('anon', 'public.unpaid_cancel_since()', 'execute');
select 'corte_auth:' || has_function_privilege('authenticated', 'public.unpaid_cancel_since()', 'execute');
select 'chamador_anon:' || has_function_privilege('anon', 'public.request_unpaid_cancellation()', 'execute');
select 'chamador_auth:' || has_function_privilege('authenticated', 'public.request_unpaid_cancellation()', 'execute');
select 'evento_desligado:' || (value #> '{events,order_cancelled_unpaid,email,enabled}')::text
  from public.store_settings where key = 'notifications';
select 'job:' || schedule from cron.job where jobname = 'cancel-unpaid-orders';
insert into public.orders (id, customer_name, customer_email, subtotal, total, payment_method)
values ('00000000-0000-4000-c098-000000001099', 'Probe', 'probe-98@exemplo.invalid', 10, 10, 'pix');
insert into public.order_notifications (order_id, event, channel, status)
values ('00000000-0000-4000-c098-000000001099', 'order_cancelled_unpaid', 'email', 'pending');
select 'check_aceita:ok';
savepoint s;
do $$ begin
  insert into public.order_notifications (order_id, event, channel, status)
  values ('00000000-0000-4000-c098-000000001099', 'order_confirmed', 'email', 'pending');
  raise notice 'check_recusa:nao';
exception when check_violation then raise notice 'check_recusa:sim';
end $$;
rollback;
SQL
)"
echo "$SAIDA" | grep -q '^coluna:timestamp with time zone$' && echo "ok — orders.unpaid_cancelled_at existe, timestamptz" || falha "coluna: $SAIDA"
echo "$SAIDA" | grep -q '^corte:true$' && echo "ok — a data de corte é o instante da aplicação (no passado recente)" || falha "corte: $SAIDA"
echo "$SAIDA" | grep -q '^corte_service:true$' && echo "ok — a service role lê a data de corte" || falha "$SAIDA"
echo "$SAIDA" | grep -q '^corte_anon:false$' && echo "ok — a chave pública não executa a data de corte" || falha "$SAIDA"
echo "$SAIDA" | grep -q '^corte_auth:false$' && echo "ok — a cliente logada não executa a data de corte" || falha "$SAIDA"
echo "$SAIDA" | grep -q '^chamador_anon:false$' && echo "ok — a chave pública não dispara o job" || falha "$SAIDA"
echo "$SAIDA" | grep -q '^chamador_auth:false$' && echo "ok — a cliente logada não dispara o job" || falha "$SAIDA"
echo "$SAIDA" | grep -q '^evento_desligado:false$' && echo "ok — o e-mail novo está em store_settings, desligado" || falha "$SAIDA"
echo "$SAIDA" | grep -q '^job:17 \* \* \* \*$' && echo "ok — o job do pg_cron existe, de hora em hora" || falha "$SAIDA"
echo "$SAIDA" | grep -q '^check_aceita:ok$' && echo "ok — o check de evento aceita order_cancelled_unpaid" || falha "$SAIDA"
echo "$SAIDA" | grep -q 'check_recusa:sim' && echo "ok — o check continua recusando evento que não existe" || falha "$SAIDA"
CHAMA="$(psql "$DB" -X -q -At -v ON_ERROR_STOP=1 -c 'select public.request_unpaid_cancellation()' 2>&1)"
echo "$CHAMA" | grep -q 'pg_net ausente' && echo "ok — sem pg_net, o job avisa e não chama nada" || falha "chamador: $CHAMA"

# ── 2. a porta servida ────────────────────────────────────────────────────────────────────────
confere "$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 -X POST "$URL/functions/v1/cancel-unpaid-orders")" "401" "sem a chave, a function recusa"
confere "$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 -X POST -H "Authorization: Bearer errada" "$URL/functions/v1/cancel-unpaid-orders")" "401" "com outra chave, a function recusa"
RESP="$(curl -s -w ' %{http_code}' --max-time 60 -X POST -H "Authorization: Bearer $SERVICE" "$URL/functions/v1/cancel-unpaid-orders")"
confere "$RESP" '{"cancelled":0} 200' "com a chave de serviço, a rodada real lê o banco e não acha nada vencido (o corte é de agora)"

# ── 3. o job, com o relógio 10 dias à frente ──────────────────────────────────────────────────
limpa
psql "$DB" -X -q -v ON_ERROR_STOP=1 >/dev/null <<SQL
insert into public.orders (id, customer_name, customer_email, subtotal, total, payment_method, status, payment_status, material_status, created_at, mp_order_id, nuvemshop_id, paid_at)
values
 ('${PREFIXO}01', 'Vencido',        'probe-98@exemplo.invalid', 10, 10, 'pix',  'pending', 'expired',  'nao_aplicavel',    now() + interval '1 day',  'PROBE-01', null, null),
 ('${PREFIXO}02', 'Cinco dias',     'probe-98@exemplo.invalid', 10, 10, 'pix',  'pending', 'expired',  'nao_aplicavel',    now() + interval '5 days', 'PROBE-02', null, null),
 ('${PREFIXO}03', 'Antes do corte', 'probe-98@exemplo.invalid', 10, 10, 'pix',  'pending', 'expired',  'nao_aplicavel',    now() - interval '1 day',  'PROBE-03', null, null),
 ('${PREFIXO}04', 'Material',       'probe-98@exemplo.invalid', 10, 10, 'pix',  'pending', 'expired',  'material_enviado', now() + interval '1 day',  'PROBE-04', null, null),
 ('${PREFIXO}05', 'Pago',           'probe-98@exemplo.invalid', 10, 10, 'pix',  'paid',    'approved', 'nao_aplicavel',    now() + interval '1 day',  'PROBE-05', null, now() + interval '1 day'),
 ('${PREFIXO}06', 'Desfeito novo',  'probe-98@exemplo.invalid', 10, 10, 'pix',  'pending', 'pending',  'nao_aplicavel',    now() + interval '1 day',  null,       null, null),
 ('${PREFIXO}07', 'Desfeito velho', 'probe-98@exemplo.invalid', 10, 10, 'card', 'pending', 'rejected', 'nao_aplicavel',    now() + interval '1 day',  'PROBE-07', null, null),
 ('${PREFIXO}08', 'Importado',      'probe-98@exemplo.invalid', 10, 10, 'pix',  'pending', 'expired',  'nao_aplicavel',    now() + interval '1 day',  'PROBE-08', 980000001, null);
insert into public.order_manual_payments (order_id, method, paid_at, previous_payment_status, undone_at)
values
 ('${PREFIXO}06', 'pix_direto', now() + interval '1 day', 'pending',  now() + interval '6 days'),
 ('${PREFIXO}07', 'pix_direto', now() + interval '1 day', 'rejected', now() + interval '2 days');
SQL
AGORA="$(sql "select to_char((now() + interval '10 days') at time zone 'utc', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"')")"

R1="$(npx --no-install tsx .specs/work-items/98-pagamento-que-falhou/probes/10-cancelamento-automatico.job.ts "$URL" "$SERVICE" "$AGORA" 2>/dev/null | tail -1)"
confere "$R1" "{\"cancelled\":[\"${PREFIXO}01\",\"${PREFIXO}07\"],\"mp\":[\"POST https://api.mercadopago.com/v1/orders/PROBE-01/cancel\",\"POST https://api.mercadopago.com/v1/orders/PROBE-07/cancel\"]}" "o job cancela só o vencido e o de desfazer antigo, e fecha a cobrança de cada um"

confere "$(sql "select string_agg(right(id::text, 2) || ':' || status || ':' || (unpaid_cancelled_at is not null)::text, ',' order by id) from public.orders where id::text like '$PREFIXO%'")" \
  "01:cancelled:true,02:pending:false,03:pending:false,04:pending:false,05:paid:false,06:pending:false,07:cancelled:true,08:pending:false" \
  "no banco: a marca e o cancelado só nos dois; o resto como estava"
confere "$(sql "select (unpaid_cancelled_at = '$AGORA'::timestamptz)::text from public.orders where id = '${PREFIXO}01'")" "true" "a marca é o instante da rodada"
confere "$(sql "select string_agg(right(order_id::text, 2) || ':' || from_status || '>' || to_status || ':' || (created_by is null)::text, ',' order by order_id) from public.order_status_history where order_id::text like '$PREFIXO%'")" \
  "01:pending>cancelled:true,07:pending>cancelled:true" "uma linha de histórico por cancelado, sem autor"
confere "$(sql "select count(*) from public.order_notifications where order_id::text like '$PREFIXO%'")" "0" "o e-mail nasce desligado: o motor real não reivindicou envio nenhum"

R2="$(npx --no-install tsx .specs/work-items/98-pagamento-que-falhou/probes/10-cancelamento-automatico.job.ts "$URL" "$SERVICE" "$AGORA" 2>/dev/null | tail -1)"
confere "$R2" '{"cancelled":[],"mp":[]}' "a segunda rodada não cancela nem fecha cobrança de novo"
confere "$(sql "select count(*) from public.order_status_history where order_id::text like '$PREFIXO%'")" "2" "e não grava histórico de novo"
