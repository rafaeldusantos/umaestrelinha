import { supabase } from '@estrelinha/supabase/client'

const BUCKET = 'mockup-templates'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zwvrqtjvaltpbevjqzks.supabase.co'

export type MockupAssetKind = 'background' | 'overlay'

/**
 * Sobe um asset de template (fundo ou overlay) ao bucket `mockup-templates`.
 * Envia o arquivo **cru**, sem recompressão — diferente de uploadProductImage
 * (WebP com perda) para **preservar a transparência (alpha)** do overlay PNG.
 */
export const uploadMockupAsset = async (
  file: File,
  kind: MockupAssetKind
): Promise<string | null> => {
  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const folder = kind === 'overlay' ? 'overlays' : 'backgrounds'
    const filePath = `${folder}/${crypto.randomUUID()}.${ext}`

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, {
        contentType: file.type || 'image/png',
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Mockup asset upload error:', error)
      return null
    }

    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filePath}`
  } catch (err) {
    console.error('Mockup asset upload error:', err)
    return null
  }
}

export const deleteMockupAsset = async (url: string) => {
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`
  if (!url.startsWith(prefix)) return
  const path = url.replace(prefix, '')
  await supabase.storage.from(BUCKET).remove([path])
}
