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
 */
const ProductDetailsAccordion = ({ product }: { product: Product }) => (
  <Accordion type="single" collapsible defaultValue="detalhes" className="w-full">
    <AccordionItem value="detalhes" className="border-nanita-border">
      <AccordionTrigger className="py-3.5 font-body text-[15px] font-bold leading-[18px] text-nanita-ink hover:no-underline">
        Detalhes do Produto
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <ul className="flex flex-col gap-1.5 text-[13px] leading-[20px] text-nanita-plum">
          {productSpecs(product).map(spec => (
            <li key={spec}>• {spec}</li>
          ))}
        </ul>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="cuidados" className="border-nanita-border">
      <AccordionTrigger className="py-3.5 font-body text-[15px] font-bold leading-[18px] text-nanita-ink hover:no-underline">
        Cuidados e Conservação
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <ul className="flex flex-col gap-1.5 text-[13px] leading-[20px] text-nanita-plum">
          <li>• Limpe com pano seco e macio — nada de água nem produto abrasivo.</li>
          <li>• Guarde longe de umidade para o metal não manchar.</li>
          <li>• Evite prender em tecidos muito finos: o alfinete pode marcar.</li>
        </ul>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="trocas" className="border-nanita-border">
      <AccordionTrigger className="py-3.5 font-body text-[15px] font-bold leading-[18px] text-nanita-ink hover:no-underline">
        Política de Trocas
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <ul className="flex flex-col gap-1.5 text-[13px] leading-[20px] text-nanita-plum">
          <li>• Você tem 7 dias corridos após o recebimento para desistir da compra.</li>
          <li>• Produto com defeito é trocado ou devolvido sem custo de frete.</li>
          <li>• Basta falar com a gente pelo WhatsApp ou pelo e-mail de contato.</li>
        </ul>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="faq" className="border-b-0">
      <AccordionTrigger className="py-3.5 font-body text-[15px] font-bold leading-[18px] text-nanita-ink hover:no-underline">
        Perguntas Frequentes
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <dl className="flex flex-col gap-3 text-[13px] leading-[20px] text-nanita-plum">
          <div>
            <dt className="font-semibold text-nanita-ink">Em quanto tempo chega?</dt>
            <dd>O prazo aparece no cálculo de frete acima, já com o tempo de produção.</dd>
          </div>
          <div>
            <dt className="font-semibold text-nanita-ink">Dá para comprar em quantidade?</dt>
            <dd>Dá — é só ajustar a quantidade antes de adicionar ao carrinho.</dd>
          </div>
          <div>
            <dt className="font-semibold text-nanita-ink">Posso pedir uma arte minha?</dt>
            <dd>Pode: monte o seu na página “Crie o Seu”.</dd>
          </div>
        </dl>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
)

export default ProductDetailsAccordion
