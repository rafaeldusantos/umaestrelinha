import { Link } from 'react-router-dom'
import { User, Menu, Heart } from 'lucide-react'
import { EstrelinhaSignature } from '@/shared/ui/brand'
import { useWishlistStore } from '@/entities/wishlist/model/wishlistStore'
import { useMenu, useMenuUiStore } from '@/entities/category'
import SearchDropdown from '@/features/search/ui/SearchDropdown'
import { useAuthContext } from '@estrelinha/auth'
import { useAuthUiStore } from '@/features/auth'
import CartButton from '@/widgets/cart-drawer/ui/CartButton'
import { useScrollDirection } from '@/shared/lib/useScrollDirection'
import MegaMenu from './MegaMenu'

/**
 * No celular o header ficou com **logo, favoritos e menu** — nada mais.
 *
 * Início, Busca, Carrinho e Conta são as quatro abas do `MobileNav`, ao alcance do polegar; repetir
 * os mesmos alvos no topo, onde a mão não chega, gastava metade da faixa de 390px com botões que
 * ninguém usa e deixava dois lugares para consertar cada comportamento. Favoritos fica porque não é
 * aba, e o menu porque é o único caminho para as coleções.
 *
 * As duas superfícies de menu vivem fora daqui (feature 16): `MegaMenu` no desktop e o widget
 * `mobile-menu` — uma folha de tela cheia — no celular. O que existia neste arquivo era um
 * `AnimatePresence` de 80 linhas com a lista de categorias e `categories.slice(0, 4)` na barra do
 * topo. O `slice` de uma lista chapada não sabe o que é raiz e o que é filha: com a árvore real
 * (`Bottons › {Academia, Anime, …}`) a barra dizia "Bottons · Academia · Anime · K-Pop". Agora quem
 * decide é `useMenu`, e quem cura é a tela `/admin/menu`.
 *
 * **No celular ele se recolhe ao rolar para baixo e volta ao rolar para cima** — o padrão de
 * Mercado Livre, Shopee, Amazon e ASOS. Motivo: com a barra de compra da página do produto, a
 * moldura fixa somava 197px, 30% de um iPhone SE. No desktop ele nunca se move: tem mega-menu e
 * busca no topo, e ali não existe o problema de alcance do polegar.
 */
const Header = () => {
  const openMenu = useMenuUiStore((s) => s.openMenu)
  const menuOpen = useMenuUiStore((s) => s.open)
  const wishlistCount = useWishlistStore((s) => s.count())
  const { user, customer } = useAuthContext()
  const openAuth = useAuthUiStore((s) => s.open)
  const { entries } = useMenu()
  const { direction, atTop } = useScrollDirection()
  const hidden = direction === 'down' && !atTop

  const initials = user ? (customer?.name || user.email || '?').slice(0, 2).toUpperCase() : null

  return (
    <header
      /* `sticky` + `translate` é a técnica, e não `position: fixed` nem desmontar o elemento: assim
         ele continua ocupando os 64px no fluxo, e esconder/mostrar **não causa reflow**. Tirá-lo do
         fluxo faria a página inteira pular a cada troca de direção de rolagem.

         `focus-within` não é preciosismo: um header traduzido para fora da tela mantém os links
         focáveis, e sem isso o `Tab` levaria o foco para controles invisíveis.

         `md:translate-y-0` trava o desktop — a regra é só do celular. */
      /* Branco chapado sobre o chão Papel — o artboard 23 não usa véu nem blur
         no topo. Com o chão deixando de ser branco, o header branco passou a se
         destacar sozinho; o blur existia para separar de um fundo da mesma cor. */
      className={`sticky top-0 z-50 h-16 border-b border-estrelinha-line bg-white transition-transform duration-200 focus-within:translate-y-0 motion-reduce:transition-none md:translate-y-0 ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      <div className="container flex h-full items-center justify-between gap-6">
        {/* A escada: 202px no desktop — a vaga que o board `5MC-0` reserva para
            a marca (202×48) —, e 150px no celular, que fica ABAIXO do piso de
            190 e por isso rende o símbolo, na mesma altura. Não é acidente: a
            190px a assinatura já está no limite (1,01px de traço), e a 150px
            teria 0,80px — a linha viraria cinza de antialias. O board mobile
            (`6AU-0`) desenha exatamente isso: símbolo pequeno ao lado do nome.

            O lockup completo não aparece em lugar nenhum do chrome: o piso dele
            é 600px, e nem a coluna do rodapé (337px) nem a viewport de projeto
            (390px) comportam. Ele é o formato de e-mail e embalagem. */}
        <Link
          to="/"
          className="flex shrink-0 items-center"
          aria-label="Uma Estrelinha — página inicial"
        >
          <EstrelinhaSignature width={150} className="md:hidden" />
          <EstrelinhaSignature width={202} className="hidden md:block" />
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {/* Falha de consulta devolve `entries: []` e o `MegaMenu` não renderiza nada — a barra fica
              com os dois itens fixos em vez de quebrar (MENU-04). */}
          <MegaMenu entries={entries} />
          <Link
            to="/sobre"
            className="text-[15px] font-medium text-estrelinha-ink transition-colors hover:text-estrelinha-primary"
          >
            Sobre
          </Link>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden w-48 md:block lg:w-56">
            <SearchDropdown />
          </div>
          <Link
            to="/favoritos"
            className="relative rounded-full p-2 transition-colors before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] hover:bg-estrelinha-ground-deep"
            aria-label="Favoritos"
          >
            <Heart className="h-5 w-5 text-estrelinha-ink" strokeWidth={1.8} />
            {wishlistCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-estrelinha-primary text-[10px] font-bold text-white">
                {wishlistCount}
              </span>
            )}
          </Link>
          {user ? (
            <Link
              to="/conta"
              className="relative hidden rounded-full p-2 transition-colors before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] hover:bg-estrelinha-ground-deep md:flex"
              aria-label="Minha conta"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-estrelinha-primary text-[9px] font-bold text-white">
                {initials}
              </span>
            </Link>
          ) : (
            <button
              onClick={() => openAuth()}
              className="relative hidden rounded-full p-2 transition-colors before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] hover:bg-estrelinha-ground-deep md:flex"
              aria-label="Entrar"
            >
              <User className="h-5 w-5 text-estrelinha-ink" strokeWidth={1.8} />
            </button>
          )}
          {/* Carrinho só no desktop: no celular a aba do `MobileNav` é o gatilho da gaveta, e o
              mesmo ícone com o mesmo badge em duas barras na mesma tela é ruído — a de baixo está
              ao alcance do polegar, a de cima não. */}
          <div className="hidden md:block">
            <CartButton />
          </div>
          {/* O botão só ABRE. Quem fecha é o X de dentro da folha, e o próprio `Sheet` no toque fora
              — um gatilho que alterna sob uma folha de tela cheia é um botão invisível. */}
          <button
            className="relative rounded-full p-2 transition-colors before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] hover:bg-estrelinha-ground-deep md:hidden"
            onClick={openMenu}
            aria-label="Abrir menu"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
          >
            <Menu className="h-5 w-5 text-estrelinha-ink" />
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
