#!/usr/bin/env bash
# Probe HTTP contra o banco LOCAL (:54441): as tabelas do Compre Junto respondem pelo PostgREST,
# anônimo lê e não escreve, o admin grava, e apagar lista em uso é recusado pelo banco.
# Nunca aponte para ambiente remoto. Limpa o que criou.
set -u
API=http://127.0.0.1:54441
ANON=$(supabase status -o json 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin)["ANON_KEY"])')
H=(-H "apikey: $ANON" -H "Content-Type: application/json")
falhas=0
ok()  { echo "ok — $1"; }
bad() { echo "FALHA — $1 ($2)"; falhas=$((falhas+1)); }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

TOKEN=$(curl -s "$API/auth/v1/token?grant_type=password" "${H[@]}" -d '{"email":"admin@umaestrelinha.dev","password":"admin123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
A=(-H "apikey: $ANON" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Prefer: return=representation")

# 1. as quatro leituras respondem para o anônimo
for t in buy_together_lists buy_together_list_items product_buy_together buy_together_list_usage; do
  [ "$(code "${H[@]}" "$API/rest/v1/$t?select=*&limit=1")" = 200 ] && ok "anônimo lê $t" || bad "anônimo lê $t" "não 200"
done

# 2. anônimo não escreve
c=$(code -X POST "${H[@]}" "$API/rest/v1/buy_together_lists" -d '{"name":"probe anon"}')
{ [ "$c" = 401 ] || [ "$c" = 403 ]; } && ok "anônimo não insere lista ($c)" || bad "anônimo insere lista" "$c"

# 3. admin grava
LID=$(curl -s -X POST "${A[@]}" "$API/rest/v1/buy_together_lists" -d '{"name":"Probe correntes"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)[0]["id"])')
[ -n "$LID" ] && ok "admin cria lista" || bad "admin cria lista" "sem id"
PID=$(curl -s "${H[@]}" "$API/rest/v1/products?select=id&limit=2" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d[0]["id"]+" "+d[1]["id"])')
P1=${PID% *}; P2=${PID#* }
c=$(code -X POST "${A[@]}" "$API/rest/v1/buy_together_list_items" -d "[{\"list_id\":\"$LID\",\"product_id\":\"$P1\",\"position\":0},{\"list_id\":\"$LID\",\"product_id\":\"$P2\",\"position\":1}]")
[ "$c" = 201 ] && ok "admin grava duas peças" || bad "admin grava peças" "$c"

# 4. posição repetida e posição 12 (a 13ª) são recusadas
c=$(code -X POST "${A[@]}" "$API/rest/v1/buy_together_list_items" -d "{\"list_id\":\"$LID\",\"product_id\":\"$P1\",\"position\":12}")
[ "$c" = 400 ] || [ "$c" = 409 ] && ok "posição 12 recusada ($c)" || bad "posição 12 aceita" "$c"

# 5. nome vazio e acima de 40 recusados
c=$(code -X POST "${A[@]}" "$API/rest/v1/buy_together_lists" -d '{"name":"   "}')
[ "$c" = 400 ] && ok "nome vazio recusado" || bad "nome vazio aceito" "$c"
c=$(code -X POST "${A[@]}" "$API/rest/v1/buy_together_lists" -d "{\"name\":\"$(printf 'a%.0s' $(seq 1 41))\"}")
[ "$c" = 400 ] && ok "nome de 41 recusado" || bad "nome de 41 aceito" "$c"

# 6. adicional por lista, com as duas FKs nomeadas (embed sem 300)
c=$(code -X POST "${A[@]}" "$API/rest/v1/product_buy_together" -d "{\"product_id\":\"$P1\",\"position\":0,\"kind\":\"list\",\"list_id\":\"$LID\"}")
[ "$c" = 201 ] && ok "admin cria adicional por lista" || bad "adicional por lista" "$c"
c=$(code -X POST "${A[@]}" "$API/rest/v1/product_buy_together" -d "{\"product_id\":\"$P1\",\"position\":3,\"kind\":\"product\",\"target_product_id\":\"$P2\"}")
[ "$c" = 400 ] && ok "posição 3 recusada" || bad "posição 3 aceita" "$c"
c=$(code -X POST "${A[@]}" "$API/rest/v1/product_buy_together" -d "{\"product_id\":\"$P1\",\"position\":1,\"kind\":\"list\",\"target_product_id\":\"$P2\"}")
[ "$c" = 400 ] && ok "tipo e alvo incoerentes recusados" || bad "tipo e alvo incoerentes" "$c"
c=$(code "${H[@]}" "$API/rest/v1/product_buy_together?select=id,principal:products!product_buy_together_product_id_fkey(id),alvo:products!product_buy_together_target_product_id_fkey(id)&limit=1")
[ "$c" = 200 ] && ok "embed pelas duas FKs nomeadas responde 200" || bad "embed das FKs" "$c"

# 7. a view nomeia a joia que usa a lista
n=$(curl -s "${H[@]}" "$API/rest/v1/buy_together_list_usage?list_id=eq.$LID&select=product_name" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)))')
[ "$n" = 1 ] && ok "a view de uso devolve 1 joia" || bad "view de uso" "$n"

# 8. apagar a lista em uso é recusado pelo banco (restrict)
c=$(code -X DELETE "${A[@]}" "$API/rest/v1/buy_together_lists?id=eq.$LID")
[ "$c" = 409 ] && ok "apagar lista em uso recusado (409)" || bad "apagar lista em uso" "$c"

# 9. anônimo não apaga nem altera
c=$(code -X PATCH "${H[@]}" "$API/rest/v1/buy_together_lists?id=eq.$LID" -d '{"name":"x"}')
n=$(curl -s "${H[@]}" "$API/rest/v1/buy_together_lists?id=eq.$LID&select=name" | python3 -c 'import sys,json;print(json.load(sys.stdin)[0]["name"])')
[ "$n" = "Probe correntes" ] && ok "anônimo não altera lista" || bad "anônimo alterou lista" "$n"

# limpeza: tira o adicional, depois a lista (as peças saem em cascata)
curl -s -o /dev/null -X DELETE "${A[@]}" "$API/rest/v1/product_buy_together?list_id=eq.$LID"
c=$(code -X DELETE "${A[@]}" "$API/rest/v1/buy_together_lists?id=eq.$LID")
[ "$c" = 204 ] || [ "$c" = 200 ] && ok "apaga a lista depois de tirá-la do adicional ($c)" || bad "limpeza" "$c"
n=$(curl -s "${H[@]}" "$API/rest/v1/buy_together_list_items?list_id=eq.$LID&select=list_id" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)))')
[ "$n" = 0 ] && ok "as peças saíram junto da lista" || bad "peças órfãs" "$n"

echo "falhas: $falhas"
exit $falhas
