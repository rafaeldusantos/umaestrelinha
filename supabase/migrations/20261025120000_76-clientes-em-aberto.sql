-- =====================================================================
-- 76 · mobile-adm: Clientes — `orders_open` em customer_stats e customer_list
-- =====================================================================
-- Requisitos: MAC-24, MAC-09 (a coluna)
--
-- Uma coluna NOVA no FIM de cada view, e nada mais. `CREATE OR REPLACE VIEW`
-- so aceita acrescentar coluna ao final, na mesma ordem das anteriores: o corpo
-- abaixo e o da migration `34` (20260829120000), COPIADO, mais a coluna. O
-- `select *` do painel continua devolvendo as mesmas 18 colunas com os mesmos
-- valores, e ganha a 19a, que ele ignora.
--
-- `orders_open` conta pedido PAGO e ainda em andamento. O par
-- `payment_status = 'approved'` e obrigatorio: um Pix expirado fica `pending`
-- para sempre, e sem o par a cliente ficaria "em aberto" indefinidamente. A
-- regra e dado em `OPEN_ORDER_RULE` (`@estrelinha/core/customers`), e o filtro
-- abaixo e a saida de `openOrdersSqlFilter('v')`.
--
-- O que NAO entrou: nenhum `grant`, `drop` ou escrita de dado. As views seguem
-- `security_invoker`, e a RLS de quem le (has_role) continua decidindo.

CREATE OR REPLACE VIEW public.customer_stats
WITH (security_invoker = true) AS
WITH vinculo AS (
  SELECT
    d.id AS customer_id,
    o.id AS order_id,
    o.total,
    o.payment_status,
    o.status,
    o.created_at,
    o.material_status
  FROM public.customer_directory d
  LEFT JOIN public.orders o
    ON o.customer_id = d.id
    OR lower(o.customer_email) = lower(d.email)
),
materiais AS (
  SELECT
    v.customer_id,
    array_agg(DISTINCT k ORDER BY k) AS material_kinds
  FROM vinculo v
  JOIN public.order_items oi ON oi.order_id = v.order_id
  CROSS JOIN unnest(oi.material_kinds) k
  GROUP BY v.customer_id
)
SELECT
  v.customer_id,
  count(v.order_id) FILTER (WHERE v.payment_status = 'approved')            AS orders_paid,
  count(v.order_id)                                                        AS orders_total,
  coalesce(sum(v.total) FILTER (WHERE v.payment_status = 'approved'), 0)::numeric(12,2)
                                                                           AS total_spent,
  -- NULL, e nao zero, quando nunca houve pedido pago: "ticket R$ 0,00" e uma
  -- afirmacao falsa sobre quem nunca comprou; ausencia e a verdade, e a tela
  -- desenha um travessao.
  CASE WHEN count(v.order_id) FILTER (WHERE v.payment_status = 'approved') > 0
       THEN round(
              coalesce(sum(v.total) FILTER (WHERE v.payment_status = 'approved'), 0)
              / count(v.order_id) FILTER (WHERE v.payment_status = 'approved'), 2)
  END                                                                      AS avg_ticket,
  min(v.created_at) FILTER (WHERE v.payment_status = 'approved')           AS first_order_at,
  max(v.created_at) FILTER (WHERE v.payment_status = 'approved')           AS last_order_at,
  -- O ultimo pedido de QUALQUER estado: e o que a coluna "Ultima compra"
  -- mostra como "em aberto" quando ainda nao virou dinheiro (CLI-05).
  max(v.created_at)                                                        AS last_activity_at,
  count(v.order_id) FILTER (WHERE v.material_status IS NOT NULL
                              AND v.material_status <> 'nao_aplicavel')    AS orders_with_material,
  coalesce(m.material_kinds, '{}'::text[])                                 AS material_kinds,
  -- `MAC-24` (feature 76) — pedido PAGO e ainda em andamento. A regra tem UM dono,
  -- `OPEN_ORDER_RULE` em `@estrelinha/core/customers`; esta linha e a saida de
  -- `openOrdersSqlFilter('v')`, colada, e `emAbertoComDonoUnico.test.ts` compara.
  count(v.order_id) filter (where v.payment_status = 'approved' and v.status in ('pending', 'paid', 'separating', 'shipped'))      AS orders_open
FROM vinculo v
LEFT JOIN materiais m ON m.customer_id = v.customer_id
GROUP BY v.customer_id, m.material_kinds;

COMMENT ON VIEW public.customer_stats IS
  'Gastou / ticket / ultima compra / material / em aberto, por pessoa do customer_directory. DINHEIRO SO DE payment_status = approved (CLI-04). orders_open (feature 76) = pago e em andamento, regra em @estrelinha/core/customers. Agregado e view, nunca coluna.';

CREATE OR REPLACE VIEW public.customer_list
WITH (security_invoker = true) AS
SELECT
  d.id,
  d.user_id,
  d.name,
  d.email,
  d.cpf,
  d.phone,
  d.created_at,
  d.has_account,
  coalesce(s.orders_paid, 0)            AS orders_paid,
  coalesce(s.orders_total, 0)           AS orders_total,
  coalesce(s.total_spent, 0)            AS total_spent,
  s.avg_ticket,
  s.first_order_at,
  s.last_order_at,
  s.last_activity_at,
  coalesce(s.orders_with_material, 0)   AS orders_with_material,
  coalesce(s.material_kinds, '{}'::text[]) AS material_kinds,
  -- `CLI-14` — duplicata e MOSTRADA, nao resolvida. Quantos cadastros compartilham
  -- este e-mail: > 1 e a visao "Possiveis duplicadas". Fundir e escrita destrutiva
  -- sobre pedido pago, e e decisao da dona.
  (SELECT count(*) FROM public.customer_directory d2
    WHERE lower(d2.email) = lower(d.email))::int AS same_email_count,
  coalesce(s.orders_open, 0)            AS orders_open
FROM public.customer_directory d
LEFT JOIN public.customer_stats s ON s.customer_id = d.id;

COMMENT ON VIEW public.customer_list IS
  'A listagem de Clientes: customer_directory + customer_stats ja juntados, para a ordenacao acontecer NO SERVIDOR. orders_open (feature 76) e a 19a coluna: pedidos pagos e em andamento.';
