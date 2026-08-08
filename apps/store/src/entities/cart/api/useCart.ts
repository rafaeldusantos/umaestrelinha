import { useCartStore } from '@/entities/cart/model/cartStore'

export const useCart = () => {
  const items = useCartStore((s) => s.items)
  const addItem = useCartStore((s) => s.addItem)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const clearCart = useCartStore((s) => s.clearCart)
  const uniqueItems = useCartStore((s) => s.uniqueItemsCount())
  const subtotal = useCartStore((s) => s.subtotal())
  const shippingCost = useCartStore((s) => s.shippingCost())
  const total = useCartStore((s) => s.total())

  return { items, addItem, removeItem, updateQuantity, clearCart, uniqueItems, subtotal, shippingCost, total }
}
