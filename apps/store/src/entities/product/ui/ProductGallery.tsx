import { useEffect, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, ImageOff, ZoomIn } from 'lucide-react'
import type { ProductImage } from '@estrelinha/supabase/types'
import { renditionSrcSet, renditionUrl } from '@estrelinha/core/media'
import ImageZoom from './ImageZoom'
import { TAP_44 } from '@/shared/lib/touchTarget'
import { Dialog, DialogContent } from '@estrelinha/ui/dialog'

interface Props {
  /** Já normalizadas por `normalizeImages` — a galeria não tolera `string[]`. */
  images: ProductImage[]
  name: string
  /**
   * A imagem da variação escolhida (PMD-06 AC 3). `null` ⇒ a principal.
   *
   * URL que não está mais na galeria também cai na principal: a referência é uma string em
   * `product_variants.image_url`, não uma FK, então o admin pode apagar a foto e deixar o
   * ponteiro para trás. Palco vazio seria pior que a foto errada.
   */
  focusUrl?: string | null
  /**
   * Os selos sobre a foto (boards de Produto: "-15%" e "NEW" no canto superior esquerdo).
   *
   * Entram por slot, e não por props de produto, porque a galeria não conhece preço nem grade —
   * quem sabe se há desconto é a página. Mantê-la burra é o que deixa ela servir também a
   * superfícies sem selo nenhum.
   */
  badges?: ReactNode
  /** O favoritar do canto superior direito, só desenhado no mobile pelos boards. */
  action?: ReactNode
}

/**
 * Texto alternativo de uma imagem da galeria.
 *
 * O `alt` cadastrado ganha do genérico: é ele que descreve a foto para quem usa leitor de tela e
 * é o que a `12` (PMD-01) vai gerar. Sem `alt`, cai no genérico posicional de antes — nunca em
 * string vazia, que num `<img>` de conteúdo significa "imagem decorativa, ignore".
 */
const altOf = (image: ProductImage, name: string, index: number) =>
  image.alt ?? `${name} - imagem ${index + 1}`

/**
 * As duas larguras da galeria (`PRF-02` AC 5-6).
 *
 * `PALCO_PX` — 720 cobre o palco no celular (390 de viewport em DPR 2 pede 780, e o `srcset` escolhe
 * a maior das três) e o palco de 588px do desktop. As DUAS leituras do palco pedem a mesma largura
 * de propósito: elas coexistem no DOM (uma escondida por `md:hidden`, a outra por `hidden md:block`)
 * e **imagem escondida por CSS continua sendo baixada**. Larguras diferentes fariam o celular baixar
 * duas fotos em vez de uma, e a economia viraria prejuízo.
 *
 * `FITA_PX` — a miniatura mede 56px no celular e 80px no desktop; 160 cobre os dois em DPR 2.
 *
 * **A tela cheia fica com o ORIGINAL** (`PRF-02` AC 6): é lá que a lupa existe, e é o único lugar da
 * loja onde a resolução gravada no Storage é o conteúdo, e não o custo.
 */
const PALCO_PX = 720
const FITA_PX = 160

/**
 * A galeria do produto — boards "Desktop Product Detail - v3" e "Mobile Product Detail - v3".
 *
 * Uma estrutura, duas leituras: no desktop o palco é quadrado com a lupa no canto e uma fita de
 * miniaturas de 80px; no mobile a mesma fita cai para 56px e ganha os **pontos** sobre a foto, que
 * são a única indicação de que há mais de uma imagem quando a fita sai do campo de visão.
 *
 * As setas laterais são **só desktop**: no celular elas cobririam 1/8 da foto para fazer o que o
 * toque na miniatura já faz.
 */
