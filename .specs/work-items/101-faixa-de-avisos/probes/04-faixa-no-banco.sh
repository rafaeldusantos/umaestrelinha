#!/usr/bin/env bash
# Probe da tarefa 04 (AD-012): a chave `announcements` de `store_settings`, contra o Supabase LOCAL.
#   1. o admin grava pelo mesmo upsert do painel (on_conflict=key);
#   2. a leitura anônima (a da loja) vê exatamente o que foi gravado;
#   3. a anônima NÃO grava;
#   4. o valor anterior é devolvido no fim (ou a linha some, se não existia).
# Só roda contra 127.0.0.1:54441. Nunca *.supabase.co.
set -euo pipefail

API="${API_URL:-http://127.0.0.1:54441}"
case "$API" in
  http://127.0.0.1:54441|http://localhost:54441) ;;
  *) echo "recusado: $API não é o Supabase local"; exit 2 ;;
esac
ANON="${ANON_KEY:?defina ANON_KEY (supabase status -o env)}"
falhou=0
ok() { echo "ok — $1"; }
ko() { echo "FALHOU — $1"; falhou=1; }

TOKEN=$(curl -s "$API/auth/v1/token?grant_type=password" -H "apikey: $ANON" -H 'Content-Type: application/json' \
  -d '{"email":"admin@umaestrelinha.dev","password":"admin123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

ANTES=$(curl -s "$API/rest/v1/store_settings?key=eq.announcements&select=value" -H "apikey: $ANON")

VALOR='{"enabled":true,"items":[{"id":"probe-1","kind":"text","highlight":"Frete grátis","text":"acima de R$ 300","linkLabel":"Ver ofertas","href":"/ofertas"}]}'

COD=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/rest/v1/store_settings?on_conflict=key" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -H 'Prefer: resolution=merge-duplicates,return=minimal' -d "{\"key\":\"announcements\",\"value\":$VALOR}")
[[ "$COD" =~ ^20 ]] && ok "o admin grava a chave announcements ($COD)" || ko "o admin não gravou ($COD)"

LIDO=$(curl -s "$API/rest/v1/store_settings?key=eq.announcements&select=value" -H "apikey: $ANON")
python3 - "$LIDO" "$VALOR" <<'PY' && ok "a leitura anônima vê o valor gravado, igual" || ko "a leitura anônima não bate"
import sys, json
lido, esperado = json.loads(sys.argv[1]), json.loads(sys.argv[2])
sys.exit(0 if lido == [{"value": esperado}] else 1)
PY

COD=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/rest/v1/store_settings?on_conflict=key" \
  -H "apikey: $ANON" -H 'Content-Type: application/json' -H 'Prefer: resolution=merge-duplicates,return=minimal' \
  -d '{"key":"announcements","value":{"enabled":true,"items":[]}}')
[[ "$COD" =~ ^20 ]] && ko "a anônima gravou ($COD)" || ok "a anônima não grava ($COD)"

LIDO2=$(curl -s "$API/rest/v1/store_settings?key=eq.announcements&select=value" -H "apikey: $ANON")
[ "$LIDO2" = "$LIDO" ] && ok "a tentativa anônima não mudou nada" || ko "a tentativa anônima mudou o valor"

# Devolve o estado de antes.
if [ "$ANTES" = "[]" ]; then
  curl -s -o /dev/null -X DELETE "$API/rest/v1/store_settings?key=eq.announcements" -H "apikey: $ANON" -H "Authorization: Bearer $TOKEN"
else
  V=$(python3 -c 'import sys,json;print(json.dumps(json.loads(sys.argv[1])[0]["value"]))' "$ANTES")
  curl -s -o /dev/null -X POST "$API/rest/v1/store_settings?on_conflict=key" -H "apikey: $ANON" -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -H 'Prefer: resolution=merge-duplicates,return=minimal' -d "{\"key\":\"announcements\",\"value\":$V}"
fi
DEPOIS=$(curl -s "$API/rest/v1/store_settings?key=eq.announcements&select=value" -H "apikey: $ANON")
[ "$DEPOIS" = "$ANTES" ] && ok "o estado de antes foi devolvido" || ko "o estado de antes NÃO foi devolvido"

exit $falhou
