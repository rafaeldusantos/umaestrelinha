-- =============================================================================
-- Uma Estrelinha — Seed de desenvolvimento / testes
-- =============================================================================
-- Roda automaticamente em `supabase db reset` (config.toml → [db.seed]).
-- Também pode ser executado avulso:
--   docker exec -i supabase_db_uma-estrelinha-store psql -U postgres -d postgres < supabase/seed.sql
--
-- É IDEMPOTENTE: upsert por `slug` (categorias/produtos), por `sku` (variações),
-- por `code` (cupons) e por `email` (admin). Rodar duas vezes atualiza o que já
-- existe e não duplica nada.
--
-- ACESSO AO BACKOFFICE (dev): admin@umaestrelinha.dev / admin123  (ver seção 6).
--
-- -----------------------------------------------------------------------------
-- SEM OBJETO DE SESSÃO — a razão de este arquivo ter sido reescrito
-- -----------------------------------------------------------------------------
-- A versão anterior declarava duas funções `pg_temp.*` e uma `CREATE TEMP TABLE
-- _pal`. A CLI envia o seed em LOTES, e objeto temporário é ligado à sessão: o
-- lote seguinte não o enxergava. O `db reset` quebrava ora com
-- `schema "pg_temp" does not exist`, ora com `relation "_pal" does not exist`,
-- conforme onde o corte caía — e o mesmo arquivo aplicado inteiro por
-- `docker exec … psql` passava, o que provava que o defeito era o transporte.
--
-- Daqui em diante: **nada de `pg_temp.*`, nada de `CREATE TEMP TABLE`.** Tudo o
-- que precisa ser reaproveitado vira CTE dentro da própria instrução, e a
-- instrução é autossuficiente qualquer que seja o corte do lote.
--
-- IMAGENS DE MARCAÇÃO: cada produto/categoria recebe um placeholder SVG rotulado
-- (nome + linha) embutido como data-URI base64 — auto-contido, sem CDN e sem
-- rede. Fotos reais entram pelo Storage. O app usa `images[0]` como principal
-- (ver entities/product/api/useProducts.ts).
--
-- CATÁLOGO: as seis linhas reais do negócio (Uma Estrelinha/cinzas, Leite
-- Materno, Dente de Leite, Pet, Maternidade, Masculina), penduradas numa raiz
-- "Joias Afetivas". A HIERARQUIA É PARTE DO FIXTURE (`BL-003`): o seed anterior
-- deixava tudo plano e a árvore que o `CLAUDE.md` descreve só existia porque
-- alguém a montou à mão — sumia no primeiro `db reset`.
--
-- TOM: o registro é sensível e memorial. Nada de trocadilho, de "corre" nem de
-- linguagem de lançamento. Preço, prazo e material saem do vocabulário real do
-- negócio (prata 925, aço inoxidável, folheado a ouro; até 30 dias úteis).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. LIMPEZA DO CATÁLOGO DEMO HERDADO
-- -----------------------------------------------------------------------------
-- A migration inicial (20260414121021) traz um seed EMBUTIDO com 6 categorias e
-- 12 produtos de botton. Migration é história e história não se reescreve — mas
-- ela roda a cada `db reset`, e sem esta limpeza a loja abriria com joia e pin
-- lado a lado.
--
-- Lista explícita de slugs, e não "apaga o que não está no seed": um banco de
-- desenvolvimento costuma ter produto cadastrado à mão, e uma limpeza por
-- exclusão apagaria o trabalho de quem estava testando.
--
-- `product_variants`, `product_categories`, `wishlist`, `reviews` e
-- `product_redirects` saem por `on delete cascade`. `order_items` não referencia
-- `products` (o pedido guarda o snapshot), então histórico de pedido não é
-- afetado. DELETE é idempotente por natureza: a segunda execução casa zero linha.
DELETE FROM public.products WHERE slug IN (
  'naruto-uzumaki','sailor-moon','bts-jungkook','blackpink-logo','darth-vader',
  'harry-potter-hogwarts','arctic-monkeys','gojo-satoru','zelda-triforce',
  'stranger-things','pikachu','tanjiro-kamado'
);

DELETE FROM public.categories WHERE slug IN (
  'anime','kpop','filmes','bandas','games','series'
);


