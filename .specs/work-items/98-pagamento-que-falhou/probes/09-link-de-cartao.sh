#!/usr/bin/env bash
# Probe do link de pagamento por cartão (WI 98, tarefa 06, UC-05) contra as functions SERVIDAS
# (`mercado-pago`, ação `card-link`, e `create-payment` com `card_link_token`; `checkout`, ação
# `get-card-link`) e a tabela `order_card_links` (migration `20261117120000_98-link-de-cartao.sql`):
#
#  - a admin gera o link de um pedido de cartão recusado: o banco guarda só o hash, um vivo;
#  - a leitura pelo token traz o número, o valor do cartão TRAVADO (120,00) e as peças, sem dado
#    pessoal (nome, e-mail, telefone, documento, endereço);
#  - pagar pelo link, sem login, passa da prova de posse e do cálculo e chega ao Mercado Pago (de
#    chave inválida), com o pedido dizendo 120,00 — o valor travado, nunca o total forjado do pedido;
#  - gerar outro link mata o anterior (leitura 404, pagamento 403) e deixa um vivo só;
#  - pedido de PIX não recebe link; cancelado e pago mostram a situação e recusam o pagamento;
#  - gerar o link não toca o pedido (o cancelamento automático não é adiado);
#  - a cliente e a chave pública não alcançam a tabela nem a RPC de emissão.
#
# Pré-condição: o Supabase local de pé (API :54441, Postgres :54442), com as migrations do WI 98
# aplicadas, e as functions `mercado-pago` e `checkout` JÁ SERVIDAS com chaves externas inválidas (este
# probe não sobe nem derruba processo). As fixturas são gravadas no banco LOCAL e apagadas no fim
# (trap), inclusive em falha. Gate: exit 0 e só linhas "ok —".
#   bash .specs/work-items/98-pagamento-que-falhou/probes/09-link-de-cartao.sh
set -euo pipefail
cd "$(dirname "$0")/../../../.."

DB="${DB:-postgresql://postgres:postgres@127.0.0.1:54442/postgres}"
URL="${URL:-http://127.0.0.1:54441}"
APIKEY="${APIKEY:-$(supabase status -o json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["PUBLISHABLE_KEY"])')}"
TMP="$(mktemp -d)"

CARTAO=00000000-0000-4000-c098-000000000901   # pedido de cartão recusado
PIX=00000000-0000-4000-c098-000000000902      # pedido de PIX: não recebe link
CLI=00000000-0000-4000-a098-000000000901

