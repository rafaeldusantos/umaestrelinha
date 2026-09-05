-- =====================================================================
-- 35 · Clientes e pedidos da Nuvemshop — o espelho da operacao
-- =====================================================================
-- Requisitos: ESP-16, ESP-22..ESP-27
--
-- Uma migration so, e NOVA (AD-017). A fonte do import NAO e a API: o plano da
-- loja e o Essencial, e os escopos `read_orders`/`read_customers` exigem Escala
-- ou Next. Entram dois CSV exportados do painel. A medicao dos arquivos esta em
-- `.specs/features/35-clientes-e-pedidos-nuvemshop/medicao.md`.
--
-- ---------------------------------------------------------------------
-- O QUE ESTA MIGRATION NAO FAZ, E POR QUE
-- ---------------------------------------------------------------------
-- * NAO cria linha em `customers` para a cliente importada. AD-023: a tela de
--   Clientes le `customer_directory`, que DERIVA a convidada dos pedidos. Toda
--   linha de `customers` sai da view com `has_account = true` — escrever ali
--   marcaria 33 pessoas que nunca criaram conta como cadastradas.
-- * NAO cria coluna de "origem". Ela seria derivavel de `nuvemshop_id IS NOT
--   NULL`, e coluna derivavel de outra e um segundo dono do mesmo dado.
-- * NAO derruba `customer_list` e `customer_stats`. A secao 3 mantem a LISTA DE
--   COLUNAS de `customer_directory` identica — so troca `NULL::text` pelo valor
--   agregado — e `CREATE OR REPLACE VIEW` aceita isso. Derrubar as tres seria
--   risco sem ganho.

-- ---------------------------------------------------------------------
-- 1. Proveniencia e idempotencia em orders
-- ---------------------------------------------------------------------
-- `nuvemshop_id` vem da coluna `Identificador do pedido` do CSV — o id real da
-- Nuvemshop, e nao o numero humano. O numero humano vira `order_number`
-- ('NS-165'), que a Adri le; o id e o que sobrevive a qualquer edicao dos dois
-- lados e faz a re-execucao encontrar a linha em vez de duplicar.
--
-- `bigint` e nao `int`: os ids medidos hoje passam de 2 bilhoes (2049787687), o
-- que ja encosta no teto de `int` com sinal (2147483647). Nao e margem, e sorte.
--
-- Indice unico SIMPLES e nao parcial, pelo mesmo raciocinio da migration
-- 20260809120000: em Postgres NULL nunca colide com NULL, entao pedido nascido
-- na loja convive sem predicado nenhum. L-018 registra que indice unico parcial
-- nao aceita deferrable e nao compoe com constraint.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS nuvemshop_id bigint,
  ADD COLUMN IF NOT EXISTS nuvemshop_status text,
  ADD COLUMN IF NOT EXISTS nuvemshop_payment_status text,
  ADD COLUMN IF NOT EXISTS nuvemshop_shipping_status text,
  ADD COLUMN IF NOT EXISTS nuvemshop_synced_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS orders_nuvemshop_id_key
  ON public.orders (nuvemshop_id);

-- Os tres eixos crus, EM PORTUGUES, como o arquivo escreve. Sao PROVENIENCIA,
-- nao um segundo dono da verdade: quem responde "este pedido foi pago?" e
-- `payment_status`, e mais ninguem. No dia em que uma tela ler
-- `nuvemshop_payment_status` para pintar um selo, existem duas respostas para a
-- mesma pergunta — e elas divergem no primeiro `Recusado`, que sozinho e
-- ambiguo (Pix vencido ou cartao negado). `provenanceNotRead.test.ts` varre
-- `apps/**` e derruba a suite se alguma tela ler estas colunas.
COMMENT ON COLUMN public.orders.nuvemshop_id IS
  'Id do pedido na Nuvemshop (coluna "Identificador do pedido" do CSV). Chave de idempotencia do import (ESP-26). NULL = pedido nascido na loja nova.';
COMMENT ON COLUMN public.orders.nuvemshop_status IS
  'PROVENIENCIA: "Status do Pedido" cru do CSV (Aberto/Arquivado/Cancelado). NENHUMA TELA LE ESTA COLUNA — a verdade da aplicacao e orders.status.';
COMMENT ON COLUMN public.orders.nuvemshop_payment_status IS
  'PROVENIENCIA: "Status do Pagamento" cru do CSV (Confirmado/Recusado/Pendente). NENHUMA TELA LE ESTA COLUNA — a verdade da aplicacao e orders.payment_status. "Recusado" e ambiguo: cobre Pix vencido e cartao negado.';
COMMENT ON COLUMN public.orders.nuvemshop_shipping_status IS
  'PROVENIENCIA: "Status do Envio" cru do CSV (Nao esta embalado/Pronto para enviar/Enviado/Entregue). NENHUMA TELA LE ESTA COLUNA — a verdade da aplicacao e orders.status.';
