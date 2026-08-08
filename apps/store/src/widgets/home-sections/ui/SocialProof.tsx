import { motion } from "framer-motion";

/** Estrelas em Fita — o mesmo papel de destaque que ela tem no contador e no
 *  selo do kit. Preenchimento puro, nunca lidas como texto. */
const StarRow = () => (
  <div className="flex items-center gap-[3px]" aria-label="5 de 5 estrelas">
    {Array.from({ length: 5 }).map((_, i) => (
      <svg key={i} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <path
          d="M7 1l1.5 3.5L12 5l-2.5 2.5.5 3.5L7 9.5 4 11l.5-3.5L2 5l3.5-.5L7 1z"
          fill="#FFC95C"
        />
      </svg>
    ))}
  </div>
);

interface TestimonialCardProps {
  quote: string;
  name: string;
  city: string;
  initial: string;
  /** Alterna Carimbo / Grafite entre depoimentos, para dar ritmo sem somar cor. */
  tone: "glaze" | "ink";
}

const TestimonialCard = ({ quote, name, city, initial, tone }: TestimonialCardProps) => (
  <div className="flex flex-col gap-3 rounded-md border border-nanita-border bg-white p-[18px]">
    <StarRow />
    <p className="text-[14px] leading-[1.5] text-nanita-ink">{quote}</p>
    <div className="flex items-center gap-2">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          tone === "ink" ? "bg-nanita-ink text-white" : "bg-nanita-glaze text-nanita-ink"
        }`}
      >
        {initial}
      </span>
      <div className="flex flex-col">
        <span className="font-display text-[13px] font-semibold text-nanita-ink">{name}</span>
        <span className="text-[12px] text-nanita-plum">{city}</span>
      </div>
    </div>
  </div>
);

export const SocialProof = () => {
  return (
    <motion.div
      className="flex flex-col gap-5 rounded-lg bg-nanita-sugar p-5 md:p-8"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-nanita-ink">
          O que a galera diz
        </h3>
        <p className="text-[14px] text-nanita-plum">+2.000 clientes felizes</p>
      </div>

      <div className="flex flex-col gap-4">
        <TestimonialCard
          quote="Amei meus bottons! A qualidade é incrível e chegaram super rápido. Já estou montando minha coleção."
          name="Marina S."
          city="São Paulo, SP"
          initial="M"
          tone="glaze"
        />
        <TestimonialCard
          quote="Comprei o kit de 10 e valeu demais! Dei de presente para as amigas e todas adoraram."
          name="Letícia R."
          city="Rio de Janeiro, RJ"
          initial="L"
          tone="ink"
        />
      </div>
    </motion.div>
  );
};

export default SocialProof;
