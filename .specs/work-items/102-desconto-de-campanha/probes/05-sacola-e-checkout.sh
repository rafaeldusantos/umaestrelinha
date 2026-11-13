#!/usr/bin/env bash
# Probe HTTP contra o ambiente LOCAL (:54441, Postgres :54442): o caminho do dinheiro com a campanha
# (WI 102, tarefa 05) — `checkout?action=create-order` → `mercado-pago?action=create-payment`.
#
# Pré-requisito: as functions SERVIDAS no local, com chaves externas INVÁLIDAS (nunca o `.env` da raiz):
#   supabase functions serve --env-file <arquivo com MP_ACCESS_TOKEN=invalida, RESEND_API_KEY=invalida>
# O Mercado Pago responde erro com a chave inválida, e é por isso que o probe confere o que o
# `create-payment` GRAVA antes de chamá-lo (o recálculo persiste `orders` antes da cobrança).
#
# As peças são linhas da GRADE (o banco local não tem peça ativa sem variação): cada linha manda
# `variant_id` com `price_source = 'variant'`, e o "de" é o `compare_price` da variação — escolhida
# sem "de", para o preço com a campanha ser simplesmente 80% do preço da variação.
#
# O que prova, contra o banco e as functions de verdade:
#   1. em vigência, o `create-order` grava `campaign_id`/`campaign_percent` na linha marcada (o id
#      forjado no corpo é descartado) e `orders.campaign_discount` calculado por ele (CA-13);
#   2. o corpo forjado (percentual exibido maior que o do servidor) é recusado com 422
#      `promotion_no_longer_valid`, e nada é gravado;
#   3. a campanha encerrada: o pedido que exibe a campanha é recusado (422); sem exibi-la, nasce sem
#      campanha (CA-04);
#   4. o pedido criado em vigência e pago depois do fim é cobrado pela campanha GRAVADA (D-05), com o
#      cupom de 10% descontando só a peça comum (CA-16) e `campaign_discount` preservado.
# Cada pedido usa um e-mail próprio (`probe102-x@exemplo.invalid`, aceito pela régua de
# `core/validators/email.ts`): o primeiro cria a conta da convidada, e o mesmo e-mail no pedido
# seguinte cairia no desafio de código (409), não na regra da campanha.
# Nunca aponte para ambiente remoto. Limpa o que criou, mesmo quando para no meio.
set -u
cd "$(dirname "$0")/../../../.."
API=http://127.0.0.1:54441
PSQL=(psql -h 127.0.0.1 -p 54442 -U postgres -d postgres -At -v ON_ERROR_STOP=1)
export PGPASSWORD=postgres
falhas=0
ok()  { echo "ok — $1"; }
bad() { echo "FALHA — $1 ($2)"; falhas=$((falhas+1)); }
sql() { "${PSQL[@]}" -c "$1"; }
py()  { python3 -c "import sys,json
try:
  d=json.load(sys.stdin)
except Exception:
  d={}
$1"; }
CID=''; CUPOM=''
limpar() {
  sql "delete from public.order_charge_locks where order_id in (select id from public.orders where client_request_id like 'probe102-%')" >/dev/null
  sql "delete from public.order_items where order_id in (select id from public.orders where client_request_id like 'probe102-%')" >/dev/null
  sql "delete from public.orders where client_request_id like 'probe102-%'" >/dev/null
  [ -n "$CID" ] && sql "delete from public.campaigns where id = '$CID'" >/dev/null
  [ -n "$CUPOM" ] && sql "delete from public.coupons where id = '$CUPOM'" >/dev/null
  # As convidadas que o `create-order` criou (a conta sem senha e a ficha em `customers`).
  sql "delete from public.addresses where customer_id in (select id from public.customers where lower(email) like 'probe102-%@exemplo.invalid')" >/dev/null 2>&1
  sql "delete from public.customers where lower(email) like 'probe102-%@exemplo.invalid'" >/dev/null 2>&1
  sql "delete from auth.users where lower(email) like 'probe102-%@exemplo.invalid'" >/dev/null 2>&1
  return 0
}
# A primeira pré-condição que falha para o probe — limpando antes.
parar() { bad "$1" "$2"; limpar; echo "falhas: $falhas"; exit 1; }

ANON=$(supabase status -o json 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin)["ANON_KEY"])')
[ -n "$ANON" ] || parar "a chave pública do Supabase local" "supabase status sem ANON_KEY"
c=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/functions/v1/checkout" -H "apikey: $ANON" -H "Content-Type: application/json" -d '{}')
[ "$c" = 400 ] || parar "as functions servidas no local" "POST vazio no checkout deu $c, esperado 400"
N=$(sql "select count(*) from public.campaigns where active and starts_at <= now() + interval '11 days' and ends_at > now() - interval '2 days'")
[ "$N" = 0 ] || parar "nenhuma campanha ligada cruzando a janela do probe" "$N encontradas"

