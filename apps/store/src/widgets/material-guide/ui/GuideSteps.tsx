import { ESTRELINHA_ICONS } from '@/shared/ui/icons'
import { PASSOS_DO_ENVIO } from '../model/guide'
import GuideHeading from './GuideHeading'
import GuideSection from './GuideSection'

/**
 * "Do pedido à joia, em quatro passos" (`5MC-0`).
 *
 * `<ol>`, e não uma fileira de `<div>`: a ordem é a informação. No desktop os quatro passos dividem a
 * linha; no mobile empilham, cada um com o número na coluna da esquerda.
 *
 * O fio acima de cada passo é `border-t` do próprio item — no board ele é do tamanho da coluna, e um
 * divisor único atravessando os quatro se romperia no mobile, onde eles empilham.
 */
const GuideSteps = () => (
  <GuideSection tone="surface" labelledBy="guia-passos">
    <div className="flex flex-col gap-8 md:gap-10">
      <GuideHeading
        id="guia-passos"
        versalete="Como funciona"
        titulo="Do pedido à joia, em quatro passos"
        apoio="O endereço de envio é enviado por WhatsApp somente após a confirmação do pagamento."
        apoioAoLado
      />

      <ol className="flex flex-col gap-0 md:flex-row md:gap-6">
        {PASSOS_DO_ENVIO.map(passo => {
          const Icone = ESTRELINHA_ICONS[passo.icone]
          return (
            <li
              key={passo.numero}
              className="flex flex-1 flex-col gap-2.5 border-t border-estrelinha-line py-5 md:gap-3.5 md:py-0 md:pt-[22px]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-[24px] font-bold text-estrelinha-accent-strong md:text-[28px]">
                  {passo.numero}
                </span>
                <Icone className="h-6 w-6 shrink-0 text-estrelinha-primary md:h-7 md:w-7" aria-hidden />
              </div>
              <h3 className="text-[16px] font-semibold text-estrelinha-ink md:text-[17px]">
                {passo.titulo}
              </h3>
              <p className="text-[15px] font-light leading-[26px] text-estrelinha-ink-soft">
                {passo.texto}
              </p>
            </li>
          )
        })}
      </ol>
    </div>
  </GuideSection>
)

export default GuideSteps
