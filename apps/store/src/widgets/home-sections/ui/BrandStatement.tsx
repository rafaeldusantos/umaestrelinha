import { Link } from 'react-router-dom'
import type { HomeSectionConfig } from '@estrelinha/core/home'
import { EstrelinhaStarIcon } from '@/shared/ui/icons'
import { TAP_ROW } from '@/shared/lib/touchTarget'

/**
 * O bloco institucional da home — board `7CF-0`, e o mesmo texto que a loja em produção traz entre
 * as coleções.
 *
 * É a **única faixa escura** do miolo da home, e é de propósito: ela separa as coleções em dois
 * blocos e é o lugar onde a loja para de vender e diz quem faz. O peso vem de escala e superfície,
 * não de cor — nenhum dourado em texto aqui (o realce dourado é o anel da assinatura, elemento
 * gráfico).
 *
 * Sobre `ink`, `on-primary` mede 12,21:1 e `ground` 12,73:1. `primary` mediria 1,45:1 e sumiria —
 * por isso o link de escape é sublinhado em `on-primary`, não um CTA azul.
 *
 * **O texto vem por prop, e não há fallback literal aqui** (feature 24, emenda `E1`): um default
 * dentro do widget seria um segundo dono dos mesmos textos, e a faixa continuaria dizendo a versão
 * antiga depois de a dona editar a nova. Quem guarda a composição de hoje é
 * `DEFAULT_HOME_COMPOSITION`; quem prova que a página não mudou é `homeComposition.test.tsx`.
 */
interface Props {
  /** O `config` da seção `brand_statement` (`HOME-43`). */
  content: HomeSectionConfig
}

const BrandStatement = ({ content }: Props) => {
  return (
    <section className="bg-estrelinha-ink">
      <div className="container flex flex-col gap-10 py-14 md:flex-row md:items-start md:gap-24 md:py-24">
        <div className="flex flex-col gap-4 md:w-[44%] md:shrink-0">
          <p className="estrelinha-eyebrow flex items-center gap-3 text-estrelinha-accent">
            <span aria-hidden className="block h-px w-7 bg-estrelinha-accent" />
            {content.eyebrow}
          </p>
          <h2 className="font-display text-[26px] font-semibold leading-[1.28] tracking-[-0.02em] text-estrelinha-on-primary md:text-[34px] md:leading-[1.4]">
            {content.title}
          </h2>
        </div>

        <div className="flex flex-col gap-7 md:flex-1 md:pt-1.5">
          <p className="text-[15px] font-light leading-[28px] text-estrelinha-ground md:text-[17px] md:leading-[32px]">
            {content.paragraph}
          </p>

          <div className="flex items-center gap-4">
            <span
              aria-hidden
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-estrelinha-accent"
            >
              <EstrelinhaStarIcon className="h-5 w-5 text-estrelinha-accent" />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-display text-[18px] leading-6 text-estrelinha-on-primary">
                {content.author_name}
              </span>
              <span className="text-[13px] font-light text-estrelinha-ground">
                {content.author_role}
              </span>
            </span>
          </div>

          {/* Sem rótulo OU sem destino, o link de escape não sai: `<Link to={undefined}>` derrubaria
              a Home inteira, e um destino inventado mandaria a cliente para outro lugar em silêncio. */}
          {content.link_label && content.link_href && (
            <Link
              to={content.link_href}
              className={`${TAP_ROW} self-start text-[14px] font-semibold text-estrelinha-on-primary underline underline-offset-4 transition-opacity hover:opacity-70`}
            >
              {content.link_label}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

export default BrandStatement
