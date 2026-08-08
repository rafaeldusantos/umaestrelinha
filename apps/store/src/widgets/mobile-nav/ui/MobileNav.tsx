import { Link, useLocation } from 'react-router-dom'
import { Home, Search, ShoppingCart, User } from 'lucide-react'
import { useAuthContext } from '@estrelinha/auth'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { useCartUiStore } from '@/entities/cart/model/cartUiStore'
import { useSearchUiStore } from '@/features/search'
import { useAuthUiStore } from '@/features/auth'

/**
 * A barra de abas do celular — a navegação principal da loja, já que ~90% dos acessos vêm de mobile.
 *
 * As quatro abas são **ações**, não necessariamente rotas, e cada uma abre a superfície canônica do
 * seu assunto — é isso que evita ter dois lugares para consertar a mesma regra:
 *
 * - **Início** navega (é uma página de verdade).
 * - **Busca** abre a busca em tela cheia (board "Mobile Search Open - v3"). Navegar para `/busca`
 *   tirava a cliente da página em que ela estava — e a rota, com o campo vazio e sem histórico, era
 *   pior que o overlay em tudo. `/busca?q=` continua sendo o destino do "Ver todos".
 * - **Carrinho** abre a gaveta, a única superfície de sacola da loja.
 * - **Conta**, deslogada, abre o overlay de auth **no lugar**. Ir para `/conta` sem sessão levava a
 *   uma página que renderiza `null`: quem fechasse o overlay ficava numa tela branca, sem header e
 *   sem caminho de volta. Logada, navega normalmente.
 */

// Alvo de toque: `h-full` numa barra de 64px passa dos 44px mínimos, e a largura mínima impede que
// "Carrinho" (a palavra mais longa) empurre as vizinhas para fora do lugar.
const TAB_CLASS =
  'relative flex h-full min-w-[68px] flex-col items-center justify-center gap-0.5 px-2 transition-colors'

const MobileNav = () => {
  const location = useLocation()

  const uniqueItems = useCartStore((s) => s.uniqueItemsCount())
  const openCart = useCartUiStore((s) => s.openCart)
  const cartOpen = useCartUiStore((s) => s.open)
  const openSearch = useSearchUiStore((s) => s.openSearch)
  const searchOpen = useSearchUiStore((s) => s.open)
  const openAuth = useAuthUiStore((s) => s.open)
  const { user } = useAuthContext()

  const onHome = location.pathname === '/'
  const onAccount = location.pathname === '/conta'
  const onSearch = searchOpen || location.pathname === '/busca'

  // Artboard 23, "Mobile Bottom Nav": a aba ativa é Carmim e a inativa é
  // Carbono — e a diferença não é só de cor. O ícone ativo vem PREENCHIDO e o
  // rótulo em 600; os inativos são contorno e 500. Cor sozinha não sustenta a
  // hierarquia em preto e branco, que é a última linha do checklist do
  // DESIGN.md.
  const tint = (active: boolean) =>
    active ? 'text-nanita-jam font-semibold' : 'text-nanita-plum font-medium'

  const iconProps = (active: boolean) => ({
    className: 'h-5 w-5',
    strokeWidth: active ? 2.2 : 1.8,
    fill: active ? 'currentColor' : 'none',
    'aria-hidden': true as const,
  })

  return (
    <nav
      aria-label="Navegação principal"
      /* `pb-[env(safe-area-inset-bottom)]` + altura do conteúdo em vez de `h-16` fixo: no iPhone com
         indicador de home, uma barra de 64px cravada no `bottom-0` fica com a última linha de texto
         debaixo do indicador, e o toque na aba do meio abre o gesto do sistema. O `main` do
         `StoreLayout` reserva o mesmo `calc()`. */
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-nanita-border bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="flex h-16 items-center justify-around">
        {/* Início e Conta-logada seguem sendo `Link`: são rotas de verdade, e um `<button>` com
            `navigate()` tiraria o "abrir em nova aba" e o href que o navegador mostra. */}
        <Link to="/" className={`${TAB_CLASS} ${tint(onHome)}`} aria-current={onHome ? 'page' : undefined}>
          <Home {...iconProps(onHome)} />
          <span className="text-[10px]">Início</span>
        </Link>

        <button
          type="button"
          onClick={openSearch}
          className={`${TAB_CLASS} ${tint(onSearch)}`}
          aria-haspopup="dialog"
          aria-expanded={searchOpen}
        >
          <Search {...iconProps(onSearch)} />
          <span className="text-[10px]">Busca</span>
        </button>

        <button
          type="button"
          onClick={openCart}
          className={`${TAB_CLASS} ${tint(cartOpen)}`}
          aria-label={
            uniqueItems > 0
              ? `Carrinho, ${uniqueItems} ${uniqueItems === 1 ? 'item' : 'itens'}`
              : 'Carrinho'
          }
          aria-haspopup="dialog"
          aria-expanded={cartOpen}
        >
          <span className="relative">
            <ShoppingCart {...iconProps(cartOpen)} />
            {uniqueItems > 0 && (
              <span
                aria-hidden
                className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-nanita-jam px-1 text-[9px] font-bold text-white"
              >
                {uniqueItems}
              </span>
            )}
          </span>
          <span className="text-[10px]">Carrinho</span>
        </button>

        {user ? (
          <Link
            to="/conta"
            className={`${TAB_CLASS} ${tint(onAccount)}`}
            aria-label="Minha conta"
            aria-current={onAccount ? 'page' : undefined}
          >
            <User {...iconProps(onAccount)} />
            <span className="text-[10px]">Conta</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => openAuth({ returnTo: '/conta' })}
            className={`${TAB_CLASS} ${tint(false)}`}
            aria-label="Entrar"
            aria-haspopup="dialog"
          >
            <User {...iconProps(false)} />
            <span className="text-[10px]">Conta</span>
          </button>
        )}
      </div>
    </nav>
  )
}

export default MobileNav
