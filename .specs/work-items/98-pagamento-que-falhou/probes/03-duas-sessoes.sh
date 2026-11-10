#!/usr/bin/env bash
# Probe do registro manual por DUAS sessões concorrentes (WI 98, tarefa 01, CA-03.5): duas admins
# diferentes, em duas conexões, registram o mesmo pedido ao mesmo tempo. A sessão A trava o pedido
# (`for update` de `record_manual_payment`) e segura a transação aberta; a sessão B é vista ESPERANDO
# a trava (`pg_stat_activity.wait_event_type = 'Lock'`), e quando A confirma ela lê o pedido já pago e
# responde `ja_pago` — sem segundo registro, segunda linha de histórico, segunda baixa de estoque nem
# segundo uso do cupom.
#
# Concorrência não cabe numa transação desfeita: as fixturas são gravadas de verdade no banco LOCAL e
# apagadas no fim (trap), inclusive em falha. Mede as funções APLICADAS no banco local.
# Gate: exit 0 e só linhas "ok —".
#   bash .specs/work-items/98-pagamento-que-falhou/probes/03-duas-sessoes.sh
set -euo pipefail

DB="${DB:-postgresql://postgres:postgres@127.0.0.1:54442/postgres}"
SAIDA="${TMPDIR:-/tmp}/probe-98-duas-sessoes.$$"
mkdir -p "$SAIDA"

PEDIDO='00000000-0000-0000-0000-0000000098c1'
PRODUTO='00000000-0000-0000-0000-0000000098c2'
CUPOM='00000000-0000-0000-0000-0000000098c3'

q() { psql "$DB" -X -q -At -v ON_ERROR_STOP=1 -c "$1"; }
falha() { echo "falhou — $*" >&2; exit 1; }

limpar() {
  psql "$DB" -X -q -At -c "
    delete from public.orders where id = '$PEDIDO';
    delete from public.products where id = '$PRODUTO';
    delete from public.coupons where id = '$CUPOM';" >/dev/null 2>&1 || true
  rm -rf "$SAIDA"
}
trap limpar EXIT

q "select 1" >/dev/null || falha "o banco local não responde em $DB"
[ "$(q "select count(*) from pg_proc where proname = 'record_manual_payment'")" = "1" ] \
  || falha "record_manual_payment não está aplicada no banco local"

# Duas admins diferentes (a "outra sessão" é outra pessoa, não a mesma chamando de novo).
ADMIN_A="$(q "select user_id from public.user_roles where role = 'admin' order by user_id limit 1")"
ADMIN_B="$(q "select user_id from public.user_roles where role = 'admin' order by user_id offset 1 limit 1")"
[ -n "$ADMIN_A" ] && [ -n "$ADMIN_B" ] || falha "o banco local precisa de duas contas admin"

limpar; mkdir -p "$SAIDA"
q "
insert into public.products (id, name, slug, base_price, stock_policy, stock_total, is_active)
values ('$PRODUTO', 'Peça probe duas sessões', 'peca-probe-duas-sessoes', 100, 'track', 10, true);
insert into public.coupons (id, code, used_count) values ('$CUPOM', 'PROBEDUAS', 5);
insert into public.orders (id, subtotal, total, payment_method, customer_name, customer_email, status, payment_status, coupon_id, created_at)
values ('$PEDIDO', 150, 150, 'pix', 'Duas', 'duas@exemplo.invalid', 'pending', 'expired', '$CUPOM', now() - interval '2 days');
insert into public.order_items (order_id, product_id, product_name, quantity, unit_price)
values ('$PEDIDO', '$PRODUTO', 'Peça', 3, 50);" >/dev/null

sessao() { # $1 = admin, $2 = nome, $3 = segundos com a transação aberta depois de registrar
  cat <<SQL
\\set ON_ERROR_STOP 1
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '$1', 'role', 'authenticated')::text, true) \\g /dev/null
select 'resultado=' || (public.record_manual_payment('$PEDIDO', 'transferencia', null, '$2', null, '$2') ->> 'result');
select pg_sleep($3) \\g /dev/null
commit;
SQL
}

# Sessão A: registra e segura o pedido travado por 4 s.
sessao "$ADMIN_A" "Admin A" 4 | PGAPPNAME=probe98-a psql "$DB" -X -q -At >"$SAIDA/a.txt" 2>&1 &
PID_A=$!

# Espera A estar dentro do pg_sleep (o registro feito, a trava tomada, a transação aberta).
for _ in $(seq 1 50); do
  [ "$(q "select count(*) from pg_stat_activity where application_name = 'probe98-a' and query like '%pg_sleep%' and state = 'active'")" = "1" ] && break
  sleep 0.1
done
[ "$(q "select count(*) from pg_stat_activity where application_name = 'probe98-a' and query like '%pg_sleep%' and state = 'active'")" = "1" ] \
  || falha "a sessão A não chegou a segurar a trava: $(cat "$SAIDA/a.txt")"

# Sessão B: registra o mesmo pedido enquanto A segura a trava.
sessao "$ADMIN_B" "Admin B" 0 | PGAPPNAME=probe98-b psql "$DB" -X -q -At >"$SAIDA/b.txt" 2>&1 &
PID_B=$!

ESPEROU=0
for _ in $(seq 1 30); do
  if [ "$(q "select count(*) from pg_stat_activity where application_name = 'probe98-b' and wait_event_type = 'Lock'")" = "1" ]; then
    ESPEROU=1; break
  fi
  sleep 0.1
done
# Enquanto B espera, nada dela foi gravado e A ainda não confirmou: de fora, o pedido segue não pago.
VISTO_DE_FORA="$(q "select payment_status from public.orders where id = '$PEDIDO'")"

wait "$PID_A" || falha "a sessão A terminou com erro: $(cat "$SAIDA/a.txt")"
wait "$PID_B" || falha "a sessão B terminou com erro: $(cat "$SAIDA/b.txt")"

[ "$ESPEROU" = "1" ] || falha "a sessão B não foi vista esperando a trava do pedido"
[ "$VISTO_DE_FORA" = "expired" ] || falha "o pedido apareceu pago antes de A confirmar: $VISTO_DE_FORA"
echo "ok — a sessão B (outra admin, outra conexão) espera a trava que a sessão A segura"

grep -qx 'resultado=ok' "$SAIDA/a.txt" || falha "A: $(cat "$SAIDA/a.txt")"
grep -qx 'resultado=ja_pago' "$SAIDA/b.txt" || falha "B: $(cat "$SAIDA/b.txt")"
echo "ok — A grava (ok) e B, depois que A confirma, responde ja_pago"

LINHA="$(q "
select (select count(*) from public.order_manual_payments where order_id = '$PEDIDO')
  || '|' || (select count(*) from public.order_status_history where order_id = '$PEDIDO')
  || '|' || (select stock_total from public.products where id = '$PRODUTO')
  || '|' || (select used_count from public.coupons where id = '$CUPOM')
  || '|' || (select created_by from public.order_manual_payments where order_id = '$PEDIDO')
  || '|' || (select payment_status || '/' || status from public.orders where id = '$PEDIDO')")"
[ "$LINHA" = "1|1|7|6|$ADMIN_A|approved/paid" ] || falha "efeitos repetidos ou faltando: $LINHA"
echo "ok — um registro (de A), uma linha de histórico, estoque 10 → 7 uma vez, cupom +1 uma vez"
