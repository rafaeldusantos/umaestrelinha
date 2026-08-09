import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice } from '@estrelinha/core/formatters'
import { categoryPath, productPath } from '@estrelinha/core/routes'
import type { MenuEntry } from '@estrelinha/core/menu'
import { useProducts } from '@/entities/product'
import { EstrelinhaSymbol } from '@/shared/ui/brand'
import { NAV_ITEM } from './navItem'

/**
 * A barra de universos do desktop e o painel que ela abre — board "Desktop Mega Menu Open - v3".
 *
 * O board é da era v3 pop-culture (`Lilita One`, `#1A0F2E`, `#FF3B7F`). A **estrutura e o espaçamento**
 * dele são a entrega; a paleta e a tipografia vêm do tema da loja, porque o `DESIGN.md` já aposentou as
 * três coisas. A coluna "Por estilo" do board ficou fora do escopo (eixo transversal, sem modelo de
 * dado) e os 160px dela sobraram para a faixa "Em destaque", que segue com 3 cards.
 *
 * O que decide o conteúdo é `useMenu` → `menuEntries`, a mesma função que a tela `/admin/menu` usa
 * para prometer. Antes, aqui, era `categories.slice(0, 4)` de uma lista chapada — e é assim que a
 * barra passou a dizer "Bottons · Academia · Anime · K-Pop".
 */

/** Espera antes de abrir e antes de fechar, em ms. */
const OPEN_DELAY = 120
const CLOSE_DELAY = 200

/** Quantos produtos em destaque a faixa "Em destaque" mostra. */
const TRENDING_LIMIT = 3

const EYEBROW =
  'text-[11px] font-bold uppercase tracking-[0.08em] text-estrelinha-primary'


/**
 * A faixa "Em destaque" — produtos em destaque da categoria.
 *
 * Componente separado porque `useProducts` é um hook: chamá-lo por entrada da barra seria uma chamada
 * condicional. Montando só o painel aberto, a consulta acontece uma vez, e o React Query a mantém em
 * cache por slug — reabrir o mesmo painel não refaz a requisição.
 */
