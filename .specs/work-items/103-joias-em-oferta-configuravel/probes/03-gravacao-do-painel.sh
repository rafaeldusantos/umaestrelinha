#!/usr/bin/env bash
# Probe HTTP contra o banco LOCAL (:54441), com token de admin: o editor do bloco "Joias em oferta"
# grava EXATAMENTE como o painel chama —
#   · a seção com `config` e `campaign_id` (`useAdminHomeSections.updateSectionConfig`), ANTES dos itens;
#   · os itens por `curateSection` (delete + insert com as oito colunas), e a peça escolhida chega ao banco;
#   · a segunda seção com a MESMA campanha é recusada com `23505` nomeando o índice por campanha;
#   · a leitura das marcações (`fetchCampaignMarks`: contagem, depois páginas por `product_id`);
#   · a leitura das peças escolhidas (`fetchCampaignPieces`: `CAMPAIGN_PIECE_COLUMNS` por id).
# Prova que o painel grava (`AD-012`), não só que o tipo diz que grava. Nunca aponte para ambiente
# remoto. Limpa o que criou: as campanhas nascem DESLIGADAS (a exclusão "uma ligada por vez" não
# entra no caminho), e são apagadas no fim junto com as seções.
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

DEPOIS=$(python3 -c 'import datetime;print((datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(days=10)).isoformat())')
MAIS=$(python3 -c 'import datetime;print((datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(days=20)).isoformat())')
save() { curl -s -X POST "${A[@]}" "$API/rest/v1/rpc/save_campaign" -d "$1"; }

