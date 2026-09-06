import { useEffect, useState } from 'react'
import { TAP_44 } from '@/shared/lib/touchTarget'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, Heart, Package, Search, User, X } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@estrelinha/ui/sheet'
import { MENU_ICON_COMPONENTS } from '@estrelinha/ui/icons'
import { EstrelinhaSignature } from '@/shared/ui/brand'
import { useAuthContext } from '@estrelinha/auth'
import type { MenuItem, ResolvedMenuBanner } from '@estrelinha/core/menu'
import { renditionSrcSet, renditionUrl } from '@estrelinha/core/media'
import { categoryPath } from '@estrelinha/core/routes'
import { useMenu, useMenuUiStore } from '@/entities/category'
import { useMenuBanners, useMenuPreview } from '@/entities/menu'
import { useSearchUiStore } from '@/features/search'
import { useAuthUiStore } from '@/features/auth'

/**
 * O menu do celular — boards "Mobile Menu Open - v3" e `DGK-0`. **Folha de tela cheia**.
 *
 * ~90% dos acessos da loja vêm de celular, então esta é a navegação principal, não a versão
 * reduzida do desktop. E a curadoria daqui **não é a mesma** do computador (feature 39): a Adri liga
 * cada categoria nas duas superfícies separadamente, e o painel de uma entrada pode mostrar 5
 * subcategorias aqui e 12 lá. Por isso o hook é pedido por nome — `useMenu('mobile')` —, e não
 * derivado de largura de tela.
 *
 * **Nenhum item de menu é escrito neste arquivo** (`NAV-14`). O `<Link to="/sobre">` que morava no
 * fim da lista saiu: o "Sobre" agora é um **item de link** de `store_settings.menu`, semeado pela
 * migration, e a Adri pode movê-lo, trocá-lo ou tirá-lo sem ninguém mexer em código.
 *
 * **A faixa promocional do rodapé saiu junto.** Ela mostrava o promo da *primeira* entrada que
 * tivesse um — a ordem da árvore decidindo o destaque, sem ninguém escolher. O banner agora mora
 * **dentro do acordeão** da entrada a que pertence (`NAV-36`), que é onde a cliente está olhando
 * quando decide para onde ir.
 */

/** Rótulo dos atalhos, com o mesmo alvo mínimo de 44px das abas da `MobileNav`. */
const CHIP =
  'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-pill bg-estrelinha-ground-deep px-3 text-[13px] font-semibold text-estrelinha-primary'

/**
 * Uma linha da folha — 56px de altura, board `DGK-0`.
 *
 * `min-h-[56px]` e não `h-[56px]`: nome de coleção longo embrulha em duas linhas em 390px, e uma
 * altura fixa cortaria a segunda. O piso de 44px do projeto está coberto com folga.
 */
const ROW = 'flex w-full min-h-[56px] items-center gap-3 border-b border-estrelinha-line py-3 text-left'

