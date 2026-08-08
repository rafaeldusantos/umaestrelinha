-- =============================================================================
-- Nanita — Seed de desenvolvimento / testes
-- =============================================================================
-- Roda automaticamente em `supabase db reset` (config.toml → [db.seed]).
-- Também pode ser executado avulso:
--   docker exec -i supabase_db_nanapin-store psql -U postgres -d postgres < supabase/seed.sql
--
-- É IDEMPOTENTE: upsert por `slug` (categorias/produtos), por `code` (cupons) e
-- por `email` (admin). Convive com o seed embutido na migration inicial —
-- re-executar apenas atualiza os registros existentes e insere os novos.
--
-- ACESSO AO BACKOFFICE (dev): admin@nanapin.dev / admin123  (ver seção 6).
--
-- IMAGENS DE MARCAÇÃO: em vez de fotos aleatórias, cada produto/categoria recebe
-- um placeholder SVG rotulado (nome + categoria) embutido como data-URI base64.
-- É auto-contido (funciona offline, sem CDN), na paleta da marca e com um
-- desenho de "botton". O app usa `images[0]` como imagem principal
-- (ver entities/product/api/useProducts.ts). Trocar por assets reais no
-- Storage em produção.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers (funções temporárias — somem no fim da sessão)
-- -----------------------------------------------------------------------------