-- -----------------------------------------------------------------------------
-- 1. CATEGORIAS  (raiz + as seis linhas, com hierarquia — BL-003)
-- -----------------------------------------------------------------------------
-- Duas instruções, e não uma: a raiz precisa existir para que as filhas possam
-- resolver `parent_id` por slug. As duas são upsert por slug.
--
-- O marcador SVG é montado com `format()` — era o papel de uma função temporária,
-- que deixou de existir junto com o resto dos objetos de sessão. Nas duas
-- instruções de categoria o template é escrito inline (uma vez cada); no bloco de
-- produtos, onde são dois marcadores por linha, ele é declarado uma vez num
-- `VALUES` dentro do próprio `LATERAL`.
-- `%1$s` fundo · `%2$s` rótulo do topo · `%3$s` corpo · `%4$s` corpo do texto.

INSERT INTO public.categories (name, slug, description, icon, image_url, active, sort_order, show_in_menu)
SELECT
  'Joias Afetivas',
  'joias-afetivas',
  'Peças feitas à mão que guardam um material de quem você ama.',
  'gem',
  'data:image/svg+xml;base64,' || encode(convert_to(format(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600" '
    || 'font-family="Georgia,serif"><rect width="600" height="600" fill="%1$s"/>'
    || '<circle cx="300" cy="278" r="150" fill="#FFFFFF" fill-opacity="0.10"/>'
    || '<circle cx="300" cy="278" r="104" fill="none" stroke="#FFFFFF" stroke-opacity="0.28" stroke-width="3"/>'
    || '<text x="300" y="112" text-anchor="middle" font-size="22" letter-spacing="6" fill="#FFFFFF" fill-opacity="0.75">%2$s</text>'
    || '<text x="300" y="292" text-anchor="middle" font-weight="bold" fill="#FFFFFF" font-size="40">%3$s</text>'
    || '<text x="300" y="548" text-anchor="middle" font-size="19" fill="#FFFFFF" fill-opacity="0.6">Uma Estrelinha · imagem de marcação</text>'
    || '</svg>', '#34495E', 'CATÁLOGO', 'Joias Afetivas'), 'UTF8'), 'base64'),
  true, 0, false
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  icon        = EXCLUDED.icon,
  image_url   = EXCLUDED.image_url,
  active      = EXCLUDED.active,
  sort_order  = EXCLUDED.sort_order;

-- As seis linhas. `show_in_menu` marca QUATRO — é o `MENU_SLOT_LIMIT` da barra
-- do topo (`@estrelinha/core/menu`), e marcar cinco faria o admin exibir
-- "5 de 4" de propósito. A raiz fica fora da barra: ela é o contêiner, e
-- `browseCategories` já pula guarda-chuva sozinho.
INSERT INTO public.categories
  (name, slug, description, icon, image_url, active, sort_order, parent_id, show_in_menu)
SELECT
  l.name, l.slug, l.description, l.icon,
  'data:image/svg+xml;base64,' || encode(convert_to(format(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600" '
    || 'font-family="Georgia,serif"><rect width="600" height="600" fill="%1$s"/>'
    || '<circle cx="300" cy="278" r="150" fill="#FFFFFF" fill-opacity="0.10"/>'
    || '<circle cx="300" cy="278" r="104" fill="none" stroke="#FFFFFF" stroke-opacity="0.28" stroke-width="3"/>'
    || '<text x="300" y="112" text-anchor="middle" font-size="22" letter-spacing="6" fill="#FFFFFF" fill-opacity="0.75">%2$s</text>'
    || '<text x="300" y="292" text-anchor="middle" font-weight="bold" fill="#FFFFFF" font-size="%4$s">%3$s</text>'
    || '<text x="300" y="548" text-anchor="middle" font-size="19" fill="#FFFFFF" fill-opacity="0.6">Uma Estrelinha · imagem de marcação</text>'
    || '</svg>',
    l.color, 'LINHA', l.name,
    CASE WHEN char_length(l.name) > 15 THEN 32 WHEN char_length(l.name) > 10 THEN 38 ELSE 46 END
  ), 'UTF8'), 'base64'),
  true, l.sort_order, root.id, l.in_menu
