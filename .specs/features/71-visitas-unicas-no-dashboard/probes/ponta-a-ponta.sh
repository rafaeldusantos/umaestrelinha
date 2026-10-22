#!/usr/bin/env bash
# Feature 71 · prova de ponta a ponta contra o banco LOCAL (54441/54442) — `prova-navegador.md`, parte (a).
#
# Diferente dos outros probes (todos em `begin … rollback`), este GRAVA de verdade e lê pelo caminho
# que o painel usa: login do admin do `seed.sql` no GoTrue local → JWT → `POST /rest/v1/rpc/
# store_movement` pelo gateway. As linhas de teste ficam no banco entre `semear` e `limpar` para a
# parte (b) (o Dashboard em navegador) ler os mesmos números.
#
#   ./ponta-a-ponta.sh semear    # grava as fixturas (visitas e pedidos), com o estado de entrada salvo
#   ./ponta-a-ponta.sh ler       # leitura A (21/10 23h de Brasília, por p_agora) e B (agora real)
#   ./ponta-a-ponta.sh papeis    # anon e cliente não leem nem gravam direto
#   ./ponta-a-ponta.sh limpar    # apaga as fixturas e devolve store_visits/contador ao estado de entrada
#
# Nada aqui usa --linked. Ids e números de pedido são reconhecíveis (prefixos `7100e2e0-` e
# `PROBE-71-E2E-`), e `limpar` confere que sobraram ZERO.
set -euo pipefail

DB="postgresql://postgres:postgres@127.0.0.1:54442/postgres"
API="http://127.0.0.1:54441"
KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
JWT_SECRET="super-secret-jwt-token-with-at-least-32-characters-long"
ESTADO="$(dirname "$0")/.ponta-a-ponta.estado"

A="7100e2e0-0000-4000-8000-00000000000a"
B="7100e2e0-0000-4000-8000-00000000000b"

q() { psql "$DB" -X -At -v ON_ERROR_STOP=1 -c "$1"; }

falhas=0
confere() { # confere <descrição> <obtido> <esperado>
  if [ "$2" == "$3" ]; then echo "ok    $1 = $2"; else echo "FALHA $1: obtido '$2', esperado '$3'"; falhas=$((falhas + 1)); fi
}

token_admin() {
  curl -s "$API/auth/v1/token?grant_type=password" -H "apikey: $KEY" -H 'Content-Type: application/json' \
    -d '{"email":"admin@umaestrelinha.dev","password":"admin123"}' | jq -r .access_token
}

# JWT HS256 de um usuário SEM papel de admin (cliente comum do banco local), assinado com o segredo
# local — o mesmo formato que o GoTrue emite.
token_cliente() {
  local sub
  sub=$(q "select u.id from auth.users u where not exists (select 1 from public.user_roles r where r.user_id = u.id) order by u.created_at limit 1")
  node -e '
    const c = require("crypto"); const [sub, seg] = process.argv.slice(1)
    const b = o => Buffer.from(JSON.stringify(o)).toString("base64url")
    const agora = Math.floor(Date.now() / 1000)
    const h = b({ alg: "HS256", typ: "JWT" }), p = b({ sub, role: "authenticated", aud: "authenticated", iat: agora, exp: agora + 600 })
    console.log(h + "." + p + "." + c.createHmac("sha256", seg).update(h + "." + p).digest("base64url"))
  ' "$sub" "$JWT_SECRET"
}

movimento() { # movimento <token> [p_agora]
  local corpo='{}'
  [ -n "${2:-}" ] && corpo="{\"p_agora\":\"$2\"}"
  curl -s "$API/rest/v1/rpc/store_movement" -H "apikey: $KEY" -H "Authorization: Bearer $1" \
    -H 'Content-Type: application/json' -d "$corpo"
}

