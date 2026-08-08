import { Heart, Sparkles, Star } from 'lucide-react'
import { motion } from 'framer-motion'

const AboutPage = () => (
  <div className="container py-12 max-w-2xl">
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-2 bg-nanita-sugar rounded-pill px-4 py-1.5 border border-nanita-border mb-4">
          <Heart className="w-4 h-4 text-nanita-jam" />
          <span className="text-xs font-medium text-nanita-plum">Sobre a criadora</span>
        </span>
        <h1 className="font-heading text-4xl font-semibold text-nanita-ink">Oi, eu sou a Nana! 💜</h1>
      </div>

      <div className="bg-white rounded-2xl border border-nanita-border p-8 space-y-4 text-nanita-plum leading-relaxed">
        <p>
          Me chamo <strong className="text-nanita-ink">Alana</strong>, mas todo mundo me chama de Nana. Sou apaixonada por fandoms e
          sempre quis criar algo que conectasse pessoas através do que elas amam.
        </p>
        <p>
          A Nanita nasceu dessa paixão! Cada botton é pensado com carinho para representar aquele anime,
          banda, jogo ou série que faz seu coração bater mais forte.
        </p>
        <p>
          Todos os pins são produzidos com materiais de qualidade e acabamento brilhante. Porque seu fandom
          merece estar no peito com estilo!
        </p>

        <div className="grid grid-cols-3 gap-4 pt-4">
          {[
            { icon: Sparkles, label: 'Feito com amor', desc: 'Cada pin é especial' },
            { icon: Star, label: 'Qualidade', desc: 'Acabamento premium' },
            { icon: Heart, label: 'Fandom first', desc: 'Por fã, para fãs' },
          ].map((item) => (
            <div key={item.label} className="text-center p-4 bg-nanita-sugar rounded-xl">
              <item.icon className="w-6 h-6 text-nanita-jam mx-auto mb-2" />
              <p className="text-xs font-semibold text-nanita-ink">{item.label}</p>
              <p className="text-xs text-nanita-plum">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  </div>
)

export default AboutPage
