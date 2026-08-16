import { ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@estrelinha/ui/dialog'
import { TAP_ROW } from '@/shared/lib/touchTarget'
import { videoEmbed, videoUrl, type VideoDePreparo } from '../model/videos'

/**
 * O vídeo em tela cheia.
 *
 * **O `<iframe>` só existe enquanto este diálogo está aberto**, e é a razão de o player não morar no
 * cartão da lista. Cinco players embutidos carregariam cinco vezes o script do YouTube em quem só
 * passou pela página — peso e rastreio antes de qualquer clique. Aqui o iframe monta no clique e é
 * desmontado no fechamento (o `Dialog` do Radix remove o conteúdo do DOM), o que também **para o
 * som**: um player escondido continuaria tocando atrás do diálogo fechado.
 *
 * A proporção é 16:9 travada por `aspect-video`, e não por altura fixa: altura fixa entorta em toda
 * viewport que não é a do teste, e no celular deitado o vídeo passaria da tela.
 *
 * O link de fora existe porque o embed **pode não tocar**: extensão de bloqueio, rede corporativa,
 * política de privacidade do navegador. Sem ele, a cliente vê um retângulo preto e conclui que o
 * vídeo não existe.
 */
interface VideoLightboxProps {
  video: VideoDePreparo | null
  onOpenChange: (aberto: boolean) => void
}

const VideoLightbox = ({ video, onOpenChange }: VideoLightboxProps) => (
  <Dialog open={video !== null} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[min(96vw,1024px)] gap-4 border-estrelinha-line bg-white p-4 md:p-6">
      {video && (
        <>
          <div className="overflow-hidden rounded-md bg-estrelinha-ink">
            <iframe
              key={video.id}
              src={videoEmbed(video.id)}
              title={video.titulo}
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>

          <div className="flex flex-col gap-2 pr-8">
            <DialogTitle className="font-display text-[19px] font-normal leading-7 text-estrelinha-ink md:text-[22px]">
              {video.titulo}
            </DialogTitle>
            <DialogDescription className="text-[15px] font-light leading-[26px] text-estrelinha-ink-soft">
              {video.descricao}
            </DialogDescription>
            <a
              href={videoUrl(video.id)}
              target="_blank"
              rel="noopener noreferrer"
              className={`${TAP_ROW} gap-2 self-start text-[14px] font-medium text-estrelinha-primary hover:underline`}
            >
              Abrir no YouTube
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
            </a>
          </div>
        </>
      )}
    </DialogContent>
  </Dialog>
)

export default VideoLightbox
