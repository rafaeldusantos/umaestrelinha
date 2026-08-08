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
import { NAV_ITEM } from './navItem'

/**
 * Alvo de toque dos ícones da faixa escura.
 *
 * O `before:` de 44×44 continua sendo o alvo real — o disco visível tem 36px, e
 * é o pseudo-elemento que garante os 44px que o `CLAUDE.md` exige sem inflar o
 * desenho. O véu de hover mudou de `ground-deep` para branco a 10%: sobre
 * `primary-strong`, um hover em tom claro chapado apagaria o ícone.
 */
const ICON_BUTTON =
  "relative flex items-center rounded-full p-2 transition-colors before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] hover:bg-white/10"

/** Contador — `accent` com texto `ink` (4,78:1). A board (`5N6-0`) põe
 *  `primary-strong` ali, que mede 4,21:1 e reprova em AA; ver
 *  `contrast.test.ts`. */
const BADGE =
  'absolute -right-0.5 -top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-estrelinha-accent text-[10px] font-bold text-estrelinha-ink'

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
 *
 * ## O chrome da Uma Estrelinha — boards `5MC-0` (desktop) e `6AU-0` (mobile)
 *
 * **A moldura do topo é ESCURA.** Os dois boards põem o header em
 * `primary-strong` (`5MD-0`, `6B6-0`) com ícone e rótulo em `on-primary`, e o
 * desktop acrescenta uma **segunda faixa** em `primary` (`5N8-0`) com os
 * departamentos em caixa alta. Não é enfeite: com o chão da loja em `ground`
 * (que deixou de ser branco), um header branco não se separa mais de nada —
 * era o `border-b` sozinho segurando a divisão.
 *
 * A segunda faixa é `hidden md:flex`. **No celular a moldura continua com 64px
 * de uma faixa só** — a board mobile desenha 112px porque põe o campo de busca
 * dentro do header, e esta loja tem a busca na aba do `MobileNav`, ao alcance
 * do polegar. Adotar as duas coisas custaria 48px do orçamento de 64px que a
 * regra da barra única existe para proteger.
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
      /* `primary-strong` chapado — `5MD-0` e `6B6-0`. Sem véu, sem blur e sem
         `border-b`: a faixa escura já se separa do chão `ground` por si, e o
         que fecha a moldura no desktop é a segunda faixa, em `primary`. */
      className={`sticky top-0 z-50 bg-estrelinha-primary-strong transition-transform duration-200 focus-within:translate-y-0 motion-reduce:transition-none md:translate-y-0 ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      <div className="container flex h-16 items-center justify-between gap-4 md:h-[84px] md:gap-8">
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
          {/* `onInk`: o fundo passou a ser `primary-strong`. O tom `brand`
              pintaria #283A4A sobre #283A4A — 1,00:1, um header com um vazio no
              lugar da marca. É o mesmo defeito que `Footer.test.tsx` congelou. */}
          <EstrelinhaSignature width={150} tone="onInk" className="md:hidden" />
          <EstrelinhaSignature width={202} tone="onInk" className="hidden md:block" />
        </Link>

        {/* A busca é o centro da faixa no board (`5MN-0`, 680×48): `flex-1` com
            teto de 680, e não uma caixinha de 192px encostada nos ícones. */}
        <div className="hidden max-w-[680px] flex-1 md:block">
          <SearchDropdown />
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-4">
          <Link to="/favoritos" className={ICON_BUTTON} aria-label="Favoritos">
            <Heart className="h-5 w-5 text-estrelinha-on-primary" strokeWidth={1.8} />
            {wishlistCount > 0 && <span className={BADGE}>{wishlistCount}</span>}
          </Link>
          {user ? (
            <Link to="/conta" className={`${ICON_BUTTON} hidden md:flex`} aria-label="Minha conta">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-estrelinha-accent text-[9px] font-bold text-estrelinha-ink">
                {initials}
              </span>
            </Link>
          ) : (
            <button
              onClick={() => openAuth()}
              className={`${ICON_BUTTON} hidden md:flex`}
              aria-label="Entrar"
            >
              <User className="h-5 w-5 text-estrelinha-on-primary" strokeWidth={1.8} />
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
            className={`${ICON_BUTTON} md:hidden`}
            onClick={openMenu}
            aria-label="Abrir menu"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
          >
            <Menu className="h-5 w-5 text-estrelinha-on-primary" />
          </button>
        </div>
      </div>

      {/* A segunda faixa — `5N8-0`. Só no desktop: no celular o caminho para as
          coleções é a folha de tela cheia do `mobile-menu`, e uma barra de
          departamentos em 390px caberia com três itens e meio.

          O bloco "DEPARTAMENTOS" da board ficou de fora: ele abre um painel de
          todos os departamentos, e nesta loja QUEM é departamento são as
          próprias entradas de `menuEntries` — cada uma já com o seu painel. Um
          quinto gatilho ao lado delas seria um botão sem destino próprio. */}
      <div className="hidden bg-estrelinha-primary md:block">
        <nav aria-label="Departamentos" className="container flex h-[52px] items-center gap-9">
          {/* Falha de consulta devolve `entries: []` e o `MegaMenu` não renderiza nada — a barra
              fica com o item fixo em vez de quebrar (MENU-04). */}
          <MegaMenu entries={entries} />
          <Link to="/sobre" className={`${NAV_ITEM} border-transparent`}>
            Sobre
          </Link>
        </nav>
      </div>
    </header>
  )
}

export default Header
