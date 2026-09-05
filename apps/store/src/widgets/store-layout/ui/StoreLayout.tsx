import { lazy, Suspense, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useCartUiStore } from '@/entities/cart/model/cartUiStore'
import { useMenuUiStore } from '@/entities/category/model/menuUiStore'
import { useAuthUiStore } from '@/features/auth/model/authUiStore'
import { useSearchUiStore } from '@/features/search/model/searchUiStore'
import { BOTTOM_BAR_RESERVE, ownsBottomBar } from '@/shared/lib/storeChrome'
import RouteFallback from '@/shared/ui/RouteFallback'
import Header from '@/widgets/header/ui/Header'
import Footer from '@/widgets/footer/ui/Footer'
import MobileNav from '@/widgets/mobile-nav/ui/MobileNav'
import WhatsAppFloat from '@/widgets/whatsapp-float/ui/WhatsAppFloat'

/*
 * `PRF-11` — **os overlays de gesto não entram no chunk inicial**.
 *
 * Os quatro painéis abaixo ficavam montados em toda rota da loja, desde o primeiro pixel: a gaveta
 * do carrinho, a busca em tela cheia, a folha de menu do celular e o login por OTP. Nenhum deles
 * aparece sem alguém tocar em alguma coisa, e o login sozinho arrasta sete passos de formulário.
 *
 * **Os imports são PROFUNDOS de propósito.** O barrel (`@/features/search`, `@/features/auth`,
 * `@/widgets/mobile-menu`) reexporta o componente E a store de UI; importar a store pelo barrel faria
 * o Rollup ver o mesmo módulo em import estático e dinâmico, e nesse caso ele resolve pelo
 * **estático** — o chunk voltaria inteiro para a entrada, sem ninguém notar. Aqui a store vem do
 * caminho dela e o componente vem do dele.
 */
const CartDrawer = lazy(() => import('@/widgets/cart-drawer/ui/CartDrawer'))
const SearchOverlay = lazy(() => import('@/features/search/ui/SearchOverlay'))
const MobileMenu = lazy(() => import('@/widgets/mobile-menu/ui/MobileMenu'))
const AuthOverlay = lazy(() => import('@/features/auth/ui/AuthOverlay'))

/**
 * "Já foi aberto alguma vez?" — o latch que monta o overlay sob demanda **e não o desmonta depois**.
 *
 * Desmontar ao fechar seria o desenho óbvio e estaria errado: `Sheet`, `Dialog` e `Drawer` animam a
 * SAÍDA, e um componente que some no mesmo quadro em que `open` vira `false` corta a animação pela
 * metade. Uma vez baixado, o chunk já está no navegador — mantê-lo montado não custa rede nenhuma.
 */
const useAbertoAlgumaVez = (aberto: boolean): boolean => {
  const jaAbriu = useRef(false)
  if (aberto) jaAbriu.current = true
  return jaAbriu.current
}

const StoreLayout = () => {
  // Uma barra de rodapé por vez: onde a página traz a própria (a de compra, na página do produto),
  // as abas saem de cena em vez de empilhar. Empilhadas somavam 133px de rodapé — com o header, 30%
  // de um iPhone SE. É a mesma decisão que já tirou o checkout deste layout (ver `App.tsx`).
  const pageOwnsBar = ownsBottomBar(useLocation().pathname)

  const mostrarCarrinho = useAbertoAlgumaVez(useCartUiStore(s => s.open))
  const mostrarBusca = useAbertoAlgumaVez(useSearchUiStore(s => s.open))
  const mostrarMenu = useAbertoAlgumaVez(useMenuUiStore(s => s.open))
  const mostrarAuth = useAbertoAlgumaVez(useAuthUiStore(s => s.isOpen))

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        {/* O `Suspense` da PÁGINA fica aqui, e não em volta das `Routes`: o header e o rodapé já
            estão na tela e são os mesmos em toda rota. Trocá-los pelo fallback enquanto o chunk baixa
            faria a moldura piscar a cada navegação — o deslocamento de layout que `PRF-10` proíbe. */}
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      {/* A reserva da barra fixa mora AQUI, depois do `Footer`, porque é ele o fim do documento.
          Era um `pb` no `main`, o que reservava espaço no lugar errado: ao rolar até o fim de
          verdade, a barra cobria a última faixa do rodapé, e o `pb-8` dele não dava conta de 64px.
          Como as duas barras têm a MESMA altura (`BOTTOM_BAR_H`), a reserva é incondicional — há
          sempre exatamente uma barra ali, muda só qual. */}
      {/* `style`, e não uma classe `h-[calc(...)]`: a altura vem de uma constante, e o JIT do
          Tailwind só varre classe literal — interpolada, a regra não seria gerada. */}
      <div
        aria-hidden
        data-testid="bottom-bar-reserve"
        className="shrink-0 md:hidden"
        style={{ height: BOTTOM_BAR_RESERVE }}
      />
      {!pageOwnsBar && <MobileNav />}
      <WhatsAppFloat />
      {/* Os quatro overlays, montados na PRIMEIRA abertura e não antes. O fallback é `null`: enquanto
          o chunk baixa não existe painel para desenhar, e um esqueleto aqui seria uma camada
          fantasma por cima da loja.

          Montada aqui, e não no header: o gatilho da gaveta está em quatro lugares (header, nav
          mobile, toast de "adicionado", checkout) e o painel precisa ser um só. Vale igual para a
          busca (aba do `MobileNav` e menu do header) e para a folha de menu, que é de tela cheia e
          não pode nascer dentro de um `<header>` `sticky` com `z-50` — ela precisa da pilha do
          layout, ainda mais agora que o header carrega um `transform`, que cria containing block. */}
      <Suspense fallback={null}>
        {mostrarCarrinho && <CartDrawer />}
        {mostrarBusca && <SearchOverlay />}
        {mostrarMenu && <MobileMenu />}
        {mostrarAuth && <AuthOverlay />}
      </Suspense>
    </div>
  )
}

export default StoreLayout
