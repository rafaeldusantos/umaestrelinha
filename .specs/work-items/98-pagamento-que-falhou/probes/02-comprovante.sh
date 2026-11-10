#!/usr/bin/env bash
# Probe do bucket privado dos comprovantes (WI 98, tarefa 01), pela API de Storage LOCAL (:54441).
# Prova: o admin envia e gera URL assinada; a URL abre e EXPIRA; a cliente logada e o anon não leem
# nem assinam; o caminho público não serve o objeto. Limpa o que enviou (trap).
# Gate: exit 0 e só linhas "ok —".
set -euo pipefail
API=http://127.0.0.1:54441
DB=postgresql://postgres:postgres@127.0.0.1:54442/postgres
SEGREDO=super-secret-jwt-token-with-at-least-32-characters-long
ANON=$(supabase status -o json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["ANON_KEY"])')
ADMIN_ID=$(psql "$DB" -Atc "select user_id from public.user_roles where role='admin' order by user_id limit 1")
CLIENTE_ID=$(psql "$DB" -Atc "select u.id from auth.users u where not exists (select 1 from public.user_roles r where r.user_id=u.id and r.role='admin') order by u.id limit 1")
jwt() { python3 - "$1" "$SEGREDO" <<'PY'
import base64, hashlib, hmac, json, sys, time
b = lambda d: base64.urlsafe_b64encode(json.dumps(d, separators=(',', ':')).encode()).rstrip(b'=').decode()
h = b({"alg": "HS256", "typ": "JWT"})
p = b({"sub": sys.argv[1], "role": "authenticated", "aud": "authenticated", "exp": int(time.time()) + 600})
s = base64.urlsafe_b64encode(hmac.new(sys.argv[2].encode(), f"{h}.{p}".encode(), hashlib.sha256).digest()).rstrip(b'=').decode()
print(f"{h}.{p}.{s}")
PY
}
T_ADMIN=$(jwt "$ADMIN_ID"); T_CLIENTE=$(jwt "$CLIENTE_ID")
CAMINHO="00000000-0000-0000-0000-0000000098ff/probe-$(date +%s).png"
TMP=$(mktemp -d); printf '\x89PNG\r\n\x1a\nprobe' > "$TMP/c.png"
limpar() { curl -s -o /dev/null -X DELETE "$API/storage/v1/object/order-payment-receipts/$CAMINHO" -H "apikey: $ANON" -H "Authorization: Bearer $T_ADMIN" || true; rm -rf "$TMP"; }
trap limpar EXIT
falha() { echo "FALHOU — $*"; exit 1; }

c=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/storage/v1/object/order-payment-receipts/$CAMINHO" \
  -H "apikey: $ANON" -H "Authorization: Bearer $T_CLIENTE" -H 'Content-Type: image/png' --data-binary @"$TMP/c.png")
[ "$c" -ge 400 ] || falha "a cliente enviou ($c)"
echo "ok — a cliente logada não envia ao bucket ($c)"

c=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/storage/v1/object/order-payment-receipts/$CAMINHO" \
  -H "apikey: $ANON" -H "Authorization: Bearer $T_ADMIN" -H 'Content-Type: image/png' --data-binary @"$TMP/c.png")
[ "$c" = 200 ] || falha "o admin não enviou ($c)"
echo "ok — o admin envia"

c=$(curl -s -o /dev/null -w '%{http_code}' "$API/storage/v1/object/public/order-payment-receipts/$CAMINHO")
[ "$c" -ge 400 ] || falha "o caminho público serviu ($c)"
echo "ok — o caminho público não serve o comprovante ($c)"

for quem in "$T_CLIENTE" "$ANON"; do
  c=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/storage/v1/object/sign/order-payment-receipts/$CAMINHO" \
    -H "apikey: $ANON" -H "Authorization: Bearer $quem" -H 'Content-Type: application/json' -d '{"expiresIn":60}')
  [ "$c" -ge 400 ] || falha "assinou sem ser admin ($c)"
  c=$(curl -s -o /dev/null -w '%{http_code}' "$API/storage/v1/object/authenticated/order-payment-receipts/$CAMINHO" \
    -H "apikey: $ANON" -H "Authorization: Bearer $quem")
  [ "$c" -ge 400 ] || falha "leu sem ser admin ($c)"
done
echo "ok — a cliente logada e o anon não leem nem assinam"

URL=$(curl -s -X POST "$API/storage/v1/object/sign/order-payment-receipts/$CAMINHO" \
  -H "apikey: $ANON" -H "Authorization: Bearer $T_ADMIN" -H 'Content-Type: application/json' -d '{"expiresIn":2}' \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["signedURL"])')
c=$(curl -s -o /dev/null -w '%{http_code}' "$API/storage/v1$URL")
[ "$c" = 200 ] || falha "a URL assinada não abriu ($c)"
echo "ok — a URL assinada do admin abre"
python3 -c 'import time; time.sleep(4)'
c=$(curl -s -o /dev/null -w '%{http_code}' "$API/storage/v1$URL")
[ "$c" -ge 400 ] || falha "a URL assinada não expirou ($c)"
echo "ok — a URL assinada expira ($c)"
