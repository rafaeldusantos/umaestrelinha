#!/usr/bin/env bash
# Feature 76 · T10 — semântica de orders_open + custo da lista. Fixturas apagadas por `trap`.
#   bash .specs/features/76-mobile-adm-clientes/probes/02-em-aberto.sh
set -euo pipefail
cd "$(dirname "$0")/../../../.."
DB="postgresql://postgres:postgres@127.0.0.1:54442/postgres"
P=.specs/features/76-mobile-adm-clientes/probes
cont() { echo "$(psql "$DB" -At -c 'select count(*) from public.orders')/$(psql "$DB" -At -c 'select count(*) from public.customers')/$(psql "$DB" -At -c 'select count(*) from public.customer_list')"; }
ANTES="$(cont)"
limpa() { psql "$DB" -q -v ON_ERROR_STOP=1 -f "$P/02-limpa.sql" >/dev/null; echo "banco restaurado: $(cont) orders/customers/customer_list (antes: $ANTES)"; }
trap limpa EXIT
psql "$DB" -q -v ON_ERROR_STOP=1 -f "$P/02-limpa.sql" >/dev/null
SAIDA="$(psql "$DB" -v ON_ERROR_STOP=1 -P pager=off -f "$P/02-em-aberto.sql")"
echo "$SAIDA"
if echo "$SAIDA" | grep -q FALHA; then echo "PROBE FALHOU"; exit 1; fi
test "$(echo "$SAIDA" | grep -c '^ ok ')" = 8 || { echo "esperava 8 linhas ok"; exit 1; }
echo "$SAIDA" | grep -q 'orders_open nulo em customer_list: 0' || { echo "orders_open nulo"; exit 1; }
echo "--- desempenho (transação desfeita) ---"
psql "$DB" -v ON_ERROR_STOP=1 -P pager=off -f "$P/02-desempenho.sql" | tee /tmp/p76-desempenho.$$ 
MS="$(grep -E 'Execution Time' /tmp/p76-desempenho.$$ | sed -E 's/.*: ([0-9.]+) ms.*/\1/')"
rm -f /tmp/p76-desempenho.$$
echo "execution time: ${MS} ms"
awk -v ms="$MS" 'BEGIN { exit !(ms < 1000) }' || { echo "ACIMA DE 1 s: abrir entrada no BACKLOG.md"; exit 2; }
echo "ok — tudo dentro do esperado"
