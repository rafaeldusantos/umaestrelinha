#!/usr/bin/env bash
# Probe contra o Postgres LOCAL (:54442): o relatório de adesão ao Compre Junto (`buy_together_adoption`).
#   1. sem papel admin a RPC recusa com 42501 antes de ler qualquer linha; `anon` não executa
#   2. período fora de 7/30/90 recusa com 22023
#   3. só pedidos pagos e não cancelados (a régua do Dashboard), no recorte de dias de Brasília
#   4. indicadores: pedidos com Compre Junto, peças (soma da quantidade da linha marcada), valor,
#      a parte dos pedidos pagos e a média por pedido
#   5. marca cujo principal não está no pedido não conta; a linha conta UMA vez nas peças, e uma vez
#      por lista mesmo acompanhando duas joias da mesma lista
#   6. por joia principal e por lista, com a peça que mais sai (com a variação), a lista sem venda com
#      0 e a linha "direto no produto"
#   7. tirar as peças da lista e apagar a lista depois não muda os números (o pedido guarda a marca)
#   8. (WI 92) o valor é o preço pago (`unit_price`, líquido) e `desconto_concedido` soma
#      `(full_unit_price - unit_price) * quantity` das linhas marcadas — nos indicadores, por joia e
#      por lista, uma vez por linha; a linha sem preço cheio (pedido antigo) conta 0
# Cópia do probe do WI-01 (`.specs/work-items/WI-01-compre-junto/probes/05-adesao.sh`) com a fixtura
# do desconto: os números de antes não mudam, porque o valor continua sendo o preço pago.
# Tudo numa transação DESFEITA, com `p_agora` em 2030 para não esbarrar nos pedidos do banco local.
# Nunca aponte para ambiente remoto. Não deixa nada gravado.
set -u
D=postgresql://postgres:postgres@127.0.0.1:54442/postgres
falhas=0
ok()  { echo "ok — $1"; }
bad() { echo "FALHA — $1 ($2)"; falhas=$((falhas+1)); }

ADMIN=$(psql "$D" -Atc "select user_id from public.user_roles where role = 'admin' limit 1")
PECA=$(psql "$D" -Atc "select id from public.products limit 1")
[ -n "$ADMIN" ] || { echo "FALHA — nenhum admin no banco local"; exit 1; }
[ -n "$PECA" ] || { echo "FALHA — nenhum produto no banco local"; exit 1; }

