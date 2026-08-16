import { CheckCircle2, XCircle } from 'lucide-react'
import { ESTRELINHA_ICONS } from '@/shared/ui/icons'
import {
  AVISO_SEM_RASTREIO,
  DECLARACAO,
  DEPOIS_DE_POSTAR,
  FORMAS_DE_ENVIO,
} from '../model/guide'
import GuideHeading from './GuideHeading'
import GuideSection from './GuideSection'
import MaterialAddress from './MaterialAddress'

/**
 * "Como enviar pelos Correios" (`5MC-0`) — formas de envio, declaração de conteúdo e o depois.
 *
 * A declaração é o trecho que mais evita problema real: transportadora não aceita material biológico,
 * e a cliente que escreve "cinzas" na etiqueta tem a encomenda retida. Por isso os dois cartões são
 * **exemplos literais**, prontos para copiar, e não uma instrução em prosa.
 *
 * O riscado do "nunca escreva" é `line-through` de verdade, e não uma cor de aviso: quem lê rápido vê
 * o gesto antes da palavra.
 */
const ShippingSection = () => (
  <GuideSection tone="surface" labelledBy="guia-postagem">
    <div className="flex flex-col gap-8 md:gap-[52px]">
      <GuideHeading
        id="guia-postagem"
        versalete="Hora de postar"
        titulo="Como enviar pelos Correios"
      />

      <div className="flex flex-col gap-10 md:flex-row md:gap-20">
        <div className="flex flex-col gap-6 md:w-[560px] md:shrink-0 md:gap-[26px]">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-estrelinha-ink md:text-[13px]">
            Formas de envio
          </h3>

          <ul className="flex flex-col gap-6 md:gap-[26px]">
            {FORMAS_DE_ENVIO.map(forma => {
              const Icone = ESTRELINHA_ICONS[forma.icone]
              return (
                <li
                  key={forma.titulo}
                  className="flex items-start gap-4 border-b border-estrelinha-line pb-5 md:gap-[18px] md:pb-[22px]"
                >
                  <span
                    aria-hidden
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-estrelinha-ground-deep md:h-[46px] md:w-[46px]"
                  >
                    <Icone className="h-6 w-6 text-estrelinha-primary" aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-[17px] font-semibold leading-7 text-estrelinha-ink md:text-[19px]">
                      {forma.titulo}
                    </span>
                    <span className="text-[16px] font-light leading-[26px] text-estrelinha-ink-soft md:text-[17px]">
                      {forma.texto}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>

          <p className="flex items-start gap-3 rounded-[2px] border-l-[3px] border-[#9E4A3E] bg-[#F7EDE8] px-5 py-4 text-[14px] font-light leading-6 text-estrelinha-ink md:px-[22px] md:py-5">
            <XCircle className="mt-0.5 h-[22px] w-[22px] shrink-0 text-[#9E4A3E]" aria-hidden />
            {AVISO_SEM_RASTREIO}
          </p>
        </div>

        <div className="flex flex-col gap-5 md:w-[560px] md:shrink-0 md:gap-6">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-estrelinha-ink md:text-[13px]">
            Na declaração de conteúdo
          </h3>
          <p className="text-[16px] font-light leading-[28px] text-estrelinha-ink-soft md:text-[17px]">
            {DECLARACAO.intro}
          </p>

          <div className="flex flex-col gap-4 md:flex-row md:gap-5">
            <div className="flex flex-1 flex-col gap-4 rounded-md bg-estrelinha-serenity p-5 md:p-6">
              <p className="flex items-center gap-2.5 text-[14px] font-semibold uppercase tracking-[0.04em] text-estrelinha-primary">
                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
                Escreva assim
              </p>
              {DECLARACAO.escreva.map(exemplo => (
                <p key={exemplo.valor} className="flex flex-col gap-1 rounded-sm bg-white p-4">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-estrelinha-ink-soft">
                    {exemplo.rotulo}
                  </span>
                  <span className="font-display text-[16px] leading-[22px] text-estrelinha-ink md:text-[17px]">
                    {exemplo.valor}
                  </span>
                </p>
              ))}
            </div>

            <div className="flex flex-1 flex-col gap-4 rounded-md bg-[#F7EDE8] p-5 md:p-6">
              <p className="flex items-center gap-2.5 text-[14px] font-semibold uppercase tracking-[0.04em] text-[#9E4A3E]">
                <XCircle className="h-5 w-5 shrink-0" aria-hidden />
                Nunca escreva
              </p>
              <ul className="flex flex-col gap-2.5 rounded-sm bg-white p-4">
                {DECLARACAO.nuncaEscreva.map(termo => (
                  <li
                    key={termo}
                    className="text-[16px] font-light leading-[22px] text-estrelinha-ink-soft line-through decoration-1 md:text-[17px]"
                  >
                    {termo}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/*
        O endereço de destino, de `store_settings` (`MAT-01`).
        **Sobreviveu ao redesenho de propósito.** Os artboards não desenham este bloco — neles o
        endereço chega por WhatsApp depois do pagamento, que é o que o passo 01 promete. Mas o
        componente existe, lê a aba Material das configurações e **não renderiza endereço pela
        metade**: enquanto a dona não preencher, ele mostra o convite a confirmar pelo WhatsApp, que é
        exatamente o comportamento do board. Apagá-lo trocaria uma informação que a loja já sabe dar
        por uma que a cliente teria de pedir.
      */}
      <MaterialAddress />

      <ul className="flex flex-col gap-4 md:flex-row md:gap-6">
        {DEPOIS_DE_POSTAR.map(cartao => {
          const Icone = ESTRELINHA_ICONS[cartao.icone]
          return (
            <li
              key={cartao.titulo}
              className="flex flex-1 items-start gap-4 rounded-md bg-estrelinha-ground p-6 md:gap-[18px] md:px-8 md:py-[30px]"
            >
              <Icone className="h-7 w-7 shrink-0 text-estrelinha-primary md:h-[30px] md:w-[30px]" aria-hidden />
              <div className="flex min-w-0 flex-col gap-2">
                <h3 className="text-[17px] font-semibold leading-7 text-estrelinha-ink md:text-[19px]">
                  {cartao.titulo}
                </h3>
                <p className="text-[16px] font-light leading-[27px] text-estrelinha-ink-soft md:text-[17px]">
                  {cartao.texto}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  </GuideSection>
)

export default ShippingSection
