// Feature 46 — a regra da página de perguntas da loja.
//
// Irmã de `resolveProductFaqs`, e de propósito: as três regras que aquela função carrega valem
// iguais aqui, porque o problema é o mesmo — um vínculo ordenado sobre a biblioteca, onde a entrada
// pode ter saído do ar. O que muda é só o contexto do vínculo: lá é um produto, aqui é a página.
//
// Separá-las em duas escritas daria à página a chance de esquecer uma das três, e a que ela
// esqueceria é sempre a mesma: pular a vaga sem preenchê-la.

import { normalizeFaqText } from './faq.ts'
import type { FaqEntry, FaqPageGroup, FaqPageLink, ResolvedFaq } from './types.ts'

/**
 * Os assuntos da página, **na ordem em que ela os exibe**.
 *
 * Vocabulário fechado, espelhado pelo `check` da migration da 46 — e `faqPageSchema.test.ts` lê o
 * `.sql` do disco e compara os dois, valor a valor. Duas listas que se contradizem fazem o painel
 * oferecer um assunto que o banco recusa, e a dona descobre no save.
 *
 * A ordem é dado, não alfabética: ela vai do que a cliente pergunta **antes de decidir** (o que é
 * uma joia afetiva, como funciona, como envio) para o que ela pergunta **depois de receber** (como
 * limpo, posso tomar banho). É a ordem da dúvida, não a do dicionário.
 *
 * `sobre` nomeia a loja além das joias porque acolhe "Ainda tenho dúvidas, como falo com vocês?" —
 * que é sobre a Uma Estrelinha, não sobre a peça.
 */
export const FAQ_PAGE_CATEGORIES = [
  { key: 'sobre', label: 'Sobre as joias e a Uma Estrelinha' },
  { key: 'o-processo', label: 'O processo e os prazos' },
  { key: 'envio-do-material', label: 'Envio do material' },
  { key: 'materiais-e-acabamentos', label: 'Materiais e acabamentos' },
  { key: 'personalizacao', label: 'Personalização' },
  { key: 'cuidados', label: 'Cuidados com a joia' },
] as const satisfies readonly { key: string; label: string }[]

export type FaqPageCategoryKey = (typeof FAQ_PAGE_CATEGORIES)[number]['key']

const ORDEM = new Map(FAQ_PAGE_CATEGORIES.map((c, i) => [c.key as string, i]))

/**
 * O rótulo do assunto — ou o próprio valor, quando ele não está no vocabulário.
 *
 * **Degrada, nunca quebra.** Assunto não é dinheiro nem segurança: a resposta certa para "não
 * reconheço este valor" é a seção sair com um título feio, não a página inteira cair. Mesmo molde de
 * `menuIconKey`, que devolve item sem ícone em vez de derrubar a barra.
 */
export const faqPageCategoryLabel = (key: string | null | undefined): string => {
  const alvo = String(key ?? '').trim()
  return FAQ_PAGE_CATEGORIES.find(c => c.key === alvo)?.label ?? alvo
}

/**
 * O motivo da recusa de um assunto, ou `null` quando ele é válido.
 *
 * `string | null`, nunca união discriminada por literal booleano: com `strictNullChecks: false`
 * aquela forma não estreita, e ler `.reason` no ramo do `else` é TS2339. Mesmo formato de
 * `reservedSlugRefusal`, `menuTargetRefusal` e `freeShippingRefusal`.
 */
export const faqPageCategoryRefusal = (key: string | null | undefined): string | null => {
  const alvo = String(key ?? '').trim()
  if (alvo === '') return 'Escolha um assunto para a pergunta.'
  if (ORDEM.has(alvo)) return null
  return (
    `“${alvo}” não é um assunto da página. ` +
    `Os assuntos são: ${FAQ_PAGE_CATEGORIES.map(c => c.label).join(', ')}.`
  )
}

