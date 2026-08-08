import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useCartUiStore } from '@/entities/cart/model/cartUiStore'
import { useRecoverCart } from '@/features/recover-cart/model/useRecoverCart'

/**
 * `/carrinho` é atalho, não tela.
 *
 * A sacola vive na gaveta (`widgets/cart-drawer`) — é ela que o header, a nav mobile, o toast de
 * "adicionado" e o checkout abrem. Duas superfícies para a mesma lista significavam dois lugares
 * para consertar cada regra de carrinho, e no mobile ainda tirava a cliente da página em que ela
 * estava comprando.
 *
 * A rota fica de pé por dois motivos: link direto colado/salvo por alguém, e o `?recover=<id>` dos
 * e-mails de carrinho abandonado — que precisa reconstruir a sacola **antes** de qualquer redirect,
 * senão o lembrete leva para uma home com o carrinho vazio.
 */
const CartPage = () => {
  const { recovering, isRecovering } = useRecoverCart()
  const openCart = useCartUiStore((s) => s.openCart)

  // `useRecoverCart` só liga `recovering` no efeito de montagem, então o primeiro render ainda diz
  // "false" mesmo com uma recuperação a caminho. Esperar um commit separa "ainda não começou" de
  // "já acabou" sem depender de o hook sinalizar transição — o que ele não faz nos caminhos de erro,
  // onde o `?recover` fica na URL.
  const [bootstrapped, setBootstrapped] = useState(false)
  useEffect(() => setBootstrapped(true), [])

  const settled = !isRecovering || (bootstrapped && !recovering)

  useEffect(() => {
    if (settled) openCart()
  }, [settled, openCart])

  if (!settled) {
    return (
      <div className="container py-20 text-center">
        <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-estrelinha-primary" aria-hidden />
        <h1 className="font-heading text-2xl font-bold text-estrelinha-ink">Recuperando seu carrinho…</h1>
        <p className="mt-2 text-estrelinha-ink-soft">Estamos restaurando seus itens. Só um instante.</p>
      </div>
    )
  }

  return <Navigate to="/" replace />
}

export default CartPage
