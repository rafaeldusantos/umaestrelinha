// A imagem da variação, escolhida na própria linha da grade — feature 81 (OPV-11..15, 26, 28).
//
// Substitui o card "Imagem por variação" (PMD-06), que ficava longe da linha, numa fileira de
// miniaturas de 40px, e só conhecia foto já enviada pela galeria. Aqui a escolha mora na linha, e o
// envio de foto nova acontece no próprio modal — pelo MESMO motor da galeria (`uploadProductImages`,
// A8): um segundo caminho de upload teria validação própria e divergiria.
//
// O componente não escreve em `form.images` nem em `form.variants`: entrega o que aconteceu
// (`onImagesAdded`, `onSelect`) e quem tem o formulário decide.

import { useRef, useState } from 'react'
import { Check, ImagePlus, Upload } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@estrelinha/ui/dialog'
import { cn } from '@estrelinha/ui/lib/utils'
import type { ProductImage } from '@estrelinha/supabase/types'
import { uploadFailureMessage } from '@/shared/lib/uploadImage'
import { uploadProductImages } from '../lib/uploadProductImage'

export interface VariantImagePickerProps {
  /** O nome da variação ("Tamanho: 4,5 cm"), para o nome acessível e o título do modal. */
  label: string
  /** A imagem escolhida para a linha; `null` usa a principal. */
  imageUrl: string | null
  /** Todas as imagens do produto, na ordem da galeria. */
  images: readonly ProductImage[]
  onSelect: (url: string | null) => void
  /** As fotos enviadas pelo modal — entram na galeria do produto (modal Mídia). */
  onImagesAdded: (images: ProductImage[]) => void
  /** O mesmo sinal da galeria: enquanto `true`, o salvar do produto fica desabilitado (OPV-15). */
  onUploadingChange?: (uploading: boolean) => void
}

const VariantImagePicker = ({
  label,
  imageUrl,
  images,
  onSelect,
  onImagesAdded,
  onUploadingChange,
}: VariantImagePickerProps) => {
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [failures, setFailures] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const escolhida = imageUrl && images.some(img => img.url === imageUrl) ? imageUrl : null

  const choose = (url: string | null) => {
    onSelect(url)
    setOpen(false)
  }

  const setUploadingState = (value: boolean) => {
    setUploading(value)
    onUploadingChange?.(value)
  }

  const handleFiles = async (files: FileList | null) => {
    const list = Array.from(files ?? [])
    if (inputRef.current) inputRef.current.value = ''
    if (list.length === 0) return

    setFailures([])
    setUploadingState(true)
    let uploaded: string[] = []
    let failed: Parameters<typeof uploadFailureMessage>[0][] = []
    try {
      ;({ uploaded, failed } = await uploadProductImages(list))
    } finally {
      setUploadingState(false)
    }

    if (uploaded.length > 0) {
      onImagesAdded(uploaded.map(url => ({ url, alt: null, source: 'upload' as const })))
      onSelect(uploaded[0])
    }
    // Com alguma falha o modal fica aberto: a mensagem tem de ser lida, e fechar a esconderia.
    if (failed.length > 0) setFailures(failed.map(uploadFailureMessage))
    else setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Imagem de ${label}`}
        onClick={() => {
          setFailures([])
          setOpen(true)
        }}
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg',
          escolhida ? 'border border-border' : 'border border-dashed border-border text-muted-foreground',
        )}
      >
        {escolhida ? (
          <img src={escolhida} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        {/* Altura máxima da viewport e rolagem por dentro: com as 28 fotos do maior produto do
            catálogo, o modal centrado por `translate` perdia o topo — título e "Usar a principal"
            fora da tela e sem rolagem (QA da 81). */}
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Imagem de {label}</DialogTitle>
            <DialogDescription>A foto que esta variação mostra na loja.</DialogDescription>
          </DialogHeader>

          {images.length === 0 && (
            <p className="text-sm text-muted-foreground">Este produto ainda não tem imagens.</p>
          )}

          <div className="grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-2">
            <button
              type="button"
              aria-pressed={escolhida === null}
              onClick={() => choose(null)}
              className={cn(
                'flex aspect-square min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-lg border-2 p-1 text-center text-xs',
                escolhida === null ? 'border-primary text-foreground' : 'border-border text-muted-foreground',
              )}
            >
              {escolhida === null && <Check className="h-4 w-4" aria-hidden="true" />}
              Usar a principal
            </button>
            {images.map((image, index) => (
              <button
                key={image.url}
                type="button"
                aria-label={`Imagem ${index + 1}`}
                aria-pressed={escolhida === image.url}
                onClick={() => choose(image.url)}
                className={cn(
                  'aspect-square min-h-11 min-w-11 overflow-hidden rounded-lg border-2',
                  escolhida === image.url ? 'border-primary' : 'border-border',
                )}
              >
                <img src={image.url} alt={image.alt ?? ''} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>

          {failures.length > 0 && (
            <div role="alert" className="space-y-1 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
              {failures.map(message => (
                <p key={message}>{message}</p>
              ))}
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            data-testid="variant-image-input"
            onChange={event => handleFiles(event.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {uploading ? 'Enviando…' : 'Adicionar imagens'}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default VariantImagePicker
