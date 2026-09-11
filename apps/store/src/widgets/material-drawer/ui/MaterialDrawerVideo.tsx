import { useState } from 'react'
import { Play } from 'lucide-react'
import type { MaterialKind } from '@estrelinha/core/material'
import { videoCapa, videoDoMaterial, videoEmbed, videoUrl } from '@/entities/material'

/**
 * O vídeo do material, dentro da gaveta (`GAV-14`, `GAV-23`).
 *
 * **O `<iframe>` só nasce depois do toque.** Cinco players embutidos carregariam o script do YouTube
 * em quem apenas abriu a gaveta — é a mesma regra que a feature `31` aplicou na página do guia, e
 * aqui ela pesa mais: ~90% dos acessos vêm de celular, muitas vezes em rede ruim.
 *
 * **Toca aqui, e não num diálogo por cima.** A página do guia usa `VideoLightbox`, que é um `Dialog`
 * do Radix; diálogo sobre gaveta empilha foco em duas camadas, e no celular a gaveta já ocupa quase
 * a tela inteira — a segunda camada não acrescentaria área, só um segundo jeito de fechar.
 *
 * **`videoUrl` fica presente nos dois estados**: quem bloqueia iframe (extensão, rede corporativa)
 * não vê o player e não veria nada. A saída externa é o que impede o bloco de virar um retângulo
 * preto sem explicação.
 *
 * Material sem vídeo não renderiza bloco nenhum — `videoDoMaterial` devolve `null`, e um cartão
 * vazio prometeria um vídeo que não existe.
 */
interface Props {
  kind: MaterialKind
}

const MaterialDrawerVideo = ({ kind }: Props) => {
  const [tocando, setTocando] = useState(false)
  const video = videoDoMaterial(kind)

  if (!video) return null

  if (tocando) {
    return (
      <div data-testid="material-drawer-video" className="flex flex-col gap-2">
        <div className="aspect-video w-full overflow-hidden rounded-sm bg-estrelinha-ink">
          <iframe
            src={videoEmbed(video.id)}
            title={video.titulo}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 text-[14px] font-semibold leading-[19px] text-estrelinha-ink">
            {video.titulo}
          </span>
          <a
            href={videoUrl(video.id)}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-[13px] font-medium text-estrelinha-primary underline-offset-2 hover:underline"
          >
            abrir no YouTube
          </a>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="material-drawer-video" className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setTocando(true)}
        className="flex min-h-[64px] items-center gap-3 rounded-sm border border-estrelinha-line bg-estrelinha-surface p-2.5 text-left transition-colors hover:border-estrelinha-field"
      >
        <span className="relative flex h-[59px] w-[104px] shrink-0 items-end overflow-hidden rounded-[4px] bg-estrelinha-ground-deep p-1.5">
          {/* A capa é conteúdo, não decoração: a Adri escreve o título do vídeo dentro da arte, e
              quem não a enxerga precisa saber o que há ali. `alt=""` só valeria se o título
              estivesse repetido ao lado — e ele está, mas dentro do MESMO botão, o que faria o
              leitor de tela anunciar um botão sem imagem nenhuma se a capa falhasse. */}
          <img
            src={videoCapa(video.id)}
            alt={`Capa do vídeo: ${video.titulo}`}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span
            aria-hidden
            className="relative flex h-[26px] w-[26px] items-center justify-center rounded-full bg-estrelinha-primary"
          >
            <Play className="h-[11px] w-[11px] fill-estrelinha-on-primary text-estrelinha-on-primary" />
          </span>
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[14px] font-semibold leading-[19px] text-estrelinha-ink">
            {video.titulo}
          </span>
          <span className="text-[12px] leading-[17px] text-estrelinha-ink-soft">
            Vídeo da Adri · toque para assistir aqui
          </span>
        </span>
      </button>

      <a
        href={videoUrl(video.id)}
        target="_blank"
        rel="noreferrer"
        className="self-start text-[13px] font-medium text-estrelinha-primary underline-offset-2 hover:underline"
      >
        abrir no YouTube
      </a>
    </div>
  )
}

export default MaterialDrawerVideo
