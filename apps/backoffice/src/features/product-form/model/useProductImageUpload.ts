// ADI-03..06 — o único dono do envio de imagens da página do produto (design, Abordagem A).
//
// Até a `85` quem enviava era o `ImageGallery`, sozinho. Agora há DUAS superfícies que enviam (o
// Resumo e o modal Mídia), e a spec exige o mesmo progresso nas duas. Dois estados de envio
// brigariam pelo `uploading` da página: o primeiro lote a terminar destravaria o salvar com o outro
// ainda no ar. Por isso o "envio no ar" é um CONTADOR de lotes, não um booleano.
//
// O corpo é o `handleFiles` da galeria, movido sem mudar o comportamento: o mesmo motor
// (`uploadProductImages`, ADI-06), um toast por falha com `uploadFailureMessage` e o lote parcial
// seguindo (ADI-05), e o toast de sucesso com a mesma frase.

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from '@estrelinha/ui/hooks/use-toast'
import { uploadFailureMessage } from '@/shared/lib/uploadImage'
import { uploadProductImages, type UploadProgress } from '../lib/uploadProductImage'

/**
 * Quanto tempo as linhas "enviada" ficam na tela depois de o ÚLTIMO lote terminar
 * (BUG-20261028-linhas-de-envio-ficam-na-tela). Sem prazo, elas ficavam para sempre — até a de uma
 * foto já removida no modal, ao lado de "Nenhuma imagem ainda". As linhas "falhou" NÃO saem: a Adri
 * precisa ler qual arquivo não entrou, e o toast da falha some sozinho. Elas saem no próximo envio.
 */
export const UPLOAD_DONE_LINGER_MS = 4000

export interface UseProductImageUploadOptions {
  /** As URLs enviadas com sucesso, na ordem do lote. Quem anexa no FIM é a página (ADI-04). */
  onUploaded: (urls: string[]) => void
  /** `true` quando o primeiro lote começa, `false` quando o ÚLTIMO termina. */
  onUploadingChange?: (busy: boolean) => void
}

export interface ProductImageUpload {
  upload: (files: FileList | File[]) => Promise<void>
  progress: UploadProgress[]
  uploading: boolean
}

export const useProductImageUpload = ({
  onUploaded,
  onUploadingChange,
}: UseProductImageUploadOptions): ProductImageUpload => {
  const [progress, setProgress] = useState<UploadProgress[]>([])
  const [uploading, setUploading] = useState(false)
  const active = useRef(0)
  /** A limpeza das linhas "enviada", agendada quando o último lote termina. */
  const limpeza = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelarLimpeza = () => {
    if (limpeza.current !== null) clearTimeout(limpeza.current)
    limpeza.current = null
  }
  useEffect(() => cancelarLimpeza, [])
  // Os callbacks em ref: um lote que termina depois de um re-render chama o callback VIGENTE, não o
  // que existia quando ele começou (senão a página anexaria sobre uma lista velha de imagens).
  const callbacks = useRef({ onUploaded, onUploadingChange })
  callbacks.current = { onUploaded, onUploadingChange }

  const upload = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files)
    if (!list.length) return

    // Um lote novo no ar: a limpeza agendada pelo anterior não pode tirar as linhas deste.
    cancelarLimpeza()
    if (active.current === 0) {
      // Um envio novo, sem outro no ar, começa com o progresso limpo (como a galeria fazia). Com um
      // lote já correndo, as linhas se somam: as duas superfícies mostram o mesmo progresso.
      setProgress([])
      setUploading(true)
      callbacks.current.onUploadingChange?.(true)
    }
    active.current += 1

    let result: Awaited<ReturnType<typeof uploadProductImages>>
    try {
      result = await uploadProductImages(list, event =>
        // Uma linha por arquivo: o evento seguinte do mesmo arquivo substitui o anterior.
        setProgress(current => [...current.filter(p => p.file !== event.file), event]),
      )
      // As imagens entram ANTES de o salvar destravar, na mesma ordem da galeria de antes.
      if (result.uploaded.length) callbacks.current.onUploaded(result.uploaded)
    } finally {
      active.current -= 1
      if (active.current === 0) {
        setUploading(false)
        callbacks.current.onUploadingChange?.(false)
        // Só quando TODOS os lotes terminaram: com outro no ar, o progresso dele não pode encolher.
        limpeza.current = setTimeout(() => {
          limpeza.current = null
          setProgress(current => current.filter(p => p.status !== 'done'))
        }, UPLOAD_DONE_LINGER_MS)
      }
    }

    const { uploaded, failed } = result
    // Falha parcial não cancela o lote: cada rejeitado é nomeado com o motivo (ADI-05).
    for (const failure of failed) {
      toast({ title: uploadFailureMessage(failure), variant: 'destructive' })
    }
    if (uploaded.length) toast({ title: `${uploaded.length} imagem(ns) enviada(s)!` })
  }, [])

  return { upload, progress, uploading }
}
