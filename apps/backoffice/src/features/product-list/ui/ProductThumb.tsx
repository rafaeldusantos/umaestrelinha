// A miniatura da coluna Produto. 72px para a peça ser reconhecível sem abrir o produto, e o
// passar do mouse (ou o foco do teclado) abre a foto grande ao lado. HoverCard e não Popover: o
// zoom é espiada, não ação — no celular, onde não há hover, a miniatura continua sendo o bastante.

import { Package } from 'lucide-react'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@estrelinha/ui/hover-card'
import { renditionUrl } from '@estrelinha/core/media'

export const THUMB_SIZE = 72
export const ZOOM_SIZE = 320

interface ProductThumbProps {
  url: string | null
  alt: string
}

const ProductThumb = ({ url, alt }: ProductThumbProps) => {
  if (!url) {
    return (
      <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-lg bg-muted">
        <Package className="h-5 w-5 text-muted-foreground" />
      </span>
    )
  }

  return (
    <HoverCard openDelay={150} closeDelay={50}>
      <HoverCardTrigger asChild>
        <span
          tabIndex={0}
          aria-label={`Ampliar a foto de ${alt}`}
          className="block shrink-0 cursor-zoom-in rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img
            src={renditionUrl(url, THUMB_SIZE * 2)}
            alt={alt}
            width={THUMB_SIZE}
            height={THUMB_SIZE}
            loading="lazy"
            className="h-[72px] w-[72px] rounded-lg bg-muted object-cover"
          />
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="start"
        collisionPadding={16}
        className="w-auto p-2 motion-reduce:animate-none"
      >
        <img
          src={renditionUrl(url, ZOOM_SIZE * 2)}
          alt=""
          width={ZOOM_SIZE}
          height={ZOOM_SIZE}
          className="block h-auto max-h-[420px] w-[320px] rounded-md object-contain"
        />
      </HoverCardContent>
    </HoverCard>
  )
}

export default ProductThumb
