-- =====================================================================
-- 30 · T8 — Google Shopping: identificadores do produto e o interruptor
-- =====================================================================
-- Requisitos: GSH-15, GSH-19, GSH-20
--
-- A loja tem 3.235 ofertas aprovadas na conta Merchant Center 685367464, hoje
-- alimentadas pela Content API do app da Nuvemshop. No cutover de DNS aquela
-- fonte morre, e o feed proprio precisa emitir os MESMOS campos que estao
-- aprovados. Esta migration abre as colunas que o painel da Nuvemshop expoe
-- (marca, MPN, faixa etaria, sexo) mais as duas que o feed precisa decidir
-- (categoria do Google, existencia de identificador), e semeia a chave de
-- configuracao do interruptor.
--
-- Nenhuma tabela nova, nenhuma policy nova, nenhum grant novo: `products` e
-- `store_settings` ja tem RLS, e a escrita das duas ja e admin-only.

-- ---------------------------------------------------------------------
-- 1. products: os campos que o feed emite por produto
-- ---------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand                   text,
  ADD COLUMN IF NOT EXISTS mpn                     text,
  ADD COLUMN IF NOT EXISTS age_group               text,
  ADD COLUMN IF NOT EXISTS gender                  text,
  ADD COLUMN IF NOT EXISTS google_product_category text,
  ADD COLUMN IF NOT EXISTS identifier_exists       boolean;

COMMENT ON COLUMN public.products.brand IS
  'Marca da peca. Semeada pelo importador de RawProduct.brand, e SO onde a coluna ainda e nula.';
COMMENT ON COLUMN public.products.mpn IS
  'Numero de peca do fabricante. Campo equivalente ao da tela Instagram e Google Shopping da Nuvemshop.';
COMMENT ON COLUMN public.products.google_product_category IS
  'Taxonomia do Google. NULL herda o default de store_settings.google_shopping.';
COMMENT ON COLUMN public.products.identifier_exists IS
  'NULL = nunca decidido, e herda o padrao da loja (sem identificador). Terceiro estado deliberado, mesmo molde de requires_material (22) e engraving_max_chars (22). Joia artesanal nao tem GTIN: a propria Nuvemshop marca estes produtos como "produto unico ou vintage sem identificador".';

-- ---------------------------------------------------------------------
-- 2. Os dois vocabularios fechados
-- ---------------------------------------------------------------------
-- CHECK em statement PROPRIO e NOMEADO, nunca inline no ADD COLUMN IF NOT
-- EXISTS: quando a coluna ja existe, o inline e ignorado em silencio e o banco
-- fica sem a constraint sem avisar. A migration 20260801120000 registra a mesma
-- armadilha em `stock_policy`.
--
-- Os valores sao os do vocabulario do Google, nao os nossos. Texto livre aqui
-- faria a oferta ser recusada item a item, e a dona descobriria no Merchant
-- Center e nao no save.
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_age_group_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_age_group_check
  CHECK (age_group IS NULL OR age_group IN ('newborn', 'infant', 'toddler', 'kids', 'adult'));

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_gender_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_gender_check
  CHECK (gender IS NULL OR gender IN ('male', 'female', 'unisex'));

-- ---------------------------------------------------------------------
-- 3. store_settings.google_shopping — o interruptor
-- ---------------------------------------------------------------------
-- `enabled` nasce FALSE de proposito. O feed nao pode responder antes do
-- cutover: enquanto a loja antiga atende o dominio, uma fonte de dados nova
-- apontando para ca disputaria os mesmos offer_id com a Content API viva.
--
-- `ever_enabled` existe porque desligar DEPOIS de ligado nao e neutro: o Google
-- para de receber o feed e as ofertas expiram. E o que faz a tela exigir
-- confirmacao (GSH-16) em vez de tratar como um toggle qualquer.
--
-- `last_fetched_at` e escrito pela edge function a cada resposta 200. E o unico
-- sinal, do nosso lado, de que a busca agendada esta de pe.
-- O formato do INSERT segue o das duas `*_create_store_settings.sql` de proposito:
-- `storeSettingsDefaults.test.ts` extrai os defaults desta forma exata para
-- compara-los com o TypeScript, e uma terceira grafia sairia da varredura sem
-- ninguem notar.
INSERT INTO public.store_settings (key, value) VALUES
  ('google_shopping', jsonb_build_object(
    'enabled', false,
    'ever_enabled', false,
    'merchant_id', '685367464',
    'default_product_category', 'Apparel & Accessories > Jewelry',
    'last_fetched_at', NULL
  ))
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. categories.google_product_category (GSH-23, P3)
-- ---------------------------------------------------------------------
-- A taxonomia do Google por CATEGORIA, para a dona nao repetir a escolha em
-- 689 produtos. A precedencia e produto > categoria > padrao da loja, e quem a
-- aplica e `resolveOffer` — ninguem le a coluna crua.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS google_product_category text;

COMMENT ON COLUMN public.categories.google_product_category IS
  'Taxonomia do Google herdada pelos produtos da categoria. NULL = herda o padrao da loja. Precedencia: produto > categoria > store_settings.google_shopping.default_product_category.';
