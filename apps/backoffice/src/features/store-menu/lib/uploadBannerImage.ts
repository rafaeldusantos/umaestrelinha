// A arte do banner do painel do menu (feature 39, `NAV-33`).
//
// **O bucket é o `home-images`, e a escolha é deliberada.** Ele nasceu na feature 24 com um motivo
// que descreve exatamente este arquivo: "banner de campanha **sobrevive** à coleção que ele
// apontava, e uma limpeza futura de imagem órfã de produto não pode alcançá-lo". A arte do menu tem
// o mesmo ciclo de vida e a mesma policy (leitura pública, escrita só de admin) — é o mesmo tipo de
// objeto, anunciado noutra vaga.
//
// Um bucket `menu-images` exigiria migration, e a da feature 39 **já está aplicada** (`AD-017`:
// migration aplicada é imutável, correção vem em migration nova). Criar um bucket para separar duas
// artes de campanha seria pagar uma migration por uma pasta — que é o que a pasta `menu/` já
// resolve, sem dividir a policy em duas que precisariam ser mantidas iguais.

import { uploadFailureMessage, uploadImageBlob, validateImageFile } from '@/shared/lib/uploadImage'

export const BANNER_BUCKET = 'home-images'
export const BANNER_FOLDER = 'menu'

/**
 * O resultado do envio.
 *
 * Dois campos chapados, e **não** uma união discriminada por `ok`: `strictNullChecks: false` não
 * estreita união por literal booleano, e ler o motivo no ramo do `else` seria TS2339. Mesmo formato
 * de veredito de `uploadHomeImage` e das recusas de `@estrelinha/core/menu`.
 */
export interface BannerUpload {
  url: string | null
  error: string | null
}

/**
 * Valida, comprime e grava — nesta ordem, que é a que importa.
 *
 * Validar depois de comprimir é validar tarde: o arquivo de 40 MB já entrou no canvas, que é onde a
 * aba trava. A régua é a mesma dos outros dois chamadores (`validateImageFile`), porque a resposta
 * para o mesmo PDF de 40 MB não pode depender da tela em que ele foi solto.
 */
export const uploadBannerImage = async (file: File): Promise<BannerUpload> => {
  const invalido = validateImageFile(file)
  if (invalido) {
    return { url: null, error: uploadFailureMessage({ file: file.name, reason: invalido }) }
  }

  const url = await uploadImageBlob(file, { bucket: BANNER_BUCKET, folder: BANNER_FOLDER })
  return url
    ? { url, error: null }
    : { url: null, error: uploadFailureMessage({ file: file.name, reason: 'upload' }) }
}
