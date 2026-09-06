import { Link } from 'react-router-dom'
import { User, Menu, Heart, ChevronLeft, ChevronRight } from 'lucide-react'
import { EstrelinhaSignature } from '@/shared/ui/brand'
import { useWishlistStore } from '@/entities/wishlist/model/wishlistStore'
import { useMenu, useMenuUiStore } from '@/entities/category'
import SearchDropdown from '@/features/search/ui/SearchDropdown'
import { useAuthContext } from '@estrelinha/auth'
import { useAuthUiStore } from '@/features/auth'
import CartButton from '@/widgets/cart-drawer/ui/CartButton'
import { useScrollDirection } from '@/shared/lib/useScrollDirection'
import { useOverflowAffordance } from '@/shared/lib/useOverflowAffordance'
import MegaMenu from './MegaMenu'

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
 * A altura da faixa de departamentos, com UM dono.
 *
 * Ela é escrita em dois lugares — o `<nav>` que rola e a camada de afordância que se desenha por
 * cima dele — e os dois **precisam** concordar: a camada é `absolute bottom-0` contra o `<header>`,
 * então uma altura divergente a deixaria fora de registro com a faixa, sem erro nenhum.
 */
const FAIXA_ALTURA = 'h-[52px]'

/**
 * A seta de rolagem da faixa cheia — `BL-028`.
 *
 * **44px de alvo sem auxiliar**: `h-11 w-11` já É o alvo, então nada de `TAP_44` (que existe para
 * desenho MENOR que 44). O ícone sai `on-primary` sobre `primary` — 8,40:1 — e o anel de foco sai
 * `accent`, que sobre `primary` mede 3,26:1 e passa a régua de 3:1 de elemento gráfico. **Nenhuma
 * cor nova**: os dois tokens já vestem esta faixa.
 *
 * `pointer-events-auto` porque a camada que a contém é `pointer-events-none` — o degradê não pode
 * roubar clique de item nenhum, e a seta é a única coisa clicável ali.
 */
