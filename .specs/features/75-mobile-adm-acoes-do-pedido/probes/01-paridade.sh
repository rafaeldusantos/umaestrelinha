#!/usr/bin/env bash
# Feature 75 · T29 — semeia as fixturas P75-…, roda o probe de paridade e apaga tudo por `trap`,
# também em falha. Pré-condição: a `send-notification` local viva (R7, TQ3).
#   bash .specs/features/75-mobile-adm-acoes-do-pedido/probes/01-paridade.sh
set -euo pipefail
cd "$(dirname "$0")/../../../.."
DB="postgresql://postgres:postgres@127.0.0.1:54442/postgres"
P=.specs/features/75-mobile-adm-acoes-do-pedido/probes
export APIKEY="${APIKEY:-$(supabase status -o json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["PUBLISHABLE_KEY"])')}"
ANTES="$(psql "$DB" -At -c 'select count(*) from public.orders')/$(psql "$DB" -At -c 'select count(*) from auth.users')"
limpa() { psql "$DB" -q -v ON_ERROR_STOP=1 -f "$P/01-limpa.sql" >/dev/null; echo "banco restaurado: $(psql "$DB" -At -c 'select count(*) from public.orders')/$(psql "$DB" -At -c 'select count(*) from auth.users') pedidos/usuários (antes: $ANTES)"; }
trap limpa EXIT
psql "$DB" -q -v ON_ERROR_STOP=1 -f "$P/01-limpa.sql" >/dev/null
psql "$DB" -q -v ON_ERROR_STOP=1 -f "$P/01-fixturas.sql" >/dev/null
npx tsx --tsconfig tsconfig.base.json "$P/01-paridade.ts"
