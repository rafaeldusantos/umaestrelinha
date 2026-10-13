import { useMemo } from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@estrelinha/ui/accordion'
import type { Product } from '@estrelinha/supabase/types'
import type { ResolvedFaq } from '@estrelinha/core/faq'
import { sanitizeHtml } from '@/shared/lib/sanitizeHtml'
import ProductDescription from './ProductDescription'
import ProductFaq from './ProductFaq'

/**
 * "Detalhes do Produto / Perguntas Frequentes" — boards de Produto.
 *
 * Duas seções, a primeira aberta: é a que traz a **descrição completa**, e deixar tudo fechado
 * esconderia o texto da peça atrás de um clique que quase toda visita dá. A descrição chegou aqui na
 * feature 27: ela vivia entre o preço e o seletor de variação, e com mediana de 2.271 caracteres
 * empurrava o CTA para fora da primeira tela.
 *
 * A seção traz **só a descrição** (2026-10-10, decisão do usuário): os bullets de tamanho e peso
 * saíram — as colunas que os alimentavam existem para a cotação de frete, não para a vitrine. Pelo
 * mesmo pedido saiu "Cuidados e Conservação", que era texto fixo igual para todo o catálogo; o
 * cuidado com a joia continua na página `/cuidados-com-sua-joia-afetiva`. "Política de Trocas" já
 * tinha saído antes (2026-09-11), e segue na página própria.
 *
 * Sem descrição que sobreviva à limpeza, a seção **não é montada** (`PIN-05`/`PDP-10`): uma seção
 * aberta e vazia seria pior que ausente.
 *
 * **`faqs` chega por PROP, e não de um hook aqui dentro** (`FAQ-01`). Um `useQuery` dentro de um
 * componente que várias telas montam obrigaria todas elas a ter `QueryClientProvider` — foi
 * exatamente o que derrubou 17 testes da confirmação de pedido na feature 22. Quem consulta é a
 * `ProductPage`; este componente continua apresentacional e testável sem provider.
 */
const ProductDetailsAccordion = ({
  product,
  faqs = [],
}: {
  product: Product
  faqs?: readonly ResolvedFaq[]
}) => {
  /**
   * A mesma função que o `ProductDescription` chama, e de propósito.
   *
   * Quem monta o `dangerouslySetInnerHTML` **tem** de ser quem sanitiza — é o que faz o componente
   * ser seguro venha de onde vier a chamada. Aqui a pergunta é outra: "sobra alguma coisa?", e ela
   * precisa ser respondida antes de decidir montar a seção. Uma descrição que só tinha `<script>`
   * abriria uma seção em branco se a decisão olhasse o campo cru.
   */
  const temDescricao = useMemo(() => sanitizeHtml(product.description) !== '', [product.description])

  return (
  <Accordion type="single" collapsible defaultValue={temDescricao ? 'detalhes' : undefined} className="w-full">
    {/* A última seção visível não leva risco embaixo: sem perguntas, quem fecha o acordeão é esta. */}
    {temDescricao && (
    <AccordionItem value="detalhes" className={faqs.length > 0 ? 'border-estrelinha-line' : 'border-b-0'}>
      <AccordionTrigger className="py-3.5 font-body text-[15px] font-bold leading-[18px] text-estrelinha-ink hover:no-underline">
        Detalhes do Produto
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <ProductDescription html={product.description} />
      </AccordionContent>
    </AccordionItem>
    )}

    {/* `FAQ-02`: a seção mostra as perguntas DAQUELE produto, e some quando ele não tem nenhuma.
        Até a feature 28 havia aqui um `<dl>` cravado com "Em quanto tempo chega?" e "Dá para
        comprar em quantidade?" — duas perguntas iguais nos 691 produtos, enquanto as 3.476 reais
        estavam presas dentro de `products.description`. As duas viraram entradas da biblioteca, e a
        dona as vincula a quem quiser (inclusive em lote, por categoria).

        Uma seção vazia seria pior que ausente, pela mesma régua da `PIN-05` logo acima. */}
    {faqs.length > 0 && (
    <AccordionItem value="faq" className="border-b-0">
      <AccordionTrigger className="py-3.5 font-body text-[15px] font-bold leading-[18px] text-estrelinha-ink hover:no-underline">
        Perguntas Frequentes
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <ProductFaq items={faqs} />
      </AccordionContent>
    </AccordionItem>
    )}
  </Accordion>
  )
}

export default ProductDetailsAccordion
