#!/usr/bin/env bash
# Probe HTTP contra o banco LOCAL (:54441): a gravação dos adicionais pelo formulário do produto
# (`persistAddons`), com os mesmos verbos e filtros que o painel usa. Prova: o embed com a FK nomeada
# responde (sem a dica, 300); trocar posições num `upsert` por id passa (a chave de posição é
# adiada); `on_conflict` pela posição é recusado (é por isso que o painel grava por id); apagar
# recortado por joia e por id não toca o Compre Junto de outra joia; anônimo não escreve.
# Nunca aponte para ambiente remoto. Limpa o que criou.
set -u
API=http://127.0.0.1:54441
case "$API" in *127.0.0.1*|*localhost*) ;; *) echo "só local"; exit 2;; esac
ANON=$(supabase status -o json 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin)["ANON_KEY"])')
H=(-H "apikey: $ANON" -H "Content-Type: application/json")
falhas=0
ok()  { echo "ok — $1"; }
bad() { echo "FALHA — $1 ($2)"; falhas=$((falhas+1)); }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
js() { python3 -c "import sys,json;d=json.load(sys.stdin);print($1)"; }

TOKEN=$(curl -s "$API/auth/v1/token?grant_type=password" "${H[@]}" -d '{"email":"admin@umaestrelinha.dev","password":"admin123"}' | js 'd["access_token"]')
A=(-H "apikey: $ANON" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Prefer: return=representation")

IDS=$(curl -s "${H[@]}" "$API/rest/v1/products?select=id&limit=4" | js '" ".join(x["id"] for x in d)')
set -- $IDS; P1=$1; P2=$2; P3=$3; P4=$4
cleanup() { curl -s -o /dev/null -X DELETE "${A[@]}" "$API/rest/v1/product_buy_together?product_id=in.($P1,$P3)"; }
trap cleanup EXIT
cleanup

# 1. dois adicionais da joia 1 e um da joia 3
R=$(curl -s -X POST "${A[@]}" "$API/rest/v1/product_buy_together" -d "[{\"product_id\":\"$P1\",\"position\":0,\"kind\":\"product\",\"target_product_id\":\"$P2\"},{\"product_id\":\"$P1\",\"position\":1,\"kind\":\"product\",\"target_product_id\":\"$P4\"},{\"product_id\":\"$P3\",\"position\":0,\"kind\":\"product\",\"target_product_id\":\"$P2\"}]")
A1=$(echo "$R" | js 'd[0]["id"]'); A2=$(echo "$R" | js 'd[1]["id"]'); A3=$(echo "$R" | js 'd[2]["id"]')
[ -n "$A1" ] && [ -n "$A2" ] && [ -n "$A3" ] && ok "insere os adicionais (insert em lote)" || bad "insert" "$R"

# 2. o embed do formulário: com a FK nomeada responde 200; sem a dica, 300
SEL='product_buy_together!product_buy_together_product_id_fkey(id,position,kind,target_product_id,list_id,target_variant_ids,hidden_on_variant_ids)'
c=$(code "${A[@]}" "$API/rest/v1/products?select=id,$SEL&id=eq.$P1")
[ "$c" = 200 ] && ok "embed com a FK nomeada responde 200" || bad "embed com dica" "$c"
c=$(code "${A[@]}" "$API/rest/v1/products?select=id,product_buy_together(id)&id=eq.$P1")
[ "$c" = 300 ] && ok "embed SEM a dica é ambíguo (300), por isso o painel nomeia a FK" || bad "embed sem dica" "$c"
N=$(curl -s "${A[@]}" "$API/rest/v1/products?select=id,$SEL&id=eq.$P1" | js 'len(d[0]["product_buy_together"])')
[ "$N" = 2 ] && ok "o embed devolve os 2 adicionais da joia" || bad "embed conta" "$N"

# 3. reordenar: trocar as posições num upsert por id, numa gravação só
c=$(code -X POST -H "Prefer: resolution=merge-duplicates,return=minimal" "${A[@]:0:6}" "$API/rest/v1/product_buy_together?on_conflict=id" \
  -d "[{\"id\":\"$A1\",\"product_id\":\"$P1\",\"position\":1,\"kind\":\"product\",\"target_product_id\":\"$P2\",\"list_id\":null,\"target_variant_ids\":[],\"hidden_on_variant_ids\":[]},{\"id\":\"$A2\",\"product_id\":\"$P1\",\"position\":0,\"kind\":\"product\",\"target_product_id\":\"$P4\",\"list_id\":null,\"target_variant_ids\":[],\"hidden_on_variant_ids\":[]}]")
{ [ "$c" = 201 ] || [ "$c" = 200 ] || [ "$c" = 204 ]; } && ok "upsert por id troca as posições (chave adiada) ($c)" || bad "upsert por id" "$c"
POS=$(curl -s "${A[@]}" "$API/rest/v1/product_buy_together?select=id,position&product_id=eq.$P1&order=position" | js '",".join(x["id"][:4]+"@"+str(x["position"]) for x in d)')
[ "$POS" = "${A2:0:4}@0,${A1:0:4}@1" ] && ok "as posições ficaram trocadas" || bad "posições" "$POS"

# 4. on_conflict pela posição é recusado: chave adiada não serve de alvo (por isso a gravação é por id)
c=$(code -X POST -H "Prefer: resolution=merge-duplicates,return=minimal" "${A[@]:0:6}" "$API/rest/v1/product_buy_together?on_conflict=product_id,position" \
  -d "[{\"product_id\":\"$P1\",\"position\":0,\"kind\":\"product\",\"target_product_id\":\"$P2\"}]")
[ "$c" = 400 ] || [ "$c" = 409 ] || [ "$c" = 500 ] && ok "on_conflict por (joia, posição) é recusado ($c)" || bad "on_conflict por posição aceito" "$c"

# 5. apagar recortado por joia e por id: a joia 3 continua com o dela
c=$(code -X DELETE "${A[@]}" "$API/rest/v1/product_buy_together?product_id=eq.$P1&id=in.($A1)")
[ "$c" = 200 ] && ok "apaga o adicional tirado, recortado pela joia" || bad "delete" "$c"
N1=$(curl -s "${A[@]}" "$API/rest/v1/product_buy_together?select=id&product_id=eq.$P1" | js 'len(d)')
N3=$(curl -s "${A[@]}" "$API/rest/v1/product_buy_together?select=id&product_id=eq.$P3" | js 'len(d)')
[ "$N1" = 1 ] && [ "$N3" = 1 ] && ok "a joia 1 ficou com 1 e a joia 3 não foi tocada (1)" || bad "contagens" "$N1/$N3"
# um delete com o id de OUTRA joia, recortado pela joia 1, não apaga nada
curl -s -o /dev/null -X DELETE "${A[@]}" "$API/rest/v1/product_buy_together?product_id=eq.$P1&id=in.($A3)"
N3=$(curl -s "${A[@]}" "$API/rest/v1/product_buy_together?select=id&product_id=eq.$P3" | js 'len(d)')
[ "$N3" = 1 ] && ok "id de outra joia no delete recortado não apaga nada" || bad "recorte" "$N3"

# 6. anônimo não escreve
c=$(code -X POST "${H[@]}" "$API/rest/v1/product_buy_together" -d "{\"product_id\":\"$P1\",\"position\":2,\"kind\":\"product\",\"target_product_id\":\"$P2\"}")
{ [ "$c" = 401 ] || [ "$c" = 403 ]; } && ok "anônimo não grava adicional ($c)" || bad "anônimo grava" "$c"

exit $falhas
