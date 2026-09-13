import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  HERO_CAROUSEL_SLOTS,
  heroCarouselWidth,
  heroSlideArt,
  type HomeSection,
  type ResolvedItem,
} from '@estrelinha/core/home'
import { renditionSrcSet, renditionUrl } from '@estrelinha/core/media'
import { cn } from '@estrelinha/ui/lib/utils'
import { TAP_44 } from '@/shared/lib/touchTarget'
import { useHeroCarousel } from '../model/useHeroCarousel'

/**
 * O **Banner principal** da Home (feature 41).
 *
 * Arte enviada pela dona, uma por dispositivo, apontando para uma coleção, uma peça ou um caminho da
 * loja. Sem texto sobreposto: a frase da campanha está **dentro** da imagem, que é como a Adri monta
 * banner hoje — e é por isso que o `alt` é obrigatório, e não decoração de acessibilidade.
 *
 * **O trilho é um container de rolagem com `scroll-snap`, não um `translateX` animado.** Três coisas
 * saem de graça e certas: o arrasto do dedo é o do navegador, a rolagem vertical da página não é
 * sequestrada (`BNR-37`), e o teclado continua sendo do navegador. O que o hook faz é só o que o
 * navegador não faz sozinho — girar, parar de girar, e saber onde parou.
 *
 * **Nenhum `opacity: 0` neste arquivo, em nenhuma grafia.** Este bloco pode ser o elemento do LCP da
 * Home, e o Chrome **não conta como pintado** um elemento em opacidade zero — foi assim que o hero
 * adiava a métrica em 2 s (`PRF-19`, feature 40). `heroCarouselSemOpacidadeZero.test.ts` derruba a
 * suíte, porque o sintoma não aparece em diff nenhum.
 *
 * SPEC_DEVIATION: `BNR-39` foi escrita para um trilho **transladado** ("o slide que sai de vista sai
 * do alcance do teclado e do leitor de tela"). Aqui não há esse estado: os slides não ficam
 * escondidos, ficam fora da vista num container rolável, e dar Tab neles os traz para a vista — que
 * é o comportamento correto de um scroller, não o foco invisível que a AC proíbe. Tirá-los do Tab
 * seria introduzir o defeito, não evitá-lo.
 * Reason: a propriedade cobrada — nenhum elemento focável visualmente oculto — continua valendo, e é
 * asserida em `HeroCarousel.test.tsx` ("nenhum slide fica oculto E focável"). "Por construção" que
 * ninguém mede é só uma frase.
 *
 * SPEC_DEVIATION: `BNR-27` pede que destino **externo** abra em nova aba. Não implementado, porque é
 * inalcançável: `ctaHrefRefusal` recusa qualquer endereço que não comece com `/` (`HOME-23`), e é a
 * régua que `destinationRefusal` aplica ao caminho livre deste bloco. Escrever o ramo seria código
 * para um estado que o sistema não produz — e nenhum teste real o alcançaria.
 * Reason: a mudança, se um dia for querida, é em `ctaHrefRefusal`, não aqui.
 */

interface Props {
  section: HomeSection
  items: ResolvedItem[]
}

/**
 * A vaga, **medida em `core`** e entregue por variável CSS.
 *
 * Uma classe do Tailwind com a proporção cravada (`aspect-[1440/540]`) seria um segundo dono da
 * medida: o painel recomenda o tamanho a partir de `HERO_CAROUSEL_SLOTS`, e a loja reservaria outro.
 * Com `var()`, o número tem uma origem só e o CSS só carrega o nome dele.
 *
 * A vaga existir **antes da imagem chegar** é o que atende `BNR-26`: a altura é conhecida no primeiro
 * quadro, então a seção não empurra nada para baixo quando a arte carrega.
 */
const VAGAS = {
  '--vaga-celular': `${HERO_CAROUSEL_SLOTS.mobile.width} / ${HERO_CAROUSEL_SLOTS.mobile.height}`,
  '--vaga-computador': `${HERO_CAROUSEL_SLOTS.desktop.width} / ${HERO_CAROUSEL_SLOTS.desktop.height}`,
} as React.CSSProperties

/** As larguras que cada vaga pede ao `render/image`. A de 2× cobre tela retina. */
const LARGURAS_CELULAR = [HERO_CAROUSEL_SLOTS.mobile.width / 2, HERO_CAROUSEL_SLOTS.mobile.width]
const LARGURAS_COMPUTADOR = [
  HERO_CAROUSEL_SLOTS.desktop.width / 2,
  HERO_CAROUSEL_SLOTS.desktop.width,
]

