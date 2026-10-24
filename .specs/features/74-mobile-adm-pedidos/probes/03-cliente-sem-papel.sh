#!/usr/bin/env bash
# Feature 74 · T10 — semeia uma cliente SEM papel admin com um pedido dela, roda o `.ts` e apaga
# tudo por `trap`, também em falha.   bash .specs/features/74-mobile-adm-pedidos/probes/03-cliente-sem-papel.sh
set -euo pipefail
cd "$(dirname "$0")/../../../.."
DB="postgresql://postgres:postgres@127.0.0.1:54442/postgres"
P=.specs/features/74-mobile-adm-pedidos/probes
export APIKEY="${APIKEY:-$(supabase status -o json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["PUBLISHABLE_KEY"])')}"
ANTES="$(psql "$DB" -At -c 'select count(*) from public.orders')/$(psql "$DB" -At -c 'select count(*) from auth.users')"
limpa() { psql "$DB" -q -v ON_ERROR_STOP=1 -f "$P/02-limpa.sql" >/dev/null; echo "banco restaurado: $(psql "$DB" -At -c 'select count(*) from public.orders')/$(psql "$DB" -At -c 'select count(*) from auth.users') pedidos/usuários (antes: $ANTES)"; }
trap limpa EXIT
psql "$DB" -q -v ON_ERROR_STOP=1 -f "$P/02-limpa.sql" >/dev/null
psql "$DB" -q -v ON_ERROR_STOP=1 <<'SQL'
-- O pedido nasce de convidada; a conta, ao nascer, o ADOTA por e-mail (`handle_new_customer`).
insert into public.orders (id, order_number, customer_name, customer_email, payment_method, subtotal, total, status, payment_status, created_at)
values ('00000000-0000-4000-c074-0000000000a1', 'PRB74-CLI', 'Probe74 Cliente', 'probe74-cliente@exemplo.invalid', 'pix', 90, 90, 'paid', 'approved', '2030-02-01T10:00:00Z');
insert into public.order_items (id, order_id, product_id, product_name, quantity, unit_price)
values ('00000000-0000-4000-c074-0000000000a2', '00000000-0000-4000-c074-0000000000a1', 'probe74', 'Probe74 Joia', 1, 90);
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a074-000000000001', 'authenticated', 'authenticated',
  'probe74-cliente@exemplo.invalid', extensions.crypt('probe74senha', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
insert into auth.identities (provider, provider_id, user_id, identity_data, last_sign_in_at, created_at, updated_at)
values ('email', '00000000-0000-4000-a074-000000000001', '00000000-0000-4000-a074-000000000001',
  jsonb_build_object('sub', '00000000-0000-4000-a074-000000000001', 'email', 'probe74-cliente@exemplo.invalid', 'email_verified', true), now(), now(), now());
SQL
npx tsx --tsconfig tsconfig.base.json "$P/03-cliente-sem-papel.ts"
