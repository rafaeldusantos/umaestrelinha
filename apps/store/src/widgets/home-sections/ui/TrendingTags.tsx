import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useCategories } from '@/entities/category'
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
 */

/** Quantos chips a seção mostra. Acima disso a nuvem vira parede. */
const LIMIT = 12

/** Quantos vêm preenchidos. Dois bastam para dar hierarquia sem virar arco-íris. */
const HIGHLIGHTED = 2

function TrendingTags() {
  const { data: categories } = useCategories()
  const temas = pickTrendingCategories(categories, LIMIT)

  if (temas.length === 0) return null

  return (
    <motion.div
      className="flex flex-col gap-5"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-[22px] leading-[1.27] tracking-[-0.03em] text-estrelinha-ink md:text-[38px] md:leading-[1.12]">
          Explore por tema
        </h2>
        <p className="text-[13px] font-light text-estrelinha-ink-soft md:text-[17px]">
          As linhas mais procuradas, direto ao ponto
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {temas.map((tema, i) => (
          <Link
            key={tema.slug}
            to={`/colecao/${tema.slug}`}
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

      <Link
        to="/busca"
        className="inline-flex min-h-11 w-fit items-center gap-1.5 text-[13px] font-semibold text-estrelinha-primary transition-opacity hover:opacity-70 md:gap-2 md:text-[15px]"
      >
        Ver todos os temas
        <ArrowRight size={15} strokeWidth={2.2} />
      </Link>
    </motion.div>
  )
}

export default TrendingTags
