import { Link } from 'react-router-dom'
import { motion, type Variants } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
}

/**
 * A fileira de marcas do wordmark, solta — barra · losango · barra · losango ·
 * barra. É o ornamento que o artboard 23 põe no lugar da arte no celular, onde
 * uma cartela de 440px não caberia sem espremer o texto.
 *
 * `size` é a altura da barra; o resto sai dela, na proporção do logo.
 */
const MarkRow = ({ className = '' }: { className?: string }) => (
  <div className={`flex items-center gap-2 ${className}`} aria-hidden>
    {[0, 1, 2, 3, 4].map((i) =>
      i % 2 === 0 ? (
        <span key={i} className="h-2 w-[22px] shrink-0 rounded-[2px] bg-nanita-glaze" />
      ) : (
        <span key={i} className="h-[11px] w-[11px] shrink-0 rotate-45 bg-nanita-raspberry" />
      ),
    )}
  </div>
)

/**
 * A arte do hero no desktop — a **cartela de pins** do artboard 22.
 *
 * Substitui o sistema de discos com o rosto da Nana. A mascote não sumiu da
 * loja: ela é a persona da criadora e segue no 404, nos estados vazios e na
 * página Sobre. O que mudou é que o hero passa a mostrar o **produto**, e a
 * cartela pontilhada é a embalagem em que ele chega.
 *
 * Tudo em porcentagem de um quadrado de 440px, para escalar junto.
 */
const HeroArt = () => (
  <div className="relative aspect-square w-full max-w-[440px]" aria-hidden>
    {/* A cartela: papel com picote, levemente torta */}
    <div className="absolute left-[6.4%] top-[10%] h-[78.2%] w-[87.3%] -rotate-3 rounded-[28px] border-2 border-dashed border-nanita-rule bg-nanita-paper" />

    
    {/* Pin grande, Carimbo. As medidas de dentro são porcentagem DO PIN (184px
        no artboard), não do quadrado de 440: barra 26×9, losango 13×13, gap 10. */}
    <div className="absolute left-[10%] top-[16.4%] flex h-[41.8%] w-[41.8%] items-center justify-center gap-[5.4%] rounded-full bg-nanita-glaze">
      {[0, 1, 2, 3, 4].map((i) =>
        i % 2 === 0 ? (
          <span key={i} className="h-[4.9%] w-[14.1%] shrink-0 rounded-[2px] bg-white" />
        ) : (
          <span key={i} className="h-[7.1%] w-[7.1%] shrink-0 rotate-45 bg-white" />
        ),
      )}
    </div>

    {/* Pin Grafite com losango Fita — o único lugar da arte com manteiga */}
    <div className="absolute left-[57.3%] top-[14.1%] flex h-[25.5%] w-[25.5%] items-center justify-center rounded-full bg-nanita-ink">
      <span className="h-[23%] w-[23%] rotate-45 bg-nanita-butter" />
    </div>

    {/* Pin com aro — a borda crimpada do produto de verdade */}
    <div className="absolute left-[60.9%] top-[45.5%] flex h-[21.8%] w-[21.8%] items-center justify-center rounded-full border-[8px] border-nanita-glaze bg-white">
      <span className="h-[10.5%] w-[31%] rounded-[2px] bg-nanita-glaze" />
    </div>

    {/* Pin Mata-borrão com losango Selo */}
    <div className="absolute left-[40%] top-[62.7%] flex h-[17.3%] w-[17.3%] items-center justify-center rounded-full bg-nanita-sugar">
      <span className="h-[21%] w-[21%] rotate-45 bg-nanita-raspberry" />
    </div>

    {/* Pin Selo, chapado */}
    <div className="absolute left-[20.9%] top-[64.5%] h-[10.9%] w-[10.9%] rounded-full bg-nanita-raspberry" />

    {/* Selo "FEITO À MÃO" — Fita sobre Grafite, a única combinação em que a
        manteiga é legível (10,17:1). */}
    <div className="absolute left-[56.8%] top-[75.9%] flex -rotate-[5deg] items-center gap-2 rounded-pill bg-nanita-ink px-3.5 py-2">
      <span className="h-2 w-2 shrink-0 rotate-45 bg-nanita-butter" />
      <span className="whitespace-nowrap text-[11px] font-semibold tracking-[0.16em] text-nanita-butter">
        FEITO À MÃO
      </span>
    </div>
  </div>
)