# Duas peças da grade: uma linha ativa com preço próprio e sem "de", em produtos diferentes.
LINHA_PECA=$(sql "select p.id||'|'||v.id||'|'||v.price from public.products p join public.product_variants v on v.product_id = p.id where p.is_active and v.is_active and v.price is not null and v.compare_price is null order by p.id, v.position, v.id limit 1")
[ -n "$LINHA_PECA" ] || parar "uma variação ativa com preço e sem \"de\" para a peça de campanha" "nenhuma"
IFS='|' read -r PECA VPECA PRECO <<<"$LINHA_PECA"
LINHA_COMUM=$(sql "select p.id||'|'||v.id||'|'||v.price from public.products p join public.product_variants v on v.product_id = p.id where p.is_active and v.is_active and v.price is not null and v.compare_price is null and p.id <> '$PECA' order by p.id, v.position, v.id limit 1")
[ -n "$LINHA_COMUM" ] || parar "uma variação ativa com preço para a peça comum" "nenhuma"
IFS='|' read -r COMUM VCOMUM PRECO_COMUM <<<"$LINHA_COMUM"
ok "peça de campanha: variação de R\$ $PRECO; peça comum: variação de R\$ $PRECO_COMUM"

CID=$(sql "insert into public.campaigns (name, badge_text, starts_at, ends_at, active) values ('Probe Checkout', 'PROBE', now() - interval '1 day', now() + interval '10 days', true) returning id" | head -1)
[ ${#CID} = 36 ] || parar "criar a campanha do probe" "id '$CID'"
sql "insert into public.campaign_percents (campaign_id, percent) values ('$CID', 20)" >/dev/null || parar "o percentual da campanha" "insert falhou"
sql "insert into public.product_campaigns (product_id, campaign_id, percent) values ('$PECA', '$CID', 20)" >/dev/null || parar "marcar a peça" "insert falhou"
M=$(sql "select percent from public.product_campaigns where product_id = '$PECA' and campaign_id = '$CID'")
[ "$M" = 20 ] && ok "campanha em vigência criada, com a peça marcada em 20%" || parar "a marcação da peça" "'$M'"
CUPOM=$(sql "insert into public.coupons (code, type, value, active) values ('PROBE102', 'percent', 10, true) returning id" | head -1)
[ ${#CUPOM} = 36 ] || parar "criar o cupom de 10%" "id '$CUPOM'"

# Os valores esperados, em centavos e por unidade, meio centavo para cima — feitos aqui, nunca lidos
# da regra que a function chama.
C_PRECO=$(python3 -c "print(int(round($PRECO*100)))")
C_COMUM=$(python3 -c "print(int(round($PRECO_COMUM*100)))")
C_CAMP=$(( (C_PRECO * 80 + 50) / 100 ))
reais() { python3 -c "print(f'{$1/100:.2f}')"; }
CAMP=$(reais $C_CAMP)
{ [ -n "$CAMP" ] && [ "$C_CAMP" -lt "$C_PRECO" ]; } || parar "o preço da campanha" "'$CAMP'"
DESCONTO_ESP=$(reais $((C_PRECO - C_CAMP)))
CUPOM_ESP=$(reais $(( (C_COMUM * 10 + 50) / 100 )))
SUBTOTAL_ESP=$(reais $((C_CAMP + C_COMUM)))

pedido() { # $1 = sufixo, $2 = percentual exibido da peça (ou null), $3 = unit_price exibido da peça
  cat <<JSON
{"client_request_id":"probe102-$1","customer_name":"Probe","customer_email":"probe102-$1@exemplo.invalid","customer_document":"39053344705",
 "payment_method":"pix","address_zip":"04538133","address_street":"Rua","address_number":"1","address_neighborhood":"B","address_city":"SP","address_state":"SP",
 "subtotal":0,"discount":0,"shipping_cost":0,"total":123.45,"coupon_id":"$CUPOM","coupon_code":"PROBE102",
 "items":[
  {"product_id":"$PECA","product_name":"Peça","quantity":1,"unit_price":$3,"full_unit_price":$PRECO,"price_source":"variant","variant_id":"$VPECA","campaign_percent":$2,"campaign_id":"00000000-0000-4000-8000-000000000000"},
  {"product_id":"$COMUM","product_name":"Comum","quantity":1,"unit_price":$PRECO_COMUM,"full_unit_price":$PRECO_COMUM,"price_source":"variant","variant_id":"$VCOMUM"}
 ]}
JSON
}
criar() { curl -s -w '\n%{http_code}' -X POST "$API/functions/v1/checkout?action=create-order" -H "apikey: $ANON" -H "Content-Type: application/json" -d "$1"; }
NENHUM=00000000-0000-0000-0000-000000000000

# 1. Em vigência, exibindo os 20%.
R=$(criar "$(pedido a 20 "$CAMP")"); CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
OID=$(echo "$BODY" | py 'print(d.get("order_id") or "")'); TOKEN=$(echo "$BODY" | py 'print(d.get("access_token") or "")')
{ [ "$CODE" = 200 ] && [ ${#OID} = 36 ] && [ -n "$TOKEN" ]; } && ok "em vigência o pedido nasce ($OID)" || parar "create-order em vigência" "$CODE $BODY"
L=$(sql "select campaign_id||'|'||campaign_percent from public.order_items where order_id = '$OID' and product_id = '$PECA'")
[ "$L" = "$CID|20" ] && ok "a linha marcada grava a campanha do SERVIDOR ($L; o id forjado do corpo foi descartado)" || bad "campanha da linha" "'$L' ≠ '$CID|20'"
L=$(sql "select coalesce(campaign_id::text,'nula') from public.order_items where order_id = '$OID' and product_id = '$COMUM'")
[ "$L" = nula ] && ok "a linha comum fica sem campanha" || bad "linha comum" "'$L'"
D=$(sql "select campaign_discount from public.orders where id = '$OID'")
{ [ -n "$D" ] && [ "$D" = "$DESCONTO_ESP" ]; } && ok "orders.campaign_discount calculado pelo servidor: $D" || bad "campaign_discount" "'$D' ≠ '$DESCONTO_ESP'"

# 2. Corpo forjado: 70% exibido contra 20% do servidor.
R=$(criar "$(pedido b 70 1)"); CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
COD=$(echo "$BODY" | py 'print(d.get("code") or "")')
{ [ "$CODE" = 422 ] && [ "$COD" = promotion_no_longer_valid ]; } && ok "corpo forjado: 422 promotion_no_longer_valid" || bad "forjado" "$CODE $BODY"
N=$(sql "select count(*) from public.orders where client_request_id = 'probe102-b'")
[ "$N" = 0 ] && ok "nada gravado na recusa (0 pedidos)" || bad "gravou na recusa" "'$N'"

# 3. A campanha encerra.
sql "update public.campaigns set starts_at = now() - interval '2 days', ends_at = now() - interval '1 second' where id = '$CID'" >/dev/null || parar "encerrar a campanha" "update falhou"
R=$(criar "$(pedido c 20 "$CAMP")"); CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
COD=$(echo "$BODY" | py 'print(d.get("code") or "")')
N=$(sql "select count(*) from public.orders where client_request_id = 'probe102-c'")
{ [ "$CODE" = 422 ] && [ "$COD" = promotion_no_longer_valid ] && [ "$N" = 0 ]; } && ok "depois do fim, o pedido que ainda exibe a campanha é recusado (422, nada gravado)" || bad "depois do fim exibindo" "$CODE $BODY ($N gravados)"
R=$(criar "$(pedido d null "$PRECO")"); CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
OID2=$(echo "$BODY" | py 'print(d.get("order_id") or "")')
L=$(sql "select coalesce(campaign_id::text,'nula') from public.order_items where order_id = '${OID2:-$NENHUM}' and product_id = '$PECA'")
D2=$(sql "select campaign_discount from public.orders where id = '${OID2:-$NENHUM}'")
{ [ "$CODE" = 200 ] && [ "$L" = nula ] && [ "$D2" = 0.00 ]; } && ok "depois do fim, sem exibir: nasce sem campanha (campaign_discount $D2)" || bad "depois do fim sem exibir" "$CODE '$L' '$D2' $BODY"

# 4. O pedido de 1 é pago DEPOIS do fim: vale a campanha gravada, e o cupom só desconta a comum.
R=$(curl -s -w '\n%{http_code}' -X POST "$API/functions/v1/mercado-pago?action=create-payment" -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d "{\"order_id\":\"$OID\",\"method\":\"pix\",\"idempotency_key\":\"$(python3 -c 'import uuid;print(uuid.uuid4())')\",\"access_token\":\"$TOKEN\"}")
echo "   (create-payment respondeu $(echo "$R" | tail -1): o Mercado Pago está com chave inválida; o que vale é o que foi gravado antes dele)"
V=$(sql "select subtotal||'|'||discount||'|'||campaign_discount from public.orders where id = '$OID'")
ESP="$SUBTOTAL_ESP|$CUPOM_ESP|$DESCONTO_ESP"
{ [ -n "$V" ] && [ "$V" = "$ESP" ]; } && ok "pago depois do fim: subtotal pela campanha gravada, cupom só na comum, campanha preservada ($V)" || bad "recálculo do create-payment" "'$V' ≠ '$ESP'"
L=$(sql "select campaign_id||'|'||campaign_percent||'|'||unit_price from public.order_items where order_id = '$OID' and product_id = '$PECA'")
[ "$L" = "$CID|20|$CAMP" ] && ok "a linha regravada mantém a campanha e o preço dela ($L)" || bad "linha regravada" "'$L' ≠ '$CID|20|$CAMP'"

limpar
N=$(sql "select (select count(*) from public.campaigns where id = '$CID') + (select count(*) from public.coupons where code = 'PROBE102') + (select count(*) from public.orders where client_request_id like 'probe102-%')")
[ "$N" = 0 ] && ok "limpeza feita (0 campanha, 0 cupom, 0 pedido do probe)" || bad "limpeza" "'$N'"

echo "falhas: $falhas"
exit $falhas