FROM (VALUES
  -- slug, nome, descrição, ícone, cor do marcador, ordem, na barra do topo
  ('uma-estrelinha', 'Uma Estrelinha', 'Cinzas de cremação de quem partiu, guardadas em resina e prata.', 'star',       '#34495E', 1, true),
  ('pet',            'Pet',            'Pelos, cinzas ou um dente do companheiro de todas as horas.',     'paw-print',  '#4A5C6A', 2, true),
  ('leite-materno',  'Leite Materno',  'O leite da amamentação preservado numa joia que dura.',           'droplet',    '#8C8073', 3, true),
  ('dente-de-leite', 'Dente de Leite', 'O primeiro dentinho, guardado sem caixinha de gaveta.',           'sparkle',    '#B8945F', 4, true),
  ('maternidade',    'Maternidade',    'Coto umbilical, mecha de cabelo e as primeiras lembranças.',      'heart',      '#A07E4C', 5, false),
  ('masculina',      'Masculina',      'Anéis e pingentes de linha mais reta, em prata e aço.',           'circle-dot', '#23303A', 6, false)
) AS l(slug, name, description, icon, color, sort_order, in_menu)
CROSS JOIN (SELECT id FROM public.categories WHERE slug = 'joias-afetivas') AS root
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  icon        = EXCLUDED.icon,
  image_url   = EXCLUDED.image_url,
  active      = EXCLUDED.active,
  sort_order  = EXCLUDED.sort_order,
  -- `parent_id` no upsert é o que faz a árvore sobreviver ao segundo reset, e
  -- não só ao primeiro (BL-003).
  parent_id    = EXCLUDED.parent_id,
  show_in_menu = EXCLUDED.show_in_menu;

-- 1b. Card promocional do menu.
-- `menu_promo.category_id` mora em jsonb e NÃO tem FK: quem lê precisa resolver
-- o destino em runtime (`resolvePromo`). Aqui ele é resolvido por slug para
-- nunca nascer apontando para um id inventado.
UPDATE public.categories AS c
SET menu_promo = jsonb_build_object(
      'category_id', alvo.id::text,
      'badge',       'Feita à mão',
      'title',       'Joias com cinzas de cremação',
      'subtitle',    'Cada peça é única, como a história dela.'
    )
FROM (SELECT id FROM public.categories WHERE slug = 'uma-estrelinha') AS alvo
WHERE c.slug = 'uma-estrelinha';


-- -----------------------------------------------------------------------------
-- 2. PRODUTOS  (upsert por slug; category_id e cor resolvidos pelo slug da linha)
-- -----------------------------------------------------------------------------
-- Medidas e peso vão preenchidos porque a ficha técnica da página passou a sair
-- SÓ do cadastro (`PIN-05`): produto sem medida mostra ficha curta, e um fixture
-- inteiro sem medida esconderia a régua nova.
--
-- `production_lead_days = 30` é o prazo real do negócio (até 30 dias úteis após
-- o material chegar) e entra na cotação de frete.
INSERT INTO public.products
  (name, slug, description, base_price, original_price, category_id,
   image_url, images, is_new, is_featured, is_promo, is_active, stock_total,
   low_stock_threshold, tags, sort_order, weight_kg, width_cm, height_cm,
   production_lead_days)
SELECT
  p.name, p.slug, p.description, p.base_price, p.original_price, c.id,
  m.principal,
  -- `products.images` é jsonb [{url, alt, source}] desde a migration
  -- 20260801120200. O `alt` vem preenchido de propósito: a loja lê `images[].alt`
  -- e um fixture com alt nulo esconderia regressão de acessibilidade.
  jsonb_build_array(
    jsonb_build_object('url', m.principal, 'alt', p.name || ' — ' || p.linha,       'source', 'upload'),
    jsonb_build_object('url', m.detalhe,   'alt', p.name || ' — segundo ângulo',    'source', 'upload')
  ),
  p.is_new, p.is_featured, p.is_promo, true, p.stock, 3, p.tags, p.sort_order,
  p.weight_kg, p.width_cm, p.height_cm, 30
