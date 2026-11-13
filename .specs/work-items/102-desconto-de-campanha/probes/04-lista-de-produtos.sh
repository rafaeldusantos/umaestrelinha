#!/usr/bin/env bash
# Probe HTTP contra o banco LOCAL (:54441): a lista de produtos do painel filtrada pela campanha e a
# edição em massa. Faz EXATAMENTE as chamadas do painel — o filtro da lista
# (`apps/backoffice/src/entities/product/api/useAdminProducts.ts`: o embed `!inner` com apelido e os
# dois `eq`), o embed de exibição da linha, e a porta das marcações em lote
# (`entities/campaign/api/campaignWrite.ts`, `setProductsCampaign`: upsert com `on_conflict`, e
# delete por `product_id=in.(…)` para tirar). Prova também que pôr e tirar da campanha não toca no
# preço de sempre da peça. Nunca aponte para ambiente remoto. Limpa o que criou.
set -u
API=http://127.0.0.1:54441
ANON=$(supabase status -o json 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin)["ANON_KEY"])')
H=(-H "apikey: $ANON" -H "Content-Type: application/json")
falhas=0
ok()  { echo "ok — $1"; }
bad() { echo "FALHA — $1 ($2)"; falhas=$((falhas+1)); }
py() { python3 -c "import sys,json;d=json.load(sys.stdin);$1"; }

