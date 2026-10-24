#!/usr/bin/env bash
# Feature 76 · T30 — probe de paridade do app contra o banco local (supabase-js real, sessão da admin do
# seed e de uma conta sem papel). Duas fases: `real` (48 pessoas do banco, sem fixtura) e `fixturas`
# (P76-…, semeadas e apagadas por `trap`, também em falha).
#   bash .specs/features/76-mobile-adm-clientes/probes/03-paridade.sh
set -euo pipefail
cd "$(dirname "$0")/../../../.."
DB="postgresql://postgres:postgres@127.0.0.1:54442/postgres"
P=.specs/features/76-mobile-adm-clientes/probes
export APIKEY="${APIKEY:-$(supabase status -o json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["PUBLISHABLE_KEY"])')}"
cont() { echo "$(psql "$DB" -At -c 'select count(*) from public.orders')/$(psql "$DB" -At -c 'select count(*) from public.customers')/$(psql "$DB" -At -c 'select count(*) from public.customer_list')"; }
ANTES="$(cont)"
limpa() { psql "$DB" -q -v ON_ERROR_STOP=1 -f "$P/03-limpa.sql" >/dev/null; psql "$DB" -q -v ON_ERROR_STOP=1 -f "$P/01-limpa.sql" >/dev/null; echo "banco restaurado: $(cont) orders/customers/customer_list (antes: $ANTES)"; }
trap limpa EXIT
psql "$DB" -q -v ON_ERROR_STOP=1 -f "$P/03-limpa.sql" >/dev/null
psql "$DB" -q -v ON_ERROR_STOP=1 -f "$P/01-limpa.sql" >/dev/null
echo "=== fase real (sem fixtura) ==="
FASE=real npx tsx --tsconfig tsconfig.base.json "$P/03-paridade.ts"
psql "$DB" -q -v ON_ERROR_STOP=1 -f "$P/01-banco.sql" >/dev/null
psql "$DB" -q -v ON_ERROR_STOP=1 -f "$P/03-fixturas.sql" >/dev/null
echo "=== fase fixturas ==="
FASE=fixturas npx tsx --tsconfig tsconfig.base.json "$P/03-paridade.ts"
