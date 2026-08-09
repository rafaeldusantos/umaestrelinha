-- =====================================================================
-- 23 · T16 — category_redirects: o slug antigo de uma CATEGORIA
-- =====================================================================
-- Requisito: SEO-02
--
-- Só produto tinha redirect de slug (`product_redirects`, 20260801120300).
-- Com `AD-018` a categoria passa a morar na raiz do domínio (`/:slug`) e a
-- subcategoria em `/:pai/:filha` — ou seja, o slug de categoria virou endereço
-- público de primeira classe, e renomeá-lo mata todo link indexado exatamente
-- como acontecia com produto.
--
-- Migration NOVA, e não reescrita de existente: `AD-017` permite reescrever a
-- história enquanto o banco não for implantado, mas a permissão é para desfazer
-- dívida — não para acomodar tabela nova.
--
-- Forma copiada de `product_redirects` de propósito: mesma PK textual, mesmo
-- CASCADE, mesma RLS. Duas tabelas que resolvem o mesmo problema em entidades
-- diferentes não devem divergir em detalhe nenhum.

CREATE TABLE IF NOT EXISTS public.category_redirects (
  from_slug   text PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- A PK cobre "para onde vai este slug?". Este índice cobre o sentido inverso —
-- "quais slugs antigos apontam para esta categoria?" —, que é o que a escrita
-- do admin e uma eventual limpeza precisam.
CREATE INDEX IF NOT EXISTS category_redirects_category_idx
  ON public.category_redirects (category_id);

COMMENT ON TABLE public.category_redirects IS
  'Slugs antigos de categoria, para a loja resolver a URL indexada depois de um rename. ON DELETE CASCADE: categoria apagada nao deixa redirect pendurado. from_slug divide namespace com categories.slug, e a precedencia e fixa — categoria viva vence o redirect, e a escrita apaga o redirect cujo from_slug virou slug ativo.';

-- ---------------------------------------------------------------------
-- RLS — espelho exato de `product_redirects` (20260801120400)
-- ---------------------------------------------------------------------
-- Leitura pública é necessária: a loja resolve o slug antigo **sem sessão**,
-- no mesmo caminho em que `/produtos/:slug` já resolve o redirect de produto.
-- A tabela não carrega dado sensível — é um par de id e um slug que já é
-- público por definição.
ALTER TABLE public.category_redirects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "category_redirects_public_read"  ON public.category_redirects;
DROP POLICY IF EXISTS "category_redirects_admin_write"  ON public.category_redirects;

CREATE POLICY "category_redirects_public_read"
  ON public.category_redirects FOR SELECT USING (true);

CREATE POLICY "category_redirects_admin_write"
  ON public.category_redirects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
