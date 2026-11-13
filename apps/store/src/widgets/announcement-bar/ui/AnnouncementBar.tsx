import { Fragment, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  ANNOUNCEMENT_ART_SLOTS,
  ANNOUNCEMENT_BAR_HEIGHT,
  type Announcement,
  type ImageAnnouncement,
  type TextAnnouncement,
} from '@estrelinha/core/announcements'
import { renditionSrcSet, renditionUrl } from '@estrelinha/core/media'
import { ANNOUNCEMENT_BAR_ID } from '@/shared/lib/storeChrome'
import { useHeroCarousel } from '@/shared/lib/useHeroCarousel'
import { useAnnouncementBar } from '../model/useAnnouncementBar'

/**
 * A faixa de avisos — acima do cabeçalho, em toda página do `StoreLayout`.
 *
 * Fundo `accent` com texto `ink` **sólido** (4,78:1): dentro de superfície ouro, texto com opacidade
 * reprova (`accentText.test.ts`). A faixa rola com a página; quem gruda é só o cabeçalho, e ele só se
 * recolhe depois que a faixa sai da tela (`useScrollDirection` mede a faixa pelo id).
 *
 * **Altura fixa, a mesma para todo aviso**, vinda de `core` por variável CSS: a troca de aviso não
 * mexe na página, e a vaga existe antes de a configuração chegar.
 *
 * **O giro é o do Banner principal** (`useHeroCarousel`, sem trilho — índice puro): 6 s, pausa com
 * ponteiro, foco e dedo, e com movimento reduzido não gira. Sem `aria-live`: anunciar a cada 6 s
 * interromperia quem usa leitor de tela.
 *
 * **Nada nasce em opacidade zero** (`faixaSemOpacidadeZero.test.ts`): a entrada de cada aviso é um
 * deslocamento de 6 px, nunca um esmaecer.
 */

/** As alturas de `core`, por variável CSS — uma classe com o número cravado seria um segundo dono. */
const VAGA = {
  '--faixa-celular': ANNOUNCEMENT_BAR_HEIGHT.mobile,
  '--faixa-computador': ANNOUNCEMENT_BAR_HEIGHT.desktop,
} as React.CSSProperties

/**
 * A seta: `h-11 w-11` já É o alvo de 44 px (molde da seta do cabeçalho), então nada de `TAP_44`. A
 * área visível é a caixa de 32 × 40 de dentro; o anel de foco é `ink`, que sobre `accent` mede 4,78.
 */
const SETA =
  'hidden h-11 w-11 shrink-0 items-center justify-center rounded-sm text-estrelinha-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-estrelinha-ink md:flex'

/** O foco do aviso que é link: anel `ink` por dentro da faixa. */
const FOCO =
  'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-estrelinha-ink'

const LARGURAS_COMPUTADOR = [ANNOUNCEMENT_ART_SLOTS.desktop.width / 2, ANNOUNCEMENT_ART_SLOTS.desktop.width]
const LARGURAS_CELULAR = [ANNOUNCEMENT_ART_SLOTS.mobile.width / 2, ANNOUNCEMENT_ART_SLOTS.mobile.width]

const TextoDoAviso = ({ aviso, comRotulo }: { aviso: TextAnnouncement; comRotulo: boolean }) => {
  const destaque = aviso.highlight.trim()
  const texto = aviso.text.trim()
  const rotulo = comRotulo ? aviso.linkLabel.trim() : ''
  const partes = [
    destaque && (
      <span key="destaque" className="font-bold">
        {destaque}
      </span>
    ),
    texto && <span key="texto">{texto}</span>,
    rotulo && (
      <span key="rotulo" className="whitespace-nowrap font-semibold underline underline-offset-[3px]">
        {rotulo}
      </span>
    ),
  ].filter(Boolean)

  return (
    <>
      {partes.map((parte, i) => (
        <Fragment key={i}>
          {i > 0 && ' · '}
          {parte}
        </Fragment>
      ))}
    </>
  )
}

