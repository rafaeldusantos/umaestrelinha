// O modal Mídia (feature 85, MOD-02, MOD-04, MOD-07).
//
// A aba Mídia saiu da página e o conteúdo dela mora aqui, sem mudar: a galeria inteira (envio,
// ordenar, remover, alt-text, selo de origem, colar) e o campo de vídeo. O modal é só a moldura.
//
// MOD-04: não existe "Cancelar". Tudo o que muda aqui já é o formulário da página — o modal nunca
// guarda cópia nem desfaz nada ao fechar, e a gravação é o "Salvar" do topo. Fechar por "Concluir",
// `Esc` ou o X é só fechar.
//
// MOD-07: abaixo de `lg` o modal ocupa a tela inteira (390px sem rolagem horizontal). O
// `DialogContent` é `grid grid-cols-1` (trilha de piso zero, `dialogGridTrack.test.ts`); aqui só
// se acrescentam as linhas `auto 1fr auto`, para cabeçalho e rodapé ficarem fixos e só o corpo
// rolar quando há muitas fotos.

import { useRef } from 'react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@estrelinha/ui/dialog'
import type { ProductImage } from '@estrelinha/supabase/types'
import type { UploadProgress } from '../lib/uploadProductImage'
import ImageGallery from './ImageGallery'
import { MEDIA_FOCUS_FALLBACK_ATTR } from './ProductMediaSummary'

/**
 * Tela cheia em < lg; cartão de até 940px a partir de `lg`. Exportado para o teste ler o MESMO
 * literal que o componente usa e cravar os tokens que a spec pede (MOD-07).
 */
export const MEDIA_DIALOG_CLASSES =
  'h-[100dvh] max-h-[100dvh] w-screen max-w-none grid-rows-[auto_minmax(0,1fr)_auto] gap-0 rounded-none p-0 sm:rounded-none lg:h-auto lg:max-h-[calc(100vh-48px)] lg:max-w-[940px] lg:rounded-2xl'

/**
 * O X do `DialogContent` é `h-4 w-4` e mora no pacote compartilhado. Ele é o ÚLTIMO filho do
 * conteúdo, então a variante arbitrária o leva a 44px aqui, sem mexer nos outros diálogos (MOD-07).
 */
export const MEDIA_DIALOG_CLOSE_CLASSES =
  '[&>button:last-child]:right-2 [&>button:last-child]:top-2 [&>button:last-child]:flex [&>button:last-child]:h-11 [&>button:last-child]:w-11 [&>button:last-child]:items-center [&>button:last-child]:justify-center'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  images: ProductImage[]
  onImagesChange: (next: ProductImage[]) => void
  productName: string
  videoUrl: string
  onVideoUrlChange: (value: string) => void
  upload: (files: FileList | File[]) => Promise<void> | void
  progress: UploadProgress[]
  uploading: boolean
}

const ProductMediaDialog = ({
  open,
  onOpenChange,
  images,
  onImagesChange,
  productName,
  videoUrl,
  onVideoUrlChange,
  upload,
  progress,
  uploading,
}: Props) => {
  // Quem tinha o foco ao abrir ("Editar mídia" ou o item do checklist). Sem `DialogTrigger`, o Radix
  // não sabe a quem devolver e o foco cai no <body>; o mesmo padrão do visualizador (ZOM-05).
  const origem = useRef<HTMLElement | null>(null)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${MEDIA_DIALOG_CLASSES} ${MEDIA_DIALOG_CLOSE_CLASSES}`}
        onOpenAutoFocus={() => {
          // O `FocusScope` dispara isto antes de mover o foco: `activeElement` ainda é a origem.
          origem.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        }}
        onCloseAutoFocus={e => {
          e.preventDefault()
          // A origem pode ter saído da página enquanto o modal estava aberto: a pendência "Ao menos
          // uma imagem" some quando a primeira foto entra, e focar um nó desconectado deixa o foco
          // no <body>. Aí o foco vai ao "Editar mídia" do Resumo, que está sempre lá
          // (BUG-20261028-foco-cai-no-body-quando-a-pendencia-de-imagem-se-resolve).
          const alvo = origem.current?.isConnected
            ? origem.current
            : document.querySelector<HTMLElement>(`[${MEDIA_FOCUS_FALLBACK_ATTR}]`)
          alvo?.focus()
          origem.current = null
        }}
      >
        <DialogHeader className="border-b border-border px-5 py-4 pr-14 text-left">
          <DialogTitle>Mídia</DialogTitle>
          <DialogDescription>Imagens e vídeo do produto. A primeira imagem é a principal.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-4" data-testid="media-dialog-body">
          <ImageGallery
            images={images}
            onChange={onImagesChange}
            productName={productName}
            upload={upload}
            progress={progress}
            uploading={uploading}
          />

          <div className="space-y-1.5">
            <Label htmlFor="product-media-video">Vídeo (URL YouTube/Vimeo)</Label>
            <Input
              id="product-media-video"
              value={videoUrl}
              onChange={event => onVideoUrlChange(event.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="h-11"
            />
          </div>
        </div>

        <DialogFooter className="items-stretch gap-3 border-t border-border px-5 py-3 sm:items-center sm:justify-between sm:space-x-0">
          <p className="text-xs text-muted-foreground">
            As mudanças entram no formulário. Grave com "Salvar" no topo da página.
          </p>
          <Button type="button" className="h-11 shrink-0" onClick={() => onOpenChange(false)}>
            Concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ProductMediaDialog
