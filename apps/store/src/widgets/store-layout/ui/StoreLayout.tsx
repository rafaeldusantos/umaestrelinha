import { Outlet, useLocation } from 'react-router-dom'
import { AuthOverlay } from '@/features/auth'
import { SearchOverlay } from '@/features/search'
import { BOTTOM_BAR_RESERVE, ownsBottomBar } from '@/shared/lib/storeChrome'
import Header from '@/widgets/header/ui/Header'
import CartDrawer from '@/widgets/cart-drawer/ui/CartDrawer'
import Footer from '@/widgets/footer/ui/Footer'
import MobileNav from '@/widgets/mobile-nav/ui/MobileNav'
import { MobileMenu } from '@/widgets/mobile-menu'
import WhatsAppFloat from '@/widgets/whatsapp-float/ui/WhatsAppFloat'

const StoreLayout = () => {
  // Uma barra de rodapé por vez: onde a página traz a própria (a de compra, na página do produto),
  // as abas saem de cena em vez de empilhar. Empilhadas somavam 133px de rodapé — com o header, 30%
  // de um iPhone SE. É a mesma decisão que já tirou o checkout deste layout (ver `App.tsx`).
  const pageOwnsBar = ownsBottomBar(useLocation().pathname)

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <Outlet />
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
      {/* Montada aqui, e não no header: o gatilho está em quatro lugares (header, nav mobile, toast de
          "adicionado", checkout) e o painel precisa ser um só. */}
      <CartDrawer />
      {/* Mesma razão: a busca é aberta pela aba do `MobileNav` e pelo menu do header. */}
      <SearchOverlay />
      {/* E de novo a mesma: o gatilho é o botão de menu do header, mas a folha é de tela cheia e não
          pode nascer dentro de um `<header>` `sticky` com `z-50` — ela precisa da pilha do layout.
          Vale mais ainda agora que o header carrega um `transform`: transform cria containing block,
          então um `position: fixed` ali dentro passaria a se medir pelo header, não pela viewport. */}
      <MobileMenu />
      <AuthOverlay />
    </div>
  )
}

export default StoreLayout
