-- =====================================================================
-- 07 · T2 — backfill de product_variants: pausado e sem preço
-- =====================================================================
-- Requisitos: VAR-01 (AC 2, 3, 4)
--
-- Duas origens, uma regra: NADA nasce vendável.
--
--   (a) `products.variants` (JSONB) -> uma linha por objeto.
--   (b) linhas legadas já em `product_variants` -> normalizadas, `id` PRESERVADO.
--
-- Em ambas: `price = NULL` e `is_active = false`.
--
-- Por que pausado. O JSONB não tem coluna de preço — não existe valor correto a
-- copiar. Uma variação ATIVA e SEM preço é undercharge esperando acontecer: a
-- loja mostraria a combinação, o cliente compraria, e o servidor cairia no
-- fallback de `base_price`. Pausar é o único mapeamento que não corre risco de
-- cobrar errado. O admin liga cada linha quando põe preço.
--
-- Por que `price_override` NÃO é interpretado (A15). No seed, a variação
-- '5.5 cm (grande)' tem `price_override = 2.00` contra `base_price` de R$ 4,90.
-- Isso lê como DELTA, apesar de a coluna se chamar "override". Se fosse lido
-- como preço absoluto, o tamanho GRANDE ficaria mais barato que o pequeno.
-- Entre duas leituras plausíveis e opostas, a escolha é não adivinhar.
--
-- `products.variants` NÃO é removido aqui — a remoção é VAR-13, no fecho do
-- programa (feature 13), quando nenhum leitor sobrar.

DO $$
DECLARE
  v_legadas      int;
  v_do_jsonb     int;
  v_sku_perdidos int;
  v_total        int;
BEGIN
  -- -------------------------------------------------------------------
  -- (b) Normaliza o que já existe. Roda ANTES do insert para que a
  --     contagem separe as duas origens sem ambiguidade.
  --     UPDATE (nunca DELETE+INSERT): `order_items.variant_id` tem FK para
  --     estes ids, e recriá-los deixaria pedido órfão.
  -- -------------------------------------------------------------------
  UPDATE public.product_variants
  SET option_values = '{}'::jsonb,
      price         = NULL,
      is_active     = false
  WHERE is_active IS DISTINCT FROM false
     OR price IS NOT NULL
     OR option_values <> '{}'::jsonb;
  GET DIAGNOSTICS v_legadas = ROW_COUNT;

  -- -------------------------------------------------------------------
  -- (a) Copia o JSONB. Sem dados no seed atual (0 produtos com variants
  --     não-vazio), mas obrigatório para bases reais.
  -- -------------------------------------------------------------------
  WITH src AS (
    SELECT
      p.id                                        AS product_id,
      t.ord,
      nullif(btrim(t.v ->> 'size'),   '')         AS size,
      nullif(btrim(t.v ->> 'finish'), '')         AS finish,
      nullif(btrim(t.v ->> 'sku'),    '')         AS sku,
      coalesce(nullif(btrim(t.v ->> 'stock'), '')::int, 0) AS stock
    FROM public.products p
    CROSS JOIN LATERAL jsonb_array_elements(p.variants)
      WITH ORDINALITY AS t(v, ord)
    WHERE jsonb_typeof(p.variants) = 'array'
  ),
  mapped AS (
    SELECT
      product_id, ord, sku, stock,
      (CASE WHEN size   IS NOT NULL THEN jsonb_build_object('Tamanho', size)      ELSE '{}'::jsonb END)
      ||
      (CASE WHEN finish IS NOT NULL THEN jsonb_build_object('Acabamento', finish) ELSE '{}'::jsonb END)
        AS option_values,
      array_to_string(array_remove(ARRAY[size, finish], NULL), ' · ') AS label
    FROM src
  ),
  deduped AS (
    -- `product_variants.sku` é UNIQUE GLOBAL. Um sku repetido — dentro do
    -- proprio lote ou contra uma linha que já existe — abortaria o insert
    -- inteiro. Preferimos perder o sku (recuperável na tela) a perder a
    -- variação (não recuperável).
    SELECT
      m.*,
      CASE
        WHEN m.sku IS NULL THEN NULL
        WHEN EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.sku = m.sku) THEN NULL
        WHEN row_number() OVER (PARTITION BY m.sku ORDER BY m.product_id, m.ord) > 1 THEN NULL
        ELSE m.sku
      END AS sku_safe
    FROM mapped m
  ),
  inserted AS (
    INSERT INTO public.product_variants
      (product_id, name, sku, stock, option_values, price, compare_price, is_active, position)
    SELECT
      d.product_id,
      coalesce(nullif(d.label, ''), 'Variação ' || d.ord),  -- `name` é NOT NULL
      d.sku_safe,
      d.stock,
      d.option_values,
      NULL,   -- price: o JSONB não tem preço. Ver cabeçalho.
      NULL,
      false,  -- is_active
      (d.ord - 1)::int
    FROM deduped d
    -- Idempotência: não duplica se a combinação já existir para o produto.
    WHERE NOT EXISTS (
      SELECT 1 FROM public.product_variants pv
      WHERE pv.product_id = d.product_id
        AND pv.option_values = d.option_values
        AND pv.option_values <> '{}'::jsonb
    )
    RETURNING 1
  )
  SELECT count(*) INTO v_do_jsonb FROM inserted;

  SELECT count(*) INTO v_sku_perdidos
  FROM public.product_variants
  WHERE sku IS NULL AND option_values <> '{}'::jsonb;

  SELECT count(*) INTO v_total FROM public.product_variants WHERE is_active = false;

  -- AC 4: o admin precisa saber quantas linhas precisam de preço antes de
  -- voltarem à loja.
  RAISE NOTICE '[07/T2] variacoes pausadas e sem preco: % (legadas normalizadas: %, vindas do JSONB: %)',
    v_total, v_legadas, v_do_jsonb;

  IF v_sku_perdidos > 0 THEN
    RAISE NOTICE '[07/T2] ATENCAO: % variacao(oes) do JSONB ficaram sem SKU por colisao com SKU existente', v_sku_perdidos;
  END IF;
END $$;
