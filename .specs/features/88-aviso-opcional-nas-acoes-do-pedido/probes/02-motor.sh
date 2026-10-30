#!/usr/bin/env bash
# Feature 88 · T08 — o motor SERVIDO (`supabase functions serve`) contra o banco local: `customer: false`
# grava `skipped` (AVS-10), o aviso à dona sai como sempre (A-04), o avião (`action=send`) reivindica a
# linha `skipped` (AVS-13, AVS-24), e a porta da cliente (`notify`) ignora a opção.
#
#   bash .specs/features/88-aviso-opcional-nas-acoes-do-pedido/probes/02-motor.sh
#
# Pré-condição: o Supabase local de pé (API :54441, Postgres :54442) com a migration da 88 aplicada.
# Semeia os pedidos P88-…, uma conta de cliente e liga dois eventos em `store_settings.notifications`;
# `trap` apaga as fixturas, devolve as configurações byte a byte e encerra o `functions serve`, também
# em falha. Exit 0 e só linhas `ok —`.
#
# NADA sai para fora do banco local: a chave do Resend é inválida de propósito, o destinatário é
# desviado para um endereço `@exemplo.invalid` (`RESEND_DEV_REDIRECT_TO`) e o HTTPS de saída do worker
# aponta para um proxy inexistente. O e-mail que "sai" termina `failed` — que é o desfecho esperado de
# uma reivindicação sem provedor alcançável, e é por isso que as asserções aceitam `sent` ou `failed`.
set -euo pipefail
cd "$(dirname "$0")/../../../.."
DB="postgresql://postgres:postgres@127.0.0.1:54442/postgres"
URL="http://127.0.0.1:54441"
APIKEY="${APIKEY:-$(supabase status -o json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["PUBLISHABLE_KEY"])')}"
TMP="$(mktemp -d)"
SERVE_PID=""

P1=00000000-0000-4000-c088-000000000001   # enviado com rastreio  → order_shipped (cliente)
P2=00000000-0000-4000-c088-000000000002   # envelope a caminho    → material_tracking_registered (cliente) + owner_material_incoming (dona)
P3=00000000-0000-4000-c088-000000000003   # o pedido DA CLIENTE   → a porta `notify`
CLI=00000000-0000-4000-a088-000000000001

sql() { psql "$DB" -At -v ON_ERROR_STOP=1 -c "$1"; }
falha() { echo "PROBE FALHOU: $1" >&2; exit 1; }
confere() { if [ "$1" = "$2" ]; then echo "ok — $3"; else falha "$3 (esperado '$2', veio '$1')"; fi; }

ANTES_NOTIF="$(sql "select value::text from public.store_settings where key = 'notifications'")"
[ -n "$ANTES_NOTIF" ] || falha 'store_settings.notifications existe no banco local'

limpa() {
  psql "$DB" -q -v ON_ERROR_STOP=1 >/dev/null <<SQL
delete from public.order_notifications where order_id::text like '00000000-0000-4000-c088-%';
delete from public.order_status_history where order_id::text like '00000000-0000-4000-c088-%';
delete from public.order_items where order_id::text like '00000000-0000-4000-c088-%';
delete from public.orders where id::text like '00000000-0000-4000-c088-%';
delete from public.customers where email like 'probe88-%@exemplo.invalid';
delete from auth.identities where user_id::text like '00000000-0000-4000-a088-%';
delete from auth.users where id::text like '00000000-0000-4000-a088-%';
SQL
}

restaura() {
  set +e
  if [ -n "$SERVE_PID" ]; then kill -INT "$SERVE_PID" 2>/dev/null; wait "$SERVE_PID" 2>/dev/null; fi
  limpa
  psql "$DB" -q -v ON_ERROR_STOP=1 -v v="$ANTES_NOTIF" >/dev/null <<'SQL'
update public.store_settings set value = :'v'::jsonb where key = 'notifications';
SQL
  local depois
  depois="$(sql "select value::text from public.store_settings where key = 'notifications'")"
  [ "$depois" = "$ANTES_NOTIF" ] && echo "banco restaurado: fixturas P88 apagadas, notifications byte a byte" \
    || echo "ATENÇÃO: notifications NÃO voltou ao valor de antes" >&2
  rm -rf "$TMP"
}
trap restaura EXIT