semear() {
  if [ -f "$ESTADO" ]; then echo "já semeado ($ESTADO existe) — rode 'limpar' antes"; exit 1; fi
  # O estado de entrada: quantas visitas, o contador, e se já há pedido pago na janela.
  {
    echo "visitas=$(q 'select count(*) from public.store_visits')"
    echo "contador=$(q 'select count(*) from public.store_visit_counter')"
    echo "pagos_na_janela=$(q "select count(*) from public.orders where paid_at >= '2026-10-12'")"
  } >"$ESTADO"
  cat "$ESTADO"
  if [ "$(q "select count(*) from public.orders where paid_at >= '2026-10-12'")" != "0" ]; then
    echo "há pedido pago desde 12/10 no banco local: os números esperados abaixo não valeriam"; rm "$ESTADO"; exit 1
  fi

  q "begin;
     -- Visitas: o MESMO navegador (A) na segunda, terça e quarta; um segundo (B) só na quarta.
     insert into public.store_visits (day, visitor_id) values
       ('2026-10-19', '$A'), ('2026-10-20', '$A'), ('2026-10-21', '$A'), ('2026-10-21', '$B');

     -- Pedidos nas bordas do dia. 21h30 de Brasília é 00h30 do dia SEGUINTE em UTC.
     insert into public.orders (order_number, status, subtotal, total, payment_method, customer_name,
                                customer_email, payment_status, created_at, paid_at) values
       -- 1: pago qua 21/10 21h30 (BRT) = 22/10 00:30Z ⇒ quarta em Brasília, quinta em UTC
       ('PROBE-71-E2E-1', 'paid',      100.00, 100.00, 'pix', 'Probe 71 E2E', 'probe71e2e@exemplo.invalid', 'approved', '2026-10-22T00:20:00Z', '2026-10-22T00:30:00Z'),
       -- 2: criado qua 21h30 (BRT) e NÃO pago ⇒ nunca conta
       ('PROBE-71-E2E-2', 'pending',   999.00, 999.00, 'pix', 'Probe 71 E2E', 'probe71e2e@exemplo.invalid', 'pending',  '2026-10-22T00:30:00Z', null),
       -- 3: pago ter 20/10 21h30 (BRT) = 21/10 00:30Z ⇒ terça em Brasília, quarta em UTC
       ('PROBE-71-E2E-3', 'paid',       50.00,  50.00, 'pix', 'Probe 71 E2E', 'probe71e2e@exemplo.invalid', 'approved', '2026-10-21T00:20:00Z', '2026-10-21T00:30:00Z'),
       -- 4: pago DOMINGO 18/10 21h30 (BRT) = SEGUNDA 19/10 00:30Z ⇒ fora da semana em Brasília, dentro em UTC
       ('PROBE-71-E2E-4', 'paid',       30.00,  30.00, 'pix', 'Probe 71 E2E', 'probe71e2e@exemplo.invalid', 'approved', '2026-10-19T00:20:00Z', '2026-10-19T00:30:00Z'),
       -- 5: pago qua 10h (BRT) e CANCELADO ⇒ não conta
       ('PROBE-71-E2E-5', 'cancelled',  70.00,  70.00, 'pix', 'Probe 71 E2E', 'probe71e2e@exemplo.invalid', 'approved', '2026-10-21T12:50:00Z', '2026-10-21T13:00:00Z'),
       -- 6: pago qua 23h30 (BRT) = 22/10 02:30Z ⇒ DEPOIS do instante da leitura A (23h), conta só na B
       ('PROBE-71-E2E-6', 'paid',       20.00,  20.00, 'pix', 'Probe 71 E2E', 'probe71e2e@exemplo.invalid', 'approved', '2026-10-22T02:20:00Z', '2026-10-22T02:30:00Z');
     commit;"
  echo "semeado: 4 visitas (A seg/ter/qua, B qua) e 6 pedidos PROBE-71-E2E-*"
}

