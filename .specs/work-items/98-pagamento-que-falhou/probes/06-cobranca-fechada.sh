#!/usr/bin/env bash
# Probe da function `mercado-pago` SERVIDA (WI 98, tarefa 03, CA-02.4 e a porta `close-charge`):
#
#  - `create-payment` num pedido CANCELADO responde 409 `order_cancelled`, e num pedido já PAGO (com
#    `paid_at`) 409 `order_already_paid` — os dois antes do pagador e, portanto, antes do Mercado Pago —,
#    também nos casos reais em que `payment_status` já não é retentável (`approved` do registro à mão,
#    `cancelled` da cobrança fechada): o código vem antes da recusa genérica;
#  - o PAR: o mesmo pedido em aberto e sem CPF passa da recusa e para no passo seguinte (422 do
#    pagador), o que prova que a recusa é o que detém os outros dois — sem nenhuma chamada externa;
#  - nenhum dos três pedidos tem a linha alterada (`mp_order_id`, `payment_status`, `updated_at`);
#  - `close-charge` sem sessão ⇒ 401, com a chave pública como sessão ⇒ 401, com uma conta sem papel
#    ⇒ 403, com a admin num pedido em aberto ⇒ 409 `em_aberto`, e num cancelado sem cobrança ⇒
#    `sem_cobranca` (nenhuma chamada ao Mercado Pago).
#
# Pré-condição: o Supabase local de pé (API :54441, Postgres :54442), com as migrations do WI 98
# aplicadas, e a function `mercado-pago` JÁ SERVIDA com chaves externas inválidas (este probe não
# sobe nem derruba processo). As fixturas são gravadas no banco LOCAL e apagadas no fim (trap),
# inclusive em falha. Gate: exit 0 e só linhas "ok —".
#   bash .specs/work-items/98-pagamento-que-falhou/probes/06-cobranca-fechada.sh
set -euo pipefail
cd "$(dirname "$0")/../../../.."

DB="${DB:-postgresql://postgres:postgres@127.0.0.1:54442/postgres}"
URL="${URL:-http://127.0.0.1:54441}"
APIKEY="${APIKEY:-$(supabase status -o json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["PUBLISHABLE_KEY"])')}"
TMP="$(mktemp -d)"

CANCELADO=00000000-0000-4000-c098-000000000601
PAGO=00000000-0000-4000-c098-000000000602
ABERTO=00000000-0000-4000-c098-000000000603
REGISTRADO=00000000-0000-4000-c098-000000000604   # registrado à mão: payment_status approved
FECHADO=00000000-0000-4000-c098-000000000605      # cancelado com a cobrança fechada: payment_status cancelled
CLI=00000000-0000-4000-a098-000000000601

sql() { psql "$DB" -X -q -At -v ON_ERROR_STOP=1 -c "$1"; }
falha() { echo "falhou — $*" >&2; exit 1; }
confere() { if [ "$1" = "$2" ]; then echo "ok — $3"; else falha "$3 (esperado '$2', veio '$1')"; fi; }

limpa() {
  psql "$DB" -X -q -v ON_ERROR_STOP=1 >/dev/null 2>&1 <<SQL || true
delete from public.order_status_history where order_id::text like '00000000-0000-4000-c098-0000000006%';
delete from public.order_items where order_id::text like '00000000-0000-4000-c098-0000000006%';
delete from public.orders where id::text like '00000000-0000-4000-c098-0000000006%';
delete from public.customers where email like 'probe98-06%@exemplo.invalid';
delete from auth.identities where user_id = '$CLI';
delete from auth.users where id = '$CLI';
SQL
}
encerra() { limpa; rm -rf "$TMP"; }
trap encerra EXIT

sql "select 1" >/dev/null || falha "o banco local não responde em $DB"
[ -n "$APIKEY" ] || falha "não consegui ler a chave pública do Supabase local"
COD="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -X POST "$URL/functions/v1/mercado-pago" || true)"
confere "$COD" "400" "a function mercado-pago está servida (corpo vazio responde 400)"