sql() { psql "$DB" -X -q -At -v ON_ERROR_STOP=1 -c "$1"; }
falha() { echo "falhou — $*" >&2; exit 1; }
confere() { if [ "$1" = "$2" ]; then echo "ok — $3"; else falha "$3 (esperado '$2', veio '$1')"; fi; }
sha() { printf '%s' "$1" | python3 -c 'import hashlib,sys; print(hashlib.sha256(sys.stdin.buffer.read()).hexdigest())'; }
campo() { python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(eval(sys.argv[2]))' "$TMP/r.json" "$1" 2>/dev/null || echo '-'; }

limpa() {
  psql "$DB" -X -q -v ON_ERROR_STOP=1 >/dev/null 2>&1 <<SQL || true
delete from public.order_card_links where order_id::text like '00000000-0000-4000-c098-0000000009%';
delete from public.order_charge_locks where order_id::text like '00000000-0000-4000-c098-0000000009%';
delete from public.order_status_history where order_id::text like '00000000-0000-4000-c098-0000000009%';
delete from public.order_notifications where order_id::text like '00000000-0000-4000-c098-0000000009%';
delete from public.order_items where order_id::text like '00000000-0000-4000-c098-0000000009%';
delete from public.orders where id::text like '00000000-0000-4000-c098-0000000009%';
delete from auth.identities where user_id = '$CLI';
delete from auth.users where id = '$CLI';
SQL
}
encerra() { limpa; rm -rf "$TMP"; }
trap encerra EXIT

sql "select 1" >/dev/null || falha "o banco local não responde em $DB"
[ -n "$APIKEY" ] || falha "não consegui ler a chave pública do Supabase local"
confere "$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -X POST "$URL/functions/v1/mercado-pago")" "400" "a function mercado-pago está servida"
confere "$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -X POST "$URL/functions/v1/checkout")" "400" "a function checkout está servida"

limpa
psql "$DB" -X -q -v ON_ERROR_STOP=1 >/dev/null <<SQL
insert into public.orders (id, customer_name, customer_email, customer_phone, customer_document, address_street, address_zip,
  payment_method, subtotal, shipping_cost, total, status, payment_status, created_at) values
  ('$CARTAO', 'Probe Nove Cartao', 'probe98-09a@exemplo.invalid', '51998124471', '39053344705', 'Rua Probe Nove', '91240010',
   'card', 100, 20, 1, 'pending', 'rejected', '2026-11-01T12:00:00Z'),
  ('$PIX', 'Probe Nove Pix', 'probe98-09b@exemplo.invalid', null, '39053344705', null, null,
   'pix', 100, 20, 113, 'pending', 'pending', '2026-11-01T12:00:00Z');
insert into public.order_items (order_id, product_id, product_name, variant_label, quantity, unit_price, full_unit_price) values
  ('$CARTAO', 'probe98-09', 'Peça probe nove', 'Prata', 1, 100, 100), ('$PIX', 'probe98-09', 'Peça', null, 1, 100, 100);
-- O valor travado na primeira cobrança (recusada): cartão 100 + frete 20 = 120,00.
insert into public.order_charge_locks (order_id, first_method, promotion_discount, buy_together_discount, order_bump_discount, pix, card, lines)
values ('$CARTAO', 'card', 0, 0, 0,
  '{"subtotal":100,"discount":0,"pix_discount":7,"shipping":20,"total":113}',
  '{"subtotal":100,"discount":0,"pix_discount":0,"shipping":20,"total":120}',
  '[{"product_id":"probe98-09","variant_id":null,"quantity":1,"unit_price":100,"full_unit_price":100}]');
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
values ('00000000-0000-0000-0000-000000000000', '$CLI', 'authenticated', 'authenticated',
  'probe98-09-cliente@exemplo.invalid', extensions.crypt('probe98senha', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
insert into auth.identities (provider, provider_id, user_id, identity_data, last_sign_in_at, created_at, updated_at)
values ('email', '$CLI', '$CLI', jsonb_build_object('sub', '$CLI', 'email', 'probe98-09-cliente@exemplo.invalid', 'email_verified', true), now(), now(), now());
SQL

token() {
  curl -s --max-time 20 -X POST "$URL/auth/v1/token?grant_type=password" -H "apikey: $APIKEY" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("access_token",""))'
}
ADMIN_JWT="$(token admin@umaestrelinha.dev admin123)"
CLI_JWT="$(token probe98-09-cliente@exemplo.invalid probe98senha)"
[ -n "$ADMIN_JWT" ] || falha "a admin do seed não entrou"
[ -n "$CLI_JWT" ] || falha "a cliente da fixtura não entrou"

gera() { # $1 = bearer · $2 = pedido · imprime o status; corpo em $TMP/r.json
  curl -s -o "$TMP/r.json" -w '%{http_code}' --max-time 30 -X POST "$URL/functions/v1/mercado-pago?action=card-link" \
    -H "apikey: $APIKEY" -H "Authorization: Bearer $1" -H 'Content-Type: application/json' -d "{\"order_id\":\"$2\"}"
}
le() { # $1 = token · imprime o status; corpo em $TMP/r.json
  curl -s -o "$TMP/r.json" -w '%{http_code}' --max-time 30 -X POST "$URL/functions/v1/checkout?action=get-card-link" \
    -H "apikey: $APIKEY" -H 'Content-Type: application/json' -d "{\"token\":\"$1\"}"
}
paga() { # $1 = token · imprime "<http> <code>"
  curl -s -o "$TMP/r.json" -w '%{http_code}' --max-time 60 -X POST "$URL/functions/v1/mercado-pago?action=create-payment" \
    -H "apikey: $APIKEY" -H 'Content-Type: application/json' \
    -d "{\"order_id\":\"$CARTAO\",\"method\":\"card\",\"idempotency_key\":\"probe98-09-$RANDOM\",\"card_link_token\":\"$1\",\"card\":{\"token\":\"tok\",\"payment_method_id\":\"visa\",\"installments\":1,\"payer\":{\"email\":\"quem@paga.test\"}}}" > "$TMP/http"
  printf '%s %s' "$(cat "$TMP/http")" "$(campo 'd.get("code") or "-"')"
}

# -------------------------------------------------------------------------------------------------
# Gerar o link
# -------------------------------------------------------------------------------------------------
confere "$(gera "$CLI_JWT" "$CARTAO")" "403" "a cliente logada não gera link (só admin)"
confere "$(gera "$ADMIN_JWT" "$PIX")" "409" "pedido de PIX não recebe link de cartão"
confere "$(sql "select count(*) from public.order_card_links where order_id = '$PIX'")" "0" "e nada é gravado para ele"
ANTES="$(sql "select created_at::text || '|' || coalesce(updated_at::text, '-') || '|' || status from public.orders where id = '$CARTAO'")"
confere "$(gera "$ADMIN_JWT" "$CARTAO")" "200" "a admin gera o link do pedido de cartão recusado"
LINK1="$(campo 'd["link"]')"
case "$LINK1" in http*://*/pagar-com-cartao\#*) echo "ok — a porta devolve o link da loja (/pagar-com-cartao#<token>), não o token solto";; *) falha "a porta não devolveu o link (veio '$LINK1')";; esac
confere "$(campo 'sorted(d.keys())')" "['link']" "a resposta traz só o link"
T1="${LINK1#*#}"
[ ${#T1} -ge 43 ] || falha "o token tem de ter 256 bits (veio '${T1}')"
confere "$(sql "select count(*) || '|' || bool_and(token_hash = '$(sha "$T1")') || '|' || bool_and(revoked_at is null) from public.order_card_links where order_id = '$CARTAO'")" \
  "1|true|true" "o banco guarda um link vivo, só o hash do token"
confere "$(sql "select count(*) from public.order_card_links where token_hash = '$T1'")" "0" "o token em claro não está no banco"
confere "$(sql "select created_at::text || '|' || coalesce(updated_at::text, '-') || '|' || status from public.orders where id = '$CARTAO'")" \
  "$ANTES" "gerar o link não toca o pedido (o cancelamento automático não é adiado)"

# -------------------------------------------------------------------------------------------------
# A leitura pelo token: o valor travado, sem dado pessoal
# -------------------------------------------------------------------------------------------------
confere "$(le "$T1")" "200" "o link abre o pedido sem login"
confere "$(campo 'd["order"]["amount"]')" "120" "o valor é o do cartão travado (120,00), não o total do pedido (1,00)"
confere "$(campo 'd["order"]["items"][0]["name"] + "|" + d["order"]["items"][0]["variant"]')" "Peça probe nove|Prata" "as peças do pedido"
for pessoal in 'Probe Nove' probe98-09a 51998124471 39053344705 'Rua Probe Nove' 91240010; do
  if grep -q "$pessoal" "$TMP/r.json"; then falha "a leitura trouxe '$pessoal'"; fi
done
echo "ok — a leitura não traz nome, e-mail, telefone, documento nem endereço"

# -------------------------------------------------------------------------------------------------
# Pagar pelo link
# -------------------------------------------------------------------------------------------------
R="$(paga "$T1")"
case "$R" in 400\ -|402\ -|502\ -|200\ -) echo "ok — pagar pelo link, sem login, passa da prova de posse e chega ao Mercado Pago (de chave inválida: $R)";; *) falha "pagar pelo link (veio '$R': $(cat "$TMP/r.json"))";; esac
confere "$(sql "select total::text from public.orders where id = '$CARTAO'")" "120.00" "o pedido passa a dizer 120,00 — o valor travado do cartão"

# -------------------------------------------------------------------------------------------------
# Gerar outro link mata o anterior
# -------------------------------------------------------------------------------------------------
confere "$(gera "$ADMIN_JWT" "$CARTAO")" "200" "a admin gera outro link"
T2="$(campo 'd["link"].split("#",1)[1]')"
confere "$(sql "select count(*) filter (where revoked_at is null) || '|' || count(*) filter (where revoked_at is not null) from public.order_card_links where order_id = '$CARTAO'")" \
  "1|1" "um vivo e um revogado"
confere "$(le "$T1")" "404" "o link antigo não abre mais"
confere "$(paga "$T1")" "403 -" "o link antigo não paga mais"
confere "$(le "$T2")" "200" "o link novo abre"

# -------------------------------------------------------------------------------------------------
# Cancelado e pago: a situação, sem pagamento
# -------------------------------------------------------------------------------------------------
sql "update public.orders set status = 'cancelled' where id = '$CARTAO'"
confere "$(le "$T2")" "200" "pedido cancelado: o link ainda abre"
confere "$(campo 'd.get("situation","-") + "|" + str("order" in d)')" "cancelled|False" "e mostra a situação, sem pedido a pagar"
confere "$(paga "$T2")" "409 order_cancelled" "pagar o cancelado pelo link é recusado"
sql "update public.orders set status = 'paid', payment_status = 'approved', paid_at = now() where id = '$CARTAO'"
le "$T2" >/dev/null
confere "$(campo 'd.get("situation","-") + "|" + str("order" in d)')" "paid|False" "pedido pago: a situação, sem pedido a pagar"
confere "$(paga "$T2")" "409 order_already_paid" "pagar o pago pelo link é recusado"
confere "$(gera "$ADMIN_JWT" "$CARTAO")" "409" "pedido pago não recebe link novo"

# -------------------------------------------------------------------------------------------------
# A tabela e a RPC não existem para a cliente
# -------------------------------------------------------------------------------------------------
for quem in CLI ANON; do
  if [ "$quem" = CLI ]; then B="$CLI_JWT"; N="a cliente logada"; else B="$APIKEY"; N="a chave pública"; fi
  S="$(curl -s -o "$TMP/p.json" -w '%{http_code}' --max-time 20 "$URL/rest/v1/order_card_links?order_id=eq.$CARTAO" -H "apikey: $APIKEY" -H "Authorization: Bearer $B")"
  case "$S" in 401|403) echo "ok — $N não lê a tabela do link ($S)";; *) falha "$N leu a tabela ($S: $(cat "$TMP/p.json"))";; esac
  S="$(curl -s -o "$TMP/p.json" -w '%{http_code}' --max-time 20 -X POST "$URL/rest/v1/rpc/issue_order_card_link" -H "apikey: $APIKEY" -H "Authorization: Bearer $B" \
    -H 'Content-Type: application/json' -d "{\"p_order_id\":\"$CARTAO\",\"p_token_hash\":\"$(sha x)\",\"p_created_by\":null}")"
  case "$S" in 401|403|404) echo "ok — $N não executa a emissão do link ($S)";; *) falha "$N executou a RPC ($S)";; esac
