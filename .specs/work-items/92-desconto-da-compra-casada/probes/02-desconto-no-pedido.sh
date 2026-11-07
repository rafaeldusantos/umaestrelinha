#!/usr/bin/env bash
# Probe HTTP contra o banco LOCAL (:54441): as colunas do desconto da compra casada no pedido
# (migration 20261107140000) — `orders.buy_together_discount`, `orders.order_bump_discount` e
# `order_items.full_unit_price` —, gravadas pelos mesmos verbos que o `create-order` (insert com a
# service role) e o `create-payment` (update por id) usam.
#
# Prova: as colunas existem para o PostgREST (nada de PGRST204); o insert grava o que veio; sem elas os
# descontos nascem 0 e o preço cheio nulo; o update regrava; o `check` recusa negativo (23514); a
# linha mista vira duas linhas da mesma peça. Só apaga o que criou (por id). Nunca aponte para remoto.
set -u
API=http://127.0.0.1:54441
case "$API" in *127.0.0.1*|*localhost*) ;; *) echo "só local"; exit 2;; esac
SR=$(supabase status -o json 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin)["SERVICE_ROLE_KEY"])')
H=(-H "apikey: $SR" -H "Authorization: Bearer $SR" -H "Content-Type: application/json" -H "Prefer: return=representation")
falhas=0
ok()  { echo "ok — $1"; }
bad() { echo "FALHA — $1 ($2)"; falhas=$((falhas+1)); }
js() { python3 -c "import sys,json;d=json.load(sys.stdin);print($1)"; }
PEDIDOS=""
cleanup() { [ -n "$PEDIDOS" ] && curl -s -o /dev/null -X DELETE "${H[@]}" "$API/rest/v1/orders?id=in.(${PEDIDOS#,})"; }
trap cleanup EXIT

pedido() { # json extra
  echo "{\"customer_name\":\"Probe 92\",\"customer_email\":\"probe92@exemplo.invalid\",\"payment_method\":\"pix\",\"subtotal\":450.1,\"total\":450.1$1}"
}

# 1. o insert do create-order grava os descontos por tipo
R=$(curl -s -w '\n%{http_code}' -X POST "${H[@]}" "$API/rest/v1/orders" -d "$(pedido ',"promotion_discount":3.95,"buy_together_discount":7.9,"order_bump_discount":20')")
c=$(echo "$R" | tail -1); corpo=$(echo "$R" | sed '$d')
if [ "$c" = 201 ]; then
  O1=$(echo "$corpo" | js 'd[0]["id"]'); PEDIDOS="$PEDIDOS,$O1"
  V=$(echo "$corpo" | js '"{}/{}/{}".format(float(d[0]["buy_together_discount"]), float(d[0]["order_bump_discount"]), float(d[0]["promotion_discount"]))')
  [ "$V" = "7.9/20.0/3.95" ] && ok "o pedido grava buy_together_discount, order_bump_discount e promotion_discount ($V)" || bad "valores do pedido" "$V"
else bad "insert do pedido com os descontos" "$c $corpo"; fi

# 2. sem as colunas, os descontos nascem zero
R=$(curl -s -X POST "${H[@]}" "$API/rest/v1/orders" -d "$(pedido '')")
O2=$(echo "$R" | js 'd[0]["id"]'); PEDIDOS="$PEDIDOS,$O2"
V=$(echo "$R" | js '"{}/{}".format(float(d[0]["buy_together_discount"]), float(d[0]["order_bump_discount"]))')
[ "$V" = "0.0/0.0" ] && ok "pedido sem as colunas nasce com os dois descontos em zero" || bad "default dos descontos" "$V"

