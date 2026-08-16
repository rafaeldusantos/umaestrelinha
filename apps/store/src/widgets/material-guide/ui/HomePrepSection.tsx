import { Info } from 'lucide-react'
import { ESTRELINHA_ICONS } from '@/shared/ui/icons'
import { PREPARO_EM_CASA } from '../model/guide'
import GuideHeading from './GuideHeading'
import GuideSection from './GuideSection'

/**
 * "Dois materiais precisam ser preparados antes do envio" (`5MC-0`) — placenta e sangue.
 *
 * **A única faixa escura da página**, e é assim no board. A inversão de cor não é ritmo visual: estes
 * dois são os únicos materiais em que a cliente executa um processo em casa, com forno e horas de
 * espera, e errar significa começar de novo com material que não se repõe. A faixa separa "leia" de
 * "faça".
 *
 * Os números saem em `on-primary` dentro do anel de ouro, e não em ouro como no board: `accent` sobre
 * `primary` mede 3,26:1 — passa como anel (objeto gráfico, 3:1), reprova como algarismo (4,5:1). O
 * ouro fica na forma; o número, legível.
 */
const HomePrepSection = () => (
  <GuideSection tone="primary" labelledBy="guia-preparo-casa">
    <div className="flex flex-col gap-8 md:gap-10">
      <GuideHeading
        id="guia-preparo-casa"
        versalete="Preparo em casa"
        titulo="Dois materiais precisam ser preparados antes do envio"
        apoio="Placenta e sangue devem chegar desidratados. Qualquer dúvida no meio do processo, chame no WhatsApp."
        escuro
        apoioAoLado
      />

      {PREPARO_EM_CASA.map(bloco => {
        const Icone = ESTRELINHA_ICONS[bloco.icone]
        return (
          <section
            key={bloco.anchor}
            id={bloco.anchor}
            aria-labelledby={`preparo-${bloco.anchor}`}
            className="flex scroll-mt-24 flex-col gap-6 border-t border-[#F7F3EC2E] pt-6 md:gap-8 md:pt-11"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
              <h3
                id={`preparo-${bloco.anchor}`}
                className="flex items-center gap-3.5 font-display text-[21px] font-normal leading-[30px] text-estrelinha-on-primary md:text-[28px] md:leading-[34px]"
              >
                <Icone className="h-7 w-7 shrink-0 md:h-[30px] md:w-[30px]" aria-hidden />
                {bloco.titulo}
              </h3>
              <p className="flex items-start gap-2.5 rounded-pill bg-[#F7F3EC1A] px-5 py-3 text-[14px] font-light leading-5 text-estrelinha-on-primary md:items-center">
                <Info className="mt-0.5 h-[17px] w-[17px] shrink-0 text-estrelinha-accent md:mt-0" aria-hidden />
                {bloco.aviso}
              </p>
            </div>

            <ol className="grid gap-5 md:grid-cols-3 md:gap-9">
              {bloco.passos.map((passo, indice) => (
                <li key={passo} className="flex items-start gap-4">
                  <span
                    aria-hidden
                    className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-estrelinha-accent font-display text-[14px] font-bold text-estrelinha-on-primary"
                  >
                    {indice + 1}
                  </span>
                  <span className="text-[16px] font-light leading-[28px] text-estrelinha-on-primary md:text-[17px]">
                    {passo}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )
      })}
    </div>
  </GuideSection>
)

export default HomePrepSection