const ProductGallery = ({ images, name, focusUrl = null, badges, action }: Props) => {
  const [current, setCurrent] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)

  // PMD-06 AC 2-3: a escolha da variação manda no destaque. Sem imagem própria — ou com uma que
  // já saiu da galeria — volta para a principal.
  useEffect(() => {
    const target = focusUrl ? images.findIndex(img => img.url === focusUrl) : -1
    setCurrent(target >= 0 ? target : 0)
  }, [focusUrl, images])

  // Produto sem imagem mostra o palco vazio, e NENHUM `<img>`: `src={undefined}` faz o browser
  // rebaixar para a URL da própria página e requisitar o HTML como imagem (VAR-11 AC 3).
  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl bg-estrelinha-ground-deep">
        <ImageOff className="h-10 w-10 text-estrelinha-ink-soft" aria-hidden="true" />
        <span className="sr-only">{name} sem imagem</span>
      </div>
    )
  }

  // Um `current` fora da faixa acontece quando o produto é trocado com a galeria montada.
  const index = Math.min(current, images.length - 1)
  const active = images[index]
  const many = images.length > 1
  const step = (delta: number) => setCurrent(c => (c + delta + images.length) % images.length)

  return (
    <div className="flex flex-col gap-2 md:gap-3">
      <div className="group relative aspect-square overflow-hidden rounded-xl bg-estrelinha-ground-deep">
        {/* Desktop: a lupa do board é o próprio palco — `ImageZoom` amplia sob o cursor. */}
        <div
          className="hidden h-full w-full cursor-zoom-in md:block"
          onClick={() => setFullscreen(true)}
        >
          <ImageZoom src={renditionUrl(active.url, PALCO_PX)} alt={altOf(active, name, index)} />
        </div>

        {/* Mobile: toque abre a tela cheia. */}
        <div className="h-full w-full md:hidden" onClick={() => setFullscreen(true)}>
          <AnimatePresence mode="wait">
            {/* O LCP da página do produto no celular — 90% dos acessos da loja. `eager` e
                `fetchpriority="high"` porque é a maior imagem da dobra, e nada acima dela compete.
                A grafia minúscula sai por spread: o React 18.3 não conhece `fetchPriority` e avisa
                no console pedindo exatamente esta. */}
            <motion.img
              key={index}
              src={renditionUrl(active.url, PALCO_PX)}
              srcSet={renditionSrcSet(active.url) || undefined}
              sizes="(min-width: 768px) 50vw, 100vw"
              loading="eager"
              {...({ fetchpriority: 'high' } as Record<string, string>)}
              alt={altOf(active, name, index)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full object-cover"
            />
          </AnimatePresence>
        </div>

        {badges && <div className="absolute left-3 top-3 z-10 flex gap-1.5">{badges}</div>}
        {action && <div className="absolute right-3 top-3 z-10 md:hidden">{action}</div>}

        {many && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Imagem anterior"
              className={`${TAP_44} absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 opacity-0 shadow-estrelinha-soft backdrop-blur transition-opacity group-hover:opacity-100 md:flex`}
            >
              <ChevronLeft className="h-4 w-4 text-estrelinha-ink" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Próxima imagem"
              className={`${TAP_44} absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 opacity-0 shadow-estrelinha-soft backdrop-blur transition-opacity group-hover:opacity-100 md:flex`}
            >
              <ChevronRight className="h-4 w-4 text-estrelinha-ink" />
            </button>

            {/* Pontos: só mobile. No desktop a fita de 80px já diz quantas fotos existem.
                Vão dentro de uma pílula clara porque a foto atrás pode ser de qualquer cor — sobre
                um produto rosa, ponto em geleia e ponto em tinta translúcida somem os dois. */}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-pill bg-white/85 px-2 py-1.5 backdrop-blur md:hidden">
              {images.map((img, i) => (
                <span
                  key={`${img.url}-${i}`}
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    i === index ? 'bg-estrelinha-primary' : 'bg-estrelinha-ink/25'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => setFullscreen(true)}
          aria-label="Ver imagem em tela cheia"
          /* 44px no celular (o alvo de toque mínimo do projeto), 36px no desktop, onde quem clica
             é o ponteiro. O board desenha 36 nos dois — medido em 390px, ficou pequeno demais. */
          className={`${TAP_44} absolute bottom-3 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/85 shadow-estrelinha-soft backdrop-blur transition-transform hover:scale-105 md:h-9 md:w-9`}
        >
          <ZoomIn className="h-4 w-4 text-estrelinha-ink" />
        </button>
      </div>

      {many && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] md:gap-2 [&::-webkit-scrollbar]:hidden">
          {images.map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Ver imagem ${i + 1} de ${images.length}`}
              aria-current={i === index}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-sm border-2 transition-colors md:h-20 md:w-20 md:rounded-md ${
                i === index ? 'border-estrelinha-primary' : 'border-transparent'
              }`}
            >
              {/* Miniatura é controle de navegação, não conteúdo: o `alt` do botão já está na
                  imagem grande, e repeti-lo aqui faria o leitor de tela ler N vezes o mesmo. */}
              <img
                src={renditionUrl(img.url, FITA_PX)}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-h-[95vh] max-w-[95vw] border-none bg-black/95 p-2">
          <div className="relative flex h-[85vh] items-center justify-center">
            <img
              src={active.url}
              alt={altOf(active, name, index)}
              className="max-h-full max-w-full object-contain"
            />
            {many && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Imagem anterior"
                  className={`${TAP_44} absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 backdrop-blur`}
                >
                  <ChevronLeft className="h-5 w-5 text-white" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Próxima imagem"
                  className={`${TAP_44} absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 backdrop-blur`}
                >
                  <ChevronRight className="h-5 w-5 text-white" />
                </button>
              </>
            )}
          </div>
          {many && (
            <div className="mt-2 flex justify-center gap-2">
              {images.map((img, i) => (
                <button
                  key={`${img.url}-${i}`}
                  type="button"
                  onClick={() => setCurrent(i)}
                  aria-label={`Ver imagem ${i + 1} de ${images.length}`}
                  className={`h-12 w-12 overflow-hidden rounded-sm border-2 transition-colors ${
                    i === index ? 'border-white' : 'border-white/30'
                  }`}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ProductGallery
