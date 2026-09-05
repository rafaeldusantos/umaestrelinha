-- =====================================================================
-- 34 · Painel de vendas — Pedidos e Clientes
-- =====================================================================
-- Requisitos: PED-11, PED-29, CLI-01..CLI-14
--
-- Uma migration so, e NOVA. A AD-017 venceu em 2026-08-17, quando o
-- `Supabase Deploy` aplicou as 44 migrations no projeto hospedado: daqui em
-- diante migration aplicada e imutavel, e correcao vem em migration nova.
-- Reescrever arquivo ja aplicado faz o banco local e o hospedado divergirem em
-- silencio, porque o `db push` so olha o que falta, nunca o que mudou.
--
-- ---------------------------------------------------------------------
-- O QUE ENTROU AQUI E NAO ESTAVA NO PLANO DA FEATURE
-- ---------------------------------------------------------------------
-- 1. O CHECK de `orders.status` nao aceita 'separating' (secao 1). Foi
--    encontrado na validacao, medido contra o banco local, e nao estava na
--    spec: e a mesma familia do `DbCategory`/PGRST204 da AD-012.
-- 2. `customer_directory` (secao 3). A spec presume que a cliente convidada e
--    uma linha de `customers`, e ela nao e: aquela tabela so recebe linha do
--    trigger `on_auth_user_created_customer`, sobre `auth.users`. Sem esta
--    view, o filtro "conta/convidada" (CLI-01), o retrato da base (CLI-06) e
--    as duplicadas por e-mail (CLI-14) nao teriam o que ler.
--
-- ---------------------------------------------------------------------
-- O QUE DELIBERADAMENTE NAO ENTROU
-- ---------------------------------------------------------------------
-- * `unique (customers.email)`. Pode haver duplicata JA GRAVADA, e a migration
--   falharia na aplicacao. A feature MOSTRA a duplicata (CLI-14); fundir dois
--   cadastros e escrita destrutiva sobre pedido pago, e e decisao da dona.
-- * Indice em `orders(customer_email)`. JA EXISTE, criado como
--   `idx_orders_email` na migration 20260415090935. Um segundo indice sobre a
--   mesma coluna e um segundo dono do mesmo caminho de acesso, com custo de
--   escrita em todo pedido e nenhum ganho de leitura.
-- * Coluna materializada de gasto/ticket. Agregado e VIEW: materializar daria
--   um segundo dono do numero, que qualquer importacao desatualizaria em
--   silencio. Mesma decisao de `faq_usage` na feature 28.

-- ---------------------------------------------------------------------
-- 1. orders.status — 'separating' era recusado pelo CHECK
-- ---------------------------------------------------------------------
-- `ORDER_STATUSES` do backoffice declara seis estados e a tela oferece os seis,
-- mas o CHECK inline do CREATE TABLE original so permitia cinco. Nada nunca o
-- afrouxou. Medido contra o banco local:
--
--   ERROR: new row for relation "orders" violates check constraint
--          "orders_status_check"
--
-- Ou seja: TODA gravacao de "Em separacao" falhava, com 23514, e nada no
-- repositorio acusava — o tipo e `text`, o `tsc` acha certo, e os testes de
-- componente mockam o client. E o defeito da AD-012 pela terceira vez.
--
-- PED-29 (avancar status) depende deste estado existir de verdade.
--
-- CHECK em statement PROPRIO e NOMEADO, nunca inline num ALTER: quando a
-- coluna ja existe, o inline e ignorado em silencio.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'paid', 'separating', 'shipped', 'delivered', 'cancelled'));

COMMENT ON COLUMN public.orders.notes IS
  'RECADO DA CLIENTE, escrito por ela no checkout. Existe desde a migration inicial e nunca esteve em DbOrder, entao nunca chegou a nenhuma tela do painel (PED-11). NAO CONFUNDIR com order_notes, que e nota INTERNA da Adri e a cliente nunca ve. A tela rotula os dois com a origem explicita.';

-- ---------------------------------------------------------------------
-- 2. Indices que a fila e o retrato da base passam a exigir
-- ---------------------------------------------------------------------
-- A fila filtra por `material_status` e ordena por `created_at`. Ja existe
-- `idx_orders_material_status`, PARCIAL em `material_status <> 'nao_aplicavel'`
-- — e o composto herda o MESMO predicado de propósito. Sem ele, todo pedido de
-- acessorio (a maioria silenciosa) pagaria escrita num indice que a fila nunca
-- le. A justificativa "hoje e seq scan" que circulou no design e falsa: o
-- indice parcial ja existia; o que faltava era a segunda coluna da ordenacao.
CREATE INDEX IF NOT EXISTS idx_orders_material_status_created_at
  ON public.orders (material_status, created_at DESC)
  WHERE material_status <> 'nao_aplicavel';

