import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { browseCategories, useCategories } from '@/entities/category'
import { categoryHref } from '@estrelinha/core/menu'
import { useProducts } from '@/entities/product/api/useProducts'
import SectionHeading from '@/shared/ui/SectionHeading'

/**
 * Ritmo de cor dos cards, por POSIÇÃO — artboards 22 e 23.
 *
 * **1º Carimbo → 2º Grafite → demais Mata-borrão.** Duas superfícies carregam
 * peso e o resto recua; é o que substituiu os seis gradientes coloridos da
 * versão anterior, em que cada categoria escolhia a própria cor e nenhuma delas
 * virava marca.
 *
 * A inicial marca-d'água é o único ornamento, e a cor dela muda com o fundo:
 * véu de branco sobre Carimbo, Carbono CHAPADO sobre Grafite (véu de rosa ali
 * sumiria), véu de Carimbo sobre Mata-borrão.
 */
const SURFACES = [
  {
    card: 'bg-estrelinha-accent',
    title: 'text-estrelinha-ink',
    // `ink` CHAPADO, não a 80%: sobre `accent` o cheio já é 4,78:1, e a 80%
    // cai para ~3,7:1 — o rótulo de contagem reprovaria a AA sem nada acusar.
    meta: 'text-estrelinha-ink',
    initial: 'text-white/35',
  },
  {
    card: 'bg-estrelinha-ink',
    title: 'text-estrelinha-accent',
    meta: 'text-estrelinha-line',
    initial: 'text-estrelinha-ink-soft',
  },
] as const

const SUGAR = {
  card: 'bg-estrelinha-ground-deep',
  title: 'text-estrelinha-ink',
  meta: 'text-estrelinha-ink-soft',
  initial: 'text-estrelinha-accent/40',
} as const

const CategoryGrid = () => {
  const { data: categories } = useCategories()
  const { data: products } = useProducts()

  // A grade é "escolha a sua linha": uma subcategoria lado a lado com o contêiner que a agrupa não é
  // escolha, é confusão — e um contêiner sozinho não é escolha nenhuma. Ver `browseCategories`.
  const visible = browseCategories(categories).slice(0, 6)

  if (visible.length === 0) return null

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Coleções"
        subtitle="Cada linha nasce de um material diferente"
        linkTo="/busca"
        linkLabel="Ver todas"
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4">
        {visible.map((cat, i) => {
          const tone = SURFACES[i] ?? SUGAR
          const productCount = products?.filter((p) => p.category_slug === cat.slug).length ?? 0

          return (
            <motion.div
              key={cat.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={categoryHref(categories ?? [], cat.id)}
                className={`relative flex h-[120px] flex-col justify-end gap-0.5 overflow-hidden rounded-md p-3.5 transition-transform hover:-translate-y-0.5 md:h-[132px] md:gap-1.5 md:rounded-lg md:p-5 ${tone.card}`}
              >
                {/* Inicial como marca d'água — o único ornamento do card.
                    Usa a família de display, a mesma dos títulos: a marca é traço
                    vetorial, então não há fonte de logotipo para usar aqui. */}
                <span
                  className={`pointer-events-none absolute right-2.5 top-0.5 select-none font-display text-[68px] font-bold leading-[76px] tracking-[-0.03em] md:-top-[14px] md:right-4 md:text-[76px] md:leading-[96px] ${tone.initial}`}
                  aria-hidden
                >
                  {cat.name.charAt(0)}
                </span>
                <span
                  className={`font-display text-[18px] font-semibold leading-[1.22] tracking-[-0.02em] md:text-[21px] md:leading-[1.24] ${tone.title}`}
                >
                  {cat.name}
                </span>
                {/* "pins" era o produto da loja anterior, e sobreviveu ao rebrand porque
                    `brandScan` varre o NOME da marca, não o vocabulário dela. Aqui é "peça", com
                    singular de verdade: "1 peças" na categoria com um item só é o tipo de detalhe
                    que a cliente lê antes de qualquer um de nós. */}
                <span className={`text-[11px] font-medium md:text-[13px] ${tone.meta}`}>
                  {productCount} {productCount === 1 ? 'peça' : 'peças'}
                </span>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export default CategoryGrid
