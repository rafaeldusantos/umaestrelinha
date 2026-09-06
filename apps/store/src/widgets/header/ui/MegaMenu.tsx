import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { categoryPath } from '@estrelinha/core/routes'
import {
  menuPanelColumns,
  type MenuCategoryItem,
  type MenuItem,
  type ResolvedMenuBanner,
} from '@estrelinha/core/menu'
import { renditionSrcSet, renditionUrl } from '@estrelinha/core/media'
import { MENU_ICON_COMPONENTS } from '@estrelinha/ui/icons'
import { useMenuBanners, useMenuPreview } from '@/entities/menu'
import { NAV_ITEM, NAV_ITEM_CHEVRON, NAV_ITEM_ICON } from './navItem'

/**
 * A barra de departamentos do desktop e o painel que ela abre — board `DDR-0`.
 *
 * O que decide o conteúdo é `useMenu('desktop')` → `menuItems`, a mesma função que a folha do
 * celular e a tela `/admin/menu` usam. Nada aqui filtra, ordena, trunca ou inventa item: **não há um
 * único item de menu escrito neste arquivo** (`NAV-14`), e é isso que permite a Adri montar a barra
 * inteira sem tocar em código.
 *
 * **Duas superfícies de conteúdo saíram na feature 39**, e nenhuma das duas por acidente:
 *
 * - **A faixa "Em destaque"** (3 produtos automáticos por `is_featured`) — decisão do usuário. Eram
 *   três peças que a Adri não escolhia, não via e não tinha tela onde trocar, e cada painel aberto
 *   custava uma consulta de catálogo. O painel passa a ser 100% curadoria dela.
 * - **O card `menu_promo`**, um retângulo de cor com texto e sem imagem. Virou banner com arte, selo,
 *   título, texto e três tipos de destino — e são até dois por painel, por dispositivo.
 */

/** Espera antes de abrir e antes de fechar, em ms. */
const OPEN_DELAY = 120
const CLOSE_DELAY = 200

/**
 * O ícone de um item — ou nada.
 *
 * **Nada, e não uma vaga vazia** (`NAV-18`): item sem ícone mostra só o nome. Reservar 16px de buraco
 * alinharia os rótulos de uma barra em que metade dos itens não tem desenho, e o alinhamento não
 * vale o vazio.
 *
 * A chave já chegou validada por `menuIconKey` dentro de `menuItems`, então o que existe aqui é
 * sempre desenhável: valor fora do catálogo virou `null` lá atrás (`NAV-19`), e a barra não quebra.
 */
const ItemIcon = ({ icon }: { icon: MenuItem['icon'] }) => {
  if (!icon) return null
  const Icon = MENU_ICON_COMPONENTS[icon]
  return <Icon className={NAV_ITEM_ICON} aria-hidden />
}

