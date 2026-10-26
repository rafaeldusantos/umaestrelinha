#!/usr/bin/env bash
# Feature 76 · T02 — semeia as fixturas P76-…, roda o probe de banco e apaga tudo por `trap`.
#   bash .specs/features/76-mobile-adm-clientes/probes/01-banco.sh            (probe)
#   MUTANTE_CURSOR=1 bash …/01-banco.sh                                      (o mutante: tem de FALHAR)
set -euo pipefail
cd "$(dirname "$0")/../../../.."
DB="postgresql://postgres:postgres@127.0.0.1:54442/postgres"
P=.specs/features/76-mobile-adm-clientes/probes
export APIKEY="${APIKEY:-$(supabase status -o json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["PUBLISHABLE_KEY"])')}"
cont() { echo "$(psql "$DB" -At -c 'select count(*) from public.orders')/$(psql "$DB" -At -c 'select count(*) from public.customers')/$(psql "$DB" -At -c 'select count(*) from public.customer_list')"; }
ANTES="$(cont)"
limpa() { psql "$DB" -q -v ON_ERROR_STOP=1 -f "$P/01-limpa.sql" >/dev/null; echo "banco restaurado: $(cont) orders/customers/customer_list (antes: $ANTES)"; }
trap limpa EXIT
psql "$DB" -q -v ON_ERROR_STOP=1 -f "$P/01-limpa.sql" >/dev/null
psql "$DB" -q -v ON_ERROR_STOP=1 -f "$P/01-banco.sql" >/dev/null
npx tsx --tsconfig tsconfig.base.json "$P/01-banco.ts"
