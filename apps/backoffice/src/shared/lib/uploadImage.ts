// O envio de imagem do painel — **um motor, três chamadores**.
//
// Ele nasceu dentro de `features/product-form/lib/uploadProductImage.ts`, e ficou lá enquanto quem
// subia arte era só o produto. Depois a Home passou a gravar em `home-images` (feature 24,
// `uploadHomeImage`) importando de `@/features/product-form`, e agora o banner do menu (feature 39)
// precisa do mesmo motor. **Feature importando de feature é a fronteira FSD ao contrário**: quem é
// compartilhado por dois consumidores mora em `shared/`, e a foto do produto vira só mais um deles.
//
// O que **não** veio junto: `uploadProductImage`, o lote e o apagar. Aqueles são regra do
// formulário de produto — quem sobe render de mockup ou banner de menu manda `Blob`, e não tem lote
// nem galeria. A validação de tipo e tamanho veio, porque ela é sobre IMAGEM e não sobre produto: os
// três chamadores recusam o mesmo PDF de 40 MB, e duas cópias da régua divergiriam no primeiro
// formato novo.

import { supabase } from '@estrelinha/supabase/client'
import { STORAGE_CACHE_CONTROL } from '@estrelinha/core/media'

/**
 * O host que monta a URL pública do objeto no Storage.
 *
 * **O `|| 'https://<ref>.supabase.co'` que vivia aqui morreu com a mudança de casa** — é a `BL-009`
 * fechada, e não reduzida. Ele era inalcançável na prática (o client de `@estrelinha/supabase`
 * LANÇA no carregamento do módulo sem `VITE_SUPABASE_URL`, e a primeira linha deste arquivo importa
 * esse client), mas "inalcançável hoje" é exatamente a forma que um fallback tem antes de virar
 * defeito: bastava alguém dar um default ao client para toda imagem enviada passar a apontar para
 * outro projeto, **sem erro em lugar nenhum**. Antes de 2026-08-29 o valor cravado era um ref que
 * nem existe na conta.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

/** O bucket padrão: a foto do produto, que era o único destino antes da feature 24. */
const BUCKET = 'product-images'
/** A pasta padrão dentro de `product-images`. */
const FOLDER = 'products'

/**
 * PMD-02 AC 5: era 1200 px — pequeno demais para o zoom de uma vitrine que vende detalhe. O teto
 * vale para o maior lado; imagem menor nunca é ampliada.
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

/**
 * Tipo e tamanho, **sem tocar no arquivo**. É pura de propósito: é o que permite recusar antes de
 * `compressImage`, e é a ordem que importa — validar depois da compressão é validar tarde demais,
 * porque o arquivo já entrou no canvas (que é onde a aba travava).
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
   * A arte da Home mora em `home-images` (feature 24) e a do banner do menu também: bucket próprio
   * porque a policy, o ciclo de vida e quem apaga são outros — um banner de campanha não é foto de
   * produto, e misturá-los faria a limpeza de um alcançar o outro.
   */
  bucket?: string
  /** A pasta dentro do bucket. Default `products`. */
  folder?: string
}

/**
 * O prefixo público de um bucket — o **único** lugar que sabe montar esse endereço.
 *
 * Existe porque `deleteProductImage` precisa desfazer a conta que `uploadImageBlob` faz. Com as duas
 * escritas soltas, mudar o formato do endereço em uma delas faria o apagar deixar de casar o
 * prefixo e sair silenciosamente sem apagar nada — a assinatura do "defeito 01".
 */
export const storagePublicPrefix = (bucket: string): string =>
  `${SUPABASE_URL}/storage/v1/object/public/${bucket}/`

/**
 * Comprime e redimensiona: no máximo `maxDimension` px no maior lado.
 *
 * Aceita qualquer `Blob` (um `File` é um `Blob`), e é isso que faz o render do estúdio de mockup —
 * que não tem nome de arquivo — passar pelo mesmo caminho da foto escolhida no disco.
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
        WEBP_QUALITY,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')) }
    img.src = url
  })

/**
 * Comprime um `Blob` e o grava no Storage. Devolve a URL pública, ou `null` se algo falhou.
 *
 * **Nunca lança**: quem chama é uma tela, e uma exceção aqui derrubaria o formulário inteiro por
 * causa de uma foto. `null` é "não há o que gravar", e é o que impede a seção (ou o banner) de ficar
 * com arte pela metade.
 *
 * **`bucket` e `folder` têm default, e o default é o que estava cravado** (feature 24): o destino
 * era `product-images/products` em duas linhas literais — a do `upload` e a que monta a URL pública.
 * Generalizar sem default mudaria o comportamento dos chamadores existentes para acrescentar um novo.
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
        // `PRF-05`: um ano, do dono único em `@estrelinha/core/media`. O caminho carrega um UUID,
        // então o objeto é imutável — uma hora de cache era desperdício puro, e ainda fazia cada
        // revisita repetir a transformação do `render/image`.
        //
        // A regra chegou pela feature 38, quando o motor ainda morava em
        // `features/product-form/lib/uploadProductImage.ts`. Ele mudou de casa na 39 (T19) e o
        // ajuste veio junto: mudança de endereço não pode custar comportamento.
        cacheControl: STORAGE_CACHE_CONTROL,
        upsert: false,
      })

    if (error) {
      console.error('Upload error:', error)
      return null
    }

    return `${storagePublicPrefix(bucket)}${filePath}`
  } catch (err) {
    console.error('Compression error:', err)
    return null
  }
}