COMMENT ON COLUMN public.orders.nuvemshop_synced_at IS
  'Quando o import tocou esta linha pela ultima vez. Diagnostico do operador, nao regra de negocio.';

-- Item importado tambem precisa de chave, mas o CSV NAO TRAZ id de item — so
-- nome, preco e quantidade. Por isso a coluna aceita NULL e o import trata item
-- de pedido importado como IMUTAVEL: gravado no INSERT, nunca atualizado.
-- Qualquer chave de update seria posicional ou por nome, e as duas erram em
-- silencio numa reexportacao. `--reimportar-itens` apaga e regrava o conjunto.
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS nuvemshop_order_id bigint;

CREATE INDEX IF NOT EXISTS idx_order_items_nuvemshop_order
  ON public.order_items (nuvemshop_order_id);

COMMENT ON COLUMN public.order_items.nuvemshop_order_id IS
  'Id do PEDIDO na Nuvemshop a que este item pertence. Existe para o --reimportar-itens apagar o conjunto certo. O CSV nao tem id de ITEM, entao nao ha chave por item.';

-- ---------------------------------------------------------------------
-- 2. Contato no proprio pedido
-- ---------------------------------------------------------------------
-- `orders` nao tinha telefone. A consequencia ja existe hoje, antes de qualquer
-- import: a convidada que compra na loja nova informa WhatsApp no checkout, o
-- valor nao e persistido no pedido, `customer_directory` devolve phone NULL, e
-- `chargeMaterialUrl` cai no `wa.me` SEM NUMERO — a cobranca de material abre o
-- app sem destinatario.
--
-- E o unico lugar onde o telefone importado PODE morar: por AD-023 nao ha linha
-- em `customers` para a cliente importada.
--
-- `customer_document` e nao `cpf`: o arquivo traz CNPJ tambem (14 digitos,
-- medido em um pedido real), e a coluna guarda so digitos.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS customer_document text;

COMMENT ON COLUMN public.orders.customer_phone IS
  'Telefone do comprador NO MOMENTO do pedido, so digitos. Snapshot: nao acompanha edicao do cadastro. Alimenta a cobranca por WhatsApp e o phone da convidada em customer_directory.';
COMMENT ON COLUMN public.orders.customer_document IS
  'CPF ou CNPJ do comprador no momento do pedido, so digitos (11 ou 14). Snapshot.';

-- Nenhum GRANT aqui, de proposito: as colunas entram em tabelas que ja tem RLS
-- e policies (`admin full orders` por has_role, `users read own orders` por
-- customer_id). Coluna nova herda a policy da tabela; conceder algo aqui abriria
-- caminho que a feature nao pediu — e `anon` nunca e alcancado.

-- ---------------------------------------------------------------------
-- 3. customer_directory — a convidada passa a ter telefone e documento
-- ---------------------------------------------------------------------
-- A view da feature 34 devolvia `NULL::text` em `cpf` e `phone` para a
-- convidada, porque nao havia de onde tirar: a coluna nao existia em `orders`.
-- Agora existe (secao 2), e a derivacao e a mesma do nome — o valor do pedido
-- MAIS RECENTE que o tenha.
--
-- `FILTER (WHERE ... IS NOT NULL)` e nao so `ORDER BY`: sem o filtro, um pedido
-- recente sem telefone poria NULL na frente e apagaria o telefone que o pedido
-- anterior tinha. `array_agg` filtrado devolve NULL quando nao sobra nada, e
-- `NULL[1]` e NULL — entao o caso "nunca houve telefone" continua correto.
--
-- A LISTA DE COLUNAS nao muda: mesmos nomes, mesmos tipos, mesma ordem. Por
-- isso `CREATE OR REPLACE VIEW` basta e `customer_list`/`customer_stats`, que
-- dependem desta, nao precisam cair. `security_invoker` preservado: sem ele a
-- view seria um furo de RLS com cara de conveniencia.
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
  g.cpf,
  g.phone,
  g.first_seen           AS created_at,
  false                  AS has_account
FROM (
  SELECT
    lower(o.customer_email)                                    AS email_key,
    min(o.customer_email)                                      AS email,
    (array_agg(o.customer_name ORDER BY o.created_at DESC))[1] AS name,
    (array_agg(o.customer_document ORDER BY o.created_at DESC)
       FILTER (WHERE o.customer_document IS NOT NULL))[1]      AS cpf,
    (array_agg(o.customer_phone ORDER BY o.created_at DESC)
       FILTER (WHERE o.customer_phone IS NOT NULL))[1]         AS phone,
    min(o.created_at)                                          AS first_seen
  FROM public.orders o
  WHERE o.customer_id IS NULL
  GROUP BY lower(o.customer_email)
) g
WHERE NOT EXISTS (
  SELECT 1 FROM public.customers c2 WHERE lower(c2.email) = g.email_key
);

COMMENT ON VIEW public.customer_directory IS
  'Quem a tela de Clientes lista: cadastro (customers) MAIS quem so comprou como convidada, agrupada por e-mail normalizado. O id da convidada e md5(lower(email))::uuid — deterministico, estavel e sem escrita. Desde a feature 35 a convidada carrega cpf e phone do pedido mais recente que os tenha.';

