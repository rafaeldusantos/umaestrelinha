-- =====================================================================
-- 07 · T5 — RLS escopada nas tabelas de produto e trigger de base_price
-- =====================================================================
-- Requisitos: VAR-07, VAR-12

-- ---------------------------------------------------------------------
-- 1. product_variants: leitura pública escopada em produto ATIVO (VAR-07)
-- ---------------------------------------------------------------------
-- A policy atual é `USING (true)` (20260414121021:193). Isso era inofensivo
-- quando a tabela tinha {name, sku, price_override, stock}. Depois de T1 ela
-- carrega preço, preço "de", estoque e SKU de TODA variação — inclusive de
-- produto em rascunho. Com `USING (true)`, qualquer anônimo lê a grade de preços
-- de um drop que ainda não foi ao ar.
DROP POLICY IF EXISTS "public read variants" ON public.product_variants;

CREATE POLICY "product_variants_public_read"
  ON public.product_variants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id
        AND p.is_active
    )
  );

-- `admin full variants` (FOR ALL, has_role admin) permanece intacta: o admin
-- continua enxergando e escrevendo tudo.

-- ---------------------------------------------------------------------
-- 2. product_categories e product_redirects (VAR-07)
-- ---------------------------------------------------------------------
-- Mesmo padrão de `mockup_templates` (decisão de 2026-07-18): leitura pública,
-- escrita só para admin autenticado.
--
-- Leitura pública é necessária: a página de coleção resolve produto→categoria
-- (PST-06) e a rota /produto/:slug resolve o redirect (PST-07) — as duas sem
-- sessão. Nenhuma das tabelas carrega dado sensível: são pares de id e um slug
-- que já é público por definição.
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_redirects  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_categories_public_read"  ON public.product_categories;
DROP POLICY IF EXISTS "product_categories_admin_write"  ON public.product_categories;
DROP POLICY IF EXISTS "product_redirects_public_read"   ON public.product_redirects;
DROP POLICY IF EXISTS "product_redirects_admin_write"   ON public.product_redirects;

CREATE POLICY "product_categories_public_read"
  ON public.product_categories FOR SELECT USING (true);

CREATE POLICY "product_categories_admin_write"
  ON public.product_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "product_redirects_public_read"
  ON public.product_redirects FOR SELECT USING (true);

CREATE POLICY "product_redirects_admin_write"
  ON public.product_redirects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------
-- 3. base_price = menor preço ativo da grade (VAR-12)
-- ---------------------------------------------------------------------
-- `products.base_price` é NOT NULL e não pode ficar sem dono depois que o preço
-- passa a viver na variação. Ele serve ao "a partir de R$ X" da vitrine — nunca
-- é o valor cobrado de um item com `price_source = 'variant'` (A14).
--
-- A regra crítica está no `coalesce`: quando NÃO há variação ativa com preço, o
-- valor ANTERIOR é preservado. Sem isso, `min()` sobre conjunto vazio devolve
-- NULL, o `NOT NULL` estouraria — ou, pior, um `coalesce(..., 0)` faria a
-- vitrine anunciar R$ 0,00. É exatamente o estado em que ficam os produtos cujas
-- variações foram migradas pausadas em T2.
CREATE OR REPLACE FUNCTION public.sync_product_base_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id uuid;
BEGIN
  -- DELETE não tem NEW; UPDATE que troque o produto precisa acertar os dois
  -- lados, e por isso a função é chamada uma vez por linha afetada.
  v_product_id := coalesce(NEW.product_id, OLD.product_id);

  UPDATE public.products p
  SET base_price = coalesce(
    (
      SELECT min(v.price)
      FROM public.product_variants v
      WHERE v.product_id = v_product_id
        AND v.is_active
        AND v.price IS NOT NULL
    ),
    p.base_price   -- sem grade ativa com preço: mantém o que estava
  )
  WHERE p.id = v_product_id;

  -- UPDATE que move a variação de produto: o produto de ORIGEM também muda.
  IF TG_OP = 'UPDATE' AND NEW.product_id IS DISTINCT FROM OLD.product_id THEN
    UPDATE public.products p
    SET base_price = coalesce(
      (
        SELECT min(v.price)
        FROM public.product_variants v
        WHERE v.product_id = OLD.product_id
          AND v.is_active
          AND v.price IS NOT NULL
      ),
      p.base_price
    )
    WHERE p.id = OLD.product_id;
  END IF;

  RETURN NULL;  -- AFTER trigger: o valor de retorno é ignorado
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_base_price ON public.product_variants;

CREATE TRIGGER trg_sync_product_base_price
  AFTER INSERT OR UPDATE OF price, is_active, product_id OR DELETE
  ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_base_price();

COMMENT ON FUNCTION public.sync_product_base_price() IS
  'Mantem products.base_price = menor price de variacao ativa. Sem grade ativa com preco, PRESERVA o valor anterior — nunca zera (A14).';
