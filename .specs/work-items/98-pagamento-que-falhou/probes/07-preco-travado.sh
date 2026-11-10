#!/usr/bin/env bash
# Probe da function `mercado-pago` SERVIDA (WI 98, tarefa 04, CA-01.5 e CA-01.6) e da tabela do valor
# travado (`order_charge_locks`, migration `20261115120000_98-preco-travado.sql`):
#
#  - a PRIMEIRA cobrança de um pedido sem valor travado é calculada como sempre e grava o travado,
#    com os totais dos dois meios (PIX 7% do banco local): peça de 100 + frete 20 ⇒ PIX 113,00 e
#    cartão 120,00, e `orders.total` = 113,00;
#  - PAGAR DE NOVO com o desconto "exibido" forjado acima do que o recálculo daria (é o que uma
#    promoção encerrada produz) e com `orders.total` forjado em 1,00: não há 422, e o pedido volta a
#    dizer 113,00 — o valor travado, nunca o gravado no pedido;
#  - o PAR: o mesmo forjado num pedido SEM valor travado continua dando 422
#    `promotion_no_longer_valid` (calculado como hoje), e nada é travado para ele;
#  - a cliente logada e a chave pública não leem nem gravam a tabela nova pelo PostgREST, e os papéis
#    `authenticated`/`anon` não alcançam a tabela no banco (numa transação desfeita).
#
# As chaves externas da function são inválidas: o Mercado Pago recusa (400) ou não responde (502).
# O que se mede é o que o servidor decidiu ANTES dele — o total gravado e a ausência do 422.
#
# Pré-condição: o Supabase local de pé (API :54441, Postgres :54442), com as migrations do WI 98
# aplicadas, e a function `mercado-pago` JÁ SERVIDA com chaves externas inválidas (este probe não
# sobe nem derruba processo). As fixturas são gravadas no banco LOCAL e apagadas no fim (trap),
# inclusive em falha. Gate: exit 0 e só linhas "ok —".
#   bash .specs/work-items/98-pagamento-que-falhou/probes/07-preco-travado.sh
set -euo pipefail
cd "$(dirname "$0")/../../../.."

DB="${DB:-postgresql://postgres:postgres@127.0.0.1:54442/postgres}"
URL="${URL:-http://127.0.0.1:54441}"
APIKEY="${APIKEY:-$(supabase status -o json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["PUBLISHABLE_KEY"])')}"
TMP="$(mktemp -d)"

TRAVA=00000000-0000-4000-c098-000000000701   # ganha o travado na primeira cobrança
SEM=00000000-0000-4000-c098-000000000702     # o par: nunca teve cobrança gravada
CLI=00000000-0000-4000-a098-000000000701

sql() { psql "$DB" -X -q -At -v ON_ERROR_STOP=1 -c "$1"; }
falha() { echo "falhou — $*" >&2; exit 1; }
confere() { if [ "$1" = "$2" ]; then echo "ok — $3"; else falha "$3 (esperado '$2', veio '$1')"; fi; }