saida=$(psql "$D" -At -v ON_ERROR_STOP=0 -v admin="$ADMIN" -v peca="$PECA" <<'SQL' 2>&1
\set VERBOSITY verbose
begin;
\set agora '''2030-01-15 15:00:00-03'''
insert into public.buy_together_lists (id, name) values
  ('0b6c1f7e-aaaa-4a2b-9c3d-000000000001', 'Probe Correntes'),
  ('0b6c1f7e-aaaa-4a2b-9c3d-000000000002', 'Probe Sem Venda');
insert into public.buy_together_list_items (list_id, product_id, position) values
  ('0b6c1f7e-aaaa-4a2b-9c3d-000000000001', :'peca', 0);

-- O1 pago há 1 dia: joia A, corrente X 45 cm (2 × 50) pela lista, embalagem Y (1 × 10) direto no produto
-- O2 pago e CANCELADO; O3 pendente — os dois ficam de fora
-- O4 pago há 2 dias: joias B e C, corrente X 45 cm (1 × 50) acompanhando B, C (mesma lista) e A (que não está
--    no pedido); e uma linha cujo único principal não está no pedido
-- O5 pago há 10 dias: joia A, corrente X 50 cm (1 × 60) pela lista — entra em 30, não em 7
-- O6 pago há 1 dia, sem Compre Junto
insert into public.orders (id, customer_name, customer_email, payment_method, subtotal, total, payment_status, status, paid_at) values
  ('0b6c1f7e-bbbb-4a2b-9c3d-000000000001', 'P', 'p@exemplo.invalid', 'pix', 1, 1, 'approved', 'paid', timestamptz :agora - interval '1 day'),
  ('0b6c1f7e-bbbb-4a2b-9c3d-000000000002', 'P', 'p@exemplo.invalid', 'pix', 1, 1, 'approved', 'cancelled', timestamptz :agora - interval '1 day'),
  ('0b6c1f7e-bbbb-4a2b-9c3d-000000000003', 'P', 'p@exemplo.invalid', 'pix', 1, 1, 'pending', 'pending', null),
  ('0b6c1f7e-bbbb-4a2b-9c3d-000000000004', 'P', 'p@exemplo.invalid', 'pix', 1, 1, 'approved', 'paid', timestamptz :agora - interval '2 days'),
  ('0b6c1f7e-bbbb-4a2b-9c3d-000000000005', 'P', 'p@exemplo.invalid', 'pix', 1, 1, 'approved', 'paid', timestamptz :agora - interval '10 days'),
  ('0b6c1f7e-bbbb-4a2b-9c3d-000000000006', 'P', 'p@exemplo.invalid', 'pix', 1, 1, 'approved', 'paid', timestamptz :agora - interval '1 day');
-- WI 92: o preço cheio de cada linha. Corrente X do O1 60 (pagou 50 ⇒ 2 × 10), Embalagem Y do O1 12 (pagou
-- 10 ⇒ 2), Corrente X do O4 SEM preço cheio (pedido antigo ⇒ 0), Corrente X do O5 75 (pagou 60 ⇒ 15). E três
-- que não podem contar: a joia A do O1 (120, não é peça marcada), a Peça Z do O4 (40, sem principal) e a
-- corrente do O2 cancelado (70).
insert into public.order_items (order_id, product_id, product_name, variant_label, quantity, unit_price, accompanies_product_ids, accompanies_list_ids, full_unit_price) values
  ('0b6c1f7e-bbbb-4a2b-9c3d-000000000001', 'probe-a', 'Joia A', null, 1, 100, null, null, 120),
  ('0b6c1f7e-bbbb-4a2b-9c3d-000000000001', 'probe-x', 'Corrente X', '45 cm', 2, 50, array['probe-a'], array['0b6c1f7e-aaaa-4a2b-9c3d-000000000001'::uuid], 60),
  ('0b6c1f7e-bbbb-4a2b-9c3d-000000000001', 'probe-y', 'Embalagem Y', null, 1, 10, array['probe-a'], array[null::uuid], 12),
  ('0b6c1f7e-bbbb-4a2b-9c3d-000000000002', 'probe-a', 'Joia A', null, 1, 100, null, null, null),
  ('0b6c1f7e-bbbb-4a2b-9c3d-000000000002', 'probe-x', 'Corrente X', '45 cm', 5, 50, array['probe-a'], array['0b6c1f7e-aaaa-4a2b-9c3d-000000000001'::uuid], 70),
  ('0b6c1f7e-bbbb-4a2b-9c3d-000000000003', 'probe-a', 'Joia A', null, 1, 100, null, null, null),
  ('0b6c1f7e-bbbb-4a2b-9c3d-000000000003', 'probe-x', 'Corrente X', '45 cm', 5, 50, array['probe-a'], array['0b6c1f7e-aaaa-4a2b-9c3d-000000000001'::uuid], null),
  ('0b6c1f7e-bbbb-4a2b-9c3d-000000000004', 'probe-b', 'Joia B', null, 1, 100, null, null, null),
  ('0b6c1f7e-bbbb-4a2b-9c3d-000000000004', 'probe-c', 'Joia C', null, 1, 100, null, null, null),
  ('0b6c1f7e-bbbb-4a2b-9c3d-000000000004', 'probe-x', 'Corrente X', '45 cm', 1, 50, array['probe-b', 'probe-c', 'probe-a'],
     array['0b6c1f7e-aaaa-4a2b-9c3d-000000000001'::uuid, '0b6c1f7e-aaaa-4a2b-9c3d-000000000001'::uuid, '0b6c1f7e-aaaa-4a2b-9c3d-000000000001'::uuid], null),
  ('0b6c1f7e-bbbb-4a2b-9c3d-000000000004', 'probe-z', 'Peça Z', null, 7, 30, array['probe-ausente'], array[null::uuid], 40),
  ('0b6c1f7e-bbbb-4a2b-9c3d-000000000005', 'probe-a', 'Joia A', null, 1, 100, null, null, null),
  ('0b6c1f7e-bbbb-4a2b-9c3d-000000000005', 'probe-x', 'Corrente X', '50 cm', 1, 60, array['probe-a'], array['0b6c1f7e-aaaa-4a2b-9c3d-000000000001'::uuid], 75),
  ('0b6c1f7e-bbbb-4a2b-9c3d-000000000006', 'probe-a', 'Joia A', null, 1, 100, null, null, null);

-- 1. sem papel: um usuário qualquer, autenticado
savepoint s1;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
select 'SEMPAPEL:' || public.buy_together_adoption(30, timestamptz :agora)::text;
rollback to savepoint s1;
savepoint s2;
set local role anon;
select 'ANON:' || public.buy_together_adoption(30, timestamptz :agora)::text;
rollback to savepoint s2;

-- como admin
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'admin', 'role', 'authenticated')::text, true);
savepoint s3;
select 'P15:' || public.buy_together_adoption(15, timestamptz :agora)::text;
rollback to savepoint s3;

