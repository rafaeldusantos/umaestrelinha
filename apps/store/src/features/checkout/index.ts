// Public API do slice. O fluxo de 5 passos (CustomerStep, AddressStep, ShippingStep,
// PaymentStep, ReviewStep, StepIndicator) foi **apagado** com o one-page (CHK-01): código morto
// que ainda compila é convite a regressão.
export { useCreatePayment } from './api/useCreatePayment'
export { useCepLookup } from './api/useCepLookup'
export { useShippingQuote } from './api/useShippingQuote'
export { default as CardPaymentBrick } from './ui/CardPaymentBrick'
export { default as ContactBlock } from './ui/ContactBlock'
export { default as DeliveryBlock } from './ui/DeliveryBlock'
export { default as OrderBump } from './ui/OrderBump'
export { default as OrderSummary } from './ui/OrderSummary'
export { default as PaymentBlock } from './ui/PaymentBlock'
// `PixPayment` saiu daqui na feature `58`: a superfície do PIX tem endereço próprio
// (`/pedido/:id/pagamento`) e mora em `features/order-payment`. O arquivo foi apagado, e
// `pagamentoComDonoUnico.test.ts` recusa a volta dele ao disco e ao barrel.