const asMap = (
  entries: ReadonlyMap<string, FaqEntry> | readonly FaqEntry[],
): ReadonlyMap<string, FaqEntry> =>
  entries instanceof Map ? entries : new Map((entries as readonly FaqEntry[]).map(e => [e.id, e]))

/**
 * O que a página desenha, agrupado e na ordem — o **único** lugar que lê `answer_override` da
 * colocação.
 *
 * As três regras de `resolveProductFaqs`, com o acréscimo do agrupamento:
 *
 * 1. **Ordem é (assunto, `position`, `faq_id`)**. O desempate por id existe pela mesma razão de lá:
 *    sem ele, duas leituras da mesma página podem trocar duas perguntas de lugar quando o `position`
 *    empata — e "a página mudou sozinha" é o tipo de defeito que ninguém consegue reproduzir.
 * 2. **Vínculo órfão ou inativo é PULADO, e a vaga não é preenchida.** A entrada chega `null` porque
 *    a RLS a escondeu, não porque o cliente filtrou. Substituí-la poria na página uma pergunta que a
 *    dona não escolheu, justamente onde ela escolheu.
 * 3. **`answer_override` só de espaço é vazio**, e cai no padrão da biblioteca.
 *
 * E a consequência do agrupamento: **assunto que ficou sem pergunta ativa some**. Um `<h2>` sobre
 * uma seção vazia é pior que a seção ausente — ele promete conteúdo que não existe, e no índice
 * lateral vira um link que não leva a lugar nenhum.
 *
 * ⚠️ **Colocação com assunto fora do vocabulário não é renderizada.** Isso não é tratamento de erro
 * defensivo: o `check` da migration torna o estado impossível pelo caminho normal, e o painel o
 * recusa antes por `faqPageCategoryRefusal`. A única origem seria escrita por SQL à mão — e nesse
 * caso a pergunta some da página em vez de aparecer sob um título que ninguém escolheu.
 */
export const resolveFaqPage = (
  links: readonly FaqPageLink[] | null | undefined,
  entries: ReadonlyMap<string, FaqEntry> | readonly FaqEntry[] = [],
): FaqPageGroup[] => {
  const porId = asMap(entries)

  const resolvidas = [...(links ?? [])]
    .sort(
      (a, b) =>
        (ORDEM.get(String(a.category)) ?? Number.MAX_SAFE_INTEGER) -
          (ORDEM.get(String(b.category)) ?? Number.MAX_SAFE_INTEGER) ||
        (a.position ?? 0) - (b.position ?? 0) ||
        String(a.faq_id).localeCompare(String(b.faq_id)),
    )
    .reduce<{ category: string; item: ResolvedFaq }[]>((saida, link) => {
      const entrada = link.faq ?? porId.get(link.faq_id)
      if (!entrada || entrada.is_active === false) return saida

      const pergunta = normalizeFaqText(entrada.question)
      const padrao = normalizeFaqText(entrada.answer)
      const proprio = normalizeFaqText(link.answer_override)

      // Entrada sem texto não vira uma linha em branco na página.
      if (pergunta === '' || (padrao === '' && proprio === '')) return saida

      saida.push({
        category: String(link.category),
        item: {
          id: entrada.id ?? link.faq_id,
          question: pergunta,
          // A resposta da página não é normalizada como a pergunta: colapsar espaço apagaria as
          // linhas em branco que `faqAnswerBlocks` usa para separar parágrafo, e as 26 respostas
          // viram um bloco só.
          answer: proprio === '' ? String(entrada.answer ?? '') : String(link.answer_override ?? ''),
          overridden: proprio !== '' && proprio !== padrao,
        },
      })
      return saida
    }, [])

  return FAQ_PAGE_CATEGORIES.reduce<FaqPageGroup[]>((grupos, { key, label }) => {
    const items = resolvidas.filter(r => r.category === key).map(r => r.item)
    if (items.length > 0) grupos.push({ category: key, label, items })
    return grupos
  }, [])
}