# 3. a linha mista vira duas linhas da mesma peça, com o cobrado e o cheio
ITENS="[{\"order_id\":\"$O1\",\"product_id\":\"corrente\",\"product_name\":\"Corrente\",\"quantity\":1,\"unit_price\":71.1,\"full_unit_price\":79},{\"order_id\":\"$O1\",\"product_id\":\"corrente\",\"product_name\":\"Corrente\",\"quantity\":1,\"unit_price\":79,\"full_unit_price\":79},{\"order_id\":\"$O1\",\"product_id\":\"joia\",\"product_name\":\"Pingente\",\"quantity\":1,\"unit_price\":300,\"full_unit_price\":null}]"
R=$(curl -s -w '\n%{http_code}' -X POST "${H[@]}" "$API/rest/v1/order_items" -d "$ITENS")
c=$(echo "$R" | tail -1); corpo=$(echo "$R" | sed '$d')
if [ "$c" = 201 ]; then
  V=$(echo "$corpo" | js '",".join("{}:{}".format(float(x["unit_price"]), x["full_unit_price"]) for x in d)')
  [ "$V" = "71.1:79.0,79.0:79.0,300.0:None" ] && ok "as linhas gravam o cobrado e o cheio; sem o cheio, nulo ($V)" || bad "linhas" "$V"
  I1=$(echo "$corpo" | js 'd[0]["id"]')
else bad "insert das linhas" "$c $corpo"; I1=""; fi

# 4. o update do create-payment regrava o cobrado e o cheio, e os descontos do pedido
if [ -n "$I1" ]; then
  c=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "${H[@]}" "$API/rest/v1/order_items?id=eq.$I1" -d '{"unit_price":63.2,"full_unit_price":79}')
  V=$(curl -s "${H[@]}" "$API/rest/v1/order_items?id=eq.$I1&select=unit_price,full_unit_price" | js '"{}:{}".format(float(d[0]["unit_price"]), float(d[0]["full_unit_price"]))')
  [ "$c" = 200 ] && [ "$V" = "63.2:79.0" ] && ok "o update por id regrava a linha ($V)" || bad "update da linha" "$c $V"
fi
c=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "${H[@]}" "$API/rest/v1/orders?id=eq.$O1" -d '{"buy_together_discount":15.8,"order_bump_discount":0}')
V=$(curl -s "${H[@]}" "$API/rest/v1/orders?id=eq.$O1&select=buy_together_discount,order_bump_discount" | js '"{}/{}".format(float(d[0]["buy_together_discount"]), float(d[0]["order_bump_discount"]))')
[ "$c" = 200 ] && [ "$V" = "15.8/0.0" ] && ok "o update do pedido regrava os descontos ($V)" || bad "update do pedido" "$c $V"

# 5. o banco recusa negativo
for campo in buy_together_discount order_bump_discount; do
  R=$(curl -s -w '\n%{http_code}' -X POST "${H[@]}" "$API/rest/v1/orders" -d "$(pedido ",\"$campo\":-1")")
  c=$(echo "$R" | tail -1); corpo=$(echo "$R" | sed '$d')
  { [ "$c" = 400 ] && echo "$corpo" | grep -q 23514; } && ok "$campo negativo é recusado pelo check (23514)" || { bad "$campo negativo" "$c $corpo"; echo "$corpo" | grep -q '"id"' && PEDIDOS="$PEDIDOS,$(echo "$corpo" | js 'd[0]["id"]')"; }
done
R=$(curl -s -w '\n%{http_code}' -X POST "${H[@]}" "$API/rest/v1/order_items" -d "{\"order_id\":\"$O2\",\"product_id\":\"x\",\"product_name\":\"X\",\"quantity\":1,\"unit_price\":1,\"full_unit_price\":-1}")
c=$(echo "$R" | tail -1); corpo=$(echo "$R" | sed '$d')
{ [ "$c" = 400 ] && echo "$corpo" | grep -q 23514; } && ok "full_unit_price negativo é recusado pelo check (23514)" || bad "full_unit_price negativo" "$c $corpo"

echo "falhas: $falhas"
[ "$falhas" = 0 ]
