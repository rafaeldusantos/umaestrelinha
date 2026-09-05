import { Clock, ListOrdered } from 'lucide-react'
import { AtendimentoIcon } from '@estrelinha/ui/icons'
import GuideHeroArt from './GuideHeroArt'
import { GUIDE_COLUMN } from './GuideSection'

/**
 * O hero do guia (`5MC-0` / `6AU-0`): texto à esquerda, a caixa aberta à direita.
 *
 * As três pílulas são **rótulos**, não ações — `<span>`, sem `href`. A pílula em elemento de ação é o
 * que `buttonShape.test.ts` recusa; aqui ela é a forma certa, porque o que elas fazem é nomear o que
 * a página promete (quantos passos, quanto tempo, que canal).
 *
 * O balão do WhatsApp sai em `primary`, e não no verde da marca: `DESIGN.md` §2 reserva
 * `whatsapp #25D366` ao **botão** do WhatsApp, e o verde sobre `ground-deep` mede 1,9:1 — reprova até
 * a régua de 3:1 de objeto gráfico.
 */
const PILULA =
  'inline-flex items-center gap-2.5 rounded-pill border border-estrelinha-line bg-white px-4 py-2.5'
const PILULA_TEXTO = 'text-[13px] font-medium text-estrelinha-ink md:text-[14px]'

const GuideHero = () => (
  <section className="w-full bg-estrelinha-ground-deep py-10 md:py-[84px]">
    <div className={`${GUIDE_COLUMN} flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between md:gap-[72px]`}>
      <div className="flex w-full flex-col items-start gap-4 md:w-[600px] md:gap-6">
        <p className="flex items-center gap-2.5">
          <span className="h-px w-6 shrink-0 bg-estrelinha-accent-strong md:w-7" aria-hidden />
          <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-estrelinha-ink-soft md:text-[13px]">
            Guia passo a passo
          </span>
        </p>

        <h1 className="font-display text-[34px] font-normal leading-[44px] tracking-[-0.02em] text-estrelinha-ink md:text-[56px] md:leading-[64px]">
          Como enviar seu material com segurança
        </h1>

        <p className="max-w-[540px] text-[17px] font-light leading-[29px] text-estrelinha-ink-soft md:text-[19px] md:leading-8">
          Cada joia guarda algo único e insubstituível. Preparar o material do jeito certo leva poucos
          minutos — e garante que sua memória chegue aqui inteira, íntegra e pronta para virar joia.
        </p>

        <ul className="flex flex-wrap items-center gap-2.5 pt-2 md:pt-3 md:gap-3">
          <li className={PILULA}>
            <ListOrdered className="h-[18px] w-[18px] shrink-0 text-estrelinha-primary" aria-hidden />
            <span className={PILULA_TEXTO}>4 passos simples</span>
          </li>
          <li className={PILULA}>
            <Clock className="h-[18px] w-[18px] shrink-0 text-estrelinha-primary" aria-hidden />
            <span className={PILULA_TEXTO}>10 min de preparo</span>
          </li>
          <li className={PILULA}>
            <AtendimentoIcon className="h-[18px] w-[18px] shrink-0 text-estrelinha-primary" aria-hidden />
            <span className={PILULA_TEXTO}>Suporte no WhatsApp</span>
          </li>
        </ul>
      </div>

      {/* No mobile a cena vem depois do texto e ocupa a largura da coluna; no desktop, ao lado. */}
      <GuideHeroArt />
    </div>
  </section>
)

export default GuideHero
