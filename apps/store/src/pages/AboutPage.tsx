import { Heart, Shield, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

/**
 * Sobre — `COP-07`.
 *
 * O registro aqui é o do negócio: esta loja transforma cinzas de cremação, leite materno, mecha de
 * cabelo, pelo de pet e dente de leite em joia. Quem lê esta página muitas vezes acabou de perder
 * alguém. Nada de linguagem festiva, nada de trocadilho, nada de emoji — o vocabulário sai da
 * própria landing page da marca (`landing-pages/src/content/categorias/uma-estrelinha.json`).
 */
const AboutPage = () => (
  <div className="container py-12 max-w-2xl">
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-2 bg-estrelinha-ground-deep rounded-pill px-4 py-1.5 border border-estrelinha-line mb-4">
          <Heart className="w-4 h-4 text-estrelinha-primary" />
          <span className="text-xs font-medium text-estrelinha-ink-soft">Quem faz</span>
        </span>
        <h1 className="font-heading text-4xl font-semibold text-estrelinha-ink">
          Feito à mão, com a sua história nas mãos
        </h1>
      </div>

      <div className="bg-white rounded-2xl border border-estrelinha-line p-8 space-y-4 text-estrelinha-ink-soft leading-relaxed">
        <p>
          Cada joia da Uma Estrelinha é criada por{' '}
          <strong className="text-estrelinha-ink">Adri Muniz</strong>, joalheira em Porto Alegre/RS.
          Não é produção em série — é um trabalho de escuta e cuidado, peça por peça, história por
          história.
        </p>
        <p>
          Perder quem amamos deixa um silêncio que nenhuma palavra preenche. Quando o seu coração
          pedir, a gente transforma uma lembrança — as cinzas, um cacho de cabelo, o leite materno,
          os pelos do seu melhor amigo — em uma joia feita à mão. Não para preencher a falta, mas
          para que o amor de vocês continue por perto.
        </p>
        <p>
          Trabalhamos com prata 925, peças folheadas a ouro e resina. Usamos apenas a quantidade
          necessária do material que você envia, e{' '}
          <strong className="text-estrelinha-ink">todo o excedente volta junto com a sua joia</strong>,
          embalado com o mesmo cuidado.
        </p>

        <div className="grid grid-cols-3 gap-4 pt-4">
          {[
            { icon: Sparkles, label: 'Única', desc: 'Cada peça é feita à mão' },
            { icon: Shield, label: 'Sigilo', desc: 'Respeito no manuseio' },
            { icon: Heart, label: 'Sem pressa', desc: 'No seu tempo' },
          ].map((item) => (
            <div key={item.label} className="text-center p-4 bg-estrelinha-ground-deep rounded-xl">
              <item.icon className="w-6 h-6 text-estrelinha-primary mx-auto mb-2" />
              <p className="text-xs font-semibold text-estrelinha-ink">{item.label}</p>
              <p className="text-xs text-estrelinha-ink-soft">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  </div>
)

export default AboutPage
