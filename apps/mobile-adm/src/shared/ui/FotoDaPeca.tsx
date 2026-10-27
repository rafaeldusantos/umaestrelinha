import { useEffect, useState } from 'react'
import { renditionUrl } from '@estrelinha/core/media'
import { EstrelinhaStarIcon } from '@estrelinha/ui/icons'
import { cn } from '@estrelinha/ui/lib/utils'

/**
 * A miniatura de uma peça: no detalhe do pedido e em "Joias mais pedidas no mês". Quem decide QUAL
 * foto é `itemPhoto` (`@estrelinha/core/orders`); aqui só se desenha.
 *
 * - **A moldura existe MESMO sem foto** (a estrela no lugar), senão a linha sem foto desalinha da
 *   linha com foto. Foto que não carrega volta à moldura com a estrela — um ícone de imagem quebrada
 *   não diz nada a quem está separando o pedido.
 * - **Pede a rendição no dobro do tamanho** (`renditionUrl`, o mesmo dono da loja e do painel): a
 *   foto original do catálogo tem centenas de KB, e a miniatura tem 40–48 px. URL fora do Storage
 *   volta inalterada.
 * - O `alt` é vazio: o nome da peça está escrito ao lado, e repeti-lo faria o leitor de tela ler duas
 *   vezes.
 */
const FotoDaPeca = ({
  foto,
  tamanho,
  altura = tamanho,
  className,
}: {
  foto: string | null
  /** A largura, em px. */
  tamanho: number
  /** A altura, em px; sem ela a moldura é quadrada. */
  altura?: number
  className?: string
}) => {
  const [falhou, setFalhou] = useState(false)
  useEffect(() => setFalhou(false), [foto])
  const mostrar = !!foto && !falhou

  return (
    <span
      data-testid="foto-da-peca"
      style={{ width: tamanho, height: altura }}
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-sm bg-estrelinha-ground-deep text-estrelinha-primary',
        className,
      )}
    >
      {mostrar ? (
        <img
          src={renditionUrl(foto, Math.max(tamanho, altura) * 2)}
          alt=""
          loading="lazy"
          decoding="async"
          width={tamanho}
          height={altura}
          onError={() => setFalhou(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <EstrelinhaStarIcon aria-hidden className="h-[22px] w-[22px]" />
      )}
    </span>
  )
}

export default FotoDaPeca
