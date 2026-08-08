import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

/**
 * Chips de fandom — artboards 22 e 23.
 *
 * Antes cada tag tinha a própria cor (roxo, verde, âmbar, rosa…), e a seção
 * virava um arco-íris sem hierarquia. Agora só as duas em alta recebem
 * preenchimento sólido; o resto é branco com contorno de Dobra.
 *
 * **Estes chips continuam em PÍLULA de propósito**, e isso é o outro lado da
 * regra de forma da v2: pílula é rótulo, e um chip de tema é rótulo — ele
 * filtra, não confirma. A allowlist de `buttonShape.test.ts` traz este arquivo
 * com o motivo escrito.
 */
const HOT_TAGS = new Set(['NarutoClassic', 'Stray Kids']);

const tags = [
  'NarutoClassic',
  'BTS',
  'StudioGhibli',
  'OnePiece',
  'Pokémon',
  'Blackpink',
  'JujutsuKaisen',
  'StarWars',
  'DemonSlayer',
  'Stray Kids',
  'DragonBall',
  'Twice',
];

function TrendingTags() {
  return (
    <motion.div
      className="flex flex-col gap-5"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-[22px] font-semibold leading-[1.27] tracking-[-0.03em] text-estrelinha-ink md:text-[44px] md:leading-[1.09]">
          Explore por tema
        </h2>
        <p className="text-[13px] text-estrelinha-ink-soft md:text-[17px]">
          Os fandoms mais pedidos, direto ao ponto
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {tags.map((tag) => {
          const hot = HOT_TAGS.has(tag);
          return (
            <Link
              key={tag}
              to={`/busca?q=${tag.replace(/\s/g, '')}`}
              className={`inline-flex items-center rounded-pill px-4 py-2 text-[13px] font-semibold transition-transform hover:scale-[1.04] md:px-5 md:py-2.5 md:text-[14px] ${
                hot
                  ? 'bg-estrelinha-accent text-estrelinha-ink'
                  : 'border border-estrelinha-line bg-white text-estrelinha-ink'
              }`}
            >
              #{tag.replace(/\s/g, '')}
            </Link>
          );
        })}
      </div>

      <Link
        to="/busca"
        className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-estrelinha-primary transition-opacity hover:opacity-70 md:gap-2 md:text-[15px]"
      >
        Ver todos os temas
        <ArrowRight size={15} strokeWidth={2.2} />
      </Link>
    </motion.div>
  );
}

export default TrendingTags