# O segredo da convidada: o pedido guarda só o SHA-256 em hex (core/checkout/guestAccess.ts).
TOKEN="probe98-06-$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
HASH="$(printf '%s' "$TOKEN" | python3 -c 'import hashlib,sys; print(hashlib.sha256(sys.stdin.buffer.read()).hexdigest())')"

limpa
psql "$DB" -X -q -v ON_ERROR_STOP=1 >/dev/null <<SQL
insert into public.orders (id, customer_name, customer_email, payment_method, subtotal, total, status, payment_status, paid_at,
  guest_access_hash, guest_access_expires_at, customer_document, created_at, updated_at) values
  ('$CANCELADO', 'Probe 06 cancelado', 'probe98-06a@exemplo.invalid', 'pix', 100, 100, 'cancelled', 'pending', null,
   '$HASH', now() + interval '7 days', null, now() - interval '1 day', '2030-01-01T00:00:00Z'),
  ('$PAGO', 'Probe 06 pago', 'probe98-06b@exemplo.invalid', 'pix', 100, 100, 'paid', 'pending', now() - interval '1 hour',
   '$HASH', now() + interval '7 days', null, now() - interval '1 day', '2030-01-01T00:00:00Z'),
  ('$ABERTO', 'Probe 06 aberto', 'probe98-06c@exemplo.invalid', 'pix', 100, 100, 'pending', 'pending', null,
   '$HASH', now() + interval '7 days', null, now() - interval '1 day', '2030-01-01T00:00:00Z'),
  ('$REGISTRADO', 'Probe 06 registrado', 'probe98-06d@exemplo.invalid', 'pix', 100, 100, 'paid', 'approved', now() - interval '1 hour',
   '$HASH', now() + interval '7 days', null, now() - interval '1 day', '2030-01-01T00:00:00Z'),
  ('$FECHADO', 'Probe 06 fechado', 'probe98-06e@exemplo.invalid', 'pix', 100, 100, 'cancelled', 'cancelled', null,
   '$HASH', now() + interval '7 days', null, now() - interval '1 day', '2030-01-01T00:00:00Z');
insert into public.order_items (order_id, product_id, product_name, quantity, unit_price) values
  ('$CANCELADO', 'probe98-06', 'Peça', 1, 100), ('$PAGO', 'probe98-06', 'Peça', 1, 100), ('$ABERTO', 'probe98-06', 'Peça', 1, 100),
  ('$REGISTRADO', 'probe98-06', 'Peça', 1, 100), ('$FECHADO', 'probe98-06', 'Peça', 1, 100);
