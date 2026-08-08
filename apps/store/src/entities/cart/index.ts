export * from './api/useCart'
export * from './lib/toQuotePayload'
export * from './model/cartStore'
export * from './model/cartUiStore'
// Sem `ui/` aqui: `CartItem`/`CartSummary` eram a tela `/carrinho`, que virou atalho para a gaveta.
// A UI de carrinho é uma só, e vive em `widgets/cart-drawer`.
