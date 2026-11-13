// A arte de um aviso da faixa — a mesma forma do envio do banner do menu (`store-menu/lib`).
//
// Bucket `home-images`, pasta `announcements`: a arte da faixa é arte de campanha, com o mesmo ciclo
// de vida e a mesma policy (leitura pública, escrita só de admin) da Home e do menu. Um bucket próprio
// exigiria migration; a pasta separa os objetos sem dividir a policy.

import {
  deleteStorageImage,
  uploadFailureMessage,
  uploadImageBlob,
  validateImageFile,
} from '@/shared/lib/uploadImage'

export const ANNOUNCEMENT_BUCKET = 'home-images'
export const ANNOUNCEMENT_FOLDER = 'announcements'

/** Dois campos chapados, e não união por `ok`: `strictNullChecks: false` não estreita booleano. */
export interface AnnouncementUpload {
  url: string | null
  error: string | null
}

/** Valida antes de comprimir, e só então grava. Nunca lança. */
export const uploadAnnouncementImage = async (file: File): Promise<AnnouncementUpload> => {
  const invalido = validateImageFile(file)
  if (invalido) {
    return { url: null, error: uploadFailureMessage({ file: file.name, reason: invalido }) }
  }

  const url = await uploadImageBlob(file, { bucket: ANNOUNCEMENT_BUCKET, folder: ANNOUNCEMENT_FOLDER })
  return url
    ? { url, error: null }
    : { url: null, error: uploadFailureMessage({ file: file.name, reason: 'upload' }) }
}

/** Apaga uma arte enviada e não gravada. Só dentro da pasta da faixa; uma URL de fora passa intacta. */
export const deleteAnnouncementImage = (url: string): Promise<void> =>
  deleteStorageImage(url, { bucket: ANNOUNCEMENT_BUCKET, folder: ANNOUNCEMENT_FOLDER })
