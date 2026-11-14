// Qual perfil de estilo a loja veste agora — o atributo do perfil no `<html>`.
//
// A configuração chega pelo navegador DEPOIS da primeira pintura; trocar a paleta ali seria a cor
// mudando diante da cliente (RN-04). Por isso o servidor escreve o perfil no `<html>` (a função
// `api/page`), e é esse veredito que vale na carga do documento. A regra inteira:
//
// - na carga, vale o atributo escrito pelo servidor, mesmo que a configuração diga outra coisa — a
//   página que veio do cache com o perfil anterior continua nele com a página parada;
// - depois da primeira troca de rota, decide a configuração — e voltar à entrada da carga não devolve
//   a decisão ao atributo;
// - sem o atributo (dev, prévia, leitura do servidor que falhou), decide a configuração;
// - enquanto a configuração não chegou, o `<html>` não é tocado;
// - em prévia no painel, o rascunho escolhido e ainda não salvo vence tudo.
//
// O atributo é sempre ESCRITO com o perfil, o Padrão inclusive, nunca removido: é a mesma forma que o
// servidor usa, e para o CSS as duas são equivalentes.
//
// Montado no `App.tsx` dentro do `BrowserRouter` (a troca de rota vem do roteador), fora das `Routes`:
// o checkout e o 404 vivem fora do `StoreLayout` e vestem o perfil também.

import { useLayoutEffect, useState } from 'react'
import { STYLE_PROFILES, STYLE_PROFILE_ATTRIBUTE, type StyleProfile } from '@estrelinha/core/appearance'
import { useStyleProfile } from '@estrelinha/core/hooks/useStyleProfile'
import { useNavigatedSinceLoad } from '@/shared/lib/useNavigatedSinceLoad'
import { useStyleProfilePreview } from './useStyleProfilePreview'

/** O que o servidor escreveu no `<html>`. Qualquer outro valor é "não sei" — decide a configuração. */
const lerAtributo = (): StyleProfile | null => {
  if (typeof document === 'undefined') return null
  const valor = document.documentElement.getAttribute(STYLE_PROFILE_ATTRIBUTE)
  return valor !== null && (STYLE_PROFILES as readonly string[]).includes(valor) ? (valor as StyleProfile) : null
}

const StyleProfileApplier = () => {
  const [atributo] = useState(lerAtributo)
  const navegou = useNavigatedSinceLoad()
  const { profile: salvo, isLoading } = useStyleProfile()
  const { preview, draft } = useStyleProfilePreview()

  let emVigor: StyleProfile | null
  if (preview && draft) emVigor = draft
  else if (!navegou && atributo) emVigor = atributo
  else emVigor = isLoading ? null : salvo

  useLayoutEffect(() => {
    if (emVigor === null) return
    document.documentElement.setAttribute(STYLE_PROFILE_ATTRIBUTE, emVigor)
  }, [emVigor])

  return null
}

export default StyleProfileApplier
