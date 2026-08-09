import { Link } from 'react-router-dom'
import { motion, type Variants } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { EstrelinhaSymbol } from '@/shared/ui/brand'

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
}

/**
 * O sobretítulo do board (`6C6-0`): uma régua curta em `accent` e o rótulo em
 * caixa alta. A régua é objeto gráfico de 1px — ouro ali é detalhe, não texto.
 */
const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <span className="flex items-center gap-2.5">
    <span aria-hidden className="h-px w-[22px] shrink-0 bg-estrelinha-accent-strong" />
    <span className="estrelinha-eyebrow text-estrelinha-ink-soft">{children}</span>
  </span>
)

/**
 * A arte do hero — **o símbolo da marca sobre o palco `serenity`**.
 *
 * O que estava aqui era uma **cartela de pins**: papel picotado, cinco discos e
 * um selo. Ela existia para mostrar o produto da loja anterior, e não há como
 * re-tematizá-la — um botton desenhado em ouro continua sendo um botton
 * (`IDN-04`). O produto desta loja é uma peça única feita com o material da
 * cliente, e ele **não tem forma genérica**: qualquer desenho de joia aqui
 * prometeria um modelo específico que o catálogo pode não ter.
 *
 * Então a arte é a marca, no molde de figura que o board usa (`6CC-0`): palco
 * `serenity` de raio `lg`, desenho de traço em cima e uma etiqueta branca
 * levemente torta com o eyebrow e a linha em display.
 *
 * `serenity` é o único uso pontual que o `design.md` reserva para ele — faixa e
 * palco —, e é o lugar certo: 1,19:1 sobre o chão, então nada de texto vive
 * aqui dentro além da etiqueta, que tem superfície própria.
 */
const HeroArt = () => (
  <div className="relative flex aspect-[350/260] w-full max-w-[440px] items-center justify-center rounded-lg bg-estrelinha-serenity">
    <EstrelinhaSymbol size={200} className="max-w-[52%]" />

    <div className="absolute bottom-5 left-5 flex -rotate-[2.5deg] flex-col gap-[3px] rounded-sm bg-estrelinha-surface px-3.5 py-2.5 shadow-estrelinha-soft">
      <span className="estrelinha-eyebrow text-[10px] leading-3 text-estrelinha-ink-soft">
        Feito à mão
      </span>
      <span className="font-display text-sm font-bold leading-[18px] text-estrelinha-primary">
        uma peça por vez
      </span>
    </div>
  </div>
)

/**
 * Hero da home.
 *
 * O board `516-0` ("Home Loja — re-skin") está **vazio**, e o `design.md`
 * declara a home fora do redesenho: ela recebe paleta e chrome, não desenho
 * novo. O que muda aqui é o que **não podia ficar** — a arte de botton e a
 * chamada que descreve um produto que a loja não vende mais.
 *
 * A estrutura (título em duas cores, subtítulo, um CTA, figura à direita) é a
 * que já estava, e é a mesma dos heros do arquivo do Paper.
 *
 * O título sai em **duas cores**: a primeira linha em `ink` e a segunda em
 * `primary`. Não é decoração — é o que dá o pico de contraste sem precisar de
 * um terceiro tamanho de fonte.
 */
const HeroBanner = () => (
  /* `ground`, o mesmo chão da página. O hero não é uma faixa de cor: quem
     carrega o peso aqui é o tipo, não o fundo. */
  <section className="bg-estrelinha-ground">
    <motion.div
      className="container flex flex-col items-center justify-between gap-12 pb-16 pt-12 md:flex-row md:gap-20 md:pb-20 md:pt-16"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* ESQUERDA — o peso está aqui: 72px de Libre Baskerville contra tudo em 15–19px */}
      <div className="flex w-full flex-col gap-6 md:w-[600px] md:gap-8">
        <motion.div variants={item}>
          <Eyebrow>Joias afetivas artesanais</Eyebrow>
        </motion.div>

        <motion.h1
          variants={item}
          className="font-display text-[38px] leading-[1.12] tracking-[-0.03em] md:text-[64px] md:leading-[1.06]"
        >
          <span className="block text-estrelinha-ink">O que você ama,</span>
          <span className="block text-estrelinha-primary">eternizado em joia.</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="max-w-[320px] text-[15px] font-light leading-[1.5] text-estrelinha-ink-soft md:max-w-[520px] md:text-[19px] md:leading-[1.6]"
        >
          Peças feitas à mão em resina com o seu material — leite materno, cabelos, pelos de pet,
          dentinhos ou cinzas. Cada joia é única, porque cada história é.
        </motion.p>

        <motion.div variants={item} className="flex flex-col gap-3.5 sm:flex-row">
          <Link
            to="/busca"
            className="inline-flex min-h-11 items-center justify-center gap-2.5 rounded-sm bg-estrelinha-primary px-6 py-3.5 font-display text-[15px] font-bold text-estrelinha-on-primary transition-colors hover:bg-estrelinha-primary-strong md:px-[30px] md:py-[17px] md:text-[17px]"
          >
            Explorar coleções
            <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
        </motion.div>
      </div>

      {/* DIREITA — a figura aparece nos dois tamanhos, porque deixou de ser uma
          cartela de 440px e cabe em 390 sem espremer o texto. */}
      <motion.div
        variants={item}
        className="flex w-full justify-center md:w-[440px] md:shrink-0"
      >
        <HeroArt />
      </motion.div>
    </motion.div>
  </section>
)

export default HeroBanner