-- ---------------------------------------------------------------------
-- 4. handle_new_customer — o reencontro por e-mail
-- ---------------------------------------------------------------------
-- ESP-22. Quem comprou antes (na Nuvemshop ou como convidada aqui) e depois
-- cria conta com o MESMO e-mail passa a enxergar o proprio historico em Minha
-- conta. Sem isto o pedido importado fica com `customer_id` nulo para sempre, e
-- `useOrdersByCustomerId` — que e o unico caminho da pagina de conta — devolve
-- lista vazia para quem tem cinco anos de compras.
--
-- O `INSERT` existente NAO muda. O `UPDATE` e aditivo e so alcanca pedido
-- ORFAO (`customer_id IS NULL`): pedido que ja pertence a alguem nunca troca de
-- dono, nem por coincidencia de e-mail.
--
-- `security definer` ja existia e e obrigatorio aqui: `orders` nao tem policy de
-- UPDATE para cliente (PAY-10), entao sem ele o UPDATE bate na RLS e falha
-- CALADO — o cadastro daria certo e o historico nao apareceria, sem erro nenhum.
--
-- `lower()` nos dois lados. O arquivo real traz `VROSA_RJ@HOTMAIL.COM` e
-- `LAINE.MCOELHO@HOTMAIL.COM` em caixa alta: comparar cru deixaria a mesma
-- pessoa como duas, e e exatamente o que `customer_directory` ja evita.
--
-- Nao ha indice em `lower(customer_email)` de proposito. A migration da 34
-- registra por que um segundo indice sobre a mesma coluna nao entra: custo de
-- escrita em todo pedido. O trigger dispara uma vez por cadastro, sobre dezenas
-- de linhas.
CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
BEGIN
  INSERT INTO public.customers (user_id, name, email)
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO v_customer_id;

  -- `DO NOTHING` nao devolve linha. Quando ja havia ficha para este user_id, o
  -- id vem da leitura — senao a adocao seria pulada justamente em quem ja
  -- existia.
  IF v_customer_id IS NULL THEN
    SELECT id INTO v_customer_id FROM public.customers WHERE user_id = new.id;
  END IF;

  IF v_customer_id IS NOT NULL AND new.email IS NOT NULL THEN
    UPDATE public.orders o
       SET customer_id = v_customer_id
     WHERE o.customer_id IS NULL
       AND lower(o.customer_email) = lower(new.email);
  END IF;

  RETURN new;
END;
$$;

COMMENT ON FUNCTION public.handle_new_customer() IS
  'Cria a ficha da cliente no signup e ADOTA os pedidos orfaos do mesmo e-mail (ESP-22). security definer e obrigatorio: orders nao tem policy de UPDATE para cliente, e sem ele a adocao falharia calada.';

-- ---------------------------------------------------------------------
-- 5. order_list — o telefone chega a listagem de pedidos
-- ---------------------------------------------------------------------
-- ESP-24. Sem isto a coluna da secao 2 existe e NAO SERVE PARA NADA: a
-- listagem le a view, a view enumera colunas uma a uma, e `customer_phone`
-- nasceu depois dela. `chargeMaterialUrl` continuaria caindo no `wa.me` SEM
-- NUMERO — que e o defeito que a secao 2 existe para consertar.
--
-- Foi encontrado em NAVEGADOR, na validacao, e nao por teste: a coluna estava
-- gravada, o teste de unidade da coluna passava, e a tela seguia sem telefone.
--
-- `CREATE OR REPLACE VIEW` aceita colunas ACRESCENTADAS AO FIM — e so ao fim.
-- Por isso as duas entram depois de `purchase_ordinal`, e a lista acima e
-- copiada da definicao vigente sem reordenar nada. Reordenar exigiria derrubar
-- a view, e `order_list` e lida pela tela de Pedidos inteira.
CREATE OR REPLACE VIEW public.order_list
WITH (security_invoker = true) AS
SELECT
  id, order_number, customer_id, status, subtotal, shipping_cost, discount, total,
  payment_method, shipping_method, tracking_code, notes, created_at, updated_at,
  customer_name, customer_email, address_street, address_number, address_neighborhood,
  address_city, address_state, shipping_carrier, cancel_reason, address_zip,
  address_complement, melhor_envio_id, melhor_envio_label_url, melhor_envio_protocol,
  coupon_code, coupon_id, payment_status, mp_payment_id, mp_status_detail, paid_at,
  pix_discount, shipping_service_id, delivery_estimate_min, delivery_estimate_max,
  mp_order_id, promotion_id, promotion_discount, material_status, material_tracking_code,
  material_received_at,
  row_number() OVER (
    PARTITION BY (COALESCE(customer_id::text, lower(customer_email))) ORDER BY created_at
  )::integer AS purchase_ordinal,
  -- As duas novas, no fim.
  customer_phone,
  customer_document
FROM public.orders o;