/** Um banner do painel — board `DDR-0`, vaga de 320px à direita das colunas. */
const BannerCard = ({
  banner,
  onNavigate,
}: {
  banner: ResolvedMenuBanner
  onNavigate: () => void
}) => {
  const conteudo = (
    <>
      {/* Sem arte, o card é só o bloco de texto — nenhum quadro vazio no lugar da foto (`NAV-32`).
          `alt=""` porque o card inteiro é o link e o título já o nomeia: um `alt` com o mesmo texto
          faria o leitor de tela anunciar a peça duas vezes. */}
      {banner.image && (
        /* A vaga tem 320px de largura fixos (o `w-[320px]` de `classe`, logo abaixo), então a foto é
           pedida NO TAMANHO DELA: 640 cobre DPR 2 e é o que vai no `src`, e o `srcset` oferece as
           duas larguras para o navegador escolher. Sem isto o painel baixava o original de 1024px
           para uma vaga de 320 — e são até dois banners por painel.

           Isto **não** estava aqui quando a 39 foi escrita, e o `design.md` dela registra o porquê:
           `@estrelinha/core/media` é da feature 38, que vivia só na `master`. O merge das duas é o
           que tornou a condição verdadeira. */
        <img
          src={renditionUrl(banner.image, 640)}
          srcSet={renditionSrcSet(banner.image, [320, 640]) || undefined}
          sizes="320px"
          alt=""
          loading="lazy"
          className="h-[190px] w-full shrink-0 object-cover"
        />
      )}
      <div className="flex flex-col gap-1.5 px-[18px] pb-[18px] pt-4">
        {banner.badge && (
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-estrelinha-ink-soft">
            {banner.badge}
          </span>
        )}
        {banner.title && (
          <span className="font-display text-[19px] leading-[26px] text-estrelinha-ink">
            {banner.title}
          </span>
        )}
        {banner.subtitle && (
          <span className="text-[13px] leading-5 text-estrelinha-ink-soft">{banner.subtitle}</span>
        )}
      </div>
    </>
  )

  const classe =
    'flex w-[320px] shrink-0 flex-col overflow-hidden rounded-md border border-estrelinha-line bg-estrelinha-ground transition-shadow hover:shadow-estrelinha-soft'

  // Destino de fora da loja não passa pelo React Router: `<Link to="https://…">` produziria uma
  // navegação interna para um caminho que não existe. Nova aba com `noopener noreferrer` (`NAV-11`).
  if (banner.external) {
    return (
      <a
        href={banner.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className={classe}
      >
        {conteudo}
      </a>
    )
  }

  return (
    <Link to={banner.href} onClick={onNavigate} className={classe}>
      {conteudo}
    </Link>
  )
}

/**
 * O painel aberto — colunas de subcategorias curadas, "ver tudo em X" e até dois banners.
 *
 * Componente separado porque `useMenuBanners` é um hook: chamá-lo por entrada da barra seria chamada
 * condicional, e chamá-lo sempre resolveria destino de produto de todos os painéis para desenhar o
 * topo. Montando só o painel aberto, a consulta acontece uma vez e o React Query a guarda — reabrir
 * o mesmo painel não refaz requisição. É a mesma montagem tardia que a faixa "Em destaque" usava.
 */
const MegaMenuPanel = ({
  item,
  onNavigate,
  onKeepOpen,
}: {
  item: MenuCategoryItem
  onNavigate: () => void
  /** O ponteiro entrou no painel: o fechamento agendado tem de ser cancelado, ou o salto de 1px
      entre a entrada e o painel fecharia justamente o que a cliente foi alcançar. */
  onKeepOpen: () => void
}) => {
  const banners = useMenuBanners(item.id, 'desktop')
  const colunas = menuPanelColumns(item.children)

  return (
    <div
      id="mega-menu-painel"
      data-testid="mega-menu-painel"
      onPointerEnter={onKeepOpen}
      /* `top-full`, e não `top-16`: o bloco de posicionamento é o `<header>`
         (que é `sticky`, logo posicionado) e ele deixou de ter uma altura
         só — no desktop são duas faixas, 84 + 52. Um número cravado
         deixaria o painel atravessando a faixa de departamentos.

         É também o que faz o painel escapar do `overflow-x-auto` da faixa: um
         abspos cujo containing block é ancestral do container de rolagem não é
         clipado por ele. Ver o comentário do `<nav>` no `Header`. */
      className="absolute left-0 right-0 top-full z-40 border-b border-estrelinha-line bg-estrelinha-surface shadow-estrelinha-soft"
    >
      <div className="container flex items-start gap-12 pb-9 pt-8">
        {colunas.length > 0 && (
          <div className="flex w-[480px] shrink-0 flex-col gap-5">
            {/* `NAV-26` — a canônica da entrada, que `menuItems` montou com `categoryHref`. O nome
                da coleção no rótulo é o que diz para onde o link vai sem a cliente ter de adivinhar
                o que "ver tudo" significa neste painel. */}
            <Link
              to={item.href}
              onClick={onNavigate}
              className="text-[15px] font-semibold leading-[18px] text-estrelinha-primary underline decoration-1 underline-offset-4"
            >
              ver tudo em {item.name}
            </Link>

            {/* Colunas de até 8, calculadas por `menuPanelColumns` na ordem da árvore — sem campo de
                configuração de coluna, que seria um dono de layout com buraco a cada filha
                desmarcada (`NAV-24`). */}
            <div className="flex items-start gap-10">
              {colunas.map((coluna, indice) => (
                <div key={indice} className="flex w-[220px] shrink-0 flex-col gap-3.5">
                  {coluna.map(filha => (
                    <Link
                      key={filha.id}
                      to={categoryPath(filha.slug, item.slug)}
                      onClick={onNavigate}
                      className="text-sm leading-[18px] text-estrelinha-ink transition-colors hover:text-estrelinha-primary"
                    >
                      {filha.name}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sem banner, nenhum nó reservado — o painel encolhe (`NAV-35`). */}
        {banners.length > 0 && (
          <div data-testid="mega-menu-banners" className="flex flex-1 justify-end gap-6">
            {banners.map((banner, indice) => (
              <BannerCard key={`${banner.href}-${indice}`} banner={banner} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const MegaMenu = ({ items }: { items: MenuItem[] }) => {
  const [openId, setOpenId] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const triggers = useRef(new Map<string, HTMLAnchorElement>())
  /**
   * O `Esc` fecha e devolve o foco à entrada — e devolver o foco **dispara o `onFocus` dela**, que
   * abre o painel. Sem esta trava o painel reabre no mesmo tique e o teclado nunca consegue fechá-lo.
   * Vale para um único `onFocus`, o que nós mesmos causamos.
   */
  const ignoreNextFocus = useRef(false)
  /**
   * `NAV-43` — na prévia, o palco diz qual painel abrir.
   *
   * Sem isto a Adri teria de passar o mouse **dentro do iframe** para conferir o painel que está
   * editando fora dele: o mouse dela está no editor, e o hover é a única forma de abrir o mega menu.
   *
   * O palco **steera**, não trava: o estado local continua sendo o dono, e um hover dentro da prévia
   * ainda abre outro painel — até a próxima mensagem. Fora do modo prévia este efeito não corre.
   */
  const { preview, openId: pedidoDoPalco } = useMenuPreview()

  useEffect(() => () => clearTimeout(timer.current), [])

  useEffect(() => {
    if (!preview) return
    // Cancela a abertura/fechamento agendado: o pedido do palco é explícito e não pode ser desfeito
    // 200ms depois por um `schedule` que já estava no ar.
    clearTimeout(timer.current)
    setOpenId(pedidoDoPalco)
  }, [preview, pedidoDoPalco])

  /**
   * Abrir e fechar com espera.
   *
   * Sem ela, atravessar a barra abre e fecha um painel por item pelo caminho, e o salto de 1px entre
   * a entrada e o painel fecha o que a cliente estava tentando alcançar.
   */
  const schedule = (id: string | null, delay: number) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpenId(id), delay)
  }

  const achado = items.find(item => item.id === openId) ?? null
  // O estreitamento tem de acontecer FORA do JSX: `achado?.kind === 'category'` no `&&` não estreita
  // o tipo para `MenuCategoryItem` dentro do bloco, e com `strictNullChecks: false` o erro só
  // apareceria no acesso a `children`.
  const aberto = achado && achado.kind === 'category' ? achado : null
  /** Item de link nunca abre painel (`NAV-12`), e categoria sem filha e sem banner também não. */
  const abrePainel = (item: MenuItem): boolean => item.kind === 'category' && item.hasPanel

  const close = (returnFocus: boolean) => {
    clearTimeout(timer.current)
    setOpenId(null)
    // `Esc` devolve o foco à entrada: sem isso o teclado volta ao começo do documento, e quem navega
    // sem mouse perde o lugar na barra a cada painel que fecha.
    if (returnFocus && openId) {
      ignoreNextFocus.current = true
      triggers.current.get(openId)?.focus()
    }
  }

  if (items.length === 0) return null

  return (
    <div
      className="flex h-full min-w-max items-center gap-9"
      onPointerLeave={() => schedule(null, CLOSE_DELAY)}
      onKeyDown={event => {
        if (event.key === 'Escape' && openId) {
          event.stopPropagation()
          close(true)
        }
      }}
    >
      {items.map(item => {
        const conteudo = (
          <>
            <ItemIcon icon={item.icon} />
            {item.name}
            {abrePainel(item) && (
              <ChevronDown className={NAV_ITEM_CHEVRON} strokeWidth={1.8} aria-hidden />
            )}
          </>
        )

        // Item de link para fora da loja: `<a>` de verdade, com nova aba e `noopener noreferrer`.
        // Um `<Link to="https://…">` faria o React Router procurar uma rota com esse nome.
        if (item.kind === 'link' && item.external) {
          return (
            <a
              key={item.id}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`${NAV_ITEM} border-transparent`}
            >
              {conteudo}
            </a>
          )
        }

        return (
          <Link
            key={item.id}
            to={item.href}
            ref={node => {
              if (node) triggers.current.set(item.id, node)
              else triggers.current.delete(item.id)
            }}
            onPointerEnter={() => schedule(abrePainel(item) ? item.id : null, OPEN_DELAY)}
            onFocus={() => {
              if (ignoreNextFocus.current) {
                ignoreNextFocus.current = false
                return
              }
              if (abrePainel(item)) setOpenId(item.id)
            }}
            onClick={() => close(false)}
            aria-expanded={abrePainel(item) ? openId === item.id : undefined}
            aria-controls={abrePainel(item) ? 'mega-menu-painel' : undefined}
            /* A régua de 2px em `accent` marca o item aberto, e o rótulo vai a branco: duas pistas,
               e nenhuma delas só de cor. Ouro como TEXTO aqui mediria 3,26:1 e reprovaria. */
            className={`${NAV_ITEM} ${
              openId === item.id ? 'border-estrelinha-accent text-white' : 'border-transparent'
            }`}
          >
            {conteudo}
          </Link>
        )
      })}

      {aberto && (
        <MegaMenuPanel
          item={aberto}
          onNavigate={() => close(false)}
          onKeepOpen={() => clearTimeout(timer.current)}
        />
      )}
    </div>
  )
}

export default MegaMenu
