import { supabase } from '@estrelinha/supabase/client'

const BUCKET = 'product-images'
/**
 * A pasta padrão dentro de `product-images`.
 *
 * Existe como constante desde a feature 24, quando `uploadImageBlob` passou a aceitar bucket e pasta
 * (a Home grava em `home-images`). **Os dois defaults são exatamente o que estava cravado antes**, e
 * é isso que faz nenhum chamador existente mudar de comportamento.
 */
const FOLDER = 'products'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zwvrqtjvaltpbevjqzks.supabase.co'
/**
 * PMD-02 AC 5: era 1200 px — pequeno demais para o zoom de uma vitrine que vende detalhe de
 * estampa. O teto vale para o maior lado; imagem menor nunca é ampliada.
 */
const MAX_DIMENSION = 1600
const WEBP_QUALITY = 0.82

/** PMD-02 AC 4 (A21): o teto do artboard, medido no arquivo ORIGINAL. */
export const MAX_FILE_BYTES = 8 * 1024 * 1024
/** A copy da dropzone diz exatamente estes três (PMD-02 AC 6). */
export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

export type UploadRejectReason = 'type' | 'size' | 'upload'

/** Erro tipado — o `null` mudo de antes não dizia qual arquivo nem por quê. */
export interface UploadFailure {
  file: string
  reason: UploadRejectReason
}

export type UploadOutcome = { ok: true; url: string } | { ok: false; failure: UploadFailure }

/** Um evento por transição de arquivo. Alimenta o progresso individual de PMD-04 AC 7. */
export interface UploadProgress {
  file: string
  size: number
  status: 'uploading' | 'done' | 'error'
  reason?: UploadRejectReason
}

/**
 * Tipo e tamanho, **sem tocar no arquivo**. É pura de propósito: é o que permite recusar antes de
 * `compressImage`, e é a ordem que importa — validar depois da compressão é validar tarde demais,
 * porque o arquivo já entrou no canvas.
 */
export const validateImageFile = (file: File): UploadRejectReason | null => {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) return 'type'
  if (file.size > MAX_FILE_BYTES) return 'size'
  return null
}

const MB = 1024 * 1024

/** Mensagem para a tela: nomeia o arquivo e o motivo (PMD-02 AC 4). */
export const uploadFailureMessage = ({ file, reason }: UploadFailure): string => {
  if (reason === 'type') return `${file}: formato não aceito — use PNG, JPG ou WebP`
  if (reason === 'size') return `${file}: maior que ${MAX_FILE_BYTES / MB} MB`
  return `${file}: falha ao enviar`
}

/** Formatos de saída que o estúdio oferece (PMD-05 AC 5). */
export type ImageFormat = 'image/webp' | 'image/png'

export interface UploadOptions {
  /** Maior lado do arquivo gravado. Default 1600 px. */
  maxDimension?: number
  /** Default WebP. O estúdio pode pedir PNG. */
  format?: ImageFormat
  /**
   * O bucket do Storage. Default `product-images`.
   *
   * A arte da Home mora em `home-images` (feature 24): bucket próprio porque a policy, o ciclo de
   * vida e quem apaga são outros — um banner de campanha não é foto de produto, e misturá-los faria
   * a limpeza de um alcançar o outro.
   */
  bucket?: string
  /** A pasta dentro do bucket. Default `products`. */
  folder?: string
}

/**
 * Compress & resize an image, max `maxDimension` px on longest side.
 * Accepts any Blob (File is a Blob), so it also serves mockup render blobs.
 */
const compressImage = (
  file: Blob,
  maxDimension: number,
  format: ImageFormat,
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
        format,
        WEBP_QUALITY
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')) }
    img.src = url
  })

/**
 * Compress a Blob to WebP (≤1600px) and upload it to `product-images/products`.
 * Shared by product image uploads and mockup render blobs.
 *
 * A assinatura `Blob → url | null` é contrato do `MockupStudioDialog`, que sobe renders sem nome de
 * arquivo — por isso a validação nominal mora em `uploadProductImage`, não aqui.
 *
 * As opções existem porque o estúdio deixa o admin escolher resolução e formato (PMD-05 AC 5).
 * Sem elas o seletor seria decorativo: qualquer escolha viraria WebP de 1600 px no Storage — a
 * mesma classe de mentira entre tela e código que esta feature existe para matar.
 *
 * **`bucket` e `folder` têm default, e o default é o que estava cravado** (feature 24): o destino
 * era `product-images/products` em duas linhas literais — a do `upload` e a que monta a URL pública.
 * Generalizar sem default mudaria o comportamento de três chamadores para acrescentar um quarto.
 */
export const uploadImageBlob = async (
  blob: Blob,
  {
    maxDimension = MAX_DIMENSION,
    format = 'image/webp',
    bucket = BUCKET,
    folder = FOLDER,
  }: UploadOptions = {},
): Promise<string | null> => {
  try {
    const compressed = await compressImage(blob, maxDimension, format)
    const fileName = `${crypto.randomUUID()}.${format === 'image/png' ? 'png' : 'webp'}`
    const filePath = `${folder}/${fileName}`

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, compressed, {
        contentType: format,
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Upload error:', error)
      return null
    }

    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`
  } catch (err) {
    console.error('Compression error:', err)
    return null
  }
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
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`
  if (!url.startsWith(prefix)) return
  const path = url.replace(prefix, '')
  await supabase.storage.from(BUCKET).remove([path])
}
