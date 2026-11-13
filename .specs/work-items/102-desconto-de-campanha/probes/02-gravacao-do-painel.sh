#!/usr/bin/env bash
# Probe HTTP contra o banco LOCAL (:54441): a gravação das campanhas pelo painel faz EXATAMENTE as
# chamadas da porta (`apps/backoffice/src/entities/campaign/api/campaignWrite.ts`) — criar e editar
# pela RPC `save_campaign`, marcar e tirar peças por `product_campaigns` (upsert com `on_conflict`),
# encerrar com o `ends_at` de agora, apagar só sem pedido. Prova que o painel grava (não só que o
# tipo diz que grava). Nunca aponte para ambiente remoto. Limpa o que criou.
set -u
API=http://127.0.0.1:54441
ANON=$(supabase status -o json 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin)["ANON_KEY"])')
H=(-H "apikey: $ANON" -H "Content-Type: application/json")
falhas=0
ok()  { echo "ok — $1"; }
bad() { echo "FALHA — $1 ($2)"; falhas=$((falhas+1)); }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
py() { python3 -c "import sys,json;d=json.load(sys.stdin);$1"; }

TOKEN=$(curl -s "$API/auth/v1/token?grant_type=password" "${H[@]}" -d '{"email":"admin@umaestrelinha.dev","password":"admin123"}' | py 'print(d["access_token"])')
A=(-H "apikey: $ANON" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Prefer: return=representation")

AGORA=$(python3 -c 'import datetime;print(datetime.datetime.now(datetime.timezone.utc).isoformat())')
ONTEM=$(python3 -c 'import datetime;print((datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(days=1)).isoformat())')
DEPOIS=$(python3 -c 'import datetime;print((datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(days=10)).isoformat())')

save() { curl -s -X POST "${A[@]}" "$API/rest/v1/rpc/save_campaign" -d "$1"; }

# 0. nenhuma campanha ligada em vigência antes do probe (senão a exclusão recusaria a dele)
n=$(curl -s "${H[@]}" "$API/rest/v1/campaigns?select=id" | py 'print(len(d))')
[ "$n" = 0 ] && ok "nenhuma campanha em vigência antes do probe" || bad "já há campanha em vigência" "$n"

# 1. criar pela RPC: a campanha e os percentuais numa gravação
CID=$(save "{\"p_id\":null,\"p_name\":\" Probe Black Friday \",\"p_badge_text\":\"PROBE BF\",\"p_band_color\":\"#161514\",\"p_accent_color\":\"#C2A063\",\"p_starts_at\":\"$ONTEM\",\"p_ends_at\":\"$DEPOIS\",\"p_active\":true,\"p_percents\":[10,15,20]}" | py 'print(d)')
[ ${#CID} = 36 ] && ok "criar pela RPC devolve o id" || bad "criar pela RPC" "$CID"
nome=$(curl -s "${A[@]}" "$API/rest/v1/campaigns?id=eq.$CID&select=name" | py 'print(d[0]["name"])')
[ "$nome" = "Probe Black Friday" ] && ok "o nome é gravado aparado" || bad "nome" "$nome"
p=$(curl -s "${A[@]}" "$API/rest/v1/campaign_percent_usage?campaign_id=eq.$CID&select=percent&order=percent" | py 'print(",".join(str(x["percent"]) for x in d))')
[ "$p" = "10,15,20" ] && ok "os três percentuais gravados, e a view os lê" || bad "percentuais" "$p"

# 2. o anon vê a em vigência (a policy pública) e não grava
n=$(curl -s "${H[@]}" "$API/rest/v1/campaigns?id=eq.$CID&select=id" | py 'print(len(d))')
[ "$n" = 1 ] && ok "anon vê a campanha em vigência" || bad "anon não vê a em vigência" "$n"
c=$(code -X POST "${H[@]}" "$API/rest/v1/rpc/save_campaign" -d "{\"p_id\":null,\"p_name\":\"x\",\"p_badge_text\":\"x\",\"p_band_color\":\"#161514\",\"p_accent_color\":\"#C2A063\",\"p_starts_at\":\"$DEPOIS\",\"p_ends_at\":\"$DEPOIS\",\"p_active\":false,\"p_percents\":[10]}")
{ [ "$c" = 401 ] || [ "$c" = 403 ] || [ "$c" = 404 ]; } && ok "anon não chama save_campaign ($c)" || bad "anon chamou save_campaign" "$c"

# 3. a porta das marcações: upsert com on_conflict, duas peças em 15%
PIDS=$(curl -s "${H[@]}" "$API/rest/v1/products?select=id&is_active=eq.true&order=id&limit=2" | py 'print(" ".join(x["id"] for x in d))')
P1=${PIDS% *}; P2=${PIDS#* }
n=$(curl -s -X POST "${A[@]}" -H "Prefer: resolution=merge-duplicates,return=representation" "$API/rest/v1/product_campaigns?on_conflict=product_id,campaign_id&select=product_id" -d "[{\"product_id\":\"$P1\",\"campaign_id\":\"$CID\",\"percent\":15},{\"product_id\":\"$P2\",\"campaign_id\":\"$CID\",\"percent\":15}]" | py 'print(len(d))')
[ "$n" = 2 ] && ok "marcar duas peças em 15% grava duas" || bad "marcar" "$n"
n=$(curl -s -X POST "${A[@]}" -H "Prefer: resolution=merge-duplicates,return=representation" "$API/rest/v1/product_campaigns?on_conflict=product_id,campaign_id&select=product_id" -d "[{\"product_id\":\"$P1\",\"campaign_id\":\"$CID\",\"percent\":10}]" | py 'print(len(d))')
p=$(curl -s "${A[@]}" "$API/rest/v1/product_campaigns?product_id=eq.$P1&campaign_id=eq.$CID&select=percent" | py 'print(d[0]["percent"])')
[ "$p" = 10 ] && ok "marcar de novo troca o percentual (upsert), sem duplicar" || bad "remarcar" "$p"
c=$(curl -s -X POST "${A[@]}" -H "Prefer: resolution=merge-duplicates,return=representation" "$API/rest/v1/product_campaigns?on_conflict=product_id,campaign_id" -d "[{\"product_id\":\"$P1\",\"campaign_id\":\"$CID\",\"percent\":40}]" | py 'print(d.get("code"))')
[ "$c" = 23503 ] && ok "marcar com 40% (fora da campanha) é recusado (23503)" || bad "percentual fora" "$c"

# 4. editar pela RPC tirando o 15% em uso: 23503, nada muda
c=$(save "{\"p_id\":\"$CID\",\"p_name\":\"Probe Black Friday\",\"p_badge_text\":\"PROBE BF\",\"p_band_color\":\"#161514\",\"p_accent_color\":\"#C2A063\",\"p_starts_at\":\"$ONTEM\",\"p_ends_at\":\"$DEPOIS\",\"p_active\":true,\"p_percents\":[10,20]}" | py 'print(d.get("code"))')
[ "$c" = 23503 ] && ok "tirar o 15% em uso pela gravação é recusado (23503)" || bad "tirar percentual em uso" "$c"
p=$(curl -s "${A[@]}" "$API/rest/v1/campaign_percent_usage?campaign_id=eq.$CID&percent=eq.15&select=products" | py 'print(d[0]["products"])')
[ "$p" = 1 ] && ok "a view conta 1 peça em 15% (o resto da gravação foi desfeito)" || bad "uso de 15%" "$p"

# 5. editar: trocar o nome e o selo, tirar o 20% (sem uso), acrescentar o 25%
r=$(save "{\"p_id\":\"$CID\",\"p_name\":\"Probe Natal\",\"p_badge_text\":\"PROBE NATAL\",\"p_band_color\":\"#6E2433\",\"p_accent_color\":\"#F6DCD8\",\"p_starts_at\":\"$ONTEM\",\"p_ends_at\":\"$DEPOIS\",\"p_active\":true,\"p_percents\":[10,15,25]}" | py 'print(d)')
[ "$r" = "$CID" ] && ok "editar pela RPC devolve o mesmo id" || bad "editar" "$r"
p=$(curl -s "${A[@]}" "$API/rest/v1/campaign_percent_usage?campaign_id=eq.$CID&select=percent&order=percent" | py 'print(",".join(str(x["percent"]) for x in d))')
[ "$p" = "10,15,25" ] && ok "os percentuais passam a 10, 15 e 25" || bad "percentuais editados" "$p"

# 6. uma segunda ligada que cruza: 23P01
c=$(save "{\"p_id\":null,\"p_name\":\"Probe cruzando\",\"p_badge_text\":\"X\",\"p_band_color\":\"#161514\",\"p_accent_color\":\"#C2A063\",\"p_starts_at\":\"$AGORA\",\"p_ends_at\":\"$DEPOIS\",\"p_active\":true,\"p_percents\":[10]}" | py 'print(d.get("code"))')
[ "$c" = 23P01 ] && ok "uma segunda ligada que cruza é recusada (23P01)" || bad "cruzando" "$c"

# 7. tirar uma peça da campanha (a porta com percentual nulo)
n=$(curl -s -X DELETE "${A[@]}" "$API/rest/v1/product_campaigns?campaign_id=eq.$CID&product_id=in.($P2)&select=product_id" | py 'print(len(d))')
[ "$n" = 1 ] && ok "tirar uma peça da campanha" || bad "tirar peça" "$n"

# 8. encerrar agora: o fim passa a ser o instante atual, e a loja deixa de ver
FIM=$(python3 -c 'import datetime;print(datetime.datetime.now(datetime.timezone.utc).isoformat())')
n=$(curl -s -X PATCH "${A[@]}" "$API/rest/v1/campaigns?id=eq.$CID&select=id" -d "{\"ends_at\":\"$FIM\"}" | py 'print(len(d))')
[ "$n" = 1 ] && ok "encerrar agora altera a campanha" || bad "encerrar" "$n"
n=$(curl -s "${H[@]}" "$API/rest/v1/campaigns?id=eq.$CID&select=id" | py 'print(len(d))')
[ "$n" = 0 ] && ok "encerrada, o anon deixa de ver" || bad "anon ainda vê a encerrada" "$n"

# 9. usada em pedido, não se apaga (409); sem pedido, sai com as marcações
OI=$(curl -s "${A[@]}" "$API/rest/v1/order_items?select=id&campaign_id=is.null&order=id&limit=1" | py 'print(d[0]["id"])')
curl -s -o /dev/null -X PATCH "${A[@]}" "$API/rest/v1/order_items?id=eq.$OI" -d "{\"campaign_id\":\"$CID\"}"
c=$(code -X DELETE "${A[@]}" "$API/rest/v1/campaigns?id=eq.$CID&select=id")
[ "$c" = 409 ] && ok "apagar a campanha usada em pedido é recusado (409)" || bad "apagar com pedido" "$c"
curl -s -o /dev/null -X PATCH "${A[@]}" "$API/rest/v1/order_items?id=eq.$OI" -d '{"campaign_id":null}'
n=$(curl -s -X DELETE "${A[@]}" "$API/rest/v1/campaigns?id=eq.$CID&select=id" | py 'print(len(d))')
[ "$n" = 1 ] && ok "sem pedido, apaga" || bad "apagar sem pedido" "$n"
n=$(curl -s "${A[@]}" "$API/rest/v1/product_campaigns?campaign_id=eq.$CID&select=product_id" | py 'print(len(d))')
[ "$n" = 0 ] && ok "as marcações saíram junto" || bad "marcações órfãs" "$n"

echo "falhas: $falhas"
exit $falhas
