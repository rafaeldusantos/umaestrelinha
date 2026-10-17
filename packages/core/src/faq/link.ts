// O endereço próprio de cada pergunta da página de perguntas frequentes.
//
// `/perguntas-frequentes/quanto-de-cinzas-preciso-enviar-3f9a1c2e`
//
// Até aqui uma pergunta só era alcançável por âncora (`#p-<id>`), e o rastreador **descarta o
// fragmento**: para o Google as 67 perguntas eram uma página só. Um caminho por pergunta é o que
// deixa cada uma ser indexada, e é o link que a Adri manda por WhatsApp.
//
// **Quem acha a pergunta é a CHAVE do fim, nunca o texto.** O texto está ali para quem lê o link e
// para o buscador; a chave são os 8 primeiros caracteres do `id`. Corrigir uma vírgula na pergunta
// muda o texto do endereço, e o link antigo continua chegando nela — a página o troca pelo novo
// (canonical). É a mesma razão pela qual a âncora antiga era o `id` e não um slug do título: a dona
// edita a pergunta no painel, e link compartilhado não pode quebrar por isso.
//
// Mora em `core` porque dois consumidores escrevem o mesmo endereço: a página da loja (canonical e
// botão de copiar) e a edge function do sitemap. Escrito duas vezes, o sitemap anunciaria uma URL e a
// página declararia outra como canônica. Imports com `.ts` explícito: o Deno do sitemap chega aqui
// por caminho relativo.

import { FAQ_PATH } from '../routes/routes.ts'

/** Quantos caracteres do `id` vão no fim do endereço. 8 hex são 4 bilhões de valores. */
export const FAQ_LINK_KEY_LENGTH = 8

/** Teto do texto do endereço — o bastante para ler a pergunta, sem virar uma frase inteira. */
const SLUG_MAX = 60

/**
 * O texto do endereço: minúsculas, sem acento, palavras separadas por hífen.
 *
 * Cortado no limite de palavra: um endereço terminando em `quanto-de-cinz` lê como erro de digitação.
 */
export const faqQuestionSlug = (question: string | null | undefined): string => {
  const base = String(question ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (base.length <= SLUG_MAX) return base
  const cortado = base.slice(0, SLUG_MAX)
  const ultimoHifen = cortado.lastIndexOf('-')
  return (ultimoHifen > 0 ? cortado.slice(0, ultimoHifen) : cortado).replace(/-+$/, '')
}

/** A chave que identifica a pergunta no endereço. */
export const faqLinkKey = (id: string): string =>
  String(id ?? '')
    .replace(/-/g, '')
    .slice(0, FAQ_LINK_KEY_LENGTH)
    .toLowerCase()

/** O segmento do endereço: texto + chave. Pergunta sem texto aproveitável vira só a chave. */
export const faqQuestionSegment = (item: { id: string; question: string }): string => {
  const slug = faqQuestionSlug(item.question)
  const chave = faqLinkKey(item.id)
  return slug === '' ? chave : `${slug}-${chave}`
}

/** `/perguntas-frequentes/<texto>-<chave>` — o endereço canônico da pergunta. */
export const faqQuestionPath = (item: { id: string; question: string }): string =>
  `${FAQ_PATH}/${faqQuestionSegment(item)}`

/**
 * A chave que um segmento de endereço carrega, ou `null` quando ele não tem uma.
 *
 * Lê só o fim: tudo antes do último hífen é texto, e texto pode ter mudado.
 */
export const faqLinkKeyFromSegment = (segment: string | null | undefined): string | null => {
  const valor = decodeURIComponent(String(segment ?? '')).trim().toLowerCase()
  const chave = valor.slice(valor.lastIndexOf('-') + 1)
  return new RegExp(`^[0-9a-f]{${FAQ_LINK_KEY_LENGTH}}$`).test(chave) ? chave : null
}

/**
 * A pergunta que um segmento de endereço pede, entre as da página — ou `null`.
 *
 * Duas perguntas com a mesma chave devolvem `null` em vez de escolher uma: abrir a pergunta errada
 * num link compartilhado é pior que abrir a página sem nenhuma aberta. Com 8 caracteres de um UUID,
 * isso é teórico — e por isso mesmo a recusa é barata.
 */
export const findFaqBySegment = <T extends { id: string }>(
  items: readonly T[],
  segment: string | null | undefined,
): T | null => {
  const chave = faqLinkKeyFromSegment(segment)
  if (!chave) return null
  const achadas = items.filter(item => faqLinkKey(item.id) === chave)
  return achadas.length === 1 ? achadas[0] : null
}
