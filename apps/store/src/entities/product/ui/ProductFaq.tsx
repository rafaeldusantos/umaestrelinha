import type { ResolvedFaq } from '@estrelinha/core/faq'

/**
 * As perguntas frequentes **daquele produto** — `FAQ-01`, `FAQ-08`.
 *
 * Até a feature 28 esta seção era um `<dl>` cravado no `ProductDetailsAccordion` com duas perguntas
 * genéricas ("Em quanto tempo chega?" e "Dá para comprar em quantidade?"), iguais nos 691 produtos.
 * As perguntas de verdade — 3.476 pares, medidos em 687 produtos — estavam presas dentro de
 * `products.description`, saindo como texto corrido no meio das especificações.
 *
 * **Sem `dangerouslySetInnerHTML`, e isso é regra, não descuido.** A resposta é `text` no banco:
 * medido, **0 de 3.476** respostas do catálogo contêm tag. A extração do importador já decodifica as
 * entidades, então o que chega aqui é texto pronto — e o React o escapa. É a diferença entre esta
 * seção e a descrição, que é HTML de origem externa e por isso paga um sanitizador inteiro.
 *
 * A marcação (`<dl>`/`<dt>`/`<dd>`) e os tokens são os mesmos do bloco que ela substitui: a mudança
 * é de **origem do dado**, não de desenho.
 */
const ProductFaq = ({ items }: { items: readonly ResolvedFaq[] }) => {
  if (!items || items.length === 0) return null

  return (
    <dl className="flex flex-col gap-3 text-[13px] leading-[20px] text-estrelinha-ink-soft">
      {items.map(item => (
        <div key={item.id}>
          <dt className="font-semibold text-estrelinha-ink">{item.question}</dt>
          <dd>{item.answer}</dd>
        </div>
      ))}
    </dl>
  )
}

export default ProductFaq
