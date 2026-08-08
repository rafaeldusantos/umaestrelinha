import { useAbandonedCartTracker } from '@/features/abandoned-cart/model/useAbandonedCartTracker'

/**
 * Componente "transparente" que apenas ativa o tracker de carrinho abandonado
 * dentro do contexto do BrowserRouter + AuthContext + QueryClient.
 */
const AbandonedCartTracker = () => {
  useAbandonedCartTracker()
  return null
}

export default AbandonedCartTracker
