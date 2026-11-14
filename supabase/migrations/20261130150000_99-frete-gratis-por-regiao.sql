-- =====================================================================
-- 99 · store_settings.shipping ganha `free_shipping_regions`
--
-- O frete gratis por valor de compra passa a poder valer so para algumas
-- regioes do Brasil (Sul, Sudeste, Centro-Oeste, Nordeste, Norte), pelos
-- slugs de `@estrelinha/core/shipping` (`region.ts`). Quem responde "o frete
-- gratis foi concedido para este CEP?" e `freeShippingState`, dono unico.
--
-- POR QUE NASCE COM AS CINCO
--
-- Campo ausente vale as cinco, e a linha nova tambem nasce com as cinco: o
-- deploy NAO muda nada para quem ja usa o frete gratis. Limitar a Sul e
-- Sudeste e escolha da dona no painel. Lista vazia com o interruptor ligado
-- deixa o frete gratis inativo, e o painel recusa grava-la.
--
-- POR QUE MIGRATION NOVA
--
-- `AD-017`: migration aplicada e imutavel. Molde da 37 e da 63
-- (`20261011120000_63-retirada.sql`):
--   · `||` e ADITIVO: preserva os outros campos da chave `shipping`;
--   · `NOT value ? 'free_shipping_regions'` faz a segunda execucao afetar 0
--     linhas. Sem essa guarda, todo `db push` futuro DESFARIA a escolha de
--     regioes que a Adri tivesse feito.
--
-- O padrao do TypeScript (`DEFAULT_SHIPPING.free_shipping_regions`) tem de
-- dizer o MESMO que a linha abaixo, na mesma ordem.
-- `storeSettingsDefaults.test.ts` le ESTE arquivo do disco e compara.
-- =====================================================================

UPDATE public.store_settings
   SET value = value || jsonb_build_object('free_shipping_regions', '["sul","sudeste","centro-oeste","nordeste","norte"]'::jsonb)
 WHERE key = 'shipping'
   AND NOT value ? 'free_shipping_regions';
