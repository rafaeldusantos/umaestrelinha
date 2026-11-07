#!/usr/bin/env bash
# Probe HTTP contra o banco LOCAL (:54441): o desconto ao levar junto de cada adicional
# (`product_buy_together.discount_percent`, migration 20261107130000), gravado com os mesmos verbos e
# o mesmo embed que o painel usa (`persistAddons`, `PRODUCT_FORM_SELECT`). Cópia estendida de
# `.specs/work-items/WI-01-compre-junto/probes/03-adicionais-no-produto.sh`.
#
# Prova: o `check` recusa 0, 51 e 10,5 (o banco também recusa, não só a tela); 1, 50 e nulo passam;
# o upsert por id do painel grava o percentual; o embed do formulário o devolve; gravar o desconto
# de uma joia não muda o Compre Junto de outra; anônimo não escreve; a leitura pública vê a coluna.
#
# Só usa joias SEM adicional nenhum, e apaga só as linhas que criou (por id). Nunca aponte para
# ambiente remoto.
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
FK='product_buy_together!product_buy_together_product_id_fkey'

# Quatro joias ativas sem nenhum adicional: as duas primeiras recebem adicionais, as outras são alvo.
IDS=$(curl -s "${A[@]}" "$API/rest/v1/products?select=id,$FK(id)&is_active=eq.true&order=id&limit=200" \
  | js '" ".join([x["id"] for x in d if not x["product_buy_together"]][:4])')
set -- $IDS; P1=${1:-}; P2=${2:-}; P3=${3:-}; P4=${4:-}
[ -n "$P4" ] || { echo "FALHA — não há 4 joias sem adicional no banco local"; exit 1; }
CRIADOS=""
cleanup() { [ -n "$CRIADOS" ] && curl -s -o /dev/null -X DELETE "${A[@]}" "$API/rest/v1/product_buy_together?id=in.(${CRIADOS#,})"; }
trap cleanup EXIT
lembrar() { CRIADOS="$CRIADOS,$1"; }

linha() { # joia, posição, alvo, desconto (json)
  echo "{\"product_id\":\"$1\",\"position\":$2,\"kind\":\"product\",\"target_product_id\":\"$3\",\"discount_percent\":$4}"
}

# 1. o banco recusa fora da faixa — 0, 51 e 10,5 — com 23514 (o `check`), e não grava nada
for v in 0 51 10.5; do
  R=$(curl -s -w '\n%{http_code}' -X POST "${A[@]}" "$API/rest/v1/product_buy_together" -d "$(linha "$P1" 0 "$P3" "$v")")
  c=$(echo "$R" | tail -1); corpo=$(echo "$R" | sed '$d')
  if [ "$v" = 10.5 ]; then
    # inteiro: o PostgREST recusa o texto antes do check (22P02); os dois são recusa do banco
    { [ "$c" = 400 ]; } && ok "gravação direta com $v é recusada pelo banco ($c, $(echo "$corpo" | js 'd.get("code")'))" || bad "gravação com $v" "$c $corpo"
  else
    { [ "$c" = 400 ] && echo "$corpo" | grep -q 23514; } && ok "gravação direta com $v é recusada pelo check (23514)" || bad "gravação com $v" "$c $corpo"
  fi
done
N=$(curl -s "${A[@]}" "$API/rest/v1/product_buy_together?select=id&product_id=eq.$P1" | js 'len(d)')
[ "$N" = 0 ] && ok "nenhuma linha ficou gravada pelas recusas" || bad "recusa gravou" "$N"

# 2. 1, 50 e nulo passam (insert em lote, como o painel insere o novo)
R=$(curl -s -X POST "${A[@]}" "$API/rest/v1/product_buy_together" -d "[$(linha "$P1" 0 "$P3" 1),$(linha "$P1" 1 "$P4" 50),$(linha "$P2" 0 "$P3" null)]")
A1=$(echo "$R" | js 'd[0]["id"]'); A2=$(echo "$R" | js 'd[1]["id"]'); A3=$(echo "$R" | js 'd[2]["id"]')
lembrar "$A1"; lembrar "$A2"; lembrar "$A3"
V=$(echo "$R" | js '",".join(str(x["discount_percent"]) for x in d)')
[ "$V" = "1,50,None" ] && ok "1, 50 e nulo são aceitos e voltam como gravados" || bad "insert 1/50/nulo" "$V $R"

