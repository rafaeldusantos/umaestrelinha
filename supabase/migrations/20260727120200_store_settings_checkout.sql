-- =====================================================================
-- M3 · store_settings: chave `checkout` (order bump) + `handling_days`
--      (BMP-01, SHP-09)
--
-- `fetchAllSettings` (packages/core/src/hooks/useStoreSettings.ts) descarta
-- qualquer chave que não esteja em DEFAULTS — por isso o tipo `SettingsKey` e o
-- DEFAULTS ganharam 'checkout' em T6; aqui a linha nasce no banco.
--
-- Idempotente por construção:
--   · o INSERT usa ON CONFLICT (key) DO NOTHING → não sobrescreve config do lojista;
--   · o UPDATE só age quando `handling_days` ainda NÃO existe (`NOT value ? ...`),
--     então rodar de novo afeta 0 linhas e nem dispara o trigger de updated_at.
-- =====================================================================

INSERT INTO public.store_settings (key, value) VALUES
  ('checkout', jsonb_build_object(
     'order_bump_enabled', false,
     'order_bump_product_id', null::text,
     'order_bump_discount_percent', 50
   ))
ON CONFLICT (key) DO NOTHING;

UPDATE public.store_settings
   SET value = value || jsonb_build_object('handling_days', 2)
 WHERE key = 'shipping'
   AND NOT value ? 'handling_days';
