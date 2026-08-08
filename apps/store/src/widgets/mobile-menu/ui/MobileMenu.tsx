import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, Heart, Info, Package, Search, User, X } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@estrelinha/ui/sheet'
import { NanitaWordmark } from '@/shared/ui/brand'
import { useAuthContext } from '@estrelinha/auth'
import type { MenuEntry } from '@estrelinha/core/menu'
import { useMenu, useMenuUiStore } from '@/entities/category'
import { useSearchUiStore } from '@/features/search'
import { useAuthUiStore } from '@/features/auth'

/**
 * O menu do celular — board "Mobile Menu Open - v3". **Folha de tela cheia**, não acordeão.
 *
 * O que havia antes era um `AnimatePresence` de 80 linhas dentro do `Header`, empurrando a lista de
 * categorias para baixo da barra de 64px. Três problemas que a folha resolve: a lista competia com o
 * conteúdo da página por espaço vertical, os atalhos de conta/favoritos/pedidos não caberam em lugar
 * nenhum, e o topo da tela — onde o polegar não chega — era onde tudo acontecia.
 *
 * ~90% dos acessos da loja vêm de celular, então esta é a navegação principal, não a versão reduzida.
 */

/** Rótulo dos atalhos, com o mesmo alvo mínimo de 44px das abas da `MobileNav`. */
const CHIP =
  'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-pill bg-estrelinha-ground-deep px-3 text-[13px] font-semibold text-estrelinha-primary'

const ROW =
  'flex w-full items-center justify-between gap-3 border-b border-estrelinha-line py-3 text-left'

const MobileMenu = () => {
  const open = useMenuUiStore((s) => s.open)
  const closeMenu = useMenuUiStore((s) => s.closeMenu)
  const setMenuOpen = useMenuUiStore((s) => s.setMenuOpen)
  const openSearch = useSearchUiStore((s) => s.openSearch)
  const openAuth = useAuthUiStore((s) => s.open)
  const { user } = useAuthContext()
  const { entries } = useMenu()

  /**
   * Um acordeão aberto por vez.
   *
   * Com quatro universos de 5–7 subcategorias cada, permitir dois abertos põe os atalhos e a faixa
   * promo abaixo de duas telas de scroll — e eles são o motivo de a folha existir.
   */
  const [expandedId, setExpandedId] = useState<string | null>(null)

  /** Todo caminho que leva a outra superfície fecha a folha primeiro: duas camadas abertas no
      celular deixam a cliente sem saber o que o "voltar" está fechando. */
  const leaveTo = (action?: () => void) => {
    closeMenu()
    action?.()
  }

  const promo = entries.find((e) => e.promo !== null)?.promo ?? null

  return (
    <Sheet open={open} onOpenChange={setMenuOpen}>
      <SheetContent
        side="left"
        /* `hideClose`: o X do `SheetContent` é de 16px no canto e ficaria EMPILHADO com o do board,
           que tem alvo de 36px e mora na mesma linha do logo. Dois botões de fechar sobrepostos
           apareceram na primeira prova visual em 390px. */
        hideClose
        className="flex w-full max-w-none flex-col gap-0 overflow-y-auto border-0 bg-white p-0 sm:max-w-none"
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">
          Universos da loja, atalhos da sua conta e o destaque da semana.
        </SheetDescription>

        <header className="flex h-16 shrink-0 items-center justify-between px-5">
          <Link to="/" onClick={() => leaveTo()} aria-label="Nanita — página inicial">
            <NanitaWordmark width={128} />
          </Link>
          <button
            type="button"
            onClick={closeMenu}
            aria-label="Fechar menu"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-estrelinha-ground-deep"
          >
            <X className="h-4 w-4 text-estrelinha-ink" strokeWidth={2.2} aria-hidden />
          </button>
        </header>

        {/* Gatilho, não um segundo campo: dois inputs de busca na mesma tela são dois lugares para
            digitar a mesma coisa, e o overlay já é a superfície canônica da busca. */}
        <div className="px-5">
          <button
            type="button"
            onClick={() => leaveTo(openSearch)}
            aria-haspopup="dialog"
            className="flex h-11 w-full items-center gap-2.5 rounded-pill bg-estrelinha-ground-deep px-4 text-left text-sm text-estrelinha-ink-soft"
          >
            <Search className="h-4 w-4 shrink-0 text-estrelinha-primary" strokeWidth={2.2} aria-hidden />
            Buscar pins, coleções...
          </button>
        </div>

        <nav aria-label="Universos" className="flex flex-col px-5 pt-3">
          {entries.map((entry) => (
            <MobileMenuEntry
              key={entry.id}
              entry={entry}
              expanded={expandedId === entry.id}
              onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              onNavigate={() => leaveTo()}
            />
          ))}

          <Link to="/sobre" onClick={() => leaveTo()} className={`${ROW} min-h-11 border-b-0`}>
            <span className="flex items-center gap-2.5">
              <Info className="h-4 w-4 shrink-0 text-estrelinha-ink-soft" strokeWidth={2} aria-hidden />
              <span className="text-base font-medium text-estrelinha-ink-soft">Sobre</span>
            </span>
          </Link>
        </nav>

        <div className="flex gap-2.5 px-5 py-4">
          {/* Deslogada, "Conta" abre o overlay de auth NO LUGAR. Navegar para `/conta` sem sessão
              leva a uma página que renderiza `null`: quem fechasse o overlay ficaria numa tela
              branca sem caminho de volta. Mesma regra da aba da `MobileNav`. */}
          {user ? (
            <Link to="/conta" onClick={() => leaveTo()} className={CHIP}>
              <User className="h-4 w-4" strokeWidth={2} aria-hidden /> Conta
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => leaveTo(() => openAuth({ returnTo: '/conta' }))}
              aria-haspopup="dialog"
              className={CHIP}
            >
              <User className="h-4 w-4" strokeWidth={2} aria-hidden /> Conta
            </button>
          )}
          <Link to="/favoritos" onClick={() => leaveTo()} className={CHIP}>
            <Heart className="h-4 w-4" strokeWidth={2} aria-hidden /> Wishlist
          </Link>
          {user ? (
            <Link to="/conta" onClick={() => leaveTo()} className={CHIP}>
              <Package className="h-4 w-4" strokeWidth={2} aria-hidden /> Pedidos
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => leaveTo(() => openAuth({ returnTo: '/conta' }))}
              aria-haspopup="dialog"
              className={CHIP}
            >
              <Package className="h-4 w-4" strokeWidth={2} aria-hidden /> Pedidos
            </button>
          )}
        </div>

        {/* Promo nula não reserva espaço (MENU-27): a folha simplesmente termina nos atalhos.
            `mb-5` e não `mt-auto` — colada no rodapé ela brigaria com a `MobileNav` do sistema. */}
        {promo && (
          <Link
            to={promo.href}
            onClick={() => leaveTo()}
            data-testid="mobile-menu-promo"
            className="mx-5 mb-5 flex items-center gap-3 rounded-md bg-estrelinha-primary p-3"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-white/20 text-2xl">
              🔥
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-bold text-white">{promo.title}</span>
              {promo.subtitle && (
                <span className="truncate text-xs text-white/85">{promo.subtitle}</span>
              )}
            </span>
          </Link>
        )}
      </SheetContent>
    </Sheet>
  )
}