-- O agregado por cliente le por vinculo e filtra por pagamento aprovado.
CREATE INDEX IF NOT EXISTS idx_orders_customer_payment
  ON public.orders (customer_id, payment_status)
  WHERE customer_id IS NOT NULL;

-- O vinculo da convidada e por e-mail normalizado. `idx_orders_email` existe,
-- mas indexa `customer_email` CRU: `lower(customer_email) = lower(...)` nao o
-- usa. Este e funcional, e so cobre a linha sem cadastro, que e o caso.
CREATE INDEX IF NOT EXISTS idx_orders_email_lower_guest
  ON public.orders (lower(customer_email))
  WHERE customer_id IS NULL;

-- ---------------------------------------------------------------------
-- 3. customer_directory — quem a tela de Clientes precisa listar
-- ---------------------------------------------------------------------
-- `public.customers` NAO e a lista de clientes da loja. Ela so recebe linha do
-- trigger `on_auth_user_created_customer`, que dispara em `auth.users`: quem
-- comprou como convidada nunca aparece ali, e o checkout grava
-- `orders.customer_id = null`.
--
-- Consequencia medida na validacao da feature 34: a tela de Clientes de hoje
-- mostra so quem criou conta. E a spec descreve o defeito da duplicata ao
-- contrario — "comprando como convidada duas vezes vira duas linhas" e falso,
-- ela vira ZERO linhas.
--
-- A identidade da convidada e o e-mail NORMALIZADO, e o id dela e derivado dele
-- por md5. Deterministico e estavel: a mesma pessoa recebe o mesmo id em toda
-- leitura, sem escrita nenhuma, e a rota `/admin/clientes/:id` funciona igual
-- para cadastro e para convidada. Criar linha em `customers` para cada convidada
-- seria escrever no banco para responder uma pergunta de leitura — e daria a
-- ela um cadastro que ela nunca pediu.
--
-- `security_invoker` para a view herdar a RLS de quem le: a policy
-- `admin full customers` / `admin full orders` (has_role) e que decide, e nao a
-- dona da view. Sem isso a view seria um furo de RLS com cara de conveniencia.
CREATE OR REPLACE VIEW public.customer_directory
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.user_id,
  c.name,
  c.email,
  c.cpf,
  c.phone,
  c.created_at,
  true AS has_account
FROM public.customers c
UNION ALL
SELECT
  md5(g.email_key)::uuid AS id,
  NULL::uuid             AS user_id,
  g.name,
  g.email,
  NULL::text             AS cpf,
  NULL::text             AS phone,
  g.first_seen           AS created_at,
  false                  AS has_account
FROM (
  SELECT
    lower(o.customer_email)                                          AS email_key,
    min(o.customer_email)                                            AS email,
    -- O nome mais RECENTE: a pessoa pode ter escrito "maria" no primeiro
    -- pedido e "Maria Silva" no segundo, e a tela deve mostrar o segundo.
    (array_agg(o.customer_name ORDER BY o.created_at DESC))[1]       AS name,
    min(o.created_at)                                                AS first_seen
  FROM public.orders o
  WHERE o.customer_id IS NULL
  GROUP BY lower(o.customer_email)
) g
WHERE NOT EXISTS (
  -- Quem comprou como convidada e DEPOIS criou conta com o mesmo e-mail nao
  -- pode virar duas linhas: o cadastro ganha, e os pedidos de convidada se
  -- ligam a ele pelo e-mail em `customer_stats`.
  SELECT 1 FROM public.customers c2 WHERE lower(c2.email) = g.email_key
);

COMMENT ON VIEW public.customer_directory IS
  'Quem a tela de Clientes lista: cadastro (customers) MAIS quem so comprou como convidada, agrupada por e-mail normalizado. O id da convidada e md5(lower(email))::uuid — deterministico, estavel e sem escrita. customers sozinha nao serve: ela so recebe linha do trigger de signup.';

