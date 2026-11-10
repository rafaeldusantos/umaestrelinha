// Abre um comprovante do pagamento registrado à mão. O bucket é PRIVADO: o arquivo só abre por uma
// URL assinada, curta (`RECEIPT_LINK_SECONDS`), gerada na hora para quem é admin.
//
// A janela abre DENTRO do clique, antes da rede — depois de um `await` o navegador a bloquearia como
// pop-up. HEIC não abre em navegador nenhum fora do Safari: vai como download.

import { supabase } from '@estrelinha/supabase/client'
import { RECEIPTS_BUCKET, RECEIPT_LINK_SECONDS } from '@estrelinha/core/orders'

export type DesfechoDoComprovante = 'aberto' | 'bloqueada' | 'falhou'

const ehDownload = (contentType: string): boolean => contentType === 'image/heic' || contentType === 'image/heif'

export async function abrirComprovante(path: string, contentType: string): Promise<DesfechoDoComprovante> {
  const janela = window.open('', '_blank')
  if (!janela) return 'bloqueada'
  janela.opener = null
  try {
    const { data, error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .createSignedUrl(path, RECEIPT_LINK_SECONDS, ehDownload(contentType) ? { download: true } : undefined)
    if (error || !data?.signedUrl) {
      janela.close()
      return 'falhou'
    }
    janela.location.href = data.signedUrl
    return 'aberto'
  } catch {
    janela.close()
    return 'falhou'
  }
}
