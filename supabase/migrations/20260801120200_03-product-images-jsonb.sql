-- =====================================================================
-- 07 · T3 — products.images: text[] -> jsonb {url, alt, source}
-- =====================================================================
-- Requisito: VAR-04
--
-- Hoje `images` é um `text[]`: uma lista de URLs e nada mais. Sem `alt`, a loja
-- renderiza `alt={product.name}` genérico em toda imagem — acessibilidade e SEO
-- pagam a conta. Sem `source`, não dá para saber qual foto veio do estúdio de
-- mockup e qual foi fotografada, que é do que o selo "Mockup" da galeria
-- depende (PMD-03, feature 12).
--
-- ATENÇÃO: esta conversão é DESTRUTIVA e existem 12 pontos de leitura que
-- assumem `string[]`. Eles são migrados na MESMA fase, em T17 (VAR-11), com um
-- helper que tolera as duas formas. Deixar T17 para depois quebraria loja e
-- admin no intervalo.
--
-- ---------------------------------------------------------------------
-- DESVIO EM RELAÇÃO AO design.md (mecanismo, não comportamento)
-- ---------------------------------------------------------------------
-- O `design.md` esboça a conversão como um `ALTER COLUMN ... USING` com
-- subquery embutida. Postgres recusa:
--
--     ERROR: cannot use subquery in transform expression (SQLSTATE 0A000)
--
-- A expressão de transformação de um `ALTER COLUMN TYPE` é avaliada por linha e
-- não aceita subquery — e `unnest` + `jsonb_agg` exige uma. A saída é embrulhar
-- a lógica numa função IMMUTABLE, usá-la no `USING`, e descartá-la em seguida
-- para não deixar utilitário de migration vivo no schema.
-- O resultado é byte a byte o que o design descreve.

-- Função temporária de conversão. Nome com prefixo `__` e vida curta:
-- existe só entre o CREATE e o DROP no fim deste arquivo.
CREATE OR REPLACE FUNCTION public.__images_text_array_to_jsonb(arr text[])
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(
    (
      SELECT jsonb_agg(jsonb_build_object('url', u, 'alt', NULL, 'source', 'upload'))
      FROM unnest(arr) AS u
      WHERE u IS NOT NULL AND btrim(u) <> ''
    ),
    '[]'::jsonb
  );
$$;

-- O DEFAULT antigo (`'{}'::text[]`) não sobrevive à troca de tipo: precisa cair
-- antes, senão o ALTER falha ao tentar convertê-lo.
ALTER TABLE public.products ALTER COLUMN images DROP DEFAULT;

ALTER TABLE public.products
  ALTER COLUMN images TYPE jsonb
  USING public.__images_text_array_to_jsonb(images);

DROP FUNCTION public.__images_text_array_to_jsonb(text[]);

-- Linhas que já eram NULL antes da conversão continuam NULL: a função só é
-- aplicada ao valor, e NULL de entrada devolve NULL.
UPDATE public.products SET images = '[]'::jsonb WHERE images IS NULL;

ALTER TABLE public.products
  ALTER COLUMN images SET DEFAULT '[]'::jsonb;

-- NOT NULL para que nenhum leitor precise distinguir `null` de lista vazia.
-- Produto sem imagem é `[]`, nunca ausência.
ALTER TABLE public.products
  ALTER COLUMN images SET NOT NULL;

COMMENT ON COLUMN public.products.images IS
  'Galeria: [{url, alt, source}]. `source` = upload | mockup. Primeiro elemento e a imagem principal. Nunca NULL — produto sem imagem e [].';