select 'R30:' || public.buy_together_adoption(30, timestamptz :agora)::text;
select 'R07:' || public.buy_together_adoption(7, timestamptz :agora)::text;
select 'MD5ANTES:' || md5((public.buy_together_adoption(30, timestamptz :agora) - 'lido_em' - 'por_lista')::text);

-- 7. a dona tira a peça da lista e depois apaga a lista: os números do histórico não mudam
reset role;
delete from public.buy_together_list_items where list_id = '0b6c1f7e-aaaa-4a2b-9c3d-000000000001';
delete from public.buy_together_lists where id = '0b6c1f7e-aaaa-4a2b-9c3d-000000000001';
set local role authenticated;
select 'MD5DEPOIS:' || md5((public.buy_together_adoption(30, timestamptz :agora) - 'lido_em' - 'por_lista')::text);
select 'LISTAAPAGADA:' || (select l::text from jsonb_array_elements(public.buy_together_adoption(30, timestamptz :agora) -> 'por_lista') l
  where l ->> 'lista_id' = '0b6c1f7e-aaaa-4a2b-9c3d-000000000001');
rollback;
SQL
)

linha() { echo "$saida" | grep -m1 "^$1" | sed "s/^$1//"; }
js() { echo "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(eval(sys.argv[1]))" "$2" 2>&1; }

echo "$saida" | grep -q "SEMPAPEL:" && bad "sem papel não recusou" "$(linha SEMPAPEL:)" \
  || { echo "$saida" | grep -q "42501: acesso restrito ao painel" && ok "sem papel: 42501 'acesso restrito ao painel'" || bad "sem papel" "$saida"; }
echo "$saida" | grep -q "ANON:" && bad "anon executou" "$(linha ANON:)" \
  || { echo "$saida" | grep -q "42501: permission denied for function buy_together_adoption" && ok "anon não executa a função" || bad "anon" "sem 'permission denied'"; }
echo "$saida" | grep -q "P15:" && bad "período 15 aceito" "$(linha P15:)" \
  || { echo "$saida" | grep -q "22023: período fora de 7, 30 ou 90 dias" && ok "período 15 recusado" || bad "período 15" "sem a recusa"; }

R30=$(linha R30:); R07=$(linha R07:)
[ -n "$R30" ] || { echo "FALHA — R30 vazio: $saida"; exit 1; }
v() { js "$R30" "$1"; }
[ "$(v "d['pedidos_pagos']")" = 4 ] && ok "30 dias: 4 pedidos pagos (cancelado e pendente de fora)" || bad "pedidos_pagos" "$(v "d['pedidos_pagos']")"
[ "$(v "d['pedidos_com']")" = 3 ] && ok "30 dias: 3 pedidos com Compre Junto" || bad "pedidos_com" "$(v "d['pedidos_com']")"
[ "$(v "d['pecas']")" = 5 ] && ok "30 dias: 5 peças (soma da quantidade; a linha de duas joias conta uma vez; a sem principal não conta)" || bad "pecas" "$(v "d['pecas']")"
[ "$(v "float(d['valor'])")" = 220.0 ] && ok "30 dias: R\$ 220 pelo preço pago em cada peça" || bad "valor" "$(v "d['valor']")"
[ "$(v "float(d['parte'])")" = 0.75 ] && ok "parte dos pedidos pagos: 0,75" || bad "parte" "$(v "d['parte']")"
[ "$(v "float(d['media'])")" = 1.67 ] && ok "média de peças por pedido: 1,67" || bad "media" "$(v "d['media']")"
[ "$(v "d['dias']")" = 30 ] && ok "o período volta na resposta" || bad "dias" "$(v "d['dias']")"
[ "$(v "d['desde']")" = 2029-12-17 ] && ok "desde 2029-12-17 (30 dias de Brasília contando hoje)" || bad "desde" "$(v "d['desde']")"

