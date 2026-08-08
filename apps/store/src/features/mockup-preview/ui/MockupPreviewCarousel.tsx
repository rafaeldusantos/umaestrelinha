import { useEffect, useState } from 'react'
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@estrelinha/ui/carousel'
import { Loader2 } from 'lucide-react'
import { useMockups, composeMockup, loadImage } from '@estrelinha/core'

interface Props {
  artDataUrl: string
}

// Dimensão máxima (px) do canvas de exibição. A composição roda na resolução do fundo
// (ENG-06) e é reduzida só para exibição — a prévia é display-only (STR-03), não a arte
// impressa/no carrinho. Composto sob demanda ao abrir a aba, não a cada frame.
const PREVIEW_MAX = 720

const MockupPreviewCarousel = ({ artDataUrl }: Props) => {
  const { data: templates } = useMockups()
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const active = templates ?? []
    if (active.length === 0 || !artDataUrl) {
      setPreviews([])
      return
    }
    let cancelled = false
    setLoading(true)
    ;(async () => {
      let art: HTMLImageElement
      try {
        art = await loadImage(artDataUrl)
      } catch {
        if (!cancelled) { setPreviews([]); setLoading(false) }
        return
      }
      const out: string[] = []
      for (const t of active) {
        try {
          const [bg, overlay] = await Promise.all([
            loadImage(t.background_url),
            t.overlay_url ? loadImage(t.overlay_url) : Promise.resolve(null),
          ])
          const result = composeMockup({
            background: bg,
            art,
            overlay,
            artZone: t.art_zone,
            blendMode: t.blend_mode,
            shadingGain: t.shading_gain,
          })
          const bgW = bg.naturalWidth || bg.width
          const bgH = bg.naturalHeight || bg.height
          const s = Math.min(1, PREVIEW_MAX / Math.max(bgW, bgH))
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(bgW * s)
          canvas.height = Math.round(bgH * s)
          const ctx = canvas.getContext('2d')
          if (!ctx) continue
          ctx.drawImage(result.canvas, 0, 0, canvas.width, canvas.height)
          out.push(canvas.toDataURL('image/png'))
        } catch {
          // template com asset inválido → ignora este e segue (STR-02: sem crash)
        }
      }
      if (!cancelled) { setPreviews(out); setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [templates, artDataUrl])

  // Sem templates ativos → não renderiza nada (STR-02).
  if ((templates ?? []).length === 0) return null

  return (
    <div className="w-full">
      {loading && previews.length === 0 && (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-nanita-jam" />
        </div>
      )}
      {previews.length > 0 && (
        <Carousel className="w-full">
          <CarouselContent>
            {previews.map((src, i) => (
              <CarouselItem key={i}>
                <div className="flex items-center justify-center">
                  <img src={src} alt={`Prévia realista ${i + 1}`} className="max-h-[380px] w-auto max-w-full rounded-xl" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {previews.length > 1 && (
            <>
              <CarouselPrevious type="button" className="left-2" />
              <CarouselNext type="button" className="right-2" />
            </>
          )}
        </Carousel>
      )}
    </div>
  )
}

export default MockupPreviewCarousel
