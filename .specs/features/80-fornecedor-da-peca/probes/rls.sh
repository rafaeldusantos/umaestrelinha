#!/usr/bin/env bash
# Feature 80 — FOR-01..03 provados por HTTP contra o Supabase local (porta 54441).
# Uso: bash rls.sh   (lê VITE_SUPABASE_PUBLISHABLE_KEY de apps/backoffice/.env)
set -u
cd "$(dirname "$0")/../../../.."
API=http://127.0.0.1:54441
KEY=$(grep '^VITE_SUPABASE_PUBLISHABLE_KEY=' apps/backoffice/.env | cut -d= -f2-)
TOKEN=$(curl -s "$API/auth/v1/token?grant_type=password" -H "apikey: $KEY" -H 'Content-Type: application/json' \
  -d '{"email":"admin@umaestrelinha.dev","password":"admin123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
PID=$(curl -s "$API/rest/v1/products?select=id&is_active=eq.true&limit=1" -H "apikey: $KEY" | python3 -c 'import sys,json;print(json.load(sys.stdin)[0]["id"])')
NOME="Probe Fornecedor $RANDOM"
req() { curl -s -o /tmp/probe80.body -w '%{http_code}' "$@"; }
adm=(-H "apikey: $KEY" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -H 'Prefer: return=representation')
pub=(-H "apikey: $KEY" -H 'Content-Type: application/json')

echo "1 anon lê suppliers:               $(req "$API/rest/v1/suppliers?select=id" "${pub[@]}") $(head -c 120 /tmp/probe80.body)"
echo "2 anon lê product_suppliers:       $(req "$API/rest/v1/product_suppliers?select=url" "${pub[@]}") $(head -c 120 /tmp/probe80.body)"
echo "3 anon grava supplier:             $(req -X POST "$API/rest/v1/suppliers" "${pub[@]}" -d "{\"name\":\"$NOME anon\"}") $(head -c 120 /tmp/probe80.body)"
echo "4 admin cria supplier:             $(req -X POST "$API/rest/v1/suppliers" "${adm[@]}" -d "{\"name\":\"$NOME\"}")"
SID=$(python3 -c 'import json;print(json.load(open("/tmp/probe80.body"))[0]["id"])')
UP=$(echo "$NOME" | tr '[:lower:]' '[:upper:]')
echo "5 admin duplica em maiúsculas:     $(req -X POST "$API/rest/v1/suppliers" "${adm[@]}" -d "{\"name\":\"  $UP \"}") $(head -c 90 /tmp/probe80.body)"
echo "6 admin vincula com link válido:   $(req -X POST "$API/rest/v1/product_suppliers?on_conflict=product_id" "${adm[@]}" -H 'Prefer: return=representation,resolution=merge-duplicates' -d "{\"product_id\":\"$PID\",\"supplier_id\":\"$SID\",\"url\":\"https://exemplo.com/peca/1\"}")"
echo "7 admin link sem http:             $(req -X PATCH "$API/rest/v1/product_suppliers?product_id=eq.$PID" "${adm[@]}" -d '{"url":"javascript:alert(1)"}') $(head -c 90 /tmp/probe80.body)"
echo "8 admin lê o embed no produto:     $(req "$API/rest/v1/products?select=id,product_suppliers(url,suppliers(name))&id=eq.$PID" "${adm[@]}") $(head -c 160 /tmp/probe80.body)"
echo "9 anon lê o MESMO embed:           $(req "$API/rest/v1/products?select=id,product_suppliers(url)&id=eq.$PID" "${pub[@]}") $(head -c 160 /tmp/probe80.body)"
echo "10 apagar supplier em uso:         $(req -X DELETE "$API/rest/v1/suppliers?id=eq.$SID" "${adm[@]}") $(head -c 90 /tmp/probe80.body)"
# limpeza
req -X DELETE "$API/rest/v1/product_suppliers?product_id=eq.$PID" "${adm[@]}" >/dev/null
req -X DELETE "$API/rest/v1/suppliers?id=eq.$SID" "${adm[@]}" >/dev/null
echo "limpeza: $(req "$API/rest/v1/suppliers?select=id&name=ilike.Probe*" "${adm[@]}") $(cat /tmp/probe80.body)"
