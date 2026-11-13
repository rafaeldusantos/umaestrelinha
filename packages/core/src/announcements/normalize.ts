// A leitura do que está gravado em `store_settings['announcements']`.
//
// O `value` é jsonb sem `check`: pode ter vindo de uma escrita direta, de uma versão antiga do painel
// ou de lixo. A leitura nunca lança — o pior caso é a faixa não existir.

import { ANNOUNCEMENT_LIMIT, type Announcement, type AnnouncementSettings } from './types.ts'

const ehObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)

const texto = (valor: unknown): string => (typeof valor === 'string' ? valor : '')

/**
 * Um aviso, só com os campos do tipo dele — ou `null` quando o tipo não é um dos conhecidos.
 *
 * O campo do outro tipo é descartado, e não carregado: um aviso de texto com `imageDesktop` ao lado
 * seria um segundo jeito de dizer "este aviso tem arte".
 */
const lerAviso = (bruto: unknown, posicao: number): Announcement | null => {
  if (!ehObjeto(bruto)) return null
  const id = texto(bruto.id).trim() || `aviso-${posicao + 1}`

  if (bruto.kind === 'text') {
    return {
      id,
      kind: 'text',
      highlight: texto(bruto.highlight),
      text: texto(bruto.text),
      linkLabel: texto(bruto.linkLabel),
      href: texto(bruto.href),
    }
  }
  if (bruto.kind === 'image') {
    return {
      id,
      kind: 'image',
      imageDesktop: texto(bruto.imageDesktop),
      imageMobile: texto(bruto.imageMobile),
      alt: texto(bruto.alt),
      href: texto(bruto.href),
    }
  }
  return null
}

/**
 * O valor gravado, na forma que os três leitores esperam. Lixo vira o padrão desligado; item de tipo
 * desconhecido sai; do sexto aviso reconhecido em diante, ignorado. Nunca lança.
 *
 * Não julga validade (texto vazio, destino externo): isso é de `announcementRefusal`, e a faixa pula o
 * aviso inválido em vez de apagá-lo do que a dona gravou.
 */
export const normalizeAnnouncements = (raw: unknown): AnnouncementSettings => {
  if (!ehObjeto(raw)) return { enabled: false, items: [] }

  const items: Announcement[] = []
  const brutos = Array.isArray(raw.items) ? raw.items : []
  for (const bruto of brutos) {
    if (items.length >= ANNOUNCEMENT_LIMIT) break
    const aviso = lerAviso(bruto, items.length)
    if (aviso) items.push(aviso)
  }

  return { enabled: raw.enabled === true, items }
}
