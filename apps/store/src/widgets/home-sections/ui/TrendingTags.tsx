import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useCategories } from '@/entities/category'
import { categoryHref } from '@estrelinha/core/menu'
import type { HomeSectionConfig } from '@estrelinha/core/home'
import { pickTrendingCategories } from '@/features/search/lib/trendingCategories'

/**
 * Chips de tema — "Explore por tema".
 *
 * **A lista deixou de ser escrita à mão.** Eram doze fandoms cravados no fonte
 * (`NarutoClassic`, `BTS`, `StudioGhibli`…) que levavam a uma busca por texto:
 * numa loja de joia afetiva os doze devolvem zero resultado, e nenhum teste
 * pegaria — o link existe, a página abre, e o que a cliente vê é "nada
 * encontrado" doze vezes.
 *
 * Agora a fonte é `pickTrendingCategories`, a mesma regra que as pílulas "Em
 * alta agora" da busca usam: **folha da árvore**, na ordem editorial
 * (`sort_order`), e cada chip leva à página da coleção — não a uma consulta de
 * texto que pode não casar com nada.
 *
 * **Os chips continuam em PÍLULA de propósito**, e isso é o outro lado da regra
 * de forma: pílula é rótulo, e um chip de tema é rótulo — ele filtra, não
 * confirma. A allowlist de `buttonShape.test.ts` traz este arquivo com o motivo.
 *
 * Feature 24: **título, subtítulo, o "ver todos" e o limite vêm por prop, sem
 * fallback literal** (emenda `E1`). A lista continua saindo de
 * `pickTrendingCategories` aqui dentro, e isso **não** é um segundo dono: o
 * `derive` de `resolveHomeSections` chama a MESMA função pura com os mesmos
 * argumentos, para saber se a seção tem o que mostrar. Dois donos seria a regra
 * escrita duas vezes — não a mesma regra chamada de dois lugares.
 *
 * A moldura da seção (o chão `surface` e o respiro) passou a morar aqui: ela
 * estava na `HomePage`, e uma composição que vem do banco não tem onde guardar
 * moldura de uma seção específica.
 */

/** Quantos vêm preenchidos. Dois bastam para dar hierarquia sem virar arco-íris. */
const HIGHLIGHTED = 2

/** O limite de quando o conteúdo não declara um. Acima de 12 a nuvem de chips vira parede. */
const LIMIT_PADRAO = 12

interface Props {
  /** O `config` da seção `trending_tags` (`HOME-41`, `HOME-42`). */
  content: HomeSectionConfig
}

function TrendingTags({ content }: Props) {
  const { data: categories } = useCategories()
  const temas = pickTrendingCategories(categories, content.limit ?? LIMIT_PADRAO)

  if (temas.length === 0) return null

  return (
    <section className="bg-estrelinha-surface py-12 md:py-16">
      <div className="container">
        <motion.div
          className="flex flex-col gap-5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-[22px] leading-[1.27] tracking-[-0.03em] text-estrelinha-ink md:text-[38px] md:leading-[1.12]">
              {content.title}
            </h2>
            <p className="text-[13px] font-light text-estrelinha-ink-soft md:text-[17px]">
              {content.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {temas.map((tema, i) => (
              <Link
                key={tema.slug}
                to={categoryHref(categories ?? [], tema.id)}
                /* Preenchido: ouro com texto `ink` — 4,78:1, o único uso de texto
                   que o acento tem. Os demais são superfície branca com contorno
                   `line`, que é divisor e não borda de controle. */
                className={`inline-flex min-h-11 items-center rounded-pill px-4 py-2 text-[13px] font-semibold transition-transform hover:scale-[1.04] md:px-5 md:py-2.5 md:text-[14px] ${
                  i < HIGHLIGHTED
                    ? 'bg-estrelinha-accent text-estrelinha-ink'
                    : 'border border-estrelinha-line bg-estrelinha-surface text-estrelinha-ink'
                }`}
              >
                {tema.name}
              </Link>
            ))}
          </div>

          {/* Sem rótulo OU sem destino, o "ver todos" não sai — mesma regra do
              CTA do hero: `<Link to={undefined}>` derrubaria a Home inteira. */}
          {content.link_label && content.link_href && (
            <Link
              to={content.link_href}
              className="inline-flex min-h-11 w-fit items-center gap-1.5 text-[13px] font-semibold text-estrelinha-primary transition-opacity hover:opacity-70 md:gap-2 md:text-[15px]"
            >
              {content.link_label}
              <ArrowRight size={15} strokeWidth={2.2} />
            </Link>
          )}
        </motion.div>
      </div>
    </section>
  )
}

export default TrendingTags