FROM (VALUES
  -- nome, slug, descrição, preço, preço de comparação, linha (slug), nome da linha, cor,
  -- novo, destaque, promo, estoque, tags, ordem, peso kg, largura cm, altura cm
  ('Pingente Coração com Cinzas',   'pingente-coracao-cinzas',   'Coração em prata 925 com uma pequena porção das cinzas guardada na resina. Feito à mão, um de cada vez.',            179.90, NULL::NUMERIC, 'uma-estrelinha', 'Uma Estrelinha', '#34495E', false, true,  false, 8,  ARRAY['cinzas','prata-925','pingente'],   1, 0.008, 2.0, 2.2),
  ('Joia Esfera com Cinzas',        'joia-esfera-cinzas',        'Esfera translúcida com as cinzas suspensas no centro, engastada em prata 925.',                                     199.90, 229.90,        'uma-estrelinha', 'Uma Estrelinha', '#34495E', false, true,  true,  6,  ARRAY['cinzas','prata-925','esfera'],     2, 0.009, 1.8, 2.4),
  ('Colar Gota Memória',            'colar-gota-memoria',        'Gota alongada com o material de quem partiu, em corrente de prata 925.',                                            219.90, NULL::NUMERIC, 'uma-estrelinha', 'Uma Estrelinha', '#34495E', true,  false, false, 5,  ARRAY['cinzas','colar','prata-925'],      3, 0.011, 1.4, 3.0),
  ('Pulseira Esfera com Estrelas',  'pulseira-esfera-estrelas',  'Esfera com cinzas e microestrelas, montada em pulseira de prata 925.',                                              349.90, NULL::NUMERIC, 'uma-estrelinha', 'Uma Estrelinha', '#34495E', false, true,  false, 4,  ARRAY['cinzas','pulseira','prata-925'],   4, 0.016, 1.6, 1.6),

  ('Pingente Patinha com Pelos',    'pingente-patinha-pelos',    'Patinha em prata 925 guardando os pelos do seu melhor amigo.',                                                      169.90, NULL::NUMERIC, 'pet',            'Pet',            '#4A5C6A', false, true,  false, 10, ARRAY['pet','pelos','pingente'],          5, 0.007, 1.9, 2.0),
  ('Coleira Memória com Cinzas',    'coleira-memoria-cinzas',    'Pingente de coleira com as cinzas do pet, em aço inoxidável.',                                                      189.90, 214.90,        'pet',            'Pet',            '#4A5C6A', true,  false, true,  7,  ARRAY['pet','cinzas','aco'],              6, 0.010, 2.2, 1.8),
  ('Pirâmide Pet — O Último Passeio','piramide-pet-ultimo-passeio','Peça decorativa em resina com cinzas ou pelo, nome do pet gravado. Fica na estante, não no pescoço.',              619.90, NULL::NUMERIC, 'pet',            'Pet',            '#4A5C6A', false, true,  false, 2,  ARRAY['pet','decorativo','resina'],       7, 0.290, 8.0, 9.0),

  ('Pingente Redondo Leite Materno','pingente-redondo-leite',    'O leite da amamentação preservado em resina, com aro de prata 925.',                                                189.90, NULL::NUMERIC, 'leite-materno',  'Leite Materno',  '#8C8073', false, true,  false, 12, ARRAY['leite-materno','prata-925'],       8, 0.008, 2.0, 2.0),
  ('Anel Leite Materno',            'anel-leite-materno',        'Anel com o leite materno na resina, aro em prata 925 ajustável.',                                                   239.90, NULL::NUMERIC, 'leite-materno',  'Leite Materno',  '#8C8073', true,  false, false, 6,  ARRAY['leite-materno','anel','prata-925'], 9, 0.006, 1.2, 1.2),

  ('Pingente Dente de Leite',       'pingente-dente-de-leite',   'O primeiro dentinho guardado na resina, com acabamento em prata 925.',                                              174.90, NULL::NUMERIC, 'dente-de-leite', 'Dente de Leite', '#B8945F', false, false, false, 9,  ARRAY['dente-de-leite','prata-925'],     10, 0.007, 1.8, 2.0),
  ('Chaveiro Dente de Leite',       'chaveiro-dente-de-leite',   'Mesma peça em versão chaveiro, em aço inoxidável — para quem prefere levar na chave.',                              139.90, 159.90,        'dente-de-leite', 'Dente de Leite', '#B8945F', false, false, true,  14, ARRAY['dente-de-leite','chaveiro','aco'], 11, 0.022, 3.0, 3.4),

  ('Pingente Coto Umbilical',       'pingente-coto-umbilical',   'O coto umbilical do recém-nascido preservado em resina, com aro de prata 925.',                                     194.90, NULL::NUMERIC, 'maternidade',    'Maternidade',    '#A07E4C', true,  true,  false, 7,  ARRAY['maternidade','coto-umbilical'],   12, 0.008, 1.9, 2.1),
  ('Pirâmide Árvore da Vida',       'piramide-arvore-da-vida',   'Peça decorativa em resina com o material afetivo e o nome gravado.',                                                419.90, NULL::NUMERIC, 'maternidade',    'Maternidade',    '#A07E4C', false, false, false, 3,  ARRAY['maternidade','decorativo','resina'], 13, 0.260, 7.5, 8.5),

  ('Anel Afetivo Masculino',        'anel-afetivo-masculino',    'Anel de linha reta em prata 925 ajustável, com o material afetivo na resina.',                                      424.90, NULL::NUMERIC, 'masculina',      'Masculina',      '#23303A', false, true,  false, 5,  ARRAY['masculina','anel','prata-925'],   14, 0.014, 1.0, 1.0),
  ('Pingente Placa Masculina',      'pingente-placa-masculina',  'Placa reta em aço inoxidável com a resina afetiva e gravação opcional.',                                            209.90, NULL::NUMERIC, 'masculina',      'Masculina',      '#23303A', false, false, false, 8,  ARRAY['masculina','aco','pingente'],     15, 0.013, 1.6, 3.2),
  -- Estoque zero de propósito: é o produto que exercita o estado "esgotado" da
  -- vitrine e da página. Mantido em `stock_policy = 'track'` mais abaixo.
  ('Colar Ponto de Luz',            'colar-ponto-de-luz',        'Ponto de luz com o material afetivo em prata 925. Produção em pausa — a próxima leva abre em breve.',                259.90, NULL::NUMERIC, 'uma-estrelinha', 'Uma Estrelinha', '#34495E', false, false, false, 0,  ARRAY['cinzas','colar','prata-925'],     16, 0.010, 1.2, 2.6)
) AS p(name, slug, description, base_price, original_price, cat_slug, linha, color,
       is_new, is_featured, is_promo, stock, tags, sort_order, weight_kg, width_cm, height_cm)