TOKEN=$(curl -s "$API/auth/v1/token?grant_type=password" "${H[@]}" -d '{"email":"admin@umaestrelinha.dev","password":"admin123"}' | py 'print(d["access_token"])')
A=(-H "apikey: $ANON" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Prefer: return=representation")

# Desligada e longe no futuro: não cruza nenhuma campanha ligada da base local.
INI=$(python3 -c 'import datetime;print((datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(days=400)).isoformat())')
FIM=$(python3 -c 'import datetime;print((datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(days=410)).isoformat())')
CID=$(curl -s -X POST "${A[@]}" "$API/rest/v1/rpc/save_campaign" -d "{\"p_id\":null,\"p_name\":\"Probe lista\",\"p_badge_text\":\"PROBE\",\"p_band_color\":\"#161514\",\"p_accent_color\":\"#C2A063\",\"p_starts_at\":\"$INI\",\"p_ends_at\":\"$FIM\",\"p_active\":false,\"p_percents\":[10,20]}" | py 'print(d)')
[ ${#CID} = 36 ] && ok "campanha do probe criada" || { bad "criar campanha" "$CID"; exit 1; }

PIDS=$(curl -s "${A[@]}" "$API/rest/v1/products?select=id&order=id&limit=3" | py 'print(" ".join(x["id"] for x in d))')
read -r P1 P2 P3 <<<"$PIDS"
precos() { curl -s "${A[@]}" "$API/rest/v1/products?select=id,base_price,original_price,price,compare_price&id=in.($P1,$P2,$P3)&order=id" | py 'print(json.dumps(d,sort_keys=True))'; }
ANTES=$(precos)

# 1. a porta em lote: as três peças em 20% num upsert só
n=$(curl -s -X POST "${A[@]}" -H "Prefer: resolution=merge-duplicates,return=representation" "$API/rest/v1/product_campaigns?on_conflict=product_id,campaign_id&select=product_id" -d "[{\"product_id\":\"$P1\",\"campaign_id\":\"$CID\",\"percent\":20},{\"product_id\":\"$P2\",\"campaign_id\":\"$CID\",\"percent\":20},{\"product_id\":\"$P3\",\"campaign_id\":\"$CID\",\"percent\":20}]" | py 'print(len(d))')
[ "$n" = 3 ] && ok "marcar três peças em 20% grava três" || bad "marcar em lote" "$n"
# e uma delas de novo, em 10% (trocar o percentual de quem já está)
n=$(curl -s -X POST "${A[@]}" -H "Prefer: resolution=merge-duplicates,return=representation" "$API/rest/v1/product_campaigns?on_conflict=product_id,campaign_id&select=product_id" -d "[{\"product_id\":\"$P3\",\"campaign_id\":\"$CID\",\"percent\":10}]" | py 'print(len(d))')
[ "$n" = 1 ] && ok "remarcar uma peça em 10%" || bad "remarcar" "$n"

# 2. o filtro da lista: o embed `!inner` com apelido, filtrado no servidor
SEL='id,base_price,product_campaigns(campaign_id,percent),filtro_campanha:product_campaigns!inner(campaign_id,percent)'
lista() { curl -s -G "${A[@]}" "$API/rest/v1/products" --data-urlencode "select=$SEL" --data-urlencode "filtro_campanha.campaign_id=eq.$CID" "$@" | py 'print(" ".join(sorted(x["id"] for x in d)))'; }
r=$(lista); e=$(printf '%s\n' "$P1" "$P2" "$P3" | sort | xargs)
[ "$r" = "$e" ] && ok "filtrar pela campanha devolve as três peças, e só elas" || bad "filtro pela campanha" "$r"
r=$(lista --data-urlencode "filtro_campanha.percent=eq.20"); e=$(printf '%s\n' "$P1" "$P2" | sort | xargs)
[ "$r" = "$e" ] && ok "campanha E 20% devolve as duas em 20%" || bad "filtro 20%" "$r"
r=$(lista --data-urlencode "filtro_campanha.percent=eq.10")
[ "$r" = "$P3" ] && ok "campanha E 10% devolve a de 10%" || bad "filtro 10%" "$r"

# 3. a contagem exata do filtro (o rodapé da lista)
cr=$(curl -s -G -D - -o /dev/null "${A[@]}" -H "Prefer: count=exact" -H "Range: 0-24" "$API/rest/v1/products" --data-urlencode "select=$SEL" --data-urlencode "filtro_campanha.campaign_id=eq.$CID" | tr -d '\r' | awk -F'/' 'tolower($0) ~ /^content-range/ {print $2}')
[ "$cr" = 3 ] && ok "o count exato do filtro é 3" || bad "count do filtro" "$cr"

# 4. o embed de exibição traz a marcação da peça
p=$(curl -s -G "${A[@]}" "$API/rest/v1/products" --data-urlencode "select=id,product_campaigns(campaign_id,percent)" --data-urlencode "id=eq.$P3" | py "print([m['percent'] for m in d[0]['product_campaigns'] if m['campaign_id']=='$CID'])")
[ "$p" = "[10]" ] && ok "a linha lê a marcação da peça (10%)" || bad "embed de exibição" "$p"

# 5. o preço de sempre não mudou
[ "$(precos)" = "$ANTES" ] && ok "marcar não mexe em base_price/original_price/price/compare_price" || bad "preço mudou ao marcar" "$(precos)"

# 6. tirar da campanha: a porta com percentual nulo (delete por product_id=in.(…))
n=$(curl -s -X DELETE "${A[@]}" "$API/rest/v1/product_campaigns?campaign_id=eq.$CID&product_id=in.($P1,$P2,$P3)&select=product_id" | py 'print(len(d))')
[ "$n" = 3 ] && ok "tirar as três peças da campanha" || bad "tirar em lote" "$n"
r=$(lista)
[ "$r" = "" ] && ok "depois de tirar, o filtro da campanha fica vazio" || bad "filtro depois de tirar" "$r"
[ "$(precos)" = "$ANTES" ] && ok "tirar devolve o preço de sempre — os mesmos de antes" || bad "preço mudou ao tirar" "$(precos)"

# limpeza
n=$(curl -s -X DELETE "${A[@]}" "$API/rest/v1/campaigns?id=eq.$CID&select=id" | py 'print(len(d))')
[ "$n" = 1 ] && ok "campanha do probe apagada" || bad "limpeza" "$n"

echo "falhas: $falhas"
exit $falhas
