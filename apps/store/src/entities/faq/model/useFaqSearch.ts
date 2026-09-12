import { useMemo } from 'react'
import { faqQuestionKey, type FaqPageGroup } from '@estrelinha/core/faq'

/**
 * O filtro da página de perguntas — `FAQL-04`, `FAQL-05`.
 *
 * **No cliente, e por `faqQuestionKey`.** São dezenas de entradas, não milhares, e a página já as
 * tem todas em mãos — buscar no servidor exigiria índice de texto **e** uma segunda normalização,
 * que divergiria desta no primeiro ajuste. É o mesmo normalizador que a biblioteca usa para
 * deduplicar e que `/admin/perguntas` usa para buscar: um dono, três consumidores.
 *
 * **Filtra por pergunta E resposta.** Quem procura "motoboy" não sabe que a palavra está no meio da
 * resposta sobre envio — e uma busca que só olha o título manda essa pessoa embora com a informação
 * na tela, escondida atrás de um acordeão fechado.
 *
 * **Assunto que ficou sem resultado some**, pelo mesmo motivo de `resolveFaqPage`: um cabeçalho
 * sobre seção vazia promete conteúdo que não existe. Mas os cabeçalhos que sobram **ficam** — quem
 * busca precisa saber de onde veio cada resposta.
 */
export const useFaqSearch = (groups: readonly FaqPageGroup[] | null | undefined, termo: string) =>
  useMemo(() => {
    const chave = faqQuestionKey(termo)
    const todos = groups ?? []

    if (chave === '') {
      return {
        groups: todos,
        /** Quantas perguntas a página mostra agora. */
        matches: todos.reduce((n, g) => n + g.items.length, 0),
        /** A busca está ativa? Separa "nada casou" de "ainda não há perguntas" (`FAQL-09`). */
        searching: false,
      }
    }

    const filtrados = todos.reduce<FaqPageGroup[]>((saida, grupo) => {
      const items = grupo.items.filter(
        item =>
          faqQuestionKey(item.question).includes(chave) ||
          faqQuestionKey(item.answer).includes(chave),
      )
      if (items.length > 0) saida.push({ ...grupo, items })
      return saida
    }, [])

    return {
      groups: filtrados,
      matches: filtrados.reduce((n, g) => n + g.items.length, 0),
      searching: true,
    }
  }, [groups, termo])
