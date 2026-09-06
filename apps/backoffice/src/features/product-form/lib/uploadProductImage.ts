// O upload de imagem **do produto** — o arquivo nomeado, o lote e o apagar.
//
// O motor (validar → comprimir → gravar no Storage) saiu daqui na feature 39: mora em
// `@/shared/lib/uploadImage`, porque a Home (feature 24) e o banner do menu (feature 39) também o
// consomem, e feature importando de feature é a fronteira FSD ao contrário. O que ficou aqui é o que
// **só o produto** tem: o lote da galeria, o progresso por arquivo e o apagar do bucket dele.

import { supabase } from '@estrelinha/supabase/client'
import {
  storagePublicPrefix,
  uploadImageBlob,
  validateImageFile,
  type UploadFailure,
  type UploadRejectReason,
} from '@/shared/lib/uploadImage'

// Os TIPOS são reexportados; as funções não. `UploadOutcome` e `UploadProgress` falam de
// `UploadFailure`, e quem lê o retorno do lote precisa do tipo — reexportar um tipo não cria segundo
// dono de comportamento. Já `validateImageFile` e `uploadFailureMessage` continuam com um endereço
// só (`@/shared/lib/uploadImage`): duas portas para a mesma régua é o defeito 01.
export type { UploadFailure, UploadRejectReason }

const BUCKET = 'product-images'

export type UploadOutcome = { ok: true; url: string } | { ok: false; failure: UploadFailure }

/** Um evento por transição de arquivo. Alimenta o progresso individual de PMD-04 AC 7. */
export interface UploadProgress {
  file: string
  size: number
  status: 'uploading' | 'done' | 'error'
  reason?: UploadRejectReason
}

/** Um arquivo: valida, comprime, sobe. Nunca lança — o erro vem tipado no retorno. */
export const uploadProductImage = async (file: File): Promise<UploadOutcome> => {
  const invalid = validateImageFile(file)
  if (invalid) return { ok: false, failure: { file: file.name, reason: invalid } }

  const url = await uploadImageBlob(file)
  return url
    ? { ok: true, url }
    : { ok: false, failure: { file: file.name, reason: 'upload' } }
}

/**
 * O lote. Falha parcial **não** cancela: os válidos sobem e os inválidos voltam nomeados um a um.
 * A ordem dos eventos e das falhas é a ordem em que o admin soltou os arquivos.
 */
export const uploadProductImages = async (
  files: readonly File[],
  onProgress?: (progress: UploadProgress) => void,
): Promise<{ uploaded: string[]; failed: UploadFailure[] }> => {
  const uploaded: string[] = []
  const failed: UploadFailure[] = []

  for (const file of files) {
    const invalid = validateImageFile(file)
    if (invalid) {
      failed.push({ file: file.name, reason: invalid })
      onProgress?.({ file: file.name, size: file.size, status: 'error', reason: invalid })
      continue
    }

    onProgress?.({ file: file.name, size: file.size, status: 'uploading' })
    const url = await uploadImageBlob(file)
    if (url) {
      uploaded.push(url)
      onProgress?.({ file: file.name, size: file.size, status: 'done' })
    } else {
      failed.push({ file: file.name, reason: 'upload' })
      onProgress?.({ file: file.name, size: file.size, status: 'error', reason: 'upload' })
    }
  }

  return { uploaded, failed }
}

export const deleteProductImage = async (url: string) => {
  const prefix = storagePublicPrefix(BUCKET)
  if (!url.startsWith(prefix)) return
  const path = url.replace(prefix, '')
  await supabase.storage.from(BUCKET).remove([path])
}