# 3. o painel muda só o percentual: upsert por id, o mesmo corpo de `persistAddons`
c=$(code -X POST -H "Prefer: resolution=merge-duplicates,return=minimal" "${A[@]:0:6}" "$API/rest/v1/product_buy_together?on_conflict=id" \
  -d "[{\"id\":\"$A1\",\"product_id\":\"$P1\",\"position\":0,\"kind\":\"product\",\"target_product_id\":\"$P3\",\"list_id\":null,\"target_variant_ids\":[],\"hidden_on_variant_ids\":[],\"discount_percent\":15},{\"id\":\"$A2\",\"product_id\":\"$P1\",\"position\":1,\"kind\":\"product\",\"target_product_id\":\"$P4\",\"list_id\":null,\"target_variant_ids\":[],\"hidden_on_variant_ids\":[],\"discount_percent\":null}]")
{ [ "$c" = 201 ] || [ "$c" = 200 ] || [ "$c" = 204 ]; } && ok "upsert por id grava o percentual novo ($c)" || bad "upsert" "$c"

# 4. o embed do formulário devolve o percentual
SEL="$FK(id,position,kind,target_product_id,list_id,target_variant_ids,hidden_on_variant_ids,discount_percent)"
V=$(curl -s "${A[@]}" "$API/rest/v1/products?select=id,$SEL&id=eq.$P1" | js '",".join(str(x["discount_percent"]) for x in sorted(d[0]["product_buy_together"], key=lambda r: r["position"]))')
[ "$V" = "15,None" ] && ok "o embed do formulário lê 15 e nulo" || bad "embed" "$V"

# 5. a outra joia não mudou
V=$(curl -s "${A[@]}" "$API/rest/v1/product_buy_together?select=discount_percent&product_id=eq.$P2" | js '",".join(str(x["discount_percent"]) for x in d)')
[ "$V" = "None" ] && ok "gravar o desconto da joia 1 não mudou o Compre Junto da joia 2" || bad "outra joia" "$V"

# 6. upsert com percentual fora da faixa também é recusado, e o gravado fica
c=$(code -X POST -H "Prefer: resolution=merge-duplicates,return=minimal" "${A[@]:0:6}" "$API/rest/v1/product_buy_together?on_conflict=id" \
  -d "[{\"id\":\"$A1\",\"product_id\":\"$P1\",\"position\":0,\"kind\":\"product\",\"target_product_id\":\"$P3\",\"list_id\":null,\"target_variant_ids\":[],\"hidden_on_variant_ids\":[],\"discount_percent\":51}]")
V=$(curl -s "${A[@]}" "$API/rest/v1/product_buy_together?select=discount_percent&id=eq.$A1" | js 'd[0]["discount_percent"]')
[ "$c" = 400 ] && [ "$V" = 15 ] && ok "upsert com 51 é recusado ($c) e o 15 gravado fica" || bad "upsert 51" "$c/$V"

# 7. leitura pública vê a coluna (a loja lê); anônimo não escreve
c=$(code "${H[@]}" "$API/rest/v1/product_buy_together?select=id,discount_percent&id=eq.$A1")
[ "$c" = 200 ] && ok "a leitura pública devolve discount_percent (200)" || bad "leitura pública" "$c"
c=$(code -X PATCH "${H[@]}" "$API/rest/v1/product_buy_together?id=eq.$A1" -d '{"discount_percent":40}')
V=$(curl -s "${A[@]}" "$API/rest/v1/product_buy_together?select=discount_percent&id=eq.$A1" | js 'd[0]["discount_percent"]')
[ "$V" = 15 ] && ok "anônimo não muda o percentual ($c, segue 15)" || bad "anônimo escreve" "$c/$V"

exit $falhas
