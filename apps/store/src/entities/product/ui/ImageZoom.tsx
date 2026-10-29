import { useState, useRef } from 'react'

interface Props {
  src: string
  /** O par do palco (`IMG-02`) — o mesmo `srcset`/`sizes` da leitura do celular. */
  srcSet?: string
  sizes?: string
  /**
   * A foto da camada ampliada (feature 87, `IMG-15`). A camada só existe com o ponteiro em cima:
   * antes da primeira entrada nenhum elemento a nomeia, e quem nunca passa o mouse não a baixa. Sair
   * e entrar de novo reusa o cache do navegador — a URL é a mesma.
   */
  zoomSrc: string
  alt: string
}

const ImageZoom = ({ src, srcSet, sizes, zoomSrc, alt }: Props) => {
  const [zooming, setZooming] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setPos({ x, y })
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden cursor-zoom-in"
      onMouseEnter={() => setZooming(true)}
      onMouseLeave={() => setZooming(false)}
      onMouseMove={handleMouseMove}
    >
      <img src={src} srcSet={srcSet} sizes={sizes} alt={alt} className="w-full h-full object-cover" />
      {zooming && (
        <div
          data-testid="image-zoom-layer"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${zoomSrc})`,
            backgroundSize: '250%',
            backgroundPosition: `${pos.x}% ${pos.y}%`,
            backgroundRepeat: 'no-repeat',
          }}
        />
      )}
    </div>
  )
}

export default ImageZoom
