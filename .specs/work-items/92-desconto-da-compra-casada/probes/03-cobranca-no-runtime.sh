#!/usr/bin/env bash
# Probe contra o ambiente LOCAL (:54441): o `create-payment` servido pelo edge runtime local cobra o
# total que a tela mostrou com o desconto casado, e devolve 422 `buy_together_price_changed` quando o
# percentual cai entre a criação do pedido e o pagamento — antes de qualquer chamada ao Mercado Pago.
#
# Pré-condição: o edge runtime local de pé, servindo `mercado-pago` com uma chave do Mercado Pago de
# TESTE ou inválida no `--env-file` (supabase/CLAUDE.md › mercado-pago). A gravação de `orders.total`
# acontece ANTES da chamada ao MP, então o total é conferido no banco qualquer que seja a resposta dele.
# Sem o runtime, o probe para com exit 3 e não grava nada.
#
# Usa duas joias ativas sem adicional nenhum e um pedido de convidada criado aqui (o token de posse é
# gerado aqui e o banco guarda só o SHA-256, como o `create-order`). Apaga só o que criou.
set -u
API=http://127.0.0.1:54441
case "$API" in *127.0.0.1*|*localhost*) ;; *) echo "só local"; exit 2;; esac
SR=$(supabase status -o json 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin)["SERVICE_ROLE_KEY"])')
ANON=$(supabase status -o json 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin)["ANON_KEY"])')
H=(-H "apikey: $SR" -H "Authorization: Bearer $SR" -H "Content-Type: application/json" -H "Prefer: return=representation")
falhas=0
ok()  { echo "ok — $1"; }
bad() { echo "FALHA — $1 ($2)"; falhas=$((falhas+1)); }
js() { python3 -c "import sys,json;d=json.load(sys.stdin);print($1)"; }
FN="$API/functions/v1/mercado-pago?action=create-payment"

# 0. o runtime está de pé? (sem ele não há o que provar — e subir infraestrutura não é deste probe)
c=$(curl -s -o /dev/null -w '%{http_code}' -m 15 -X POST "$FN" -H "apikey: $ANON" -H 'Content-Type: application/json' -d '{}')
if [ "$c" != 400 ] && [ "$c" != 401 ]; then echo "runtime fora do ar (HTTP $c) — suba o edge runtime local e rode de novo"; exit 3; fi
ok "o create-payment sobe no runtime local (HTTP $c para corpo vazio)"

FK='product_buy_together!product_buy_together_product_id_fkey'
IDS=$(curl -s "${H[@]}" "$API/rest/v1/products?select=id,base_price,$FK(id)&is_active=eq.true&base_price=gt.0&order=id&limit=200" \
  | js '" ".join(["%s:%s" % (x["id"], x["base_price"]) for x in d if not x["product_buy_together"]][:2])')