JOIN public.categories c ON c.slug = p.cat_slug
CROSS JOIN LATERAL (
  SELECT
    'data:image/svg+xml;base64,' || encode(convert_to(format(t.svg, p.color, upper(p.linha), p.name,
       CASE WHEN char_length(p.name) > 24 THEN 26 WHEN char_length(p.name) > 16 THEN 32 ELSE 38 END), 'UTF8'), 'base64') AS principal,
    'data:image/svg+xml;base64,' || encode(convert_to(format(t.svg, p.color, 'SEGUNDO ÂNGULO', p.name,
       CASE WHEN char_length(p.name) > 24 THEN 26 WHEN char_length(p.name) > 16 THEN 32 ELSE 38 END), 'UTF8'), 'base64') AS detalhe
  FROM (VALUES (
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600" '
    || 'font-family="Georgia,serif"><rect width="600" height="600" fill="%1$s"/>'
    || '<circle cx="300" cy="278" r="150" fill="#FFFFFF" fill-opacity="0.10"/>'
    || '<circle cx="300" cy="278" r="104" fill="none" stroke="#FFFFFF" stroke-opacity="0.28" stroke-width="3"/>'
    || '<text x="300" y="112" text-anchor="middle" font-size="22" letter-spacing="6" fill="#FFFFFF" fill-opacity="0.75">%2$s</text>'
    || '<text x="300" y="292" text-anchor="middle" font-weight="bold" fill="#FFFFFF" font-size="%4$s">%3$s</text>'
    || '<text x="300" y="548" text-anchor="middle" font-size="19" fill="#FFFFFF" fill-opacity="0.6">Uma Estrelinha · imagem de marcação</text>'
    || '</svg>'
  )) AS t(svg)
) AS m
ON CONFLICT (slug) DO UPDATE SET
  name                 = EXCLUDED.name,
  description          = EXCLUDED.description,
  base_price           = EXCLUDED.base_price,
  original_price       = EXCLUDED.original_price,
  category_id          = EXCLUDED.category_id,
  image_url            = EXCLUDED.image_url,
  images               = EXCLUDED.images,
  is_new               = EXCLUDED.is_new,
  is_featured          = EXCLUDED.is_featured,
  is_promo             = EXCLUDED.is_promo,
  is_active            = EXCLUDED.is_active,
  stock_total          = EXCLUDED.stock_total,
  tags                 = EXCLUDED.tags,
  sort_order           = EXCLUDED.sort_order,
  weight_kg            = EXCLUDED.weight_kg,
  width_cm             = EXCLUDED.width_cm,
  height_cm            = EXCLUDED.height_cm,
  production_lead_days = EXCLUDED.production_lead_days;