J="{j['principal']: (j['nome'], j['pedidos'], j['pecas'], float(j['valor']), j['top_nome']) for j in d['por_joia']}"
esperado_j="{'probe-a': ('Joia A', 2, 4, 170.0, 'Corrente X · 45 cm'), 'probe-b': ('Joia B', 1, 1, 50.0, 'Corrente X · 45 cm'), 'probe-c': ('Joia C', 1, 1, 50.0, 'Corrente X · 45 cm')}"
[ "$(v "$J")" = "$esperado_j" ] && ok "por joia principal: A, B e C com pedidos, peças, valor e a peça que mais sai" || bad "por joia" "$(v "$J")"

L="sorted([(l['lista_id'] or '-', l['direto'], l['nome'], l['pecas'], float(l['valor']), l['top_nome']) for l in d['por_lista'] if l['direto'] or (l['lista_id'] or '').startswith('0b6c1f7e')])"
esperado_l="[('-', True, None, 1, 10.0, 'Embalagem Y'), ('0b6c1f7e-aaaa-4a2b-9c3d-000000000001', False, 'Probe Correntes', 4, 210.0, 'Corrente X · 45 cm'), ('0b6c1f7e-aaaa-4a2b-9c3d-000000000002', False, 'Probe Sem Venda', 0, 0.0, None)]"
[ "$(v "$L")" = "$esperado_l" ] && ok "por lista: a lista (uma vez por linha), a sem venda com 0, e 'direto no produto'" || bad "por lista" "$(v "$L")"
[ "$(v "len([l for l in d['por_lista'] if l['direto']])")" = 1 ] && ok "uma só linha 'direto no produto'" || bad "linha direto" "$(v "len([l for l in d['por_lista'] if l['direto']])")"


# 8. (WI 92) o desconto concedido, com o valor pago intacto
[ "$(v "float(d['desconto_concedido'])")" = 37.0 ] && ok "30 dias: desconto concedido R\$ 37 (20 + 2 + 15; a linha sem preço cheio conta 0; joia, sem principal e cancelado de fora)" || bad "desconto_concedido" "$(v "d.get('desconto_concedido')")"
DJ="{j['principal']: float(j['desconto_concedido']) for j in d['por_joia']}"
[ "$(v "$DJ")" = "{'probe-a': 37.0, 'probe-b': 0.0, 'probe-c': 0.0}" ] && ok "por joia: o desconto de A (37) e o recuo 0 de B e C (linha sem preço cheio)" || bad "desconto por joia" "$(v "$DJ")"
DL="sorted([(l['lista_id'] or '-', float(l['desconto_concedido'])) for l in d['por_lista'] if l['direto'] or (l['lista_id'] or '').startswith('0b6c1f7e')])"
[ "$(v "$DL")" = "[('-', 2.0), ('0b6c1f7e-aaaa-4a2b-9c3d-000000000001', 35.0), ('0b6c1f7e-aaaa-4a2b-9c3d-000000000002', 0.0)]" ] \
  && ok "por lista: 35 na lista (a linha de duas joias conta uma vez), 2 direto no produto, 0 na sem venda" || bad "desconto por lista" "$(v "$DL")"

w() { js "$R07" "$1"; }
[ "$(w "(d['pedidos_pagos'], d['pedidos_com'], d['pecas'], float(d['valor']))")" = "(3, 2, 4, 160.0)" ] \
  && ok "7 dias: 3 pagos, 2 com Compre Junto, 4 peças, R\$ 160 (o de 10 dias atrás fica de fora)" || bad "7 dias" "$(w "(d['pedidos_pagos'], d['pedidos_com'], d['pecas'], d['valor'])")"
[ "$(w "float(d['desconto_concedido'])")" = 22.0 ] && ok "7 dias: desconto concedido R\$ 22 (o de 10 dias atrás fica de fora)" || bad "7 dias desconto" "$(w "d.get('desconto_concedido')")"

[ -n "$(linha MD5ANTES:)" ] && [ "$(linha MD5ANTES:)" = "$(linha MD5DEPOIS:)" ] \
  && ok "tirar a peça da lista e apagar a lista não muda indicadores nem por joia" || bad "histórico mudou" "$(linha MD5ANTES:) → $(linha MD5DEPOIS:)"
LA=$(linha LISTAAPAGADA:)
[ "$(js "$LA" "(d['nome'], d['pecas'], float(d['valor']))")" = "(None, 4, 210.0)" ] \
  && ok "a lista apagada continua no recorte por lista, sem nome, com os mesmos números" || bad "lista apagada" "$LA"

echo "falhas: $falhas"
exit $falhas