-- Escapa caracteres especiais de XML no texto do SVG.
CREATE OR REPLACE FUNCTION pg_temp.xesc(t text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT replace(replace(replace(coalesce(t,''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;')
$$;

-- Gera um placeholder SVG (data-URI base64) com título, subtítulo e cor de fundo.
-- O tamanho da fonte do título se adapta ao comprimento do texto.
CREATE OR REPLACE FUNCTION pg_temp.nana_marker(label text, sub text, bg text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT 'data:image/svg+xml;base64,' || encode(convert_to(
       '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" '
    || 'viewBox="0 0 600 600" font-family="Verdana,Geneva,sans-serif">'
    || '<rect width="600" height="600" fill="' || bg || '"/>'
    || '<circle cx="300" cy="278" r="165" fill="#FFFFFF" fill-opacity="0.12"/>'
    || '<circle cx="300" cy="278" r="120" fill="none" stroke="#FFFFFF" '
    ||   'stroke-opacity="0.25" stroke-width="4"/>'
    || '<circle cx="300" cy="278" r="16" fill="#FFFFFF" fill-opacity="0.35"/>'
    || '<text x="300" y="112" text-anchor="middle" font-size="24" letter-spacing="6" '
    ||   'fill="#FFFFFF" fill-opacity="0.8">' || upper(pg_temp.xesc(sub)) || '</text>'
    || '<text x="300" y="296" text-anchor="middle" font-weight="bold" fill="#FFFFFF" '
    ||   'font-size="' || (CASE
           WHEN char_length(label) > 15 THEN 34
           WHEN char_length(label) > 10 THEN 42
           ELSE 50 END) || '">' || pg_temp.xesc(label) || '</text>'
    || '<text x="300" y="548" text-anchor="middle" font-size="20" '
    ||   'fill="#FFFFFF" fill-opacity="0.65">Nanita · mock</text>'
    || '</svg>', 'UTF8'), 'base64')
$$;

-- Paleta por categoria (cor de fundo dos markers). Também alimenta o INSERT
-- de categorias e o de produtos (via JOIN por slug).
DROP TABLE IF EXISTS _pal;
CREATE TEMP TABLE _pal (slug text PRIMARY KEY, name text, description text, icon text, color text, sort_order int);
INSERT INTO _pal (slug, name, description, icon, color, sort_order) VALUES
  ('anime',  'Anime',  'Seus animes favoritos em botton!',     'flag',         '#B0176B', 1),
  ('kpop',   'K-Pop',  'Idols e groups em bottons lindos',     'mic',          '#D93C8C', 2),
  ('filmes', 'Filmes', 'Clássicos do cinema em pin',           'clapperboard', '#2B1622', 3),
  ('bandas', 'Bandas', 'Rock, indie e mais',                   'guitar',       '#4A1E33', 4),
  ('games',  'Games',  'Personagens icônicos',                 'gamepad-2',    '#7A2050', 5),
  ('series', 'Séries', 'Suas séries favoritas',                'tv',           '#C42A7E', 6),
  ('manga',  'Mangá',  'Capas e painéis icônicos em pin',      'book-open',    '#3B1A2B', 7),
  ('kawaii', 'Kawaii', 'Fofura pura: mascotes e comidinhas',   'heart',        '#FF51B9', 8);

-- -----------------------------------------------------------------------------
-- 1. CATEGORIAS
-- -----------------------------------------------------------------------------
INSERT INTO public.categories (name, slug, description, icon, image_url, active, sort_order)
SELECT name, slug, description, icon,
       pg_temp.nana_marker(name, 'Coleção', color), true, sort_order
FROM _pal
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  icon        = EXCLUDED.icon,
  image_url   = EXCLUDED.image_url,
  active      = EXCLUDED.active,
  sort_order  = EXCLUDED.sort_order;

-- -----------------------------------------------------------------------------
-- 2. PRODUTOS  (upsert por slug; category_id + cor resolvidos pelo slug da categoria)
-- -----------------------------------------------------------------------------
INSERT INTO public.products
  (name, slug, description, base_price, original_price, category_id,
   image_url, images, is_new, is_featured, is_promo, is_active, stock_total, low_stock_threshold, tags, sort_order)
SELECT
  p.name, p.slug, p.description, p.base_price, p.original_price, c.id,
  pg_temp.nana_marker(p.name, pal.name, pal.color),
  -- `products.images` virou jsonb [{url, alt, source}] na migration
  -- 20260801120200 (07/T3). Era `text[]`; um ARRAY[...] aqui agora estoura com
  -- "column images is of type jsonb but expression is of type text[]".
  -- O `alt` vem preenchido de propósito: a loja passa a usar images[].alt e um
  -- fixture com alt nulo esconderia regressão de acessibilidade.
  jsonb_build_array(
    jsonb_build_object(
      'url',    pg_temp.nana_marker(p.name, pal.name, pal.color),
      'alt',    p.name || ' — botton ' || pal.name,
      'source', 'upload'
    ),
    jsonb_build_object(
      'url',    pg_temp.nana_marker(p.name, 'ângulo 2', pal.color),
      'alt',    p.name || ' — segundo ângulo',
      'source', 'upload'
    )
  ),
  p.is_new, p.is_featured, p.is_promo, true, p.stock, 5, p.tags, p.sort_order
FROM (VALUES
  -- name, slug, description, base_price, original_price, cat_slug, is_new, is_featured, is_promo, stock, tags, sort_order
  ('Naruto Uzumaki',       'naruto-uzumaki',       'Botton do Naruto em modo sábio, laranja vibrante. 3.8cm.',        5.90, 7.90,        'anime',  true,  true,  true,  23, ARRAY['naruto','shonen','ninja'],       1),
  ('Sailor Moon',          'sailor-moon',          'Sailor Moon com acabamento holográfico.',                        6.90, NULL::NUMERIC,'anime',  false, true,  false, 15, ARRAY['sailormoon','mahou-shoujo'],     2),
  ('Gojo Satoru',          'gojo-satoru',          'O sensei mais estiloso de Jujutsu Kaisen.',                      6.90, NULL::NUMERIC,'anime',  true,  true,  false, 8,  ARRAY['jjk','olhos'],                   3),
  ('Tanjiro Kamado',       'tanjiro-kamado',       'Tanjiro com a marca na testa e haori xadrez.',                   6.90, NULL::NUMERIC,'anime',  false, true,  false, 10, ARRAY['demon-slayer','kimetsu'],        4),
  ('Levi Ackerman',        'levi-ackerman',        'O soldado mais forte da humanidade. AoT.',                       6.90, 8.90,        'anime',  false, false, true,  9,  ARRAY['aot','shingeki'],                5),
  ('Luffy Gear 5',         'luffy-gear-5',         'Joyboy desperto em botton premium metalizado.',                  7.90, NULL::NUMERIC,'anime',  true,  true,  false, 27, ARRAY['onepiece','luffy'],              6),

  ('BTS Jungkook',         'bts-jungkook',         'Pin do Jungkook, design minimalista em roxo.',                   6.90, NULL::NUMERIC,'kpop',   true,  true,  false, 30, ARRAY['bts','army'],                    7),
  ('BLACKPINK Logo',       'blackpink-logo',       'Logo oficial do BLACKPINK em rosa e preto.',                     5.90, NULL::NUMERIC,'kpop',   false, false, false, 20, ARRAY['blackpink','blink'],             8),
  ('Stray Kids Skzoo',     'stray-kids-skzoo',     'Mascote Skzoo fofíssimo dos Stray Kids.',                        6.90, NULL::NUMERIC,'kpop',   true,  false, false, 18, ARRAY['skz','stay'],                    9),
  ('NewJeans Bunny',       'newjeans-bunny',       'Bunny logo das NewJeans em azul baby.',                          5.90, 7.50,        'kpop',   false, true,  true,  22, ARRAY['newjeans','bunnies'],           10),
  ('TWICE Candy',          'twice-candy',          'Paleta candy pop das TWICE.',                                    5.90, NULL::NUMERIC,'kpop',   false, false, false, 16, ARRAY['twice','once'],                 11),

  ('Darth Vader',          'darth-vader',          'O lado sombrio da força em botton premium.',                     7.90, 9.90,        'filmes', false, true,  true,  12, ARRAY['starwars','sith'],              12),
  ('Hogwarts',             'harry-potter-hogwarts','Brasão de Hogwarts com detalhes dourados.',                      6.90, NULL::NUMERIC,'filmes', false, false, false, 18, ARRAY['harrypotter','magia'],          13),
  ('Toy Story Alien',      'toy-story-alien',      'Aliens de garra, ooooooh! Pixar.',                               5.90, NULL::NUMERIC,'filmes', true,  false, false, 24, ARRAY['pixar','toystory'],             14),
  ('Spider-Verse',         'spider-verse',         'Miles Morales em estilo glitch comic.',                          7.90, NULL::NUMERIC,'filmes', true,  true,  false, 19, ARRAY['spiderman','marvel'],           15),

  ('Arctic Monkeys',       'arctic-monkeys',       'Logo clássico do AM em preto e branco.',                         5.90, NULL::NUMERIC,'bandas', false, false, false, 25, ARRAY['indie','rock'],                 16),
  ('Nirvana Smiley',       'nirvana-smiley',       'O smiley icônico do grunge.',                                    5.90, NULL::NUMERIC,'bandas', false, true,  false, 31, ARRAY['grunge','90s'],                 17),
  ('Gorillaz',             'gorillaz',             'Arte dos Gorillaz em pin colorido.',                             6.90, 8.50,        'bandas', false, false, true,  13, ARRAY['gorillaz','alt'],               18),

  ('Zelda Triforce',       'zelda-triforce',       'Triforce dourada em fundo verde escuro.',                        6.90, 8.90,        'games',  false, true,  true,  14, ARRAY['zelda','nintendo'],             19),
  ('Pikachu',              'pikachu',              'O Pokémon mais famoso do mundo, fofo demais.',                   5.90, NULL::NUMERIC,'games',  true,  false, false, 35, ARRAY['pokemon','eletrico'],           20),
  ('Mario Mushroom',       'mario-mushroom',       'Super cogumelo 1-UP em pin retrô.',                              5.90, NULL::NUMERIC,'games',  false, true,  false, 28, ARRAY['mario','retro'],                21),
  ('Among Us',             'among-us',             'Sus! Crewmate vermelho em botton.',                              4.90, 6.90,        'games',  false, false, true,  40, ARRAY['amongus','sus'],                22),
  ('Minecraft Creeper',    'minecraft-creeper',    'Aw man... Creeper pixelado.',                                    5.90, NULL::NUMERIC,'games',  false, false, false, 33, ARRAY['minecraft','pixel'],            23),

  ('Stranger Things',      'stranger-things',      'Logo com luzes do Mundo Invertido.',                             5.90, NULL::NUMERIC,'series', false, false, false, 22, ARRAY['strangerthings','80s'],         24),
  ('The Office Dundie',    'the-office-dundie',    'Prêmio Dundie em versão pin.',                                   5.90, NULL::NUMERIC,'series', false, true,  false, 17, ARRAY['theoffice','sitcom'],           25),
  ('Wednesday',            'wednesday',            'Wandinha Addams em preto gótico.',                               6.90, NULL::NUMERIC,'series', true,  true,  false, 21, ARRAY['wednesday','addams'],           26),

  ('One Piece Cap 1000',   'one-piece-cap-1000',   'Capa comemorativa do capítulo 1000.',                            7.90, NULL::NUMERIC,'manga',  true,  false, false, 11, ARRAY['onepiece','manga'],             27),
  ('Berserk Brand',        'berserk-brand',        'A Marca do Sacrifício. Para os corajosos.',                      7.90, 9.90,        'manga',  false, true,  true,  7,  ARRAY['berserk','dark'],               28),

  ('Gato Pão',             'gato-pao',             'Gatinho virando pão. Fofura suprema.',                           4.90, NULL::NUMERIC,'kawaii', true,  true,  false, 50, ARRAY['gato','fofo'],                  29),
  ('Sushi Feliz',          'sushi-feliz',          'Sushizinho sorridente em pin brilhante.',                        4.90, 5.90,        'kawaii', false, false, true,  45, ARRAY['comida','fofo'],                30),
  ('Nuvem Sonolenta',      'nuvem-sonolenta',      'Nuvem fofa com carinha de sono.',                                4.90, NULL::NUMERIC,'kawaii', false, true,  false, 38, ARRAY['pastel','fofo'],                31),
  ('Esgotado Teste',       'esgotado-teste',       'Produto sem estoque — para testar o estado "esgotado".',         5.90, NULL::NUMERIC,'kawaii', false, false, false, 0,  ARRAY['teste'],                        32)
) AS p(name, slug, description, base_price, original_price, cat_slug, is_new, is_featured, is_promo, stock, tags, sort_order)
JOIN public.categories c ON c.slug = p.cat_slug
JOIN _pal pal            ON pal.slug = p.cat_slug
ON CONFLICT (slug) DO UPDATE SET
  name           = EXCLUDED.name,
  description    = EXCLUDED.description,
  base_price     = EXCLUDED.base_price,
  original_price = EXCLUDED.original_price,
  category_id    = EXCLUDED.category_id,
  image_url      = EXCLUDED.image_url,
  images         = EXCLUDED.images,
  is_new         = EXCLUDED.is_new,
  is_featured    = EXCLUDED.is_featured,
  is_promo       = EXCLUDED.is_promo,
  is_active      = EXCLUDED.is_active,
  stock_total    = EXCLUDED.stock_total,
  tags           = EXCLUDED.tags,
  sort_order     = EXCLUDED.sort_order;

-- -----------------------------------------------------------------------------
-- 2b. PRODUTO × CATEGORIA  (N:N — a verdade desde 07/T4)
-- -----------------------------------------------------------------------------
-- `products.category_id` virou LEGADO na migration 20260801120300. Quem manda é
-- `public.product_categories`, e é dela que a vitrine passa a ler (PST-06).
--
-- O backfill mora na migration, mas só alcança o que existe NO MOMENTO em que
-- ela roda — no `db reset`, isso são apenas os 12 produtos demo da migration
-- inicial. Os 20 que este seed acrescenta nasceriam sem categoria N:N, e a loja
-- local mostraria 12 de 32 produtos nas coleções.
INSERT INTO public.product_categories (product_id, category_id, position)
SELECT p.id, p.category_id, 0
FROM public.products p
WHERE p.category_id IS NOT NULL
ON CONFLICT (product_id, category_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. VARIAÇÕES  (grade real: eixos, preço por linha, estoque por linha)
-- -----------------------------------------------------------------------------
-- Reescrito em 2026-08-01 pela feature 07. O formato anterior gravava
-- `{name, sku, price_override, stock}` sem `option_values` e sem `price`, e as linhas nasciam
-- ATIVAS — deixando 5 produtos com variação ativa e sem preço, que é exatamente o estado
-- "impagável" que a spec chama de indesejado (PST-10 trata em runtime, mas o fixture não deveria
-- produzi-lo).
--
-- `price_override` NÃO é mais usado: a coluna está deprecada e sua semântica no seed antigo era
-- ambígua (o '5.5 cm (grande)' tinha 2.00 contra base_price 4,90 — lia como delta, apesar do nome).
-- Agora cada linha tem `price` ABSOLUTO, que é o contrato da feature 07.

-- 3a. Eixos do produto. Cinco produtos ganham grade 3 × 2; o resto segue sem variação,
--     precificado por `base_price` — os dois caminhos precisam existir no fixture.
UPDATE public.products
SET options = '[
      {"name": "Tamanho",    "values": ["3,5 cm", "4,5 cm", "5,5 cm"], "position": 0},
      {"name": "Acabamento", "values": ["Brilhante", "Fosco"],          "position": 1}
    ]'::jsonb
WHERE slug IN ('naruto-uzumaki','gojo-satoru','pikachu','darth-vader','gato-pao');

-- As TRÊS políticas de estoque precisam existir no fixture, senão o caminho do dinheiro só é
-- exercitado num modo. Os outros dois são marcados em produtos reais do catálogo:
--
--   none      → nunca esgota, e a baixa de estoque tem de IGNORÁ-LO por completo. É o modo dos
--               personalizados e do sob demanda.
--   backorder → vende com saldo zero ou negativo, e a baixa PODE deixar o saldo negativo.
--
-- `esgotado-teste` fica em `track` de propósito: é o produto que testa o estado "esgotado", e
-- mudá-lo de política tiraria essa cobertura.
UPDATE public.products SET stock_policy = 'none'      WHERE slug IN ('sushi-feliz');
UPDATE public.products SET stock_policy = 'backorder' WHERE slug IN ('nuvem-sonolenta');

-- 3b. A grade. Preço CRESCE com o tamanho — é o caso que motivou a feature inteira, e um fixture
--     com preço uniforme não distinguiria "cobrou pela variação" de "cobrou pelo base_price".
INSERT INTO public.product_variants
  (product_id, name, sku, option_values, price, compare_price, stock, weight_kg, is_active, position)
SELECT
  pr.id,
  v.size || ' · ' || v.finish,
  pr.slug || '-' || v.suffix,
  jsonb_build_object('Tamanho', v.size, 'Acabamento', v.finish),
  round(pr.base_price + v.delta, 2),
  CASE WHEN v.finish = 'Brilhante' THEN round(pr.base_price + v.delta + 3.00, 2) END,
  v.stock,
  v.weight_kg,
  v.is_active,
  v.position
FROM (VALUES
  ('3,5 cm', 'Brilhante', '35-bri', 0.00, 18,  0.016, true,  0),
  ('3,5 cm', 'Fosco',     '35-fos', 0.00, 10,  0.016, true,  1),
  ('4,5 cm', 'Brilhante', '45-bri', 2.00, 32,  0.018, true,  2),
  ('4,5 cm', 'Fosco',     '45-fos', 2.00,  4,  0.018, true,  3),
  ('5,5 cm', 'Brilhante', '55-bri', 3.50, 14,  0.022, true,  4),
  -- Uma linha PAUSADA de propósito: a faixa de preço e a vitrine têm de ignorá-la.
  ('5,5 cm', 'Fosco',     '55-fos', 3.50,  0,  0.022, false, 5)
) AS v(size, finish, suffix, delta, stock, weight_kg, is_active, position)
JOIN public.products pr ON pr.slug IN ('naruto-uzumaki','gojo-satoru','pikachu','darth-vader','gato-pao')
ON CONFLICT (sku) DO UPDATE SET
  name          = EXCLUDED.name,
  option_values = EXCLUDED.option_values,
  price         = EXCLUDED.price,
  compare_price = EXCLUDED.compare_price,
  stock         = EXCLUDED.stock,
  weight_kg     = EXCLUDED.weight_kg,
  is_active     = EXCLUDED.is_active,
  position      = EXCLUDED.position;

-- 3c. As linhas do formato ANTIGO (sufixos `-p38` / `-g55`) não são mais criadas. Se existirem de
--     um seed anterior, ficam pausadas e sem preço — nunca vendáveis, e sem sumir, porque
--     `order_items.variant_id` pode apontar para elas.
UPDATE public.product_variants
SET is_active = false, price = NULL
WHERE sku LIKE '%-p38' OR sku LIKE '%-g55';

-- -----------------------------------------------------------------------------
-- 4. CUPONS  (para testar o fluxo de desconto no checkout)
-- -----------------------------------------------------------------------------
INSERT INTO public.coupons (code, description, type, value, min_order, max_uses, active, valid_until) VALUES
  ('NANA10',     '10% off em qualquer pedido',        'percent',       10, 0,  NULL, true, now() + interval '90 days'),
  ('FRETE5',     'R$5 off acima de R$30',             'fixed',          5, 30, NULL, true, now() + interval '90 days'),
  ('BEMVINDO',   '15% off acima de R$50 (100 usos)',  'percent',       15, 50, 100,  true, now() + interval '90 days'),
  ('FRETEGRATIS','Frete grátis',                      'free_shipping',  0, 60, NULL, true, now() + interval '90 days'),
  ('EXPIRADO',   'Cupom expirado — para testar erro', 'percent',       20, 0,  NULL, true, now() - interval '1 day')
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  type        = EXCLUDED.type,
  value       = EXCLUDED.value,
  min_order   = EXCLUDED.min_order,
  max_uses    = EXCLUDED.max_uses,
  active      = EXCLUDED.active,
  valid_until = EXCLUDED.valid_until;

-- -----------------------------------------------------------------------------
-- 5. DROP futuro  (para testar o DropCountdown na home)
-- -----------------------------------------------------------------------------
INSERT INTO public.drops (title, description, image_url, drops_at, active)
SELECT 'Drop Verão Kawaii', 'Coleção limitada chegando! Fique ligado 💜',
       pg_temp.nana_marker('Drop Verão', 'Em breve', '#FF86B5'),
       now() + interval '7 days', true
WHERE NOT EXISTS (SELECT 1 FROM public.drops WHERE title = 'Drop Verão Kawaii');

-- -----------------------------------------------------------------------------
-- 6. USUÁRIO ADMIN  (acesso ao backoffice — :8081 /admin/*)
-- -----------------------------------------------------------------------------
-- admin@nanapin.dev / admin123  — SOMENTE desenvolvimento local.
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
  v_email text := 'admin@nanapin.dev';
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
      jsonb_build_object('name', 'Admin Nanita', 'email_verified', true),
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
