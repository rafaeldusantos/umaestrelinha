#!/usr/bin/env bash
# Probe do meio informado à cliente (WI 98, tarefa 05), contra o Supabase LOCAL (:54441/:54442) e a
# function `checkout` servida localmente.
# Prova: o `get-order` (convidada, pelo token) devolve `manual_payment.method` do registro VIVO e não
# devolve observação, comprovante nem autor; a RPC `customer_manual_payment` devolve o meio só à dona
# do pedido (outra cliente: zero linhas; anon: recusado); a tabela segue fechada à cliente.
# Monta um pedido e um registro de teste, e apaga tudo no fim (trap).
# Gate: exit 0 e só linhas "ok —".
set -euo pipefail
API=http://127.0.0.1:54441
DB=postgresql://postgres:postgres@127.0.0.1:54442/postgres
SEGREDO=super-secret-jwt-token-with-at-least-32-characters-long
ANON=$(supabase status -o json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["ANON_KEY"])')
read -r CUST_ID DONA_ID <<<"$(psql "$DB" -AtF' ' -c "select c.id, c.user_id from public.customers c where c.user_id is not null and not exists (select 1 from public.user_roles r where r.user_id=c.user_id and r.role='admin') order by c.id limit 1")"
OUTRA_ID=$(psql "$DB" -Atc "select u.id from auth.users u where u.id <> '$DONA_ID' and not exists (select 1 from public.user_roles r where r.user_id=u.id and r.role='admin') order by u.id limit 1")
jwt() { python3 - "$1" "$SEGREDO" <<'PY'
import base64, hashlib, hmac, json, sys, time
b = lambda d: base64.urlsafe_b64encode(json.dumps(d, separators=(',', ':')).encode()).rstrip(b'=').decode()
h = b({"alg": "HS256", "typ": "JWT"})
p = b({"sub": sys.argv[1], "role": "authenticated", "aud": "authenticated", "exp": int(time.time()) + 600})
s = base64.urlsafe_b64encode(hmac.new(sys.argv[2].encode(), f"{h}.{p}".encode(), hashlib.sha256).digest()).rstrip(b'=').decode()
print(f"{h}.{p}.{s}")
PY
}
T_DONA=$(jwt "$DONA_ID"); T_OUTRA=$(jwt "$OUTRA_ID")
TOKEN="probe-meio-$(date +%s)-$RANDOM"
HASH=$(printf '%s' "$TOKEN" | shasum -a 256 | cut -d' ' -f1)
NOTA='Observacao interna do probe 08'
CAMINHO='probe-08/comprovante-secreto.pdf'