const Arte = ({ item, primeiro }: { item: ResolvedItem; primeiro: boolean }) => {
  const computador = heroSlideArt(
    { image_url: item.imageUrl, image_mobile_url: item.imageMobileUrl },
    'desktop',
  ).image
  const celular = heroSlideArt(
    { image_url: item.imageUrl, image_mobile_url: item.imageMobileUrl },
    'mobile',
  ).image

  return (
    /* `<picture>` com `<source media>`: o navegador baixa **uma** das duas (`BNR-21`). Duas `<img>`
       escondidas por CSS baixariam as duas — e a que não aparece sairia do orçamento do celular. */
    <picture>
      <source
        media="(min-width: 768px)"
        srcSet={renditionSrcSet(computador, LARGURAS_COMPUTADOR) || undefined}
        src={renditionUrl(computador, HERO_CAROUSEL_SLOTS.desktop.width)}
        sizes="100vw"
      />
      <img
        src={renditionUrl(celular, HERO_CAROUSEL_SLOTS.mobile.width)}
        srcSet={renditionSrcSet(celular, LARGURAS_CELULAR) || undefined}
        sizes="100vw"
        alt={item.label}
        /* Só o primeiro slide é `eager`. `imagePriority` não serve aqui, e não é descuido: ele
           descreve uma GRADE, onde os seis primeiros cards estão todos na primeira dobra. Num
           carrossel só um slide está visível — os outros são download que ninguém pediu. */
        loading={primeiro ? 'eager' : 'lazy'}
        /* A grafia minúscula sai por spread porque o React 18.3 não conhece `fetchPriority`. */
        {...(primeiro ? ({ fetchpriority: 'high' } as Record<string, string>) : {})}
        className="h-full w-full object-cover"
      />
    </picture>
  )
}

const HeroCarousel = ({ section, items }: Props) => {
  const largura = heroCarouselWidth(section.config)
  const total = items.length
  const { index, trackRef, goTo, next, prev, pauseHandlers } = useHeroCarousel(total)

  /** Um slide não é carrossel: sem bolinha, sem seta e sem giro (`BNR-31`). */
  const gira = total > 1

  return (
    <section
      className={cn('bg-estrelinha-ground', largura === 'wide' && 'container')}
      style={VAGAS}
      data-testid="hero-carousel"
      data-largura={largura}
    >
      <div
        role="region"
        aria-roledescription="carrossel"
        aria-label="Banners da loja"
        className={cn('relative', largura === 'wide' && 'overflow-hidden rounded-lg')}
        {...pauseHandlers}
      >
        <div
          ref={trackRef}
          data-testid="hero-carousel-trilho"
          /* `snap-mandatory` é o que faz o arrasto encaixar num slide inteiro em vez de parar no
             meio. `scrollbar-none` esconde a barra sem tirar a rolagem — o trilho continua sendo um
             container de rolagem de verdade, que é o que dá o gesto e o teclado de graça. */
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, i) => (
            <Link
              key={item.id}
              to={item.href}
              data-testid={`hero-carousel-slide-${i}`}
              /* `w-full shrink-0` é o que faz cada slide ocupar uma vaga exata do trilho — sem o
                 `shrink-0` o flex os espremeria todos na mesma tela. */
              className="aspect-[var(--vaga-celular)] w-full shrink-0 snap-center overflow-hidden md:aspect-[var(--vaga-computador)]"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${total}`}
            >
              <Arte item={item} primeiro={i === 0} />
            </Link>
          ))}
        </div>

        {gira && (
          <>
            {/* As setas são do computador: no celular quem troca de slide é o dedo, e uma seta
                sobre a arte tampa justamente o texto que a campanha desenhou nela.

                **`TAP_44` vem PRIMEIRO, e a ordem aqui é carga, não estilo.** `cn` é `twMerge`, e
                o `relative` que o auxiliar traz disputa com `absolute` o mesmo grupo de posição:
                com o auxiliar por último, o `absolute` da seta é APAGADO da saída e os dois botões
                caem no fluxo normal, empilhados no canto de baixo — sem erro de build, de `tsc` ou
                de teste de componente. `alvoDeToqueNaoRoubaPosicao.test.ts` recusa a volta, e ele
                CALCULA a fusão em vez de conferir a ordem no olho. */}
            <button
              type="button"
              onClick={prev}
              aria-label="Banner anterior"
              className={cn(
                TAP_44,
                'absolute left-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-estrelinha-surface/90 p-2 text-estrelinha-ink shadow-estrelinha-soft transition-colors hover:bg-estrelinha-surface md:flex',
              )}
            >
              <ChevronLeft size={20} strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Próximo banner"
              className={cn(
                TAP_44,
                'absolute right-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-estrelinha-surface/90 p-2 text-estrelinha-ink shadow-estrelinha-soft transition-colors hover:bg-estrelinha-surface md:flex',
              )}
            >
              <ChevronRight size={20} strokeWidth={2} aria-hidden />
            </button>

            <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
              {items.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={i === index}
                  /* O rótulo diz **qual** banner, e não só o número: quem usa leitor de tela precisa
                     saber para onde vai antes de ir. */
                  aria-label={`Ver o banner ${i + 1}: ${item.label}`}
                  className={cn(
                    'h-2 w-2 rounded-full transition-colors',
                    i === index ? 'bg-estrelinha-primary' : 'bg-estrelinha-surface/70',
                    TAP_44,
                  )}
                />
              ))}
            </div>

            {/* O anúncio educado: quem não vê a troca precisa ser avisado dela, sem ser
                interrompido. `polite` espera a leitura corrente terminar. */}
            <p className="sr-only" aria-live="polite" data-testid="hero-carousel-anuncio">
              Banner {index + 1} de {total}
            </p>
          </>
        )}
      </div>
    </section>
  )
}

export default HeroCarousel
