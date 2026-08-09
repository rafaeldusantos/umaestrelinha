-- =====================================================================
-- Cria a tabela store_settings com defaults para Configuracoes da Loja.
--
-- REESCRITA sob AD-017 (2026-08-08). Ela nasceu gravando os defaults de outro
-- produto, e a migration 20260801170000 existia so para desfazer o valor
-- gravado aqui. Como este banco nunca foi implantado (nenhum
-- `db push`, nenhum schema_migrations remoto para divergir), a historia foi
-- reescrita na origem e a migration de correcao foi apagada.
--
-- **A permissao expira no primeiro `supabase db push` para um projeto
-- hospedado.** A partir dai vale a regra normal: migration aplicada e imutavel,
-- e correcao vem em migration nova.
--
-- Este arquivo e DUPLICATA BYTE-A-BYTE de 20260417015945_create_store_settings.
-- As duas rodam em sequencia no mesmo `db reset`; divergi-las cria um resultado
-- que depende de qual das duas roda por ultimo. Ao editar uma, edite a outra.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.store_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_settings_public_read" ON public.store_settings;
CREATE POLICY "store_settings_public_read"
  ON public.store_settings
  FOR SELECT
  USING (true);

-- Escrita: usa has_role(admin) se existir; senao libera para autenticados
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'has_role'
  ) THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS "store_settings_admin_write" ON public.store_settings;
      CREATE POLICY "store_settings_admin_write"
        ON public.store_settings
        FOR ALL
        TO authenticated
        USING (public.has_role(auth.uid(), 'admin'))
        WITH CHECK (public.has_role(auth.uid(), 'admin'));
    $p$;
  ELSE
    EXECUTE $p$
      DROP POLICY IF EXISTS "store_settings_auth_write" ON public.store_settings;
      CREATE POLICY "store_settings_auth_write"
        ON public.store_settings
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
    $p$;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.touch_store_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_store_settings_updated_at ON public.store_settings;
CREATE TRIGGER trg_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_store_settings_updated_at();

INSERT INTO public.store_settings (key, value) VALUES
  ('general', jsonb_build_object(
    'store_name', 'Uma Estrelinha',
    'whatsapp', '',
    'email', 'contato@umaestrelinha.com.br',
    'instagram', '',
    'tiktok', ''
  )),
  ('shipping', jsonb_build_object(
    'free_shipping_threshold', 150,
    'default_shipping_cost', 9.9,
    'origin_zip', ''
  )),
  ('payment', jsonb_build_object(
    'pix_enabled', true,
    'pix_discount_percent', 5,
    'card_enabled', true,
    'max_installments', 6,
    'min_installment_value', 10
  )),
  ('seo', jsonb_build_object(
    'title', 'Uma Estrelinha - Joias afetivas artesanais em resina',
    'description', 'Joias feitas à mão em resina com o material que você envia: cinzas, leite materno, dente de leite e mecha de cabelo.',
    'og_image', ''
  ))
ON CONFLICT (key) DO NOTHING;