const MobileMenu = () => {
  const open = useMenuUiStore((s) => s.open)
  const closeMenu = useMenuUiStore((s) => s.closeMenu)
  const setMenuOpen = useMenuUiStore((s) => s.setMenuOpen)
  const openSearch = useSearchUiStore((s) => s.openSearch)
  const openAuth = useAuthUiStore((s) => s.open)
  const { user } = useAuthContext()
  const { items } = useMenu('mobile')

  /**
   * Um acordeão aberto por vez.
   *
   * Com entradas de 5–12 subcategorias cada, permitir dois abertos põe os atalhos abaixo de duas
   * telas de scroll — e eles são parte do motivo de a folha existir.
   */
  const [expandedId, setExpandedId] = useState<string | null>(null)

  /**
   * Os banners do acordeão aberto — resolvidos **uma vez**, aqui, e não dentro de cada linha.
   *
   * Chamar o hook por linha faria a folha resolver o destino de todos os banners de todas as
   * entradas só para desenhar a lista. Como há um acordeão aberto por vez, um id basta.
   */
  const banners = useMenuBanners(expandedId, 'mobile')

  /**
   * `NAV-43` — na prévia, a folha abre sozinha, e no acordeão que o palco pediu.
   *
   * O quadro do celular mede 390: a barra de departamentos é `hidden md:block` e não existe ali, e o
   * único caminho para o menu é este `Sheet`. Sem abrir, a prévia da superfície **celular** — a que
   * responde por ~90% dos acessos da loja — mostraria a home e um ícone de hambúrguer, e a Adri
   * precisaria clicar dentro do iframe a cada mudança para ver o que fez.
   *
   * São dois efeitos e não um: abrir é uma vez (senão o X de dentro da folha reabriria a cada
   * mensagem), e o acordeão acompanha a seleção do painel a cada `open`.
   */
  const { preview, openId: pedidoDoPalco } = useMenuPreview()

  useEffect(() => {
    if (preview) setMenuOpen(true)
  }, [preview, setMenuOpen])

  useEffect(() => {
    if (preview) setExpandedId(pedidoDoPalco)
  }, [preview, pedidoDoPalco])

  /** Todo caminho que leva a outra superfície fecha a folha primeiro: duas camadas abertas no
      celular deixam a cliente sem saber o que o "voltar" está fechando. */
  const leaveTo = (action?: () => void) => {
    closeMenu()
    action?.()
  }

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
          As coleções da loja e os atalhos da sua conta.
        </SheetDescription>

        <header className="flex h-16 shrink-0 items-center justify-between px-5">
          <Link to="/" onClick={() => leaveTo()} aria-label="Uma Estrelinha — página inicial">
            <EstrelinhaSignature width={200} />
          </Link>
          <button
            type="button"
            onClick={closeMenu}
            aria-label="Fechar menu"
            className={`${TAP_44} flex h-9 w-9 items-center justify-center rounded-full bg-estrelinha-ground-deep`}
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
            {/* O texto é o da faixa de busca da board (`5MQ-0`), e não um convite
                a "pins": o produto deixou de ser esse. */}
            O que você está procurando?
          </button>
        </div>

        {/* Lista vazia não deixa `<nav>` vazio no DOM: sem item na superfície do celular, ou com a
            consulta falhando, a folha vai direto da busca para os atalhos. */}
        {items.length > 0 && (
          <nav aria-label="Coleções" className="flex flex-col px-5 pt-3">
            {items.map((item) => (
              <MobileMenuEntry
                key={item.id}
                item={item}
                expanded={expandedId === item.id}
                banners={expandedId === item.id ? banners : []}
                onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                onNavigate={() => leaveTo()}
              />
            ))}
          </nav>
        )}

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
      </SheetContent>
    </Sheet>
  )
}

/**
 * O ícone de uma linha — ou nada.
 *
 * 20px, board `DGK-0`. **`accent-strong` e não `accent`**, e a diferença é medida: a folha é branca,
 * onde `accent` (#B8945F) mede 2,82:1 e **reprova** até como objeto gráfico, que pede 3:1;
 * `accent-strong` (#A07E4C) mede 3,85:1 e passa. Na barra escura do desktop a escolha é a inversa,
 * pelo mesmo motivo. O board pinta os dois com o mesmo token; a paleta não deixa.
 *
 * Ausente é **nada**, não uma vaga vazia (`NAV-18`).
 */
const EntryIcon = ({ icon }: { icon: MenuItem['icon'] }) => {
  if (!icon) return null
  const Icon = MENU_ICON_COMPONENTS[icon]
  return <Icon className="h-5 w-5 shrink-0 text-estrelinha-accent-strong" aria-hidden />
}

