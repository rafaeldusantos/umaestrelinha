-- =====================================================================
-- 63 · store_settings.shipping ganha `pickup_enabled` (RET-20)
--
-- A retirada no escritorio volta a existir para CEP do RS (90000-000 a
-- 99999-999), sem custo, na calculadora da pagina do produto e no checkout. A
-- loja antiga (Nuvemshop) oferecia; a nova so oferecia Correios.
--
-- Este campo e o interruptor. Ele NAO basta para a retirada aparecer: o
-- endereco do escritorio e o do cartao Material (`store_settings.material`), e
-- sem rua, bairro e cidade nenhuma superficie a mostra. Quem responde "aparece
-- para este CEP?" e `pickupAvailable` em `@estrelinha/core/shipping`, dono
-- unico, chamado pela loja e pela edge function `checkout`.
--
-- POR QUE NASCE `true`
--
-- Decisao do usuario (spec da 63, Assumptions). Ao contrario do frete gratis
-- (37), a retirada nao custa dinheiro a loja: o custo e zero por definicao.
--
-- POR QUE MIGRATION NOVA
--
-- `AD-017`: migration aplicada e imutavel. Molde da 37
-- (`20260905120000_37-frete-gratis-configuravel.sql`):
--   · `||` e ADITIVO: preserva os outros campos da chave `shipping`;
--   · `NOT value ? 'pickup_enabled'` faz a segunda execucao afetar 0 linhas.
--     Sem essa guarda, todo `db push` futuro RELIGARIA a retirada que a Adri
--     tivesse desligado.
--
-- O default do TypeScript (`DEFAULT_SHIPPING.pickup_enabled`) tem de dizer o
-- MESMO que a linha abaixo. `storeSettingsDefaults.test.ts` le ESTE arquivo do
-- disco e compara.
--
-- Nenhuma coluna nova em `orders`: o pedido de retirada e
-- `shipping_service_id = 'retirada'`, coluna `text` que ja existe.
-- =====================================================================

UPDATE public.store_settings
   SET value = value || jsonb_build_object('pickup_enabled', true)
 WHERE key = 'shipping'
   AND NOT value ? 'pickup_enabled';
