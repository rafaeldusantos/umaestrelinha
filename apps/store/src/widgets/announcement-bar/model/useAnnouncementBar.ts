// Se a faixa de avisos existe nesta visita, e com quais avisos.
//
// A configuração chega pelo navegador DEPOIS da primeira pintura; uma faixa aparecendo ali empurraria
// a página inteira para baixo (o CLS que a feature 40 mediu e fechou). Por isso o servidor escreve no
// `<html>` se a faixa existe (`data-faixa`, a função `api/page`), e é esse veredito que decide na carga
// do documento. A regra inteira:
//
// - `"1"`: a faixa ocupa a vaga desde a primeira renderização; a configuração só a preenche. Sem aviso
//   válido na configuração, a vaga fica ouro e sem texto até a próxima troca de rota.
// - `"0"`: a faixa não existe, mesmo que a configuração diga o contrário.
// - ausente (dev, prévia, leitura do servidor que falhou): decide a configuração.
// - depois da primeira troca de rota no navegador, decide a configuração — o atributo é da carga do
//   documento, não de cada página.
// - em prévia, decide o rascunho do painel (e o publicado enquanto ele não chega).

import { useMemo, useState } from 'react'
import {
  announcementBarExists,
  announcementRefusal,
  normalizeAnnouncements,
  type Announcement,
  type AnnouncementSettings,
} from '@estrelinha/core/announcements'
import { useStoreSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { ANNOUNCEMENT_BAR_ATTRIBUTE } from '@estrelinha/core/page'
import { useNavigatedSinceLoad } from '@/shared/lib/useNavigatedSinceLoad'
import { useAnnouncementPreview } from './useAnnouncementPreview'

type Veredito = '1' | '0' | null

/** O que o servidor escreveu no `<html>`. Qualquer outro valor é "não sei" — decide a configuração. */
const lerAtributo = (): Veredito => {
  if (typeof document === 'undefined') return null
  const valor = document.documentElement.getAttribute(ANNOUNCEMENT_BAR_ATTRIBUTE)
  return valor === '1' || valor === '0' ? valor : null
}

/** Os avisos que o painel aceitaria, na ordem gravada. O inválido é pulado, nunca apagado. */
const avisosValidos = (settings: AnnouncementSettings): Announcement[] =>
  settings.items.filter((item, i) => announcementRefusal(item, i) === null)

export interface AnnouncementBarState {
  /** A faixa existe — o elemento é desenhado e ocupa a vaga. */
  visible: boolean
  /** Os avisos a desenhar. Vazio com `visible` é a vaga reservada, ouro e sem texto. */
  items: Announcement[]
  /** Em prévia no painel: a faixa não gira sozinha. */
  preview: boolean
  /** "Mostre o aviso N", já traduzido para a posição na lista de `items` (ou `null`). */
  show: { index: number; vez: number } | null
}

export const useAnnouncementBar = (): AnnouncementBarState => {
  const { data } = useStoreSettings()
  const publicado = useMemo(
    () => (data ? normalizeAnnouncements((data as { announcements?: unknown }).announcements) : null),
    [data],
  )

  const { preview, draft, show } = useAnnouncementPreview(publicado?.items.length ?? 0)

  const [atributo] = useState(lerAtributo)
  // A troca de rota desde a carga, com a trava: voltar à entrada da carga pelo histórico não devolve
  // a decisão ao atributo.
  const navegou = useNavigatedSinceLoad()

  if (preview) {
    const fonte = draft ?? publicado
    const existe = announcementBarExists(fonte)
    const items = existe ? avisosValidos(fonte) : []
    let posicao: AnnouncementBarState['show'] = null
    if (show && fonte) {
      const alvo = fonte.items[show.index]
      const index = alvo ? items.findIndex(item => item.id === alvo.id) : -1
      if (index >= 0) posicao = { index, vez: show.vez }
    }
    return { visible: existe, items, preview, show: posicao }
  }

  const existeNaConfiguracao = announcementBarExists(publicado)
  const items = existeNaConfiguracao ? avisosValidos(publicado) : []

  if (!navegou && atributo === '1') return { visible: true, items, preview, show: null }
  if (!navegou && atributo === '0') return { visible: false, items: [], preview, show: null }
  return { visible: existeNaConfiguracao, items, preview, show: null }
}
