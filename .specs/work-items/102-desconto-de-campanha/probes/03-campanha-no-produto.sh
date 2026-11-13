#!/usr/bin/env bash
# Probe HTTP contra o banco LOCAL (:54441): o cadastro da peça LÊ e GRAVA a marcação da campanha.
# - a carga do formulário (`PRODUCT_FORM_SELECT`, lido do próprio fonte) traz o embed
#   `product_campaigns(campaign_id, percent)` — sem ele, o cartão abriria sempre em "Nenhum";
# - o Salvar grava pela porta (`setProductsCampaign`): upsert com `on_conflict=product_id,campaign_id`
#   e, no "Nenhum", delete por campanha + `in(product_id)` — e a releitura da carga mostra o efeito;
# - `base_price`/`original_price` da peça não mudam em nenhum passo (o preço cadastrado nunca muda).
# Nunca aponte para ambiente remoto. Limpa o que criou.
set -u
cd "$(dirname "$0")/../../../.."
API=http://127.0.0.1:54441
ANON=$(supabase status -o json 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin)["ANON_KEY"])')
H=(-H "apikey: $ANON" -H "Content-Type: application/json")
falhas=0
ok()  { echo "ok — $1"; }
bad() { echo "FALHA — $1 ($2)"; falhas=$((falhas+1)); }
py() { python3 -c "import sys,json;d=json.load(sys.stdin);$1"; }

SELECT=$(python3 - <<'EOF'
import re
s=open('apps/backoffice/src/features/product-form/model/useProductForm.ts').read()
m=re.search(r"export const PRODUCT_FORM_SELECT =\s*'([^']*)'", s)
print(m.group(1))
EOF
)
case "$SELECT" in *"product_campaigns(campaign_id, percent)"*) ok "o select da carga pede o embed da campanha";; *) bad "select sem o embed" "$SELECT";; esac
SEL=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1], safe="(),*!_"))' "$SELECT")

TOKEN=$(curl -s "$API/auth/v1/token?grant_type=password" "${H[@]}" -d '{"email":"admin@umaestrelinha.dev","password":"admin123"}' | py 'print(d["access_token"])')
A=(-H "apikey: $ANON" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Prefer: return=representation")

# Uma campanha agendada bem no futuro, para não cruzar com nenhuma ligada.
CID=$(curl -s -X POST "${A[@]}" "$API/rest/v1/rpc/save_campaign" -d '{"p_id":null,"p_name":"Probe Produto","p_badge_text":"PROBE","p_band_color":"#161514","p_accent_color":"#C2A063","p_starts_at":"2031-01-01T03:00:00Z","p_ends_at":"2031-01-11T03:00:00Z","p_active":true,"p_percents":[10,15,20]}' | py 'print(d)')
[ ${#CID} = 36 ] && ok "campanha do probe criada" || { bad "criar campanha" "$CID"; exit 1; }

P=$(curl -s "${H[@]}" "$API/rest/v1/products?select=id&order=id&limit=1" | py 'print(d[0]["id"])')
precos() { curl -s "${A[@]}" "$API/rest/v1/products?id=eq.$P&select=base_price,original_price" | py 'print(d[0]["base_price"], d[0]["original_price"])'; }
ANTES=$(precos)
marca() { curl -s "${A[@]}" "$API/rest/v1/products?id=eq.$P&select=$SEL" | py "print(','.join(str(m['percent']) for m in d[0]['product_campaigns'] if m['campaign_id']=='$CID') or 'nenhuma')"; }

c=$(curl -s -o /dev/null -w '%{http_code}' "${A[@]}" "$API/rest/v1/products?id=eq.$P&select=$SEL")
[ "$c" = 200 ] && ok "a carga do formulário com o embed responde 200" || bad "carga do formulário" "$c"
m=$(marca)
[ "$m" = nenhuma ] && ok "antes de marcar, a carga não traz marcação nesta campanha" || bad "marcação antes" "$m"

# O Salvar com 20%: o upsert da porta.
n=$(curl -s -X POST "${A[@]}" -H "Prefer: resolution=merge-duplicates,return=representation" "$API/rest/v1/product_campaigns?on_conflict=product_id,campaign_id&select=product_id" -d "[{\"product_id\":\"$P\",\"campaign_id\":\"$CID\",\"percent\":20}]" | py 'print(len(d))')
[ "$n" = 1 ] && ok "o upsert da porta grava a peça em 20%" || bad "upsert" "$n"
m=$(marca)
[ "$m" = 20 ] && ok "a releitura da carga traz 20% nesta campanha" || bad "releitura" "$m"

# Trocar para 10% (o mesmo upsert, sem duplicar).
curl -s -o /dev/null -X POST "${A[@]}" -H "Prefer: resolution=merge-duplicates,return=representation" "$API/rest/v1/product_campaigns?on_conflict=product_id,campaign_id&select=product_id" -d "[{\"product_id\":\"$P\",\"campaign_id\":\"$CID\",\"percent\":10}]"
m=$(marca)
[ "$m" = 10 ] && ok "trocar para 10% troca a marcação, sem duplicar" || bad "trocar" "$m"

# "Nenhum": o delete da porta.
n=$(curl -s -X DELETE "${A[@]}" "$API/rest/v1/product_campaigns?campaign_id=eq.$CID&product_id=in.($P)&select=product_id" | py 'print(len(d))')
[ "$n" = 1 ] && ok "\"Nenhum\" apaga a marcação" || bad "delete" "$n"
m=$(marca)
[ "$m" = nenhuma ] && ok "a releitura da carga volta sem marcação" || bad "releitura depois do Nenhum" "$m"

DEPOIS=$(precos)
[ "$ANTES" = "$DEPOIS" ] && ok "base_price e original_price da peça não mudaram ($DEPOIS)" || bad "preço mudou" "$ANTES → $DEPOIS"

# Limpeza.
curl -s -o /dev/null -X DELETE "${A[@]}" "$API/rest/v1/campaigns?id=eq.$CID"
n=$(curl -s "${A[@]}" "$API/rest/v1/campaigns?id=eq.$CID&select=id" | py 'print(len(d))')
[ "$n" = 0 ] && ok "campanha do probe apagada" || bad "limpeza" "$n"

echo "falhas: $falhas"
exit $falhas
