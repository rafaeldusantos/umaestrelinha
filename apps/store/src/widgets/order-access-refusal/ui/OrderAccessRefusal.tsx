// "Não conseguimos abrir este pedido" — a recusa, com um dono só.
//
// Ela nasceu dentro de `pages/OrderConfirmationPage.tsx` e tinha um consumidor. A feature `58`
// criou o segundo (`pages/OrderPaymentPage.tsx`): as duas rotas leem o MESMO pedido, pela mesma
// porta (`useOrder`), e por isso falham exatamente do mesmo jeito — id que não existe, ou token de
// convidada que expirou.
//
// Copiada, ela divergiria sem nada quebrar: a página do pagamento passaria a mandar para "Minha
// conta" quem nunca entrou numa, ou a de confirmação deixaria de oferecer o código por e-mail. É o
// "defeito 01" na tela que a cliente vê depois de pagar.
//
// **Mora em `widgets/` e não em `shared/`** porque ela precisa de `features/auth` (o overlay de
// código): `shared` só pode importar de `shared`, e as duas consumidoras são páginas — a camada
// estritamente abaixo das duas é esta.
import { Link } from 'react-router-dom'

import { useAuthContext } from '@estrelinha/auth'

import { useAuthUiStore } from '@/features/auth'

export interface OrderAccessRefusalProps {
  /** Para onde voltar depois de entrar com o código. Ausente, o overlay abre sem destino. */
  returnTo?: string
  /**
   * **Erro de rede e pedido inexistente dizem coisas diferentes**, e o hook os mantém distintos:
   * erro rejeita, pedido que não existe resolve com ausência. Fundir os dois mandaria quem só
   * perdeu a conexão a provar que o pedido é dela.
   */
  isError: boolean
}

const OrderAccessRefusal = ({ returnTo, isError }: OrderAccessRefusalProps) => {
  // Feature 49: a convidada chega aqui SEM sessão. A tela precisa saber disso para oferecer o
  // caminho que funciona para ela — o código por e-mail — em vez de mandá-la a uma conta em que
  // ela nunca entrou.
  const { user } = useAuthContext()
  const openAuth = useAuthUiStore((s) => s.open)

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-estrelinha-ink">
        {isError ? 'Não conseguimos abrir este pedido' : 'Pedido não encontrado'}
      </h1>
      {/* Feature 49: sem sessão, "veja em Minha conta" é um conselho que não funciona — a conta
          da convidada existe, mas ela nunca entrou nela. O caminho honesto é o código por
          e-mail, que é como a loja identifica qualquer pessoa. */}
      <p className="max-w-md text-estrelinha-ink-soft">
        {isError
          ? 'Tente novamente em alguns instantes. Seus pedidos ficam guardados em Minha conta.'
          : user
            ? 'Confira o link ou veja a lista completa em Minha conta.'
            : 'O acesso a este pedido pode ter expirado. Entre com o código enviado para o seu e-mail para ver seus pedidos.'}
      </p>
      {user || isError ? (
        <Link
          to="/conta"
          className="rounded-sm border-2 border-estrelinha-ink px-7 py-4 font-heading text-[17px] font-semibold text-estrelinha-ink transition-all hover:scale-[1.02]"
        >
          Ir para Minha conta
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => openAuth({ returnTo })}
          className="min-h-11 rounded-sm border-2 border-estrelinha-ink px-7 py-4 font-heading text-[17px] font-semibold text-estrelinha-ink transition-all hover:scale-[1.02]"
        >
          Entrar com código
        </button>
      )}
    </div>
  )
}

export default OrderAccessRefusal