const ArteDoAviso = ({ aviso }: { aviso: ImageAnnouncement }) => (
  /* `<picture>` com `<source media>`: o navegador baixa UMA arte. A arte aparece inteira e
     centralizada (`object-contain`); o que sobra dos lados é o fundo ouro da faixa. */
  <picture className="flex h-full w-full items-center justify-center">
    <source
      media="(min-width: 768px)"
      srcSet={
        renditionSrcSet(aviso.imageDesktop, LARGURAS_COMPUTADOR) ||
        renditionUrl(aviso.imageDesktop, ANNOUNCEMENT_ART_SLOTS.desktop.width)
      }
    />
    <img
      src={renditionUrl(aviso.imageMobile, ANNOUNCEMENT_ART_SLOTS.mobile.width)}
      srcSet={renditionSrcSet(aviso.imageMobile, LARGURAS_CELULAR) || undefined}
      alt={aviso.alt.trim()}
      className="h-full w-auto max-w-full object-contain"
    />
  </picture>
)

const Aviso = ({ aviso }: { aviso: Announcement }) => {
  const href = aviso.href.trim()

  if (aviso.kind === 'image') {
    return href ? (
      <Link to={href} className={`flex h-full w-full items-center justify-center ${FOCO}`}>
        <ArteDoAviso aviso={aviso} />
      </Link>
    ) : (
      <ArteDoAviso aviso={aviso} />
    )
  }

  const classes =
    'block w-full text-center text-[13px] font-medium leading-[18px] text-estrelinha-ink [text-wrap:balance] md:text-sm'
  return href ? (
    <Link to={href} className={`${classes} ${FOCO}`}>
      <TextoDoAviso aviso={aviso} comRotulo />
    </Link>
  ) : (
    <p className={classes}>
      <TextoDoAviso aviso={aviso} comRotulo={false} />
    </p>
  )
}

const AnnouncementBar = () => {
  const { visible, items, preview, show } = useAnnouncementBar()
  const total = items.length
  // Em prévia a faixa não gira sozinha: a dona está lendo o aviso que acabou de abrir no painel.
  const { index, goTo, next, prev, pauseHandlers } = useHeroCarousel(total, preview ? 0 : undefined)

  // "Mostre o aviso N" vale UMA vez por pedido: o efeito depende do contador do pedido (e da posição),
  // nunca do objeto `show`, que nasce novo a cada render — senão cada clique numa seta voltaria a
  // faixa ao aviso pedido. `goTo` vai por ref pelo mesmo motivo: ele muda quando a lista muda.
  const goToRef = useRef(goTo)
  goToRef.current = goTo
  const pedido = show?.vez
  const alvo = show?.index
  useEffect(() => {
    if (pedido !== undefined && alvo !== undefined) goToRef.current(alvo)
  }, [pedido, alvo])

  if (!visible) return null

  const atual = items[Math.min(index, Math.max(total - 1, 0))]
  const comSetas = total > 1

  return (
    <section
      id={ANNOUNCEMENT_BAR_ID}
      aria-label="Avisos da loja"
      style={VAGA}
      className="h-[var(--faixa-celular)] w-full overflow-hidden bg-estrelinha-accent text-estrelinha-ink md:h-[var(--faixa-computador)]"
      {...pauseHandlers}
    >
      {atual && (
        <div className="mx-auto flex h-full max-w-[1280px] items-center gap-1 px-2">
          {comSetas && (
            <button type="button" onClick={prev} aria-label="Aviso anterior" className={SETA}>
              <span className="flex h-10 w-8 items-center justify-center" aria-hidden>
                <ChevronLeft size={16} strokeWidth={2} />
              </span>
            </button>
          )}
          <div
            key={atual.id}
            className="flex h-full min-w-0 flex-1 items-center justify-center animate-[estrelinha-faixa-entra_300ms_ease-out] motion-reduce:animate-none"
          >
            <Aviso aviso={atual} />
          </div>
          {comSetas && (
            <button type="button" onClick={next} aria-label="Próximo aviso" className={SETA}>
              <span className="flex h-10 w-8 items-center justify-center" aria-hidden>
                <ChevronRight size={16} strokeWidth={2} />
              </span>
            </button>
          )}
        </div>
      )}
    </section>
  )
}

export default AnnouncementBar