-- ---------------------------------------------------------------------
-- 4. customer_stats — as tres perguntas, como agregado derivado
-- ---------------------------------------------------------------------
-- CLI-03..CLI-06. VIEW e nao coluna: materializar daria um segundo dono do
-- numero (defeito 01), e qualquer importacao o desatualizaria em silencio.
--
-- **Dinheiro conta so `payment_status = 'approved'`.** Somar `pending` inflaria
-- o gasto com Pix que expira sozinho, e um numero de dinheiro que inclui Pix
-- expirado nao e um numero de dinheiro. A tela DECLARA esse criterio em texto,
-- para o numero nao ter dois donos silenciosos.
--
-- O vinculo pedido -> pessoa e por id OU por e-mail: cobre o pedido de
-- convidada (sem id) e o cadastro que comprou antes de criar conta.
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
  coalesce(m.material_kinds, '{}'::text[])                                 AS material_kinds
FROM vinculo v
LEFT JOIN materiais m ON m.customer_id = v.customer_id
GROUP BY v.customer_id, m.material_kinds;

COMMENT ON VIEW public.customer_stats IS
  'Gastou / ticket / ultima compra / material, por pessoa do customer_directory. DINHEIRO SO DE payment_status = approved (CLI-04) — a tela declara isso em texto. Agregado e view, nunca coluna: materializar daria um segundo dono do numero.';

-- ---------------------------------------------------------------------
-- 5. customer_notes — a nota interna sobre a pessoa
-- ---------------------------------------------------------------------
-- CLI-10, no molde de `order_notes`.
--
-- **`customer_id` NAO tem FK, e isso e deliberado.** A chave e o id do
-- `customer_directory`, que para a convidada e derivado do e-mail e nao existe
-- em `customers`. Uma FK para `customers(id)` tornaria impossivel anotar
-- exatamente sobre quem o painel mais precisa anotar — a pessoa que mandou
-- cinzas sem criar conta. O preco e conhecido: a integridade referencial fica
-- por conta da aplicacao.
--
-- A policy usa `has_role`, e NAO o `FOR ALL USING (true)` que `order_notes`
-- carrega desde 2026-04. Copiar aquele molde ao pe da letra seria copiar um
-- defeito: nota interna sobre a morte de alguem nao pode ser legivel por
-- qualquer sessao autenticada.
CREATE TABLE IF NOT EXISTS public.customer_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  note        text NOT NULL,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_notes_customer
  ON public.customer_notes (customer_id, created_at DESC);

ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin full customer_notes" ON public.customer_notes;
CREATE POLICY "admin full customer_notes" ON public.customer_notes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

REVOKE ALL ON public.customer_notes FROM anon;

COMMENT ON TABLE public.customer_notes IS
  'Nota INTERNA sobre a cliente. A cliente nunca ve, e a tela escreve isso. customer_id referencia customer_directory (que inclui convidada), por isso NAO tem FK para customers.';