/** O banner dentro do acordeão — board `DGK-0`, arte 1:1 de 104px à esquerda do texto. */
const MobileBanner = ({
  banner,
  onNavigate,
}: {
  banner: ResolvedMenuBanner
  onNavigate: () => void
}) => {
  const conteudo = (
    <>
      {/* Sem arte, o card é só o texto — nenhum quadro vazio reservado (`NAV-32`). */}
      {banner.image && (
        /* Vaga quadrada de 104px: 208 cobre DPR 2. É a vaga MENOR da loja depois do avatar do
           carrinho, e a que mais pagava por servir o original — a folha do celular é justamente
           onde a conexão é pior. Ver o comentário gêmeo em `MegaMenu`, com a vaga de 320. */
        <img
          src={renditionUrl(banner.image, 208)}
          srcSet={renditionSrcSet(banner.image, [104, 208]) || undefined}
          sizes="104px"
          alt=""
          loading="lazy"
          className="h-[104px] w-[104px] shrink-0 object-cover"
        />
      )}
      <div className="flex min-w-0 flex-col justify-center gap-1 px-3.5 py-3">
        {banner.badge && (
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-estrelinha-ink-soft">
            {banner.badge}
          </span>
        )}
        {banner.title && (
          <span className="font-display text-[15px] leading-[21px] text-estrelinha-ink">
            {banner.title}
          </span>
        )}
        {banner.subtitle && (
          <span className="text-xs leading-[17px] text-estrelinha-ink-soft">{banner.subtitle}</span>
        )}
      </div>
    </>
  )

  const classe =
    'mb-3.5 flex overflow-hidden rounded-md border border-estrelinha-line bg-estrelinha-ground'

  // Destino de fora da loja não passa pelo React Router (`NAV-11`).
  if (banner.external) {
    return (
      <a
        href={banner.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        data-testid="mobile-menu-banner"
        className={classe}
      >
        {conteudo}
      </a>
    )
  }

  return (
    <Link to={banner.href} onClick={onNavigate} data-testid="mobile-menu-banner" className={classe}>
      {conteudo}
    </Link>
  )
}

/**
 * Uma linha da folha: acordeão quando há painel, link direto quando não há (`NAV-25`).
 *
 * "Há painel" é `hasPanel`, calculado por `menuItems`: subcategoria curada **para o celular** ou
 * banner configurado nesta superfície. Uma entrada com banner e sem filha abre acordeão — o banner é
 * conteúdo suficiente.
 */
const MobileMenuEntry = ({
  item,
  expanded,
  banners,
  onToggle,
  onNavigate,
}: {
  item: MenuItem
  expanded: boolean
  banners: ResolvedMenuBanner[]
  onToggle: () => void
  onNavigate: () => void
}) => {
  const rotulo = (
    <>
      <EntryIcon icon={item.icon} />
      <span className="min-w-0 flex-1 text-base font-semibold text-estrelinha-ink">{item.name}</span>
    </>
  )

  if (item.kind === 'link') {
    // Item de link é link direto — sem painel, sem seta, sem subcategoria, sem banner (`NAV-12`).
    return item.external ? (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={ROW}>
        {rotulo}
      </a>
    ) : (
      <Link to={item.href} onClick={onNavigate} className={ROW}>
        {rotulo}
      </Link>
    )
  }

  if (!item.hasPanel) {
    return (
      <Link to={item.href} onClick={onNavigate} className={ROW}>
        {rotulo}
      </Link>
    )
  }

  return (
    <div className="border-b border-estrelinha-line">
      <button type="button" onClick={onToggle} aria-expanded={expanded} className={`${ROW} border-b-0`}>
        <EntryIcon icon={item.icon} />
        <span
          className={`min-w-0 flex-1 text-base font-semibold ${
            expanded ? 'text-estrelinha-primary' : 'text-estrelinha-ink'
          }`}
        >
          {item.name}
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-estrelinha-primary" strokeWidth={2.5} aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-estrelinha-ink" strokeWidth={2} aria-hidden />
        )}
      </button>

      {expanded && (
        /* A indentação alinha as filhas com o RÓTULO do pai, não com a borda: 22px da vaga do ícone
           mais os 12px de respiro do board. Sem ícone não há vaga, então o recuo cai para o mínimo —
           é a contrapartida de `NAV-18` no arranjo. */
        <div className={`flex flex-col pb-3.5 ${item.icon ? 'pl-[34px]' : 'pl-3'}`}>
          {item.children.map((filha) => (
            <Link
              key={filha.id}
              to={categoryPath(filha.slug, item.slug)}
              onClick={onNavigate}
              className="min-h-11 py-1.5 text-[15px] leading-[32px] text-estrelinha-ink"
            >
              {filha.name}
            </Link>
          ))}

          {/* `NAV-26` — a canônica da entrada. Só quando há filha: numa entrada que abriu o acordeão
              só por causa do banner, "ver tudo em X" duplicaria o toque na própria linha. */}
          {item.children.length > 0 && (
            <Link
              to={item.href}
              onClick={onNavigate}
              className="min-h-11 py-1.5 text-[15px] font-semibold leading-[32px] text-estrelinha-primary"
            >
              ver tudo em {item.name} →
            </Link>
          )}

          {/* O banner mora AQUI, dentro do acordeão da entrada a que pertence (`NAV-36`) — e não uma
              vez só no fim da folha, como o promo antigo fazia. */}
          {banners.map((banner, indice) => (
            <MobileBanner
              key={`${banner.href}-${indice}`}
              banner={banner}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default MobileMenu
