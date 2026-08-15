// O envio da arte da Home (feature 24, `HOME-27` e `HOME-28`).
//
// Reusa o motor do produto (`validateImageFile` → `compressImage` → Storage) e acrescenta as duas
// coisas que só a Home tem: **bucket próprio** e **aviso de proporção**.

import { aspectRatioWarning, type SlotSpec } from '@estrelinha/core/home'
import {
  uploadFailureMessage,
  uploadImageBlob,
  validateImageFile,
} from '@/features/product-form'

/**
 * O bucket da Home, separado de `product-images` (criado na T8).
 *
 * Não é zelo de organização: as duas artes têm ciclos de vida diferentes. Foto de produto some com o
 * produto; banner de campanha sobrevive à coleção que ele apontava — é o que faz `HOME-24` poder
 * dizer "a arte fica guardada aqui". Uma limpeza futura de imagem órfã de produto não pode alcançar
 * a arte da Home, e é o bucket que garante isso.
 */
export const HOME_BUCKET = 'home-images'
export const HOME_FOLDER = 'sections'

/**
 * O resultado de um envio.
 *
 * Três campos chapados, e **não** uma união discriminada por `ok`: `strictNullChecks: false` não
 * estreita união por literal booleano, e ler o motivo no ramo do `else` seria TS2339. Mesmo formato
 * de veredito das recusas de `@estrelinha/core/home` — ou há texto, ou há `null`.
 */
export interface HomeImageUpload {
  /** A URL pública, ou `null` quando **nada foi gravado**. */
  url: string | null
  /** Por que o envio não aconteceu, ou `null`. */
  error: string | null
  /**
   * A divergência de proporção — **e ela nunca impede o envio** (`HOME-27`).
   *
   * Vem preenchida junto com a `url`: recusar seria trocar um problema por outro, já que só a dona
   * sabe se o corte importa naquela peça. Quem decide o que fazer com o aviso é a tela.
   */
  warning: string | null
}

/**
 * As dimensões do arquivo **como ele veio**, antes de qualquer canvas.
 *
 * Devolve `null` quando o arquivo não decodifica; nesse caso não há aviso a dar, e o envio segue —
 * o `compressImage` logo adiante falha por conta própria e vira `error`.
 */
const naturalSize = (blob: Blob): Promise<{ width: number; height: number } | null> =>
  new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.width, height: img.height })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })

/**
 * Envia uma arte da Home e devolve a URL, o motivo da recusa e o aviso de proporção.
 *
 * **A medida sai do arquivo ORIGINAL, e a ordem é a regra** (`HOME-27`): `compressImage` reduz o
 * maior lado para 1600 px, então medir depois dele leria a arte já reescrita — e o número que a
 * mensagem devolve é justamente o que a dona usa para reexportar. Medir depois responderia sobre um
 * arquivo que ela nunca viu.
 *
 * **Falha de envio devolve `url: null`, e é o que faz `HOME-28` valer**: sem URL não há o que
 * gravar, e a seção não fica com banner pela metade. A ordem é upload → grava, nunca as duas em
 * paralelo — quem chama só escreve no banco depois de ter a URL na mão.
 */
export const uploadHomeImage = async (file: File, slot?: SlotSpec): Promise<HomeImageUpload> => {
  const invalid = validateImageFile(file)
  if (invalid) {
    return {
      url: null,
      error: uploadFailureMessage({ file: file.name, reason: invalid }),
      warning: null,
    }
  }

  const size = await naturalSize(file)
  const warning = size && slot ? aspectRatioWarning(size.width, size.height, slot) : null

  const url = await uploadImageBlob(file, { bucket: HOME_BUCKET, folder: HOME_FOLDER })
  if (!url) {
    return {
      url: null,
      error: uploadFailureMessage({ file: file.name, reason: 'upload' }),
      // Sem arquivo no Storage não há proporção a comentar: o aviso ao lado de um envio que falhou
      // faria a tela discutir o recorte de uma arte que não existe.
      warning: null,
    }
  }

  return { url, error: null, warning }
}
