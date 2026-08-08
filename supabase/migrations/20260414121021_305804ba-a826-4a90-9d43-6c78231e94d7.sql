-- 1. ENUM de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
-- 2. Funcao para update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
-- 3. CATEGORIES
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- 4. PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  base_price NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2),
  image_url TEXT,
  images TEXT[] DEFAULT '{}',
  is_new BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  is_promo BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  stock INT DEFAULT 0,
  low_stock_threshold INT DEFAULT 5,
  tags TEXT[] DEFAULT '{}',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- 5. PRODUCT VARIANTS
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  price_override NUMERIC(10,2),
  stock INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- 6. CUSTOMERS
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  cpf TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- 7. ADDRESSES
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  label TEXT DEFAULT 'Casa',
  cep TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- 8. ORDERS
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  customer_id UUID REFERENCES public.customers(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','shipped','delivered','cancelled')),
  subtotal NUMERIC(10,2) NOT NULL,
  shipping_cost NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  payment_method TEXT,
  shipping_method TEXT,
  tracking_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- 9. ORDER ITEMS
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id),
  variant_id UUID REFERENCES public.product_variants(id),
  product_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- 10. COUPONS
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
  discount_value NUMERIC(10,2) NOT NULL,
  min_order NUMERIC(10,2) DEFAULT 0,
  max_uses INT,
  uses INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- 11. WISHLIST
CREATE TABLE public.wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id)
);
-- 12. REVIEWS
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- 13. DROPS
CREATE TABLE public.drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  drops_at TIMESTAMPTZ NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- 14. USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
-- =============================================
-- RLS
-- =============================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
-- Funcao segura para checar role (security definer evita recursao)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;
-- Policies publicas de leitura
CREATE POLICY "public read categories" ON public.categories FOR SELECT USING (active = true);
CREATE POLICY "public read products" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "public read variants" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "public read approved reviews" ON public.reviews FOR SELECT USING (approved = true);
CREATE POLICY "public read active drops" ON public.drops FOR SELECT USING (active = true);
CREATE POLICY "public read active coupons" ON public.coupons FOR SELECT USING (active = true);
-- Policies de usuario autenticado
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users read own wishlist" ON public.wishlist FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users manage own wishlist" ON public.wishlist FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users delete own wishlist" ON public.wishlist FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users read own customer" ON public.customers FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users insert own customer" ON public.customers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users read own orders" ON public.orders FOR SELECT TO authenticated USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));
CREATE POLICY "users insert own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));
CREATE POLICY "users read own order items" ON public.order_items FOR SELECT TO authenticated USING (order_id IN (SELECT id FROM public.orders WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())));
CREATE POLICY "users read own addresses" ON public.addresses FOR SELECT TO authenticated USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));
CREATE POLICY "users manage own addresses" ON public.addresses FOR INSERT TO authenticated WITH CHECK (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));
-- Policies admin (acesso total)
CREATE POLICY "admin full categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin full products" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin full variants" ON public.product_variants FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin full customers" ON public.customers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin full addresses" ON public.addresses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin full orders" ON public.orders FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin full order_items" ON public.order_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin full coupons" ON public.coupons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin full reviews" ON public.reviews FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin full drops" ON public.drops FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin full user_roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- =============================================
-- SEED DATA
-- =============================================

INSERT INTO public.categories (name, slug, description, icon, sort_order) VALUES
  ('Anime', 'anime', 'Seus animes favoritos em botton!', 'flag', 1),
  ('K-Pop', 'kpop', 'Idols e groups em bottons lindos', 'mic', 2),
  ('Filmes', 'filmes', 'Classicos do cinema em pin', 'clapperboard', 3),
  ('Bandas', 'bandas', 'Rock, indie e mais', 'guitar', 4),
  ('Games', 'games', 'Personagens iconicos', 'gamepad-2', 5),
  ('Series', 'series', 'Suas series favoritas', 'tv', 6);
INSERT INTO public.products (name, slug, description, base_price, original_price, category_id, is_new, is_featured, is_promo, stock, sort_order)
SELECT p.name, p.slug, p.description, p.base_price, p.original_price, c.id, p.is_new, p.is_featured, p.is_promo, p.stock, p.sort_order
FROM (VALUES
  ('Naruto Uzumaki', 'naruto-uzumaki', 'Botton do Naruto em modo sabio, com detalhes em laranja vibrante. Tamanho 3.8cm.', 5.90, 7.90, 'anime', true, true, true, 23, 1),
  ('Sailor Moon', 'sailor-moon', 'Botton da Sailor Moon com acabamento holografico.', 6.90, NULL::NUMERIC, 'anime', false, true, false, 15, 2),
  ('BTS Jungkook', 'bts-jungkook', 'Pin do Jungkook com design minimalista em tons de roxo.', 6.90, NULL::NUMERIC, 'kpop', true, true, false, 30, 3),
  ('BLACKPINK Logo', 'blackpink-logo', 'Logo oficial do BLACKPINK em rosa e preto.', 5.90, NULL::NUMERIC, 'kpop', false, false, false, 20, 4),
  ('Darth Vader', 'darth-vader', 'O lado sombrio da forca em botton premium.', 7.90, 9.90, 'filmes', false, true, true, 12, 5),
  ('Hogwarts', 'harry-potter-hogwarts', 'Brasao de Hogwarts com detalhes dourados.', 6.90, NULL::NUMERIC, 'filmes', false, false, false, 18, 6),
  ('Arctic Monkeys', 'arctic-monkeys', 'Logo classico do AM em preto e branco.', 5.90, NULL::NUMERIC, 'bandas', false, false, false, 25, 7),
  ('Gojo Satoru', 'gojo-satoru', 'O sensei mais estiloso de Jujutsu Kaisen.', 6.90, NULL::NUMERIC, 'anime', true, true, false, 8, 8),
  ('Zelda Triforce', 'zelda-triforce', 'Triforce dourada em fundo verde escuro.', 6.90, 8.90, 'games', false, true, true, 14, 9),
  ('Stranger Things', 'stranger-things', 'Logo com luzes de Natal do Mundo Invertido.', 5.90, NULL::NUMERIC, 'series', false, false, false, 22, 10),
  ('Pikachu', 'pikachu', 'O Pokemon mais famoso do mundo em botton fofo.', 5.90, NULL::NUMERIC, 'games', true, false, false, 35, 11),
  ('Tanjiro Kamado', 'tanjiro-kamado', 'Tanjiro com a marca na testa e haori xadrez.', 6.90, NULL::NUMERIC, 'anime', false, true, false, 10, 12)
) AS p(name, slug, description, base_price, original_price, cat_slug, is_new, is_featured, is_promo, stock, sort_order)
JOIN public.categories c ON c.slug = p.cat_slug;
