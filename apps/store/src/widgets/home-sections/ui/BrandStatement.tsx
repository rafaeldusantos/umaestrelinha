import { Link } from 'react-router-dom'
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
 */
const BrandStatement = () => {
  return (
    <section className="bg-estrelinha-ink">
      <div className="container flex flex-col gap-10 py-14 md:flex-row md:items-start md:gap-24 md:py-24">
        <div className="flex flex-col gap-4 md:w-[44%] md:shrink-0">
          <p className="estrelinha-eyebrow flex items-center gap-3 text-estrelinha-accent">
            <span aria-hidden className="block h-px w-7 bg-estrelinha-accent" />
            Feito à mão, uma por vez
          </p>
          <h2 className="font-display text-[26px] font-semibold leading-[1.28] tracking-[-0.02em] text-estrelinha-on-primary md:text-[34px] md:leading-[1.4]">
            Cada joia é uma memória eternizada à mão
          </h2>
        </div>

        <div className="flex flex-col gap-7 md:flex-1 md:pt-1.5">
          <p className="text-[15px] font-light leading-[28px] text-estrelinha-ground md:text-[17px] md:leading-[32px]">
            Trabalhamos com leite materno, cinzas de cremação, coto umbilical, cabelo, pelo de pet,
            dente de leite e flores para criar peças únicas em resina, prata 925 e aço inoxidável.
            Nada é produzido em série: cada história que chega até o ateliê vira uma peça só sua.
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
                Adri Muniz
              </span>
              {/* A cidade é fato do negócio, não configuração: `GeneralSettings` não tem endereço,
                  e a `AboutPage` já a escreve do mesmo jeito. */}
              <span className="text-[13px] font-light text-estrelinha-ground">
                artesã · Porto Alegre/RS
              </span>
            </span>
          </div>

          <Link
            to="/sobre"
            className={`${TAP_ROW} self-start text-[14px] font-semibold text-estrelinha-on-primary underline underline-offset-4 transition-opacity hover:opacity-70`}
          >
            Conheça o ateliê
          </Link>
        </div>
      </div>
    </section>
  )
}

export default BrandStatement
