#!/usr/bin/env bash
# Feature 74 · T10 — a lista do app contra o PostgREST local. Semeia as fixturas (commitadas, o
# PostgREST não vê transação aberta), roda `02-lista.ts` e apaga tudo por `trap`, também em falha.
#   bash .specs/features/74-mobile-adm-pedidos/probes/02-lista.sh
set -euo pipefail
cd "$(dirname "$0")/../../../.."
DB="postgresql://postgres:postgres@127.0.0.1:54442/postgres"
P=.specs/features/74-mobile-adm-pedidos/probes
export APIKEY="${APIKEY:-$(supabase status -o json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["PUBLISHABLE_KEY"])')}"
ANTES="$(psql "$DB" -At -c 'select count(*) from public.orders')"
limpa() { psql "$DB" -q -v ON_ERROR_STOP=1 -f "$P/02-limpa.sql" >/dev/null; echo "banco restaurado: $(psql "$DB" -At -c 'select count(*) from public.orders') pedidos (antes: $ANTES)"; }
trap limpa EXIT
psql "$DB" -q -v ON_ERROR_STOP=1 -f "$P/02-limpa.sql" >/dev/null
psql "$DB" -q -v ON_ERROR_STOP=1 -f "$P/02-fixturas.sql" >/dev/null
npx tsx --tsconfig tsconfig.base.json "$P/02-lista.ts"