# 0. duas campanhas desligadas, e duas peças marcadas na primeira
CA=$(save "{\"p_id\":null,\"p_name\":\"Probe 103 A\",\"p_badge_text\":\"PROBE A\",\"p_band_color\":\"#161514\",\"p_accent_color\":\"#C2A063\",\"p_starts_at\":\"$DEPOIS\",\"p_ends_at\":\"$MAIS\",\"p_active\":false,\"p_percents\":[10]}" | py 'print(d)')
CB=$(save "{\"p_id\":null,\"p_name\":\"Probe 103 B\",\"p_badge_text\":\"PROBE B\",\"p_band_color\":\"#161514\",\"p_accent_color\":\"#C2A063\",\"p_starts_at\":\"$DEPOIS\",\"p_ends_at\":\"$MAIS\",\"p_active\":false,\"p_percents\":[10]}" | py 'print(d)')
{ [ ${#CA} = 36 ] && [ ${#CB} = 36 ]; } && ok "duas campanhas criadas pela RPC" || bad "criar campanhas" "$CA $CB"

PIDS=$(curl -s "${A[@]}" "$API/rest/v1/products?select=id&is_active=eq.true&order=id&limit=2" | py 'print(" ".join(x["id"] for x in d))')
P1=${PIDS% *}; P2=${PIDS#* }
n=$(curl -s -X POST "${A[@]}" -H "Prefer: resolution=merge-duplicates,return=representation" "$API/rest/v1/product_campaigns?on_conflict=product_id,campaign_id&select=product_id" -d "[{\"product_id\":\"$P1\",\"campaign_id\":\"$CA\",\"percent\":10},{\"product_id\":\"$P2\",\"campaign_id\":\"$CA\",\"percent\":10}]" | py 'print(len(d))')
[ "$n" = 2 ] && ok "duas peças marcadas na campanha A" || bad "marcar" "$n"

# 1. a leitura das marcações, como `fetchCampaignMarks`: conta, depois a página ordenada
total=$(curl -s -o /dev/null -D - "${A[@]}" -H "Prefer: count=exact" -I "$API/rest/v1/product_campaigns?select=product_id&campaign_id=eq.$CA" | tr -d '\r' | awk -F/ 'tolower($0) ~ /^content-range/ {print $2}')
[ "$total" = 2 ] && ok "a contagem das marcações da campanha A é 2" || bad "contagem" "$total"
ids=$(curl -s "${A[@]}" -H "Range: 0-999" "$API/rest/v1/product_campaigns?select=product_id,percent&campaign_id=eq.$CA&order=product_id" | py 'print(",".join(x["product_id"] for x in d))')
esperado=$(printf '%s\n%s\n' "$P1" "$P2" | sort | paste -sd, -)
[ "$ids" = "$esperado" ] && ok "a página traz as duas peças, em ordem de product_id" || bad "página das marcações" "$ids"

# 2. a seção nasce como `createSection` a cria: desligada, sem campanha
SID=$(curl -s -X POST "${A[@]}" "$API/rest/v1/home_sections?select=id" -d '{"type":"campaign_offers","position":9001,"active":false,"config":{}}' | py 'print(d[0]["id"])')
[ ${#SID} = 36 ] && ok "a seção campaign_offers nasce desligada" || bad "criar seção" "$SID"

# 3. `updateSectionConfig(id, config, campaignId)`: { config, campaign_id } numa escrita só
r=$(curl -s -X PATCH "${A[@]}" "$API/rest/v1/home_sections?id=eq.$SID&select=campaign_id,config" -d "{\"config\":{\"title\":\"Para o Natal\",\"subtitle\":\"Peças com desconto.\"},\"campaign_id\":\"$CA\"}" | py 'print(d[0]["campaign_id"], d[0]["config"]["title"], d[0]["config"]["subtitle"], sep="|")')
[ "$r" = "$CA|Para o Natal|Peças com desconto." ] && ok "a seção grava config e campaign_id" || bad "gravar seção" "$r"

# 4. `curateSection`: delete, depois o insert com as oito colunas (e só elas)
curl -s -o /dev/null -X DELETE "${A[@]}" "$API/rest/v1/home_section_items?section_id=eq.$SID"
n=$(curl -s -X POST "${A[@]}" "$API/rest/v1/home_section_items?select=id" -d "[{\"section_id\":\"$SID\",\"position\":1,\"category_id\":null,\"product_id\":\"$P2\",\"href\":null,\"image_url\":null,\"image_mobile_url\":null,\"alt\":null,\"title\":null,\"label_snapshot\":\"Peça do probe\"},{\"section_id\":\"$SID\",\"position\":2,\"category_id\":null,\"product_id\":\"$P1\",\"href\":null,\"image_url\":null,\"image_mobile_url\":null,\"alt\":null,\"title\":null,\"label_snapshot\":\"Outra peça\"}]" | py 'print(len(d))')
[ "$n" = 2 ] && ok "os itens entram com as oito colunas" || bad "inserir itens" "$n"
r=$(curl -s "${A[@]}" "$API/rest/v1/home_sections?id=eq.$SID&select=campaign_id,items:home_section_items(product_id,position)" | py 'print(d[0]["campaign_id"], ",".join(i["product_id"] for i in sorted(d[0]["items"], key=lambda i:i["position"])), sep="|")')
[ "$r" = "$CA|$P2,$P1" ] && ok "a peça escolhida chega ao banco, na ordem da dona, com a campanha" || bad "leitura da seção" "$r"

# 5. a mesma campanha num segundo bloco: 23505 nomeando o índice por campanha
S2=$(curl -s -X POST "${A[@]}" "$API/rest/v1/home_sections?select=id" -d '{"type":"campaign_offers","position":9002,"active":false,"config":{}}' | py 'print(d[0]["id"])')
r=$(curl -s -X PATCH "${A[@]}" "$API/rest/v1/home_sections?id=eq.$S2&select=id" -d "{\"config\":{},\"campaign_id\":\"$CA\"}" | py 'print(d.get("code"), "home_sections_campaign_offers_campaign_idx" in d.get("message",""), sep="|")')
[ "$r" = "23505|True" ] && ok "a segunda seção com a mesma campanha é recusada (23505, o índice nomeado)" || bad "colisão" "$r"
r=$(curl -s -X PATCH "${A[@]}" "$API/rest/v1/home_sections?id=eq.$S2&select=campaign_id" -d "{\"config\":{},\"campaign_id\":\"$CB\"}" | py 'print(d[0]["campaign_id"])')
[ "$r" = "$CB" ] && ok "com outra campanha, o segundo bloco grava" || bad "segundo bloco" "$r"

# 6. a leitura das peças escolhidas, como `fetchCampaignPieces`
r=$(curl -s "${A[@]}" "$API/rest/v1/products?select=id,name,is_active,base_price,original_price,product_variants(price,compare_price)&id=in.($P1,$P2)" | py 'print(len(d), all("product_variants" in x and "base_price" in x for x in d), sep="|")')
[ "$r" = "2|True" ] && ok "as peças escolhidas são lidas com preço, \"de\" e variações" || bad "leitura das peças" "$r"

# 7. limpeza: as seções da prova e as campanhas (as marcações saem junto)
curl -s -o /dev/null -X DELETE "${A[@]}" "$API/rest/v1/home_sections?id=in.($SID,$S2)"
curl -s -o /dev/null -X DELETE "${A[@]}" "$API/rest/v1/campaigns?id=in.($CA,$CB)"
n=$(curl -s "${A[@]}" "$API/rest/v1/home_sections?id=in.($SID,$S2)&select=id" | py 'print(len(d))')
m=$(curl -s "${A[@]}" "$API/rest/v1/product_campaigns?campaign_id=in.($CA,$CB)&select=product_id" | py 'print(len(d))')
{ [ "$n" = 0 ] && [ "$m" = 0 ]; } && ok "o probe limpou o que criou" || bad "limpeza" "$n $m"

echo "falhas: $falhas"
exit $falhas