ler() {
  local t m
  t=$(token_admin)
  [ "$t" != "null" ] && [ -n "$t" ] || { echo "login do admin falhou"; exit 1; }

  echo "== Leitura A — p_agora = qua 21/10 23h de Brasília (22/10 02:00Z), como admin, pelo gateway"
  m=$(movimento "$t" '2026-10-22T02:00:00Z')
  echo "$m" | jq -c '{hoje, ontem, inicio_semana, periodos}'
  confere 'A hoje'           "$(echo "$m" | jq -r .hoje)"           '2026-10-21'
  confere 'A ontem'          "$(echo "$m" | jq -r .ontem)"          '2026-10-20'
  confere 'A inicio_semana'  "$(echo "$m" | jq -r .inicio_semana)"  '2026-10-19'
  confere 'A visitas hoje/ontem/semana' "$(echo "$m" | jq -r '[.periodos.hoje.visitas,.periodos.ontem.visitas,.periodos.semana.visitas]|join("/")')" '2/1/2'
  confere 'A vendas hoje/ontem/semana'  "$(echo "$m" | jq -r '[.periodos.hoje.vendas,.periodos.ontem.vendas,.periodos.semana.vendas]|join("/")')" '1/1/2'
  confere 'A faturamento hoje/ontem/semana' "$(echo "$m" | jq -r '[.periodos.hoje.faturamento,.periodos.ontem.faturamento,.periodos.semana.faturamento]|map(tostring)|join("/")')" '100.00/50.00/150.00'
  confere 'A ticket hoje/ontem/semana'  "$(echo "$m" | jq -r '[.periodos.hoje.ticket,.periodos.ontem.ticket,.periodos.semana.ticket]|map(tostring)|join("/")')" '100.00/50.00/75.00'

  echo "== Leitura B — sem p_agora (o instante real do servidor), como o Dashboard lê"
  m=$(movimento "$t")
  echo "$m" | jq -c '{hoje, ontem, inicio_semana, contagem_desde, ultima_visita, periodos}'
  confere 'B hoje (o dia real em Brasília)' "$(echo "$m" | jq -r .hoje)" "$(q "select (now() at time zone 'America/Sao_Paulo')::date")"
  if [ "$(echo "$m" | jq -r .hoje)" != '2026-10-22' ]; then
    echo "AVISO: a leitura B só tem números esperados para hoje = 22/10 (Brasília)"; return
  fi
  # As visitas de HOJE vêm da parte (b) — o navegador. O esperado se deriva do banco, nunca se crava.
  local hoje_distintos semana_distintos
  hoje_distintos=$(q "select count(distinct visitor_id) from public.store_visits where day = '2026-10-22'")
  semana_distintos=$(q "select count(distinct visitor_id) from public.store_visits where day between '2026-10-19' and '2026-10-22'")
  local soma_dos_dias
  soma_dos_dias=$(q "select count(*) from public.store_visits where day between '2026-10-19' and '2026-10-22'")
  echo "   (banco: distintos hoje=$hoje_distintos, distintos na semana=$semana_distintos, SOMA dos dias=$soma_dos_dias)"
  confere 'B visitas hoje/ontem/semana' "$(echo "$m" | jq -r '[.periodos.hoje.visitas,.periodos.ontem.visitas,.periodos.semana.visitas]|join("/")')" "$hoje_distintos/2/$semana_distintos"
  confere 'B vendas hoje/ontem/semana'  "$(echo "$m" | jq -r '[.periodos.hoje.vendas,.periodos.ontem.vendas,.periodos.semana.vendas]|join("/")')" '0/2/3'
  confere 'B faturamento hoje/ontem/semana' "$(echo "$m" | jq -r '[.periodos.hoje.faturamento,.periodos.ontem.faturamento,.periodos.semana.faturamento]|map(tostring)|join("/")')" '0/120.00/170.00'
  confere 'B ticket hoje/ontem/semana'  "$(echo "$m" | jq -r '[.periodos.hoje.ticket,.periodos.ontem.ticket,.periodos.semana.ticket]|map(tostring)|join("/")')" 'null/60.00/56.67'

  echo "== Contraste: o que a régua em UTC (toISOString().slice(0,10)) diria na quarta"
  q "select 'UTC dia 21/10: '||count(*)||' pedido(s), R\$ '||coalesce(sum(total),0)
       from public.orders where order_number like 'PROBE-71-E2E-%' and payment_status = 'approved'
        and status <> 'cancelled' and (paid_at at time zone 'UTC')::date = '2026-10-21'"
  q "select 'UTC semana desde seg 19/10 00:00Z até 22/10 02:00Z: '||count(*)||' pedido(s), R\$ '||coalesce(sum(total),0)
       from public.orders where order_number like 'PROBE-71-E2E-%' and payment_status = 'approved'
        and status <> 'cancelled' and paid_at >= '2026-10-19T00:00:00Z' and paid_at <= '2026-10-22T02:00:00Z'"
}