limpa() {
  psql "$DB" -X -q -v ON_ERROR_STOP=1 >/dev/null 2>&1 <<SQL || true
delete from public.order_charge_locks where order_id::text like '00000000-0000-4000-c098-0000000007%';
delete from public.order_status_history where order_id::text like '00000000-0000-4000-c098-0000000007%';
delete from public.order_notifications where order_id::text like '00000000-0000-4000-c098-0000000007%';
delete from public.order_items where order_id::text like '00000000-0000-4000-c098-0000000007%';
delete from public.orders where id::text like '00000000-0000-4000-c098-0000000007%';
delete from public.customers where email like 'probe98-07%@exemplo.invalid';
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
confere "$(sql "select (value->>'pix_discount_percent')::numeric::text from public.store_settings where key = 'payment'")" "7" \
  "o PIX do banco local é 7% (a conta à mão abaixo depende dele)"

TOKEN="probe98-07-$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
HASH="$(printf '%s' "$TOKEN" | python3 -c 'import hashlib,sys; print(hashlib.sha256(sys.stdin.buffer.read()).hexdigest())')"

limpa
psql "$DB" -X -q -v ON_ERROR_STOP=1 >/dev/null <<SQL
insert into public.orders (id, customer_name, customer_email, payment_method, subtotal, shipping_cost, total, status, payment_status,
  promotion_discount, guest_access_hash, guest_access_expires_at, customer_document) values
  ('$TRAVA', 'Probe 07 travado', 'probe98-07a@exemplo.invalid', 'pix', 100, 20, 113, 'pending', 'pending',
   0, '$HASH', now() + interval '7 days', '39053344705'),
  ('$SEM', 'Probe 07 sem travado', 'probe98-07b@exemplo.invalid', 'pix', 100, 20, 113, 'pending', 'pending',
   9999, '$HASH', now() + interval '7 days', '39053344705');
-- Peça sem linha em products (o pin personalizado): o preço de origem é o gravado no item.
insert into public.order_items (order_id, product_id, product_name, quantity, unit_price, full_unit_price) values
  ('$TRAVA', 'probe98-07', 'Peça', 1, 100, 100), ('$SEM', 'probe98-07', 'Peça', 1, 100, 100);
-- Uma cliente logada, para a tabela vista pelo PostgREST com sessão.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
values ('00000000-0000-0000-0000-000000000000', '$CLI', 'authenticated', 'authenticated',
  'probe98-07-cliente@exemplo.invalid', extensions.crypt('probe98senha', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
insert into auth.identities (provider, provider_id, user_id, identity_data, last_sign_in_at, created_at, updated_at)
values ('email', '$CLI', '$CLI', jsonb_build_object('sub', '$CLI', 'email', 'probe98-07-cliente@exemplo.invalid', 'email_verified', true), now(), now(), now());
SQL

cobra() { # $1 = pedido · $2 = meio · imprime "<http> <code>"
  curl -s -o "$TMP/r.json" -w '%{http_code}' --max-time 60 -X POST "$URL/functions/v1/mercado-pago?action=create-payment" \
    -H "apikey: $APIKEY" -H 'Content-Type: application/json' \
    -d "{\"order_id\":\"$1\",\"method\":\"$2\",\"idempotency_key\":\"probe98-07-$1-$RANDOM\",\"access_token\":\"$TOKEN\"}" > "$TMP/http"
  printf '%s %s' "$(cat "$TMP/http")" "$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("code") or "-")' "$TMP/r.json" 2>/dev/null || echo '-')"
}
naoRecusou() { case "$1" in "400 -"|"502 -") echo "ok — $2 (o Mercado Pago de chave inválida respondeu $1)";; *) falha "$2 (veio '$1')";; esac; }

# -------------------------------------------------------------------------------------------------
# A primeira cobrança grava o travado
# -------------------------------------------------------------------------------------------------
confere "$(sql "select count(*) from public.order_charge_locks where order_id = '$TRAVA'")" "0" "antes: o pedido não tem valor travado"
naoRecusou "$(cobra "$TRAVA" pix)" "a primeira cobrança passa do cálculo e chega ao Mercado Pago"
confere "$(sql "select first_method || '|' || (pix->>'total') || '|' || (card->>'total') || '|' || (pix->>'pix_discount') || '|' || (pix->>'shipping') || '|' || jsonb_array_length(lines) from public.order_charge_locks where order_id = '$TRAVA'")" \
  "pix|113|120|7|20|1" "o travado: PIX 113,00 e cartão 120,00 (100 + 20, PIX de 7% sobre 100), uma linha"
confere "$(sql "select total::text from public.orders where id = '$TRAVA'")" "113.00" "o pedido diz 113,00 depois da primeira cobrança"

# -------------------------------------------------------------------------------------------------
# Pagar de novo cobra o travado — com o desconto exibido e o total do pedido forjados
# -------------------------------------------------------------------------------------------------
sql "update public.orders set promotion_discount = 9999, total = 1 where id = '$TRAVA'"
naoRecusou "$(cobra "$TRAVA" pix)" "pagar de novo no PIX não dá 422 com o desconto exibido acima do recálculo"
confere "$(sql "select total::text from public.orders where id = '$TRAVA'")" "113.00" "o pedido volta a 113,00 — o travado, nunca o total forjado"
confere "$(cobra "$TRAVA" card)" "400 -" "pagar de novo no cartão passa do cálculo, sem 422 (o 400 é o cartão ausente do corpo, depois do valor)"
confere "$(sql "select total::text from public.orders where id = '$TRAVA'")" "120.00" "no cartão o pedido diz 120,00 — o total do cartão travado na primeira cobrança"
confere "$(sql "select count(*) from public.order_charge_locks where order_id = '$TRAVA'")" "1" "pagar de novo não trava outra vez"

# -------------------------------------------------------------------------------------------------
# O par: sem valor travado, calculado como hoje
# -------------------------------------------------------------------------------------------------
confere "$(cobra "$SEM" pix)" "422 promotion_no_longer_valid" "pedido sem cobrança gravada e desconto exibido acima do recálculo ⇒ 422, como hoje"
confere "$(sql "select count(*) || '|' || (select total::text from public.orders where id = '$SEM') from public.order_charge_locks where order_id = '$SEM'")" \
  "0|113.00" "o 422 não trava nada e não toca no total do pedido"

# -------------------------------------------------------------------------------------------------
# A tabela nova não existe para a cliente
# -------------------------------------------------------------------------------------------------
CLI_JWT="$(curl -s --max-time 20 -X POST "$URL/auth/v1/token?grant_type=password" -H "apikey: $APIKEY" -H 'Content-Type: application/json' \
  -d '{"email":"probe98-07-cliente@exemplo.invalid","password":"probe98senha"}' | python3 -c 'import json,sys; print(json.load(sys.stdin).get("access_token",""))')"
[ -n "$CLI_JWT" ] || falha "a cliente da fixtura não entrou"

rest() { # $1 = bearer · $2 = método · $3 = corpo · imprime o status
  curl -s -o "$TMP/p.json" -w '%{http_code}' --max-time 20 -X "$2" "$URL/rest/v1/order_charge_locks?order_id=eq.$TRAVA" \
    -H "apikey: $APIKEY" -H "Authorization: Bearer $1" -H 'Content-Type: application/json' ${3:+-d "$3"}
}
LINHA="{\"order_id\":\"$SEM\",\"first_method\":\"pix\",\"pix\":{\"total\":0.01},\"lines\":[]}"
for quem in CLI ANON; do
  if [ "$quem" = CLI ]; then B="$CLI_JWT"; N="a cliente logada"; else B="$APIKEY"; N="a chave pública"; fi
  S="$(rest "$B" GET "")"; case "$S" in 401|403) echo "ok — $N não lê a tabela do travado ($S)";; *) falha "$N leu a tabela ($S: $(cat "$TMP/p.json"))";; esac
  S="$(curl -s -o "$TMP/p.json" -w '%{http_code}' --max-time 20 -X POST "$URL/rest/v1/order_charge_locks" \
    -H "apikey: $APIKEY" -H "Authorization: Bearer $B" -H 'Content-Type: application/json' -d "$LINHA")"
  case "$S" in 401|403) echo "ok — $N não grava na tabela do travado ($S)";; *) falha "$N gravou ($S)";; esac
  S="$(rest "$B" PATCH '{"pix":{"total":0.01}}')"; case "$S" in 401|403) echo "ok — $N não altera o travado ($S)";; *) falha "$N alterou ($S)";; esac
done
confere "$(sql "select (pix->>'total') || '|' || (select count(*) from public.order_charge_locks where order_id = '$SEM') from public.order_charge_locks where order_id = '$TRAVA'")" \
  "113|0" "o travado continua 113,00 e nada foi gravado para o outro pedido"

# No banco, numa transação desfeita: os papéis da cliente não têm privilégio nem policy na tabela.
R="$(psql "$DB" -X -q -At -v ON_ERROR_STOP=0 2>&1 <<SQL || true
begin;
select (select relrowsecurity from pg_class where oid = 'public.order_charge_locks'::regclass)
  || '|' || (select count(*) from pg_policies where schemaname = 'public' and tablename = 'order_charge_locks')
  || '|' || has_table_privilege('authenticated', 'public.order_charge_locks', 'select')
  || '|' || has_table_privilege('authenticated', 'public.order_charge_locks', 'insert')
  || '|' || has_table_privilege('anon', 'public.order_charge_locks', 'select')
  || '|' || has_table_privilege('anon', 'public.order_charge_locks', 'insert');
rollback;
SQL
)"
confere "$R" "true|0|false|false|false|false" "RLS ligada, nenhuma policy, e nenhum privilégio de leitura ou escrita para authenticated e anon"