# -------------------------------------------------------------------------------------------------
# A function servida, com o envio contido
# -------------------------------------------------------------------------------------------------
cat > "$TMP/env" <<ENV
RESEND_API_KEY=re_probe88_chave_invalida
RESEND_SENDER_NAME=Probe 88
RESEND_SENDER_EMAIL=probe88@exemplo.invalid
RESEND_DEV_REDIRECT_TO=probe88-desvio@exemplo.invalid
STORE_PUBLIC_URL=http://localhost:8082
ADMIN_PUBLIC_URL=http://localhost:8083
HTTPS_PROXY=http://127.0.0.1:9
ENV
supabase functions serve send-notification --env-file "$TMP/env" > "$TMP/serve.log" 2>&1 &
SERVE_PID=$!
for _ in $(seq 1 90); do
  cod="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL/functions/v1/send-notification?action=trigger" -H "apikey: $APIKEY" -d '{}' || true)"
  [ "$cod" = "401" ] && break
  sleep 1
done
confere "$cod" "401" 'send-notification servida e viva (sem auth responde 401)'

# -------------------------------------------------------------------------------------------------
# Fixturas
# -------------------------------------------------------------------------------------------------
limpa
psql "$DB" -q -v ON_ERROR_STOP=1 >/dev/null <<SQL
insert into public.orders (id, order_number, customer_name, customer_email, customer_phone, payment_method, subtotal, total, status, payment_status, paid_at, material_status, material_tracking_code, tracking_code, shipping_service_id, created_at) values
  ('$P1', 'P88-01', 'Probe88 Cliente 01', 'probe88-01@exemplo.invalid', '51999990000', 'pix', 100, 100, 'shipped', 'approved', now(), 'nao_aplicavel', null, 'BR123456789BR', '1', '2030-03-01T10:00:00Z'),
  ('$P2', 'P88-02', 'Probe88 Cliente 02', 'probe88-02@exemplo.invalid', '51999990000', 'pix', 100, 100, 'paid', 'approved', now(), 'material_enviado', 'AA123456789BR', null, '1', '2030-03-01T10:00:00Z'),
  ('$P3', 'P88-03', 'Probe88 Cliente 03', 'probe88-cliente@exemplo.invalid', '51999990000', 'pix', 100, 100, 'paid', 'approved', now(), 'material_enviado', 'AA987654321BR', null, '1', '2030-03-01T10:00:00Z');
insert into public.order_items (order_id, product_id, product_name, quantity, unit_price) values
  ('$P1', 'probe88', 'Probe88 Joia', 1, 100), ('$P2', 'probe88', 'Probe88 Joia', 1, 100), ('$P3', 'probe88', 'Probe88 Joia', 1, 100);
-- A conta da cliente; ao nascer, adota o P88-03 pelo e-mail (handle_new_customer).
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
values ('00000000-0000-0000-0000-000000000000', '$CLI', 'authenticated', 'authenticated',
  'probe88-cliente@exemplo.invalid', extensions.crypt('probe88senha', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
insert into auth.identities (provider, provider_id, user_id, identity_data, last_sign_in_at, created_at, updated_at)
values ('email', '$CLI', '$CLI', jsonb_build_object('sub', '$CLI', 'email', 'probe88-cliente@exemplo.invalid', 'email_verified', true), now(), now(), now());
-- Os dois eventos do envelope LIGADOS (nascem desligados); restaurados pelo trap.
update public.store_settings
  set value = jsonb_set(jsonb_set(value,
    '{events,material_tracking_registered,email,enabled}', 'true'::jsonb, true),
    '{events,owner_material_incoming,email,enabled}', 'true'::jsonb, true)
  where key = 'notifications';
SQL
confere "$(sql "select count(*) from public.orders o join public.customers c on c.id = o.customer_id where o.id = '$P3' and c.user_id = '$CLI'")" "1" \
  'o P88-03 é da conta da cliente (adotado pelo e-mail)'

token() {
  curl -s -X POST "$URL/auth/v1/token?grant_type=password" -H "apikey: $APIKEY" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("access_token",""))'
}
ADMIN_JWT="$(token admin@umaestrelinha.dev admin123)"
CLI_JWT="$(token probe88-cliente@exemplo.invalid probe88senha)"
[ -n "$ADMIN_JWT" ] || falha 'a admin do seed entra'; echo 'ok — a admin do seed entra'
[ -n "$CLI_JWT" ] || falha 'a cliente da fixtura entra'; echo 'ok — a cliente da fixtura entra'

chama() { # acao jwt corpo
  curl -s -X POST "$URL/functions/v1/send-notification?action=$1" -H "apikey: $APIKEY" -H "Authorization: Bearer $2" \
    -H 'Content-Type: application/json' -d "$3"
}
linha() { sql "select coalesce((select status from public.order_notifications where order_id = '$1' and event = '$2' and channel = 'email'), '<nenhuma>')"; }
id_da() { sql "select coalesce((select id::text from public.order_notifications where order_id = '$1' and event = '$2' and channel = 'email'), '<nenhuma>')"; }

# -------------------------------------------------------------------------------------------------
# AVS-10 — `trigger` (admin) com customer:false grava `skipped`, e o provedor não é chamado
# -------------------------------------------------------------------------------------------------
R1="$(chama trigger "$ADMIN_JWT" "{\"order_id\":\"$P1\",\"trigger\":\"order_status_changed\",\"customer\":false}")"
confere "$(echo "$R1" | python3 -c 'import json,sys; r=json.load(sys.stdin)["results"]; print([(x["event"], x.get("skipped")) for x in r])')" \
  "[('order_shipped', 'admin_opt_out')]" 'P88-01: a resposta do motor diz order_shipped / admin_opt_out'
confere "$(linha "$P1" order_shipped)" "skipped" 'P88-01: a linha (pedido, order_shipped, email) é skipped'
confere "$(sql "select attempts::text from public.order_notifications where order_id = '$P1' and event = 'order_shipped'")" "1" \
  'P88-01: a linha skipped não registrou tentativa de envio (attempts = default)'
ID1="$(id_da "$P1" order_shipped)"

# -------------------------------------------------------------------------------------------------
# A-04 — o aviso à DONA do mesmo gatilho sai como de costume
# -------------------------------------------------------------------------------------------------
chama trigger "$ADMIN_JWT" "{\"order_id\":\"$P2\",\"trigger\":\"material_tracking_set\",\"customer\":false}" > /dev/null
confere "$(linha "$P2" material_tracking_registered)" "skipped" 'P88-02: o e-mail da cliente (material_tracking_registered) é skipped'
DONA="$(linha "$P2" owner_material_incoming)"
case "$DONA" in sent|failed) echo "ok — P88-02: o aviso à dona (owner_material_incoming) foi reivindicado como de costume ($DONA)";; *) falha "P88-02: o aviso à dona foi reivindicado (veio '$DONA')";; esac