-- -----------------------------------------------------------------------------
-- 2b. PRODUTO × CATEGORIA  (N:N — a verdade desde 07/T4)
-- -----------------------------------------------------------------------------
-- `products.category_id` é LEGADO desde a migration 20260801120300. Quem manda é
-- `public.product_categories`, e é dela que a vitrine lê (PST-06). O backfill da
-- migration só alcança o que existe no momento em que ela roda — os produtos
-- deste seed nasceriam sem vínculo N:N e a loja mostraria coleção vazia.
INSERT INTO public.product_categories (product_id, category_id, position)
SELECT p.id, p.category_id, 0
FROM public.products p
WHERE p.category_id IS NOT NULL
ON CONFLICT (product_id, category_id) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 3. VARIAÇÕES  (grade real: eixos, preço por linha, estoque por linha)
-- -----------------------------------------------------------------------------
-- Os dois caminhos precisam existir no fixture: produto com grade e produto
-- precificado por `base_price`. Aqui quatro peças ganham grade 3 × 2.
--
-- Os eixos são os do negócio: o METAL muda o preço (aço < prata < folheado a
-- ouro) e o ACABAMENTO não. Preço que cresce com a linha é o que distingue
-- "cobrou pela variação" de "cobrou pelo base_price" — um fixture uniforme não
-- distinguiria.
UPDATE public.products
SET options = '[
      {"name": "Metal",      "values": ["Aço inoxidável", "Prata 925", "Folheado a ouro"], "position": 0},
      {"name": "Acabamento", "values": ["Polido", "Fosco"],                                 "position": 1}
    ]'::jsonb
WHERE slug IN ('pingente-coracao-cinzas','pingente-patinha-pelos','pingente-redondo-leite','anel-afetivo-masculino');

-- As TRÊS políticas de estoque existem no fixture, senão o caminho do dinheiro
-- só é exercitado num modo.
--
--   none      → nunca esgota e a baixa de estoque IGNORA o saldo. É o modo certo
--               para peça sob encomenda, que é a regra da casa: só começa a ser
--               feita quando o material da cliente chega.
--   backorder → vende com saldo zero ou negativo, e a baixa pode deixar negativo.
--   track     → o padrão; `colar-ponto-de-luz` fica aqui com saldo 0 porque é o
--               produto que exercita o estado "esgotado".
UPDATE public.products SET stock_policy = 'none'      WHERE slug IN ('piramide-arvore-da-vida','piramide-pet-ultimo-passeio');
UPDATE public.products SET stock_policy = 'backorder' WHERE slug IN ('anel-leite-materno');

INSERT INTO public.product_variants
  (product_id, name, sku, option_values, price, compare_price, stock, weight_kg, is_active, position)
SELECT
  pr.id,
  v.metal || ' · ' || v.acabamento,
  pr.slug || '-' || v.suffix,
  jsonb_build_object('Metal', v.metal, 'Acabamento', v.acabamento),
  round(pr.base_price + v.delta, 2),
  CASE WHEN v.acabamento = 'Polido' THEN round(pr.base_price + v.delta + 30.00, 2) END,
  v.stock,
  v.weight_kg,
  v.is_active,
  v.position
FROM (VALUES
  ('Aço inoxidável',  'Polido', 'aco-pol',   -40.00, 12, 0.009, true,  0),
  ('Aço inoxidável',  'Fosco',  'aco-fos',   -40.00,  6, 0.009, true,  1),
  ('Prata 925',       'Polido', 'prata-pol',   0.00,  9, 0.008, true,  2),
  ('Prata 925',       'Fosco',  'prata-fos',   0.00,  3, 0.008, true,  3),
  ('Folheado a ouro', 'Polido', 'ouro-pol',   60.00,  4, 0.008, true,  4),
  -- Uma linha PAUSADA de propósito: a faixa de preço e a vitrine têm de ignorá-la.
  ('Folheado a ouro', 'Fosco',  'ouro-fos',   60.00,  0, 0.008, false, 5)
) AS v(metal, acabamento, suffix, delta, stock, weight_kg, is_active, position)
JOIN public.products pr
  ON pr.slug IN ('pingente-coracao-cinzas','pingente-patinha-pelos','pingente-redondo-leite','anel-afetivo-masculino')