/**
 * Hero da home — artboards 22 (desktop) e 23 (celular).
 *
 * O título sai em **duas cores**: a primeira linha em Grafite e a segunda em
 * Carmim. Não é decoração — é o que dá o pico de contraste sem precisar de um
 * terceiro tamanho de fonte.
 *
 * O celular não recebe a cartela. Uma arte de 440px ali espremeria o texto, e o
 * artboard 23 põe no lugar dela a fileira de marcas do wordmark, que ocupa uma
 * linha e diz a mesma coisa.
 */
const HeroBanner = () => (
  /* Papel, o mesmo chão da página — medido nos dois artboards. O hero não é
     uma faixa de cor: quem carrega o peso aqui é o tipo, não o fundo. */
  <section className="bg-nanita-paper">
    <motion.div
      className="container flex flex-col items-center justify-between gap-12 pb-16 pt-12 md:flex-row md:gap-20 md:pb-20 md:pt-16"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* ESQUERDA — o peso está aqui: 82px de Fredoka contra tudo em 15–19px */}
      <div className="flex w-full flex-col gap-6 md:w-[640px] md:gap-8">
        <motion.div variants={item}>
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-nanita-glaze/40 bg-nanita-sugar px-3.5 py-1.5">
            <span className="text-[13px] font-semibold tracking-[0.02em] text-nanita-jam">
              Drop novo toda sexta
            </span>
            <span aria-hidden className="text-[13px] text-nanita-jam">
              →
            </span>
          </span>
        </motion.div>

        <motion.h1
          variants={item}
          className="font-display text-[42px] font-semibold leading-[1.1] tracking-[-0.035em] md:text-[82px] md:leading-[1]"
        >
          <span className="block text-nanita-ink">Cole no peito,</span>
          <span className="block text-nanita-jam">carrega no coração.</span>
        </motion.h1>

        <motion.div variants={item}>
          <MarkRow className="md:hidden" />
        </motion.div>

        <motion.p
          variants={item}
          className="max-w-[280px] text-[15px] leading-[1.47] text-nanita-plum md:max-w-[530px] md:text-[19px] md:leading-[1.65]"
        >
          Bottons de anime, K-Pop, games e tudo que você ama. Feitos à mão, um de cada vez, para
          gente que coleciona de verdade.
        </motion.p>

        <motion.div variants={item} className="flex flex-col gap-3.5 sm:flex-row">
          <Link
            to="/busca"
            className="inline-flex items-center justify-center gap-2.5 rounded-button bg-nanita-jam px-6 py-3.5 font-display text-[15px] font-semibold text-white transition-transform hover:scale-[1.02] active:scale-100 md:px-[30px] md:py-[17px] md:text-[17px]"
          >
            Explorar coleções
            <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
        </motion.div>

        {/* Prova social só no desktop: no celular o artboard 23 corta para dar
            a altura à dobra — e o hero de 390px já tem título, marca, subtítulo
            e dois CTAs disputando a primeira tela. */}
        <motion.div variants={item} className="hidden items-center gap-3.5 pt-2 md:flex">
          <div className="flex">
            {['bg-nanita-glaze', 'bg-nanita-raspberry', 'bg-nanita-ink'].map((bg, i) => (
              <span
                key={bg}
                className={`inline-block h-[30px] w-[30px] shrink-0 rounded-full border-2 border-white ${bg}`}
                style={{ marginLeft: i === 0 ? 0 : -9 }}
              />
            ))}
          </div>
          <span className="text-[15px] text-nanita-plum">+2.000 colecionadoras felizes</span>
        </motion.div>
      </div>

      {/* DIREITA */}
      <motion.div
        variants={item}
        className="hidden w-full justify-center md:flex md:w-[440px] md:shrink-0"
      >
        <HeroArt />
      </motion.div>
    </motion.div>
  </section>
)

export default HeroBanner