const TrendingLane = ({ slug }: { slug: string }) => {
  const { data: products } = useProducts(slug)
  const featured = (products ?? []).filter((p) => p.is_featured).slice(0, TRENDING_LIMIT)

  if (featured.length === 0) return null

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 pt-4">
      <p className={`${EYEBROW} text-estrelinha-ink-soft`}>Em destaque</p>
      <div className="flex gap-3">
        {featured.map((product) => (
          <Link
            key={product.id}
            to={productPath(product.slug)}
            className="flex w-40 shrink-0 flex-col gap-2.5"
          >
            <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-md bg-estrelinha-ground-deep">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                // O vazio da galeria é o SÍMBOLO da marca, e não uma letra: o
                // "N" que estava aqui era a inicial da loja anterior.
                <EstrelinhaSymbol size={48} className="opacity-30" />
              )}
            </div>
            <span className="text-[13px] font-semibold leading-[18px] text-estrelinha-ink">
              {product.name}
            </span>
            <span className="font-display text-[13px] font-bold text-estrelinha-primary">
              {formatPrice(product.price)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

/** O card promocional — a quarta coluna. Ausente quando `promo` é nula (MENU-27). */
const PromoCard = ({ promo }: { promo: NonNullable<MenuEntry['promo']> }) => (
  <Link
    to={promo.href}
    className="relative mt-4 flex h-[280px] w-[260px] shrink-0 flex-col justify-end overflow-hidden rounded-lg bg-estrelinha-primary p-4 transition-transform hover:scale-[1.01]"
  >
    {promo.badge && (
      <span className="absolute right-3 top-3 rounded-pill bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-white">
        {promo.badge}
      </span>
    )}
    <span className="font-display text-xl font-semibold leading-[30px] text-white">
      {promo.title}
    </span>
    {promo.subtitle && (
      <span className="pt-1.5 text-[13px] font-medium leading-5 text-white/85">
        {promo.subtitle}
      </span>
    )}
    <span className="pt-3.5 text-[13px] font-bold text-white">Explorar →</span>
  </Link>
)

const MegaMenu = ({ entries }: { entries: MenuEntry[] }) => {
  const [openId, setOpenId] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const triggers = useRef(new Map<string, HTMLAnchorElement>())
  /**
   * O `Esc` fecha e devolve o foco à entrada — e devolver o foco **dispara o `onFocus` dela**, que
   * abre o painel. Sem esta trava o painel reabre no mesmo tique e o teclado nunca consegue fechá-lo.
   * Vale para um único `onFocus`, o que nós mesmos causamos.
   */
  const ignoreNextFocus = useRef(false)

  useEffect(() => () => clearTimeout(timer.current), [])

  /**
   * Abrir e fechar com espera.
   *
   * Sem ela, atravessar a barra para chegar em "Sobre" abre e fecha quatro painéis pelo caminho, e o
   * salto de 1px entre a entrada e o painel fecha o que a cliente estava tentando alcançar.
   */
  const schedule = (id: string | null, delay: number) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpenId(id), delay)
  }

  const open = entries.find((e) => e.id === openId) ?? null
  /** Entrada sem filhas e sem promo não tem painel: é link direto (MENU-14). */
  const hasPanel = (entry: MenuEntry) => entry.children.length > 0 || entry.promo !== null

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

  if (entries.length === 0) return null

  return (
    <div
      className="flex h-full items-center"
      onPointerLeave={() => schedule(null, CLOSE_DELAY)}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && openId) {
          event.stopPropagation()
          close(true)
        }
      }}
    >
      <div className="flex h-full items-center gap-9">
        {entries.map((entry) => (
          <Link
            key={entry.id}
            to={entry.href}
            ref={(node) => {
              if (node) triggers.current.set(entry.id, node)
              else triggers.current.delete(entry.id)
            }}
            onPointerEnter={() => schedule(hasPanel(entry) ? entry.id : null, OPEN_DELAY)}
            onFocus={() => {
              if (ignoreNextFocus.current) {
                ignoreNextFocus.current = false
                return
              }
              if (hasPanel(entry)) setOpenId(entry.id)
            }}
            onClick={() => close(false)}
            aria-expanded={hasPanel(entry) ? openId === entry.id : undefined}
            aria-controls={hasPanel(entry) ? 'mega-menu-painel' : undefined}
            className={`${NAV_ITEM} ${
              openId === entry.id ? 'border-estrelinha-accent text-white' : 'border-transparent'
            }`}
          >
            {entry.name}
          </Link>
        ))}
      </div>

      {open && (
        <div
          id="mega-menu-painel"
          data-testid="mega-menu-painel"
          onPointerEnter={() => clearTimeout(timer.current)}
          /* `top-full`, e não `top-16`: o bloco de posicionamento é o `<header>`
             (que é `sticky`, logo posicionado) e ele deixou de ter uma altura
             só — no desktop são duas faixas, 84 + 52. Um número cravado
             deixaria o painel atravessando a faixa de departamentos. */
          className="absolute left-0 right-0 top-full z-40 border-b border-estrelinha-line bg-estrelinha-surface shadow-estrelinha-soft"
        >
          <div className="container flex gap-5 pb-5">
            {open.children.length > 0 && (
              <div className="flex w-[180px] shrink-0 flex-col gap-1.5 pt-4">
                <p className={`${EYEBROW} pb-2`}>{open.name}</p>
                {open.children.map((child) => (
                  <Link
                    key={child.id}
                    to={categoryPath(child.slug, open.slug)}
                    onClick={() => close(false)}
                    className="text-sm font-medium text-estrelinha-ink transition-colors hover:text-estrelinha-primary"
                  >
                    {child.name}
                  </Link>
                ))}
                <Link
                  to={open.href}
                  onClick={() => close(false)}
                  className="pt-1 text-sm font-semibold leading-7 text-estrelinha-primary hover:underline"
                >
                  Ver todos →
                </Link>
              </div>
            )}

            {open.children.length > 0 && (
              <div className="w-px shrink-0 self-stretch bg-estrelinha-line" aria-hidden />
            )}

            <TrendingLane slug={open.slug} />

            {open.promo && <PromoCard promo={open.promo} />}
          </div>
        </div>
      )}
    </div>
  )
}

export default MegaMenu