ON CONFLICT (sku) DO UPDATE SET
  name          = EXCLUDED.name,
  option_values = EXCLUDED.option_values,
  price         = EXCLUDED.price,
  compare_price = EXCLUDED.compare_price,
  stock         = EXCLUDED.stock,
  weight_kg     = EXCLUDED.weight_kg,
  is_active     = EXCLUDED.is_active,
  position      = EXCLUDED.position;


-- -----------------------------------------------------------------------------
-- 4. CUPONS  (para testar o fluxo de desconto no checkout)
-- -----------------------------------------------------------------------------
-- Os cinco formatos que o checkout precisa exercitar: percentual, valor fixo,
-- percentual com teto de usos, frete grátis e um vencido (que tem de recusar).
-- Os pisos de `min_order` acompanham a faixa de preço real do catálogo.
INSERT INTO public.coupons (code, description, type, value, min_order, max_uses, active, valid_until) VALUES
  ('ACOLHER10',   '10% off em qualquer pedido',           'percent',       10,   0, NULL, true, now() + interval '90 days'),
  ('MEMORIA20',   'R$20 off acima de R$200',              'fixed',         20, 200, NULL, true, now() + interval '90 days'),
  ('PRIMEIRA15',  '15% off acima de R$300 (100 usos)',    'percent',       15, 300,  100, true, now() + interval '90 days'),
  ('ENVIOGRATIS', 'Frete grátis acima de R$250',          'free_shipping',  0, 250, NULL, true, now() + interval '90 days'),
  ('VENCIDO',     'Cupom vencido — para testar a recusa', 'percent',       20,   0, NULL, true, now() - interval '1 day')
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  type        = EXCLUDED.type,
  value       = EXCLUDED.value,
  min_order   = EXCLUDED.min_order,
  max_uses    = EXCLUDED.max_uses,
  active      = EXCLUDED.active,
  valid_until = EXCLUDED.valid_until;

-- Sem seção de `drops`: a tabela existe, mas nenhum código a lê (o
-- `DropCountdown` da home calcula a data no próprio componente). Semear uma
-- linha ali era inventar um "lançamento" — vocabulário que não é desta loja.


-- -----------------------------------------------------------------------------
-- 5. USUÁRIO ADMIN  (acesso ao backoffice — :8083 /admin/*)
-- -----------------------------------------------------------------------------
-- admin@umaestrelinha.dev / admin123  — SOMENTE desenvolvimento local.
--
-- Sem isto, um `supabase db reset` derruba a conta e o backoffice fica
-- inacessível até alguém recriar o usuário na mão (a senha vira um hash bcrypt
-- irrecuperável). `RequireAdmin` valida via public.user_roles + has_role().
--
-- Escreve direto em auth.users/auth.identities porque o GoTrue não expõe
-- criação de usuário confirmado sem service_role key. A identity é obrigatória:
-- sem ela o login por senha falha.
DO $$
DECLARE
  v_email text := 'admin@umaestrelinha.dev';
  v_pass  text := 'admin123';
  v_id    uuid;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE email = v_email;

  IF v_id IS NULL THEN
    -- UUID fixo: mantém o id estável entre resets (facilita fixtures/queries).
    v_id := 'a95dfd7f-04b4-46b4-8999-337bebcc0f26'::uuid;

    -- Os campos de token vão como '' (não NULL): o GoTrue lê essas colunas
    -- como string e quebra o login com NULL.
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      v_email, extensions.crypt(v_pass, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', 'Admin Uma Estrelinha', 'email_verified', true),
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      provider, provider_id, user_id, identity_data,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      'email', v_id::text, v_id,
      jsonb_build_object('sub', v_id::text, 'email', v_email,
                         'email_verified', true, 'phone_verified', false),
      now(), now(), now()
    );
  ELSE
    -- Já existe (inclusive com outro id): só realinha senha e confirmação.
    UPDATE auth.users
       SET encrypted_password = extensions.crypt(v_pass, extensions.gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           updated_at         = now()
     WHERE id = v_id;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