PEDIDO=$(psql "$DB" -Atc "insert into public.orders (customer_id, customer_name, customer_email, payment_method, subtotal, total, status, payment_status, paid_at, guest_access_hash, guest_access_expires_at)
  values ('$CUST_ID', 'Probe 08', 'probe08@exemplo.invalid', 'pix', 100, 100, 'paid', 'approved', now(), '$HASH', now() + interval '1 day') returning id" | head -1)
limpar() { psql "$DB" -qAtc "delete from public.orders where id = '$PEDIDO'" >/dev/null || true; }
trap limpar EXIT
falha() { echo "FALHOU — $*"; exit 1; }

psql "$DB" -qAtc "insert into public.order_manual_payments (order_id, method, paid_at, note, created_by_name, previous_payment_status, undone_at)
  values ('$PEDIDO', 'pix_direto', now(), 'registro desfeito', 'Adri', 'pending', now())" >/dev/null
VIVO=$(psql "$DB" -Atc "insert into public.order_manual_payments (order_id, method, paid_at, note, created_by_name, previous_payment_status)
  values ('$PEDIDO', 'transferencia', now(), '$NOTA', 'Adri Muniz', 'pending') returning id" | head -1)
psql "$DB" -qAtc "insert into public.order_manual_payment_receipts (manual_payment_id, path, content_type, size_bytes)
  values ('$VIVO', '$CAMINHO', 'application/pdf', 10)" >/dev/null

# 1 · a convidada, pelo token
CORPO=$(curl -s -X POST "$API/functions/v1/checkout?action=get-order" -H "apikey: $ANON" -H 'Content-Type: application/json' \
  -d "{\"order_id\":\"$PEDIDO\",\"access_token\":\"$TOKEN\"}")
METODO=$(printf '%s' "$CORPO" | python3 -c 'import json,sys; o=json.load(sys.stdin)["order"]; print(json.dumps(o.get("manual_payment")))')
[ "$METODO" = '{"method": "transferencia"}' ] || falha "get-order devolveu manual_payment=$METODO"
echo "ok — get-order devolve o meio do registro vivo: $METODO"
for proibido in "$NOTA" "$CAMINHO" 'Adri Muniz' 'registro desfeito' 'created_by' 'receipts'; do
  printf '%s' "$CORPO" | grep -q -- "$proibido" && falha "get-order vazou: $proibido"
done
echo "ok — get-order não devolve observação, comprovante nem autor"

# 2 · a dona, com sessão, pela RPC
R=$(curl -s -X POST "$API/rest/v1/rpc/customer_manual_payment" -H "apikey: $ANON" -H "Authorization: Bearer $T_DONA" \
  -H 'Content-Type: application/json' -d "{\"p_order_id\":\"$PEDIDO\"}")
[ "$R" = '[{"method":"transferencia"}]' ] || falha "RPC da dona devolveu $R"
echo "ok — a RPC devolve só o meio à dona do pedido: $R"

# 3 · outra cliente: zero linhas
R=$(curl -s -X POST "$API/rest/v1/rpc/customer_manual_payment" -H "apikey: $ANON" -H "Authorization: Bearer $T_OUTRA" \
  -H 'Content-Type: application/json' -d "{\"p_order_id\":\"$PEDIDO\"}")
[ "$R" = '[]' ] || falha "a RPC respondeu a outra cliente: $R"
echo "ok — outra cliente não lê o meio (zero linhas)"

# 4 · anon: recusado
c=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/rest/v1/rpc/customer_manual_payment" -H "apikey: $ANON" \
  -H 'Content-Type: application/json' -d "{\"p_order_id\":\"$PEDIDO\"}")
[ "$c" -ge 400 ] || falha "anon chamou a RPC ($c)"
echo "ok — anon não chama a RPC ($c)"

# 5 · a tabela continua fechada à dona
R=$(curl -s "$API/rest/v1/order_manual_payments?select=method,note&order_id=eq.$PEDIDO" -H "apikey: $ANON" -H "Authorization: Bearer $T_DONA")
[ "$R" = '[]' ] || printf '%s' "$R" | grep -q '"code"' || falha "a dona leu a tabela: $R"
echo "ok — a tabela do registro segue fechada à cliente"

# 6 · desfeito o registro, nada
psql "$DB" -qAtc "update public.order_manual_payments set undone_at = now() where id = '$VIVO'" >/dev/null
R=$(curl -s -X POST "$API/rest/v1/rpc/customer_manual_payment" -H "apikey: $ANON" -H "Authorization: Bearer $T_DONA" \
  -H 'Content-Type: application/json' -d "{\"p_order_id\":\"$PEDIDO\"}")
[ "$R" = '[]' ] || falha "registro desfeito ainda aparece na RPC: $R"
METODO=$(curl -s -X POST "$API/functions/v1/checkout?action=get-order" -H "apikey: $ANON" -H 'Content-Type: application/json' \
  -d "{\"order_id\":\"$PEDIDO\",\"access_token\":\"$TOKEN\"}" | python3 -c 'import json,sys; print(json.dumps(json.load(sys.stdin)["order"].get("manual_payment")))')
[ "$METODO" = 'null' ] || falha "registro desfeito ainda aparece no get-order: $METODO"
echo "ok — registro desfeito: nem a RPC nem o get-order mostram meio"