const SETA =
  'pointer-events-auto absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-estrelinha-on-primary transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-estrelinha-accent motion-reduce:transition-none'

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
  // `'desktop'` cravado, e não derivado da largura: a faixa de departamentos é `hidden md:block`,
  // então o que ela desenha é sempre a curadoria do computador. Quem lê a do celular é a folha do
  // `mobile-menu`, que também pede a dela por nome. Escolher por viewport faria o hook responder
  // uma coisa no servidor de prévia e outra no navegador da cliente.
  const { items } = useMenu('desktop')
  const { direction, atTop } = useScrollDirection()
  const hidden = direction === 'down' && !atTop
  // A pista de que a faixa rola (`BL-028`). Em jsdom toda medida de layout é 0, então `antes` e
  // `depois` nascem `false` e NADA disto renderiza — que é também o caso normal da loja, com 3
  // itens. A medida que motiva o recurso é do UAT em navegador, não daqui.
  const faixa = useOverflowAffordance(items.length)

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
        {/* **A MESMA assinatura nas duas larguras** — 202px, a vaga que o board
            `5MC-0` reserva para a marca (202×48). Um elemento só, sem variante
            por breakpoint.

            Antes eram dois: 202px no desktop e 150px no celular. Os 150 ficavam
            ABAIXO do piso de 190 da assinatura, então o componente caía para o
            símbolo — a escada funcionando, e o que o board `6AU-0` desenha.
            Trocado por decisão do produto: a marca da loja é uma só em toda
            superfície de tela, e um símbolo sozinho no topo não diz o nome de
            quem está vendendo.

            **Coube porque foi medido, não porque pareceu caber.** Em 390px o
            `container` tira 32 de padding, os dois ícones do celular somam 80
            (`p-2` + ícone de 20px — o alvo de 44px é `::before` e não ocupa
            largura) e o `gap-4` tira 16: sobram **262px** para a marca. No
            iPhone SE de 375px sobram 247. Os 202 entram com folga nos dois, e
            `touchTarget.test.ts` mais a varredura de scroll horizontal da T33
            continuam guardando o resto da faixa.

            E 202 é melhor que 190 aqui: a 190px a assinatura está no limite do
            traço (1,01px), e abaixo disso a linha vira o cinza do antialias —
            é exatamente por isso que o piso existe.

            O lockup completo segue fora de todo o chrome: o piso dele é 600px, e
            nem a coluna do rodapé (337px) nem a viewport de projeto (390px)
            comportam. Ele é o formato de e-mail e embalagem. */}
        <Link
          to="/"
          /* `min-h-11`: a assinatura mede 33px de altura e o link tinha o
             tamanho dela. É o alvo mais à esquerda da faixa, onde o polegar
             chega torto. */
          className="flex min-h-11 min-w-11 shrink-0 items-center"
          aria-label="Uma Estrelinha — página inicial"
        >
          {/* `onInk`: o fundo passou a ser `primary-strong`. O tom `brand`
              pintaria #283A4A sobre #283A4A — 1,00:1, um header com um vazio no
              lugar da marca. É o mesmo defeito que `Footer.test.tsx` congelou. */}
          <EstrelinhaSignature width={202} tone="onInk" />
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

      {/* A segunda faixa — boards `5N8-0` e `DDR-0`. Só no desktop: no celular o
          caminho para as coleções é a folha de tela cheia do `mobile-menu`, e
          uma barra de departamentos em 390px caberia com três itens e meio.

          O bloco "DEPARTAMENTOS" da board ficou de fora: ele abre um painel de
          todos os departamentos, e nesta loja QUEM é departamento são as
          próprias entradas do menu — cada uma já com o seu painel. Um quinto
          gatilho ao lado delas seria um botão sem destino próprio.

          **Nenhum item de menu é escrito aqui** (`NAV-14`). O `<Link to="/sobre">`
          que morava neste JSX saiu na feature 39: quem põe o "Sobre" na barra é
          a Adri, e ele agora é um **item de link** de `store_settings.menu`,
          semeado pela migration. Um item em código é um item que ela não pode
          tirar, mover nem trocar — e `menuSemItemFixo.test.ts` recusa a volta.

          **Faixa vazia não renderiza** (caso de borda da spec): sem item nenhum
          na superfície, ou com a consulta falhando, o header fica com marca,
          busca e ações em vez de uma barra escura de 52px vazia. */}
      {items.length > 0 && (
        <div className="hidden bg-estrelinha-primary md:block">
          {/* `overflow-x-auto` aqui e `min-w-max` no `MegaMenu` — **NAV-04**, e é a resposta ao
              fim do teto de itens.

              Rolar, e nunca `flex-wrap`: embrulhar em duas linhas ESCONDE o estouro, que é
              justamente o que a dona precisa ver. É a decisão que este repositório já tomou duas
              vezes (o `overflow-x-auto` da prévia do painel, e a regra de mobile do `CLAUDE.md`:
              conteúdo largo rola dentro do próprio container, o `body` nunca).

              O painel do mega menu **não é cortado por este scroll**, e isso não é sorte: ele é
              `position: absolute` e o bloco que o contém é o `<header>` (que é `sticky`, logo
              posicionado). Um abspos cujo containing block é ancestral do container de rolagem não
              é clipado por ele. Pôr `relative` neste `<nav>` ou no `div` de `min-w-max` mudaria o
              containing block e o painel passaria a viver dentro da faixa de 52px — sem erro
              nenhum, com o mega menu virando uma tira ilegível. */}
          <nav
            ref={faixa.ref}
            aria-label="Departamentos"
            /* `scroll-smooth` faz a seta deslizar em vez de saltar, e o par
               `motion-reduce:scroll-auto` desliga isso para quem pediu menos movimento. É por ele
               que `rolar` escreve `scrollLeft` direto, sem `scrollBy({ behavior })`: a decisão de
               animar fica no CSS, num lugar só. */
            className={`container flex ${FAIXA_ALTURA} items-center overflow-x-auto scroll-smooth motion-reduce:scroll-auto`}
          >
            <MegaMenu items={items} />
          </nav>

          {/* A AFORDÂNCIA — `BL-028`. Degradê como pista, seta como alvo.

              **Ela some inteira quando a faixa cabe**, e esse é o caso normal: a loja tem 3 itens
              hoje, e `antes`/`depois` são `false` enquanto `scrollWidth === clientWidth`. Uma seta
              parada numa barra que não rola seria um botão que não faz nada.

              **Não há `relative` em ancestral nenhum, e isso é a parte não óbvia.** Esta camada é
              `absolute` contra o próprio `<header>` (que é `sticky`, logo posicionado) — a mesma
              âncora que o painel do mega menu usa. Pôr `relative` no `div` da faixa "para
              simplificar" mudaria o containing block do painel, e ele passaria a viver dentro dos
              52px — sem erro nenhum, com o mega menu virando uma tira ilegível.

              A camada é `pointer-events-none` para o degradê não roubar clique do item que ele
              cobre; só as setas voltam a receber ponteiro. O `container` interno alinha as pontas
              com as do `<nav>`, que também é `container` (medido no UAT: 80..1360 em 1440). */}
          {(faixa.antes || faixa.depois) && (
            <div
              className={`pointer-events-none absolute inset-x-0 bottom-0 ${FAIXA_ALTURA}`}
              data-testid="faixa-afordancia"
            >
              <div className="container relative h-full">
                {faixa.antes && (
                  <>
                    {/* Degradê a partir da PRÓPRIA cor da faixa, e não uma sombra: sobre um chapado
                        `primary`, qualquer sombra dura viraria uma linha que o board não tem. */}
                    <div
                      aria-hidden
                      data-testid="afordancia-esquerda"
                      className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-estrelinha-primary to-estrelinha-primary/0"
                    />
                    <button
                      type="button"
                      onClick={() => faixa.rolar(-1)}
                      aria-label="Ver os departamentos anteriores"
                      className={`${SETA} left-0`}
                    >
                      <ChevronLeft className="h-5 w-5" strokeWidth={1.8} aria-hidden />
                    </button>
                  </>
                )}
                {faixa.depois && (
                  <>
                    <div
                      aria-hidden
                      data-testid="afordancia-direita"
                      className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-estrelinha-primary to-estrelinha-primary/0"
                    />
                    <button
                      type="button"
                      onClick={() => faixa.rolar(1)}
                      aria-label="Ver mais departamentos"
                      className={`${SETA} right-0`}
                    >
                      <ChevronRight className="h-5 w-5" strokeWidth={1.8} aria-hidden />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  )
}

export default Header
