import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@estrelinha/ui/accordion'
import type { Product } from '@estrelinha/supabase/types'
import { productSpecs } from '../lib/productFacts'

/**
 * "Detalhes do Produto / Cuidados / Trocas / Perguntas Frequentes" — boards de Produto.
 *
 * Quatro seções, a primeira aberta: é a única que traz dado do cadastro, e deixar tudo fechado
 * esconderia a ficha técnica atrás de um clique que quase toda visita dá.
 *
 * Os bullets da primeira vêm de `productSpecs`, que lê as medidas do produto quando existem. As
 * outras três são política da loja, iguais para todo o catálogo — texto mesmo, não cadastro.
 *
 * Desde a `PIN-05` a ficha pode vir **vazia** (produto sem medida cadastrada): aí a seção inteira
 * não é montada, e a que abre é "Cuidados". Uma seção aberta e vazia seria pior que ausente.
 */
const ProductDetailsAccordion = ({ product }: { product: Product }) => {
  const specs = productSpecs(product)

  return (
  <Accordion type="single" collapsible defaultValue={specs.length > 0 ? 'detalhes' : 'cuidados'} className="w-full">
    {specs.length > 0 && (
    <AccordionItem value="detalhes" className="border-estrelinha-line">
      <AccordionTrigger className="py-3.5 font-body text-[15px] font-bold leading-[18px] text-estrelinha-ink hover:no-underline">
        Detalhes do Produto
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <ul className="flex flex-col gap-1.5 text-[13px] leading-[20px] text-estrelinha-ink-soft">
          {specs.map(spec => (
            <li key={spec}>• {spec}</li>
          ))}
        </ul>
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