-- ---------------------------------------------------------------------
-- 6. anonymize_customer — o caminho de LGPD
-- ---------------------------------------------------------------------
-- CLI-13. Escrita destrutiva sobre dado sensivel nao passa por `update` direto
-- do cliente: e RPC `security definer`, guardada por `has_role`, revogada de
-- `anon`. Mesma regra de `set_material_status`.
--
-- **Preserva os pedidos, sem dono.** Pedido e registro fiscal: apagar a linha
-- quebraria o faturamento. O que sai e o vinculo com a pessoa.
--
-- **E os pedidos tambem sao limpos**, e isso e o ponto que o desenho original
-- deixava passar: `orders.customer_name` e `orders.customer_email` sao copias
-- do nome e do e-mail no momento da compra. Limpar so `customers` deixaria o
-- nome e o e-mail da pessoa gravados em toda linha de pedido — atendendo ao
-- pedido de exclusao na aparencia e nao no fato. As colunas sao NOT NULL, entao
-- recebem lapide em vez de nulo.
CREATE OR REPLACE FUNCTION public.anonymize_customer(p_customer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email        text;
  v_pedidos      int := 0;
  v_enderecos    int := 0;
  v_tinha_conta  boolean := false;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_admin');
  END IF;

  -- O e-mail e a chave do vinculo, inclusive para a convidada, cujo id sai do
  -- proprio e-mail. Lido do directory para os dois casos caminharem juntos.
  SELECT d.email, d.has_account INTO v_email, v_tinha_conta
  FROM public.customer_directory d
  WHERE d.id = p_customer_id;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  -- 1. Os enderecos somem por inteiro: nao ha versao anonima de um endereco.
  DELETE FROM public.addresses
  WHERE customer_id = p_customer_id;
  GET DIAGNOSTICS v_enderecos = ROW_COUNT;

  -- 2. Os pedidos ficam, sem dono e sem identificacao.
  UPDATE public.orders
  SET
    customer_name          = 'Cliente removida',
    customer_email         = 'anonimizado+' || left(md5(lower(v_email)), 12) || '@removido.invalid',
    customer_id            = NULL,
    address_street         = NULL,
    address_number         = NULL,
    address_neighborhood   = NULL,
    address_city           = NULL,
    address_state          = NULL,
    address_zip            = NULL,
    address_complement     = NULL
  WHERE customer_id = p_customer_id
     OR lower(customer_email) = lower(v_email);
  GET DIAGNOSTICS v_pedidos = ROW_COUNT;

  -- 3. O cadastro, quando existe. A convidada nao tem, e o passo 2 ja a apagou.
  IF v_tinha_conta THEN
    UPDATE public.customers
    SET
      name    = 'Cliente removida',
      email   = 'anonimizado+' || left(md5(lower(v_email)), 12) || '@removido.invalid',
      cpf     = NULL,
      phone   = NULL,
      user_id = NULL
    WHERE id = p_customer_id;
  END IF;

  -- 4. As notas internas falam sobre a pessoa, entao vao junto.
  DELETE FROM public.customer_notes WHERE customer_id = p_customer_id;

  RETURN jsonb_build_object(
    'ok', true,
    'reason', NULL,
    'orders_preserved', v_pedidos,
    'addresses_deleted', v_enderecos,
    'had_account', v_tinha_conta
  );
END;
$$;

REVOKE ALL ON FUNCTION public.anonymize_customer(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.anonymize_customer(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.anonymize_customer(uuid) TO authenticated;

COMMENT ON FUNCTION public.anonymize_customer(uuid) IS
  'CLI-13. Apaga nome, e-mail, CPF, telefone e enderecos — do cadastro E das copias gravadas em orders — e PRESERVA os pedidos, sem dono, porque pedido e registro fiscal. Guardada por has_role, revogada de anon. O dialogo da tela escreve exatamente isto antes de perguntar.';

-- ---------------------------------------------------------------------
-- 7. customer_list — a listagem, ja juntada
-- ---------------------------------------------------------------------
-- `CLI-01` exige ordenacao NO SERVIDOR por "Gastou", "Ticket" e "Ultima compra",
-- que sao colunas do agregado. O PostgREST so junta relacoes ligadas por FK, e
-- view nao tem FK — entao ordenar por `total_spent` lendo `customer_directory`
-- e juntando `customer_stats` no cliente exigiria trazer a base inteira para
-- ordenar em memoria. Que e exatamente o defeito que esta feature desfaz.
--
-- A juncao mora aqui, e a tela le UMA relacao com `range` + `count: exact`.
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
    WHERE lower(d2.email) = lower(d.email))::int AS same_email_count
FROM public.customer_directory d
LEFT JOIN public.customer_stats s ON s.customer_id = d.id;

COMMENT ON VIEW public.customer_list IS
  'A listagem de Clientes: customer_directory + customer_stats ja juntados, para a ordenacao por gasto/ticket/ultima compra acontecer NO SERVIDOR. A tela le uma relacao so, com range e count exact.';

-- ---------------------------------------------------------------------
-- 8. order_list — a listagem de pedidos, com a ordinal da compra
-- ---------------------------------------------------------------------
-- `PED-21` pede "3a compra" ao lado do nome. Isso e uma ordinal POR PESSOA,
-- e o PostgREST nao expressa window function no `select`. Calcular no cliente
-- exigiria, para cada linha da pagina, saber quantos pedidos anteriores aquela
-- pessoa tem — ou seja, uma leitura por linha, ou a base inteira.
--
-- A view resolve com uma window function e a tela continua lendo UMA relacao,
-- com `range` + `count: exact`. Todas as colunas de `orders` que os filtros usam
-- seguem presentes: filtro, ordenacao e contagem nao mudam de forma.
--
-- O particionamento repete a regra de vinculo do resto da feature: por
-- `customer_id` quando ha cadastro, por e-mail normalizado quando e convidada.
-- Sem isso, a segunda compra de quem nunca criou conta contaria como a primeira.
CREATE OR REPLACE VIEW public.order_list
WITH (security_invoker = true) AS
SELECT
  o.*,
  row_number() OVER (
    PARTITION BY coalesce(o.customer_id::text, lower(o.customer_email))
    ORDER BY o.created_at
  )::int AS purchase_ordinal
FROM public.orders o;

COMMENT ON VIEW public.order_list IS
  'orders + a ordinal da compra por pessoa (PED-21). Window function porque o PostgREST nao a expressa no select, e calcular no cliente custaria uma leitura por linha. Leitura apenas: toda escrita continua indo para orders, por RPC guardada ou update.';