-- Uma conta sem papel de admin, para a recusa 403 da porta.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
values ('00000000-0000-0000-0000-000000000000', '$CLI', 'authenticated', 'authenticated',
  'probe98-06-cliente@exemplo.invalid', extensions.crypt('probe98senha', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
insert into auth.identities (provider, provider_id, user_id, identity_data, last_sign_in_at, created_at, updated_at)
values ('email', '$CLI', '$CLI', jsonb_build_object('sub', '$CLI', 'email', 'probe98-06-cliente@exemplo.invalid', 'email_verified', true), now(), now(), now());
SQL

retrato() { sql "select coalesce(mp_order_id, '-') || '|' || payment_status || '|' || status || '|' || updated_at::text from public.orders where id = '$1'"; }
ANTES_C="$(retrato "$CANCELADO")"; ANTES_P="$(retrato "$PAGO")"; ANTES_A="$(retrato "$ABERTO")"

cobra() { # $1 = pedido · imprime "<http> <code>"
  curl -s -o "$TMP/r.json" -w '%{http_code}' --max-time 30 -X POST "$URL/functions/v1/mercado-pago?action=create-payment" \
    -H "apikey: $APIKEY" -H 'Content-Type: application/json' \
    -d "{\"order_id\":\"$1\",\"method\":\"pix\",\"idempotency_key\":\"probe98-06-$1\",\"access_token\":\"$TOKEN\"}" > "$TMP/http"
  printf '%s %s' "$(cat "$TMP/http")" "$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("code") or "-")' "$TMP/r.json")"
}

# -------------------------------------------------------------------------------------------------
# CA-02.4 — o servidor recusa cobrar pedido cancelado, e pedido já pago, antes do Mercado Pago
# -------------------------------------------------------------------------------------------------
confere "$(cobra "$ABERTO")" "422 -" "o PAR: pedido em aberto, sem CPF, passa da recusa e para no pagador (422)"
confere "$(cobra "$CANCELADO")" "409 order_cancelled" "pedido cancelado ⇒ 409 order_cancelled, antes do pagador e do Mercado Pago"
confere "$(cobra "$PAGO")" "409 order_already_paid" "pedido já pago (paid_at) ⇒ 409 order_already_paid, antes do pagador e do Mercado Pago"
confere "$(cobra "$REGISTRADO")" "409 order_already_paid" "pedido registrado à mão (payment_status approved) ⇒ 409 order_already_paid, com o código"
confere "$(cobra "$FECHADO")" "409 order_cancelled" "pedido cancelado com a cobrança fechada (payment_status cancelled) ⇒ 409 order_cancelled, com o código"

confere "$(retrato "$CANCELADO")" "$ANTES_C" "o pedido cancelado não teve a linha alterada (sem mp_order_id, status e updated_at iguais)"
confere "$(retrato "$PAGO")" "$ANTES_P" "o pedido pago não teve a linha alterada"
confere "$(retrato "$ABERTO")" "$ANTES_A" "o pedido do par também não (parou antes de qualquer escrita)"

# -------------------------------------------------------------------------------------------------
# close-charge — a porta da dona: só admin, e só para pedido cancelado ou pago
# -------------------------------------------------------------------------------------------------
token() {
  curl -s --max-time 20 -X POST "$URL/auth/v1/token?grant_type=password" -H "apikey: $APIKEY" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("access_token",""))'
}
ADMIN_JWT="$(token admin@umaestrelinha.dev admin123)"
CLI_JWT="$(token probe98-06-cliente@exemplo.invalid probe98senha)"
[ -n "$ADMIN_JWT" ] || falha "a admin do seed não entrou"
[ -n "$CLI_JWT" ] || falha "a conta sem papel da fixtura não entrou"

fecha() { # $1 = bearer ("" = sem header) · $2 = pedido · imprime "<http> <result>"
  local auth=()
  [ -n "$1" ] && auth=(-H "Authorization: Bearer $1")
  curl -s -o "$TMP/f.json" -w '%{http_code}' --max-time 30 -X POST "$URL/functions/v1/mercado-pago?action=close-charge" \
    -H "apikey: $APIKEY" -H 'Content-Type: application/json' ${auth[@]+"${auth[@]}"} -d "{\"order_id\":\"$2\"}" > "$TMP/http"
  printf '%s %s' "$(cat "$TMP/http")" "$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("result") or "-")' "$TMP/f.json")"
}

confere "$(fecha "" "$CANCELADO")" "401 -" "close-charge sem sessão ⇒ 401"
confere "$(fecha "$APIKEY" "$CANCELADO")" "401 -" "close-charge com a chave pública como sessão ⇒ 401"
confere "$(fecha "$CLI_JWT" "$CANCELADO")" "403 -" "close-charge com uma conta sem papel de admin ⇒ 403"
confere "$(fecha "$ADMIN_JWT" "$ABERTO")" "409 em_aberto" "close-charge da admin num pedido em aberto ⇒ 409 em_aberto (a cobrança dele continua valendo)"
confere "$(fecha "$ADMIN_JWT" "$CANCELADO")" "200 sem_cobranca" "close-charge da admin num cancelado sem cobrança ⇒ sem_cobranca, sem chamar o Mercado Pago"
confere "$(retrato "$CANCELADO")" "$ANTES_C" "a porta não escreveu no pedido"