done
confere "$(sql "select count(*) from public.order_card_links where order_id = '$CARTAO'")" "2" "nada foi gravado pela cliente nem pela chave pública"
confere "$(sql "select (select relrowsecurity from pg_class where oid = 'public.order_card_links'::regclass) || '|' || (select count(*) from pg_policies where schemaname = 'public' and tablename = 'order_card_links') || '|' || has_table_privilege('authenticated', 'public.order_card_links', 'select') || '|' || has_table_privilege('anon', 'public.order_card_links', 'select') || '|' || has_function_privilege('authenticated', 'public.issue_order_card_link(uuid,text,uuid)', 'execute') || '|' || has_function_privilege('anon', 'public.issue_order_card_link(uuid,text,uuid)', 'execute')")" \
  "true|0|false|false|false|false" "RLS ligada, nenhuma policy, e nenhum privilégio para authenticated e anon"

# Um vivo por pedido: o banco recusa o segundo vivo gravado por fora da RPC (numa transação desfeita).
R="$(psql "$DB" -X -q -At -v ON_ERROR_STOP=0 2>&1 <<SQL || true
begin;
update public.order_card_links set revoked_at = null where order_id = '$CARTAO';
rollback;
SQL
)"
case "$R" in *order_card_links_one_alive*) echo "ok — o banco recusa dois links vivos no mesmo pedido";; *) falha "dois vivos passaram ($R)";; esac