/** Uma linha de universo: acordeão quando tem filhas, link direto quando não tem (MENU-14). */
const MobileMenuEntry = ({
  entry,
  expanded,
  onToggle,
  onNavigate,
}: {
  entry: MenuEntry
  expanded: boolean
  onToggle: () => void
  onNavigate: () => void
}) => {
  if (entry.children.length === 0) {
    return (
      <Link to={entry.href} onClick={onNavigate} className={`${ROW} min-h-11`}>
        <span className="text-base font-semibold text-estrelinha-ink">{entry.name}</span>
      </Link>
    )
  }

  return (
    <div className="border-b border-estrelinha-line">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex min-h-11 w-full items-center justify-between gap-3 py-3 text-left"
      >
        <span
          className={`text-base font-semibold ${expanded ? 'text-estrelinha-primary' : 'text-estrelinha-ink'}`}
        >
          {entry.name}
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-estrelinha-primary" strokeWidth={2.5} aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-estrelinha-ink" strokeWidth={2} aria-hidden />
        )}
      </button>

      {expanded && (
        <div className="flex flex-col pb-3 pl-3">
          {entry.children.map((child) => (
            <Link
              key={child.id}
              to={`/colecao/${child.slug}`}
              onClick={onNavigate}
              className="min-h-11 py-1.5 text-sm font-medium leading-7 text-estrelinha-ink"
            >
              {child.name}
            </Link>
          ))}
          <Link
            to={entry.href}
            onClick={onNavigate}
            className="min-h-11 py-1.5 text-sm font-semibold leading-7 text-estrelinha-primary"
          >
            Ver todos →
          </Link>
        </div>
      )}
    </div>
  )
}

export default MobileMenu
