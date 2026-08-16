import { Play } from 'lucide-react'
import { VIDEOS_DE_PREPARO, videoCapa } from '../model/videos'
import GuideHeading from './GuideHeading'
import GuideSection from './GuideSection'

/**
 * "Vídeos curtos de preparo" (`5MC-0`) — a lista dos cinco vídeos da Adri.
 *
 * O board desenhava três vagas com ilustração no lugar da capa; aqui são cinco vídeos reais e a capa
 * é a do próprio YouTube. Cada cartão é um **`<button>`**, não um link: o destino é o diálogo desta
 * mesma página, e um `<a href="youtu.be/…">` tiraria a cliente do guia no meio do preparo — no
 * celular, sem volta fácil.
 *
 * `loading="lazy"` nas capas porque a seção fica abaixo da dobra em qualquer viewport: cinco imagens
 * de 480px do domínio do YouTube não têm por que competir com o hero.
 */
interface VideoGalleryProps {
  onAbrir: (videoId: string) => void
}

const VideoGallery = ({ onAbrir }: VideoGalleryProps) => (
  <GuideSection tone="ground" labelledBy="guia-videos" className="border-t border-estrelinha-line">
    <div className="flex flex-col gap-8 md:gap-12">
      <GuideHeading
        id="guia-videos"
        versalete="Assista antes de embalar"
        titulo="Vídeos curtos de preparo"
        apoio="Os materiais que geram mais dúvida, explicados na prática — do frasco ao lacre."
      />

      <ul className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 md:gap-10">
        {VIDEOS_DE_PREPARO.map(video => (
          <li key={video.id}>
            <button
              type="button"
              onClick={() => onAbrir(video.id)}
              className="group flex w-full flex-col gap-4 text-left md:gap-[22px]"
            >
              <span className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md bg-estrelinha-serenity">
                <img
                  src={videoCapa(video.id)}
                  alt=""
                  loading="lazy"
                  /*
                    `object-cover` sozinho já entrega o quadro certo, e nenhuma escala a mais.
                    `hqdefault` é 480×360 com o vídeo 16:9 no meio: são exatamente 45px de tarja preta
                    em cima e 45 embaixo, e cobrir um container 16:9 corta exatamente isso. Um `scale`
                    por cima — que a primeira versão tinha — não removia tarja nenhuma (já não havia),
                    só ampliava 34% e **cortava as laterais da capa**, comendo a última palavra do
                    título que a Adri escreveu na arte.
                  */
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/*
                  O disco fica no canto, não no centro. No board a capa era um desenho vazado e o
                  disco central era o único objeto; as capas reais trazem o título do vídeo em letra
                  grande no meio, e o disco centrado apagava justamente a palavra que diz de que
                  material aquele vídeo trata.
                */}
                <span
                  aria-hidden
                  className="absolute bottom-3 left-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-estrelinha-lift transition-transform group-hover:scale-105 md:h-14 md:w-14"
                >
                  <Play className="ml-0.5 h-5 w-5 fill-estrelinha-primary text-estrelinha-primary" />
                </span>
                {video.duracao && (
                  <span className="absolute bottom-3 right-3 rounded-pill bg-estrelinha-ink/90 px-3 py-1 text-[13px] font-medium text-estrelinha-on-primary">
                    {video.duracao}
                  </span>
                )}
              </span>

              <span className="flex flex-col gap-2.5">
                <span className="font-display text-[19px] font-normal leading-7 text-estrelinha-ink group-hover:underline md:text-[22px] md:leading-7">
                  {video.titulo}
                </span>
                <span className="text-[16px] font-light leading-[26px] text-estrelinha-ink-soft md:text-[17px] md:leading-7">
                  {video.descricao}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  </GuideSection>
)

export default VideoGallery