# -------------------------------------------------------------------------------------------------
# AVS-13 / AVS-24 — o avião (`action=send`) reivindica a MESMA linha, que deixa de ser `skipped`
# -------------------------------------------------------------------------------------------------
chama send "$ADMIN_JWT" "{\"order_id\":\"$P1\",\"event\":\"order_shipped\",\"channel\":\"email\"}" > /dev/null
DEPOIS="$(linha "$P1" order_shipped)"
case "$DEPOIS" in sent|failed) echo "ok — P88-01: depois do avião a linha deixou de ser skipped ($DEPOIS)";; *) falha "P88-01: o avião reivindicou a linha (veio '$DEPOIS')";; esac
confere "$(id_da "$P1" order_shipped)" "$ID1" 'P88-01: é a MESMA linha (mesmo id), convertida — nenhuma duplicada'
confere "$(sql "select count(*) from public.order_notifications where order_id = '$P1'")" "1" 'P88-01: continua UMA linha para o pedido'

# -------------------------------------------------------------------------------------------------
# A porta da CLIENTE ignora a opção: `notify` com customer:false não grava `skipped`
# -------------------------------------------------------------------------------------------------
R3="$(chama notify "$CLI_JWT" "{\"order_id\":\"$P3\",\"trigger\":\"material_tracking_set\",\"customer\":false}")"
CLIENTE="$(linha "$P3" material_tracking_registered)"
case "$CLIENTE" in sent|failed) echo "ok — P88-03: notify com customer:false reivindicou o e-mail da cliente ($CLIENTE), não pulou";; *) falha "P88-03: notify ignorou customer:false (veio '$CLIENTE'; resposta $R3)";; esac
confere "$(sql "select count(*) from public.order_notifications where order_id = '$P3' and status = 'skipped'")" "0" \
  'P88-03: nenhuma linha skipped no pedido da cliente'

# -------------------------------------------------------------------------------------------------
# Contenção: nenhum e-mail chegou a ninguém
# -------------------------------------------------------------------------------------------------
confere "$(sql "select count(*) from public.order_notifications where order_id::text like '00000000-0000-4000-c088-%' and status = 'sent'")" "0" \
  'nenhum e-mail das fixturas saiu de fato (sem provedor alcançável, tudo failed)'
echo "ok — o motivo das falhas registrado no banco: $(sql "select string_agg(distinct left(coalesce(error, '<sem erro>'), 60), ' | ') from public.order_notifications where order_id::text like '00000000-0000-4000-c088-%' and status = 'failed'")"
