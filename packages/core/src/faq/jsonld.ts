// Feature 46 — o `FAQPage` do schema.org.
//
// Mora em `core` pelo precedente de `shopping/jsonld.ts`: serialização de dado estruturado é
// **regra**, não tela. E pela mesma razão prática — o guarda de paridade precisa importar isto de
// dentro de um teste, sem arrastar React junto.
//
// ⚠️ **O texto sai de `faqAnswerPlainText`, e isso não é preferência.** O Merchant Center reprova
// oferta cujo preço do feed discorda da landing page; um `FAQPage` que declara uma resposta
// diferente da que está na tela é a mesma família de defeito, com a diferença de que ninguém
// reprova — o buscador simplesmente passa a citar um texto que a loja não mostra.

import { faqAnswerPlainText } from './text.ts'
import type { FaqPageGroup } from './types.ts'

/** Uma pergunta do `mainEntity`. Forma mínima do schema.org, sem campo decorativo. */
interface JsonLdQuestion {
  '@type': 'Question'
  name: string
  acceptedAnswer: { '@type': 'Answer'; text: string }
}

export interface FaqPageJsonLd {
  '@context': 'https://schema.org'
  '@type': 'FAQPage'
  url?: string
  mainEntity: JsonLdQuestion[]
}

/**
 * O documento `FAQPage` de uma página já resolvida.
 *
 * **Achata os grupos de propósito.** O schema.org não tem nível de "assunto" dentro de um
 * `FAQPage` — `mainEntity` é uma lista de perguntas —, e inventar um agrupamento ali produziria
 * marcação que nenhum consumidor lê. O agrupamento é da tela; o dado estruturado é a lista.
 *
 * **Lista vazia devolve `mainEntity: []`, nunca `undefined`.** Um `FAQPage` sem `mainEntity` é
 * inválido, e a diferença entre "página sem perguntas" e "campo esquecido" é exatamente o que um
 * validador precisa conseguir dizer.
 */
export const faqPageJsonLd = (
  groups: readonly FaqPageGroup[] | null | undefined,
  options: { url?: string } = {},
): FaqPageJsonLd => {
  const documento: FaqPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (groups ?? []).flatMap(grupo =>
      grupo.items.map(item => ({
        '@type': 'Question' as const,
        name: item.question,
        acceptedAnswer: { '@type': 'Answer' as const, text: faqAnswerPlainText(item.answer) },
      })),
    ),
  }

  // `url` é opcional e só entra quando há origem: uma URL relativa num dado estruturado é pior que
  // nenhuma — o rastreador a resolve contra a base que ele achar.
  const url = String(options.url ?? '').trim()
  if (url !== '') documento.url = url

  return documento
}
