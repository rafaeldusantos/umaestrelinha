import { useMemo } from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@estrelinha/ui/accordion'
import type { Product } from '@estrelinha/supabase/types'
import { sanitizeHtml } from '@/shared/lib/sanitizeHtml'
import { productSpecs } from '../lib/productFacts'
import ProductDescription from './ProductDescription'

/**
 * "Detalhes do Produto / Cuidados / Trocas / Perguntas Frequentes" — boards de Produto.
 *
 * Quatro seções, a primeira aberta: é a única que traz dado do cadastro, e deixar tudo fechado
 * esconderia a ficha técnica atrás de um clique que quase toda visita dá.
 *
 * A primeira traz a **descrição completa** e, abaixo dela, os bullets de `productSpecs` (as medidas
 * do produto, quando existem). A descrição chegou aqui na feature 27: ela vivia entre o preço e o
 * seletor de variação, e com mediana de 2.271 caracteres empurrava o CTA para fora da primeira tela.
 * As outras três seções são política da loja, iguais para todo o catálogo — texto mesmo, não
 * cadastro.
 *
 * Desde a `PIN-05` a seção pode vir **vazia** (produto sem medida cadastrada): aí ela não é montada,
 * e a que abre é "Cuidados". Uma seção aberta e vazia seria pior que ausente. A `PDP-10` mantém a
 * regra e só acrescenta a descrição à conta do que é "vazia".
 */
const ProductDetailsAccordion = ({ product }: { product: Product }) => {
  const specs = productSpecs(product)

  /**
   * A mesma função que o `ProductDescription` chama, e de propósito.
   *
   * Quem monta o `dangerouslySetInnerHTML` **tem** de ser quem sanitiza — é o que faz o componente
   * ser seguro venha de onde vier a chamada. Aqui a pergunta é outra: "sobra alguma coisa?", e ela
   * precisa ser respondida antes de decidir montar a seção. Uma descrição que só tinha `<script>`
   * abriria uma seção em branco se a decisão olhasse o campo cru.
   */
  const temDescricao = useMemo(() => sanitizeHtml(product.description) !== '', [product.description])
  const temDetalhes = temDescricao || specs.length > 0

  return (
  <Accordion type="single" collapsible defaultValue={temDetalhes ? 'detalhes' : 'cuidados'} className="w-full">
    {temDetalhes && (
    <AccordionItem value="detalhes" className="border-estrelinha-line">
      <AccordionTrigger className="py-3.5 font-body text-[15px] font-bold leading-[18px] text-estrelinha-ink hover:no-underline">
        Detalhes do Produto
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <ProductDescription html={product.description} />
        {specs.length > 0 && (
          <ul className="mt-4 flex flex-col gap-1.5 text-[13px] leading-[20px] text-estrelinha-ink-soft first:mt-0">
            {specs.map(spec => (
              <li key={spec}>• {spec}</li>
            ))}
          </ul>
        )}
      </AccordionContent>
    </AccordionItem>
    )}

    <AccordionItem value="cuidados" className="border-estrelinha-line">
      <AccordionTrigger className="py-3.5 font-body text-[15px] font-bold leading-[18px] text-estrelinha-ink hover:no-underline">
        Cuidados e Conservação
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        {/* Cuidado de JOIA — prata 925, aço, folheado e resina. Até a feature 20 este bloco falava
            em alfinete e em metal manchando: era cuidado de botton, e nenhuma peça daqui tem
            alfinete. Resina não vai em ultrassom nem em produto de limpeza, e folheado sai com
            perfume — são as três formas reais de a cliente estragar a homenagem que encomendou. */}
        <ul className="flex flex-col gap-1.5 text-[13px] leading-[20px] text-estrelinha-ink-soft">
          <li>• Limpe com pano seco e macio. Nada de produto de limpeza, álcool ou ultrassom.</li>
          <li>• Perfume, hidratante e cloro por último: espere secar antes de colocar a joia.</li>
          <li>• Guarde separada de outras peças, longe de umidade e de sol direto.</li>
          <li>• Prata escurece com o tempo — é natural, e volta com flanela própria para prata.</li>
        </ul>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="trocas" className="border-estrelinha-line">
      <AccordionTrigger className="py-3.5 font-body text-[15px] font-bold leading-[18px] text-estrelinha-ink hover:no-underline">
        Política de Trocas
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <ul className="flex flex-col gap-1.5 text-[13px] leading-[20px] text-estrelinha-ink-soft">
          <li>• Você tem 7 dias corridos após o recebimento para desistir da compra.</li>
          <li>• Produto com defeito é trocado ou devolvido sem custo de frete.</li>
          <li>• Basta falar com a gente pelo WhatsApp ou pelo e-mail de contato.</li>
        </ul>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="faq" className="border-b-0">
      <AccordionTrigger className="py-3.5 font-body text-[15px] font-bold leading-[18px] text-estrelinha-ink hover:no-underline">
        Perguntas Frequentes
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <dl className="flex flex-col gap-3 text-[13px] leading-[20px] text-estrelinha-ink-soft">
          <div>
            <dt className="font-semibold text-estrelinha-ink">Em quanto tempo chega?</dt>
            <dd>O prazo aparece no cálculo de frete acima, já com o tempo de produção.</dd>
          </div>
          <div>
            <dt className="font-semibold text-estrelinha-ink">Dá para comprar em quantidade?</dt>
            <dd>Dá — é só ajustar a quantidade antes de adicionar ao carrinho.</dd>
          </div>
        </dl>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
  )
}

export default ProductDetailsAccordion