papeis() {
  local c
  echo "== anon (só a chave publicável), pelo gateway"
  c=$(curl -s -o /tmp/71-anon-1 -w '%{http_code}' "$API/rest/v1/store_visits?select=*" -H "apikey: $KEY")
  confere "anon GET store_visits (código / corpo)" "$c $(jq -r '.code // "sem código"' </tmp/71-anon-1)" '401 42501'
  c=$(curl -s -o /tmp/71-anon-2 -w '%{http_code}' "$API/rest/v1/store_visits" -H "apikey: $KEY" -H 'Content-Type: application/json' \
      -d "{\"day\":\"2026-10-22\",\"visitor_id\":\"$A\"}")
  confere "anon POST store_visits" "$c $(jq -r '.code // "sem código"' </tmp/71-anon-2)" '401 42501'
  c=$(curl -s -o /tmp/71-anon-3 -w '%{http_code}' "$API/rest/v1/store_visit_counter?select=*" -H "apikey: $KEY")
  confere "anon GET store_visit_counter" "$c $(jq -r '.code // "sem código"' </tmp/71-anon-3)" '401 42501'
  for fn in store_movement record_store_visit store_clock prune_store_visits; do
    local corpo='{}'
    [ "$fn" = record_store_visit ] && corpo="{\"p_id\":\"$A\"}"
    [ "$fn" = prune_store_visits ] && corpo='{"p_dia":"2099-01-01"}'
    c=$(curl -s -o /tmp/71-anon-fn -w '%{http_code}' "$API/rest/v1/rpc/$fn" -H "apikey: $KEY" -H 'Content-Type: application/json' -d "$corpo")
    confere "anon RPC $fn" "$c $(jq -r '.code // "sem código"' </tmp/71-anon-fn)" '401 42501'
  done

  echo "== cliente autenticado SEM papel de admin"
  local tc
  tc=$(token_cliente)
  c=$(curl -s -o /tmp/71-cli-1 -w '%{http_code}' "$API/rest/v1/rpc/store_movement" -H "apikey: $KEY" -H "Authorization: Bearer $tc" -H 'Content-Type: application/json' -d '{}')
  confere "cliente RPC store_movement" "$c $(jq -r '.code // "sem código"' </tmp/71-cli-1) $(jq -r '.message // ""' </tmp/71-cli-1)" '403 42501 acesso restrito ao painel'
  c=$(curl -s -o /tmp/71-cli-2 -w '%{http_code}' "$API/rest/v1/store_visits?select=*" -H "apikey: $KEY" -H "Authorization: Bearer $tc")
  confere "cliente GET store_visits" "$c $(jq -r '.code // "sem código"' </tmp/71-cli-2)" '403 42501'
  c=$(curl -s -o /tmp/71-cli-3 -w '%{http_code}' "$API/rest/v1/store_visits" -H "apikey: $KEY" -H "Authorization: Bearer $tc" -H 'Content-Type: application/json' \
      -d "{\"day\":\"2026-10-22\",\"visitor_id\":\"$A\"}")
  confere "cliente POST store_visits" "$c $(jq -r '.code // "sem código"' </tmp/71-cli-3)" '403 42501'

  echo "== e o admin também não lê a tabela direto (só pela função)"
  local ta
  ta=$(token_admin)
  c=$(curl -s -o /tmp/71-adm-1 -w '%{http_code}' "$API/rest/v1/store_visits?select=*" -H "apikey: $KEY" -H "Authorization: Bearer $ta")
  confere "admin GET store_visits" "$c $(jq -r '.code // "sem código"' </tmp/71-adm-1)" '403 42501'

  # As tentativas de gravação acima usaram o id A em 22/10, e a de poda um dia em 2099 (que apagaria
  # tudo). Nenhuma passou: as fixturas de A continuam 3 e nenhuma linha de A em 22/10 existe.
  confere "fixturas de A intactas e nenhuma linha de A em 22/10 gravada direto" \
    "$(q "select count(*) filter (where day < '2026-10-22') || '/' || count(*) filter (where day = '2026-10-22') from public.store_visits where visitor_id = '$A'")" '3/0'
  rm -f /tmp/71-anon-* /tmp/71-cli-* /tmp/71-adm-*
}

limpar() {
  [ -f "$ESTADO" ] || { echo "sem estado de entrada salvo ($ESTADO)"; exit 1; }
  # shellcheck disable=SC1090
  . "$ESTADO"
  q "begin;
     delete from public.orders where order_number like 'PROBE-71-E2E-%';
     delete from public.store_visits where visitor_id::text like '7100e2e0-%';
     commit;"
  # A entrada tinha $visitas visitas e $contador contador. As que a parte (b) gravou pelo navegador
  # são desta prova: com a entrada em zero, o estado de entrada é a tabela vazia.
  if [ "$visitas" = "0" ]; then q "delete from public.store_visits"; fi
  if [ "$contador" = "0" ]; then q "delete from public.store_visit_counter"; fi
  confere 'pedidos PROBE-71-E2E restantes' "$(q "select count(*) from public.orders where order_number like 'PROBE-71-E2E-%'")" '0'
  confere 'visitas (igual à entrada)' "$(q 'select count(*) from public.store_visits')" "$visitas"
  confere 'contador (igual à entrada)' "$(q 'select count(*) from public.store_visit_counter')" "$contador"
  rm -f "$ESTADO"
}

case "${1:-}" in
  semear) semear ;;
  ler) ler ;;
  papeis) papeis ;;
  limpar) limpar ;;
  *) echo "uso: $0 semear|ler|papeis|limpar"; exit 2 ;;
esac

if [ "$falhas" -gt 0 ]; then echo "$falhas FALHA(S)"; exit 1; fi