set -- $IDS; J=${1%%:*}; JP=${1#*:}; C=${2%%:*}; CP=${2#*:}
[ -n "${2:-}" ] || { echo "FALHA — não há 2 joias sem adicional no banco local"; exit 1; }
PIX=$(curl -s "${H[@]}" "$API/rest/v1/store_settings?key=eq.payment&select=value" | js '(d[0]["value"].get("pix_discount_percent",0) if d else 0)')
TOKEN=$(python3 -c 'import secrets;print(secrets.token_urlsafe(32))')
HASH=$(printf '%s' "$TOKEN" | shasum -a 256 | cut -d' ' -f1)
# O que a tela mostrou: a joia + a peça com 10%, no PIX.
read SUB TOT DESC <<<"$(python3 -c "
r=lambda v: round(v+1e-9,2)
jp,cp,pix=float('$JP'),float('$CP'),float('$PIX')
peca=round(cp*90)/100; sub=r(jp+peca); px=r(sub*pix/100) if pix>0 else 0
print(sub, r(sub-px), r(cp-peca))")"
EXPIRA=$(python3 -c 'import datetime;print((datetime.datetime.utcnow()+datetime.timedelta(days=1)).isoformat()+"Z")')

A1=""; O=""
cleanup() {
  [ -n "$O" ] && curl -s -o /dev/null -X DELETE "${H[@]}" "$API/rest/v1/orders?id=eq.$O"
  [ -n "$A1" ] && curl -s -o /dev/null -X DELETE "${H[@]}" "$API/rest/v1/product_buy_together?id=eq.$A1"
}
trap cleanup EXIT

A1=$(curl -s -X POST "${H[@]}" "$API/rest/v1/product_buy_together" \
  -d "{\"product_id\":\"$J\",\"position\":0,\"kind\":\"product\",\"target_product_id\":\"$C\",\"discount_percent\":10}" | js 'd[0]["id"]')
O=$(curl -s -X POST "${H[@]}" "$API/rest/v1/orders" -d "{\"customer_name\":\"Probe 92\",\"customer_email\":\"probe92@exemplo.invalid\",\"customer_document\":\"39053344705\",\"payment_method\":\"pix\",\"payment_status\":\"pending\",\"status\":\"pending\",\"subtotal\":$SUB,\"total\":$TOT,\"buy_together_discount\":$DESC,\"guest_access_hash\":\"$HASH\",\"guest_access_expires_at\":\"$EXPIRA\"}" | js 'd[0]["id"]')
curl -s -o /dev/null -X POST "${H[@]}" "$API/rest/v1/order_items" -d "[{\"order_id\":\"$O\",\"product_id\":\"$J\",\"product_name\":\"Joia\",\"quantity\":1,\"unit_price\":$JP,\"full_unit_price\":$JP,\"price_source\":\"base\",\"accompanies_product_ids\":null},{\"order_id\":\"$O\",\"product_id\":\"$C\",\"product_name\":\"Peça\",\"quantity\":1,\"unit_price\":$(python3 -c "print(round(float('$CP')*90)/100)"),\"full_unit_price\":$CP,\"price_source\":\"base\",\"accompanies_product_ids\":[\"$J\"]}]"

# 1. o mesmo total da tela: gravado em `orders.total` antes da chamada ao MP
curl -s -o /dev/null -m 30 -X POST "$FN" -H "apikey: $ANON" -H 'Content-Type: application/json' \
  -d "{\"order_id\":\"$O\",\"method\":\"pix\",\"idempotency_key\":\"$(uuidgen)\",\"access_token\":\"$TOKEN\"}"
V=$(curl -s "${H[@]}" "$API/rest/v1/orders?id=eq.$O&select=total,buy_together_discount" | js '"%s/%s" % (float(d[0]["total"]), float(d[0]["buy_together_discount"]))')
[ "$V" = "$(python3 -c "print('%s/%s' % (float('$TOT'), float('$DESC')))")" ] && ok "o create-payment grava o total da tela ($V)" || bad "total gravado" "$V esperado $TOT/$DESC"

# 2. o percentual cai para 5% antes do pagamento ⇒ 422 com código próprio, nada cobrado
curl -s -o /dev/null -X PATCH "${H[@]}" "$API/rest/v1/product_buy_together?id=eq.$A1" -d '{"discount_percent":5}'
curl -s -o /dev/null -X PATCH "${H[@]}" "$API/rest/v1/orders?id=eq.$O" -d "{\"payment_status\":\"pending\",\"mp_order_id\":null,\"buy_together_discount\":$DESC,\"total\":$TOT}"
R=$(curl -s -w '\n%{http_code}' -m 30 -X POST "$FN" -H "apikey: $ANON" -H 'Content-Type: application/json' \
  -d "{\"order_id\":\"$O\",\"method\":\"pix\",\"idempotency_key\":\"$(uuidgen)\",\"access_token\":\"$TOKEN\"}")
c=$(echo "$R" | tail -1); corpo=$(echo "$R" | sed '$d')
{ [ "$c" = 422 ] && echo "$corpo" | grep -q buy_together_price_changed; } && ok "percentual que caiu ⇒ 422 buy_together_price_changed" || bad "422 do percentual" "$c $corpo"
M=$(curl -s "${H[@]}" "$API/rest/v1/orders?id=eq.$O&select=mp_order_id" | js 'd[0]["mp_order_id"]')
[ "$M" = None ] && ok "nenhuma order criada no Mercado Pago" || bad "mp_order_id depois do 422" "$M"

echo "falhas: $falhas"
[ "$falhas" = 0 ]
