// Feature 29 / `SOB-01`..`SOB-11` — a página Sobre.
//
// Quem abre esta página muitas vezes está decidindo se manda pelo correio as cinzas de alguém. O que
// ela precisa responder é "quem é a pessoa do outro lado", e o texto é da própria Adri — não copy de
// marketing. Por isso a página é **quatro faixas de texto**, e não um card com ícones: o desenho é o
// dos artboards "Loja — Sobre a Uma Estrelinha (Mobile · simples)" e "(Desktop · simples)".
//
// **Faixa de largura cheia, e não `container`** (`SOB-01`): três das quatro seções têm cor de fundo
// própria — inclusive uma em `primary`, que é a única superfície escura da loja fora do header. Cor
// de faixa dentro de um `container` deixaria o chão aparecendo dos dois lados. O `main` do
// `StoreLayout` não impõe largura, então a faixa sangra e quem centra é a coluna de dentro.
//
// **O `✨` do texto original virou estrela desenhada** (`SOB-10`): `copyInstitucional.test.tsx` recusa
// emoji nesta página, e a recusa é do negócio, não do teste — emoji comemorativo ao lado de "quando
// alguém que amamos parte" é a loja rindo na frente de quem perdeu alguém.

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGeneralSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { EstrelinhaStarIcon } from '@estrelinha/ui/icons'
import { EstrelinhaSymbol } from '@/shared/ui/brand'
import { useCanonical } from '@/shared/lib/useCanonical'
import { TAP_ROW } from '@/shared/lib/touchTarget'

export const ABOUT_PATH = '/sobre'

/**
 * A fotografia da Adri, quando existir uma (`SOB-04`).
 *
 * `null` **não é pendência esquecida, é o estado de hoje**: o retrato não está no repositório, e o
 * artboard marca a vaga com uma caixa escrita "FOTO · retrato vertical 4:5". Caixa de notação é
 * linguagem de desenho — publicá-la seria mostrar à cliente o rascunho. Enquanto não houver arquivo,
 * a vaga sai como palco da marca, que é o mesmo par foto-ou-desenho que o `HeroBanner` da home já
 * pratica (`HOME-18`).
 *
 * Para acender: `import adri from '@/assets/adri.jpg'` e troque o `null` — o `<img>` entra sem mais
 * nada mudar, porque a vaga já tem a proporção e o recorte.
 */
const ADRI_PHOTO: { src: string; alt: string } | null = null

/** A coluna de conteúdo: 350 no mobile (390 − 2×20), 1200 no desktop (1440 − 2×120). */
const COLUNA = 'mx-auto w-full max-w-[1240px] px-5'

/** A medida de leitura do corpo, do artboard: 17/28 no mobile, 19/34 no desktop. */
const CORPO =
  'text-[17px] font-light leading-7 text-estrelinha-ink-soft md:text-[19px] md:leading-[34px]'

/**
 * A vaga da foto (`SOB-04`).
 *
 * **Uma proporção só nos dois tamanhos, 4:3 paisagem** — 350×262 no mobile, 520×390 no desktop. Duas
 * proporções obrigariam a dona a mandar dois recortes da mesma fotografia, ou fariam o navegador
 * cortar o retrato de um jeito no celular e de outro no computador. A proporção vem em classe e não
 * em altura fixa: altura fixa quebraria em toda viewport que não é a do board.
 */
const VagaDaFoto = ({ className = '' }: { className?: string }) => (
  <div
    className={`relative aspect-[4/3] w-full max-w-[350px] overflow-hidden rounded-lg bg-estrelinha-serenity md:max-w-[520px] ${className}`}
  >
    {ADRI_PHOTO ? (
      <img src={ADRI_PHOTO.src} alt={ADRI_PHOTO.alt} className="h-full w-full object-cover" />
    ) : (
      <span className="flex h-full w-full items-center justify-center">
        <EstrelinhaSymbol size={120} className="max-w-[36%]" />
      </span>
    )}
    <EstrelinhaStarIcon
      aria-hidden
      className="absolute right-5 top-5 hidden h-[34px] w-[34px] text-estrelinha-accent-strong md:block"
    />
  </div>
)

/**
 * A legenda da foto (`SOB-03`).
 *
 * **Ela troca de coluna, e não de texto**: no desktop pertence à coluna de texto, fechando o bloco
 * do título; no mobile vem depois da foto. Uma marcação só, posicionada por `grid-area` — duplicar o
 * parágrafo por breakpoint criaria dois lugares para corrigir a mesma frase, e o leitor de tela leria
 * a legenda duas vezes.
 */
const LegendaDaFoto = ({ className = '' }: { className?: string }) => (
  <p className={`flex items-start gap-2.5 md:gap-3 ${className}`}>
    <span aria-hidden className="mt-[9px] h-px w-[18px] shrink-0 bg-estrelinha-accent md:w-[22px]" />
    <span className="text-[13px] font-light leading-5 text-estrelinha-ink-soft md:text-sm md:leading-6">
      Adri Muniz, fundadora da Uma Estrelinha. Cada peça é feita à mão por ela, em Porto Alegre/RS.
    </span>
  </p>
)

/**
 * A trilha (`SOB-12`).
 *
 * É a primeira da loja — nenhuma outra página tem uma —, e por isso mora aqui e não em `shared/ui`:
 * componente compartilhado com um consumidor só é abstração antes da hora. Quando a segunda página
 * pedir trilha, ela sobe com as duas necessidades na mesa.
 *
 * `TAP_ROW`, e não `TAP_44`: é texto em fluxo, e um quadrado de 44 centrado num rótulo de 40px
 * deixaria as pontas fora do alvo (`CLAUDE.md`).
 */
const Trilha = () => (
  <nav aria-label="Trilha de navegação" className="border-b border-estrelinha-line bg-estrelinha-ground">
    <ol className={`${COLUNA} flex items-center gap-2 py-3.5 md:py-[18px]`}>
      <li>
        <Link
          to="/"
          className={`${TAP_ROW} text-[13px] font-light leading-4 text-estrelinha-ink-soft hover:text-estrelinha-primary md:text-sm`}
        >
          Início
        </Link>
      </li>
      <li aria-hidden className="flex items-center">
        <svg viewBox="0 0 24 24" className="h-3 w-3 text-estrelinha-line" fill="none">
          <path
            d="M9 5l7 7-7 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </li>
      <li
        aria-current="page"
        className="text-[13px] font-medium leading-4 text-estrelinha-primary md:text-sm"
      >
        Sobre
      </li>
    </ol>
  </nav>
)

const AboutPage = () => {
  useCanonical(ABOUT_PATH)

  // Mesmo portão do `WhatsAppFloat`: número curto demais é número não configurado, e a ação sai de
  // cena em vez de abrir uma conversa com ninguém (`SOB-08`).
  const { whatsapp, store_name } = useGeneralSettings()
  const phone = whatsapp?.replace(/\D/g, '') || ''
  const hasWhatsApp = phone.length >= 10
  const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(
    `Olá! Vim pela página Sobre da ${store_name || 'Uma Estrelinha'} e gostaria de conversar.`,
  )}`

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col"
    >
      <Trilha />

      {/* 1 · Hero — `ground-deep`, 40/44 no mobile e 96 no desktop.
          A ordem do DOM é a do mobile (título → foto → legenda), que é a ordem de leitura em
          ~90% dos acessos. No desktop a grade repõe a legenda na coluna de texto sem duplicar
          marcação: `minmax(0,…)` nas duas trilhas porque o mínimo automático de uma coluna é o
          min-content do item, e é assim que a página do produto passou a rolar na horizontal. */}
      <section
        data-testid="sobre-hero"
        className="relative bg-estrelinha-ground-deep pb-11 pt-10 md:py-24"
      >
        <div
          className={`${COLUNA} flex flex-col items-start gap-[22px] md:grid md:grid-cols-[minmax(0,600px)_minmax(0,520px)] md:items-center md:gap-x-20 md:gap-y-[26px]`}
        >
          <EstrelinhaStarIcon
            aria-hidden
            className="absolute right-6 top-[38px] h-[26px] w-[26px] text-estrelinha-accent-strong md:hidden"
          />
          <div className="flex flex-col items-start gap-[22px] md:col-start-1 md:row-start-1 md:gap-[26px]">
            <h1 className="max-w-[300px] font-display text-[34px] leading-[44px] tracking-[-0.02em] text-estrelinha-ink md:max-w-none md:text-[56px] md:leading-[70px]">
              Sobre a Uma Estrelinha
            </h1>
            <p className="font-display text-[22px] italic leading-[34px] text-estrelinha-primary md:max-w-[560px] md:text-[28px] md:leading-[44px]">
              Algumas lembranças são preciosas demais para ficarem apenas na memória.
            </p>
          </div>
          <VagaDaFoto className="md:col-start-2 md:row-span-2 md:row-start-1 md:self-center" />
          <LegendaDaFoto className="md:col-start-1 md:row-start-2 md:max-w-[520px]" />
        </div>
      </section>

      {/* 2 · A história — `ground`, coluna de leitura de 720 no desktop (`SOB-02`) */}
      <section
        aria-labelledby="sobre-historia"
        data-testid="sobre-historia"
        className="bg-estrelinha-ground pb-12 pt-11 md:py-[104px]"
      >
        <div
          className={`${COLUNA} flex w-full flex-col items-start gap-5 md:max-w-[720px] md:gap-[26px]`}
        >
          <h2
            id="sobre-historia"
            className="font-display text-[28px] leading-[38px] tracking-[-0.02em] text-estrelinha-ink md:text-[34px] md:leading-[50px]"
          >
            {/* O nome sai em nó próprio de propósito: é o que o guarda da copy institucional procura,
                e é também o que a leitora procura — a página inteira existe para apresentá-la. */}
            Prazer, eu sou <strong className="font-normal">Adri Muniz</strong>, fundadora da Uma
            Estrelinha.
          </h2>
          <p className={CORPO}>
            Sou mãe de duas meninas, esposa, apaixonada pelos meus gatos e por tudo aquilo que carrega
            significado. E foi justamente uma experiência muito pessoal que deu origem à Uma
            Estrelinha.
          </p>
          <p className={CORPO}>
            Durante a pandemia, encontrei no TikTok um vídeo de uma menina que transformava as cinzas
            de um gatinho em uma lembrança afetiva. Aquela cena me emocionou profundamente e, naquele
            momento, pensei:
          </p>
          <blockquote className="flex items-stretch gap-4 md:gap-6">
            <span aria-hidden className="w-0.5 shrink-0 bg-estrelinha-accent" />
            <p className="font-display text-[22px] italic leading-9 text-estrelinha-primary md:text-[28px] md:leading-[48px]">
              “Quando meus gatos virarem estrelinha, eu quero fazer isso também.”
            </p>
          </blockquote>
          <p className={CORPO}>
            Eu ainda não sabia como aquilo era feito. Algum tempo depois, conheci o universo das joias
            afetivas e da resina e me apaixonei pelas infinitas possibilidades de transformar pequenos
            fragmentos de uma história em algo que pudesse ser guardado para sempre.
          </p>
          <p className={CORPO}>
            O que começou pensando nos meus próprios pets acabou se tornando um propósito. Hoje, tenho
            o privilégio de criar joias de leite materno, joias para pets, peças com cabelos, pelos,
            dentes de leite, cordão umbilical, flores e cinzas de cremação, eternizando momentos que
            marcaram a vida de tantas pessoas.
          </p>
          <p className="font-display text-[19px] leading-8 text-estrelinha-ink md:text-[22px] md:leading-10">
            Ao longo dessa caminhada, percebi que não estava apenas criando joias. Estava recebendo
            histórias — de nascimento, maternidade, amor, infância, companheirismo e também de
            despedidas.
          </p>
          <p className={CORPO}>
            Cada material que chega até minhas mãos representa alguém, um momento ou uma história que
            é única. Por isso, cada peça é produzida artesanalmente com muito cuidado, carinho e
            respeito pelo significado que existe por trás dela.
          </p>
          <p className={CORPO}>
            E talvez essa seja a parte mais bonita do meu trabalho: perceber que, enquanto eternizo as
            lembranças de outras pessoas, elas também deixaram uma marca na minha história.
          </p>
        </div>
      </section>

      {/* 3 · O nome — a única faixa escura da página */}
      <section
        aria-labelledby="sobre-o-nome"
        data-testid="sobre-o-nome"
        className="bg-estrelinha-primary pb-14 pt-13 md:py-[120px]"
      >
        <div
          className={`${COLUNA} flex flex-col items-start gap-[22px] md:items-center md:gap-[30px]`}
        >
          <h2 id="sobre-o-nome" className="sr-only">
            O nome
          </h2>
          {/* O rótulo sai em `serenity`, não em ouro: `accent` mede 3,07:1 sobre `primary` e reprova
              como texto. Sobre esta faixa o ouro só é permitido como TRAÇO (`SOB-06`). */}
          <p className="flex items-center gap-2.5 md:gap-3">
            <span aria-hidden className="h-px w-[22px] shrink-0 bg-estrelinha-accent md:w-7" />
            <span className="estrelinha-eyebrow text-[11px] leading-[14px] text-estrelinha-serenity md:text-[12px] md:leading-4">
              O nome
            </span>
          </p>
          <p className="text-[17px] font-light leading-7 text-estrelinha-on-primary md:max-w-[820px] md:text-center md:text-[19px] md:leading-[34px]">
            O nome Uma Estrelinha nasceu justamente dessa ideia. Porque acredito que, quando alguém
            que amamos parte, seja uma pessoa ou um companheiro de quatro patas, ele não deixa de
            fazer parte da nossa vida.
          </p>
          <p className="max-w-[330px] font-display text-[34px] italic leading-[46px] tracking-[-0.02em] text-estrelinha-on-primary md:max-w-[900px] md:text-center md:text-[44px] md:leading-[64px]">
            Apenas passa a brilhar de outro lugar.
          </p>
          <EstrelinhaStarIcon
            aria-hidden
            className="h-[30px] w-[30px] text-estrelinha-accent md:h-[34px] md:w-[34px]"
          />
        </div>
      </section>

      {/* 4 · Fecho e convite */}
      <section
        aria-labelledby="sobre-fecho"
        data-testid="sobre-fecho"
        className="bg-estrelinha-ground-deep pb-13 pt-12 md:py-[104px]"
      >
        <div
          className={`${COLUNA} flex flex-col items-start gap-[26px] md:items-center md:gap-[30px]`}
        >
          <h2 id="sobre-fecho" className="sr-only">
            O que a Uma Estrelinha faz
          </h2>
          <p className={`${CORPO} md:max-w-[720px] md:text-center`}>
            A Uma Estrelinha existe para transformar pequenos pedacinhos de histórias em lembranças
            que podem ser carregadas para sempre.
          </p>

          <div className="flex flex-col gap-1.5 md:items-center md:gap-2">
            <p className="font-display text-[22px] leading-9 text-estrelinha-ink-soft md:text-[28px] md:leading-[46px]">
              Porque algumas fases passam.
            </p>
            <p className="font-display text-[22px] leading-9 text-estrelinha-ink-soft md:text-[28px] md:leading-[46px]">
              Algumas pessoas partem.
            </p>
            <p className="font-display text-[22px] font-semibold leading-9 text-estrelinha-ink md:text-[28px] md:leading-[46px]">
              Mas o amor permanece.
            </p>
          </div>

          <div className="flex w-full flex-col items-start gap-3 md:w-[440px] md:items-center md:gap-3.5">
            <span aria-hidden className="h-px w-full bg-estrelinha-line" />
            {/* O artboard traz este versalete em ouro, e ele NÃO pode sair assim: `accent-strong`
                sobre `ground-deep` mede 3,17:1 — passa como traço (3:1) e reprova como texto
                (4,5:1). O fio acima continua ouro, porque fio é desenho. Divergência deliberada do
                desenho, na direção que `accentText.test.ts` existe para cobrar. */}
            <p className="estrelinha-eyebrow text-[11px] leading-[14px] text-estrelinha-ink-soft md:text-[12px] md:leading-4">
              Uma Estrelinha
            </p>
            <p className="font-display text-[19px] italic leading-[30px] text-estrelinha-primary md:text-[22px] md:leading-[34px]">
              eternizando suas lembranças
            </p>
          </div>

          {/* Ação é `rounded-sm` (6px) — pílula nesta loja é forma de RÓTULO, não de botão. As duas
              têm 44px de altura no mínimo, o piso de alvo de toque do projeto (`SOB-11`). */}
          <div className="flex w-full flex-col gap-3.5 md:w-auto md:flex-row md:items-center">
            <Link
              to="/busca"
              className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-sm bg-estrelinha-primary px-8 py-4 text-[17px] font-semibold text-estrelinha-on-primary transition-colors hover:bg-estrelinha-primary-strong md:w-auto"
            >
              Conhecer as joias
              <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none">
                <path
                  d="M5 12h13M12.5 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            {hasWhatsApp && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-sm border border-estrelinha-line bg-estrelinha-surface px-8 py-4 text-[17px] font-medium text-estrelinha-ink transition-colors hover:bg-estrelinha-ground md:w-auto"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="h-[18px] w-[18px] shrink-0 text-estrelinha-whatsapp"
                  fill="none"
                >
                  <path
                    d="M20 11.5c0 4.3-3.6 7.8-8 7.8-1.3 0-2.6-.3-3.7-.9L4 19.5l1.2-3.4A7.6 7.6 0 0 1 4 11.5C4 7.2 7.6 3.7 12 3.7s8 3.5 8 7.8z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.4 9.2c.6 2.4 2.4 4 4.6 4.6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                Falar com a Adri
              </a>
            )}
          </div>
        </div>
      </section>
    </motion.article>
  )
}

export default AboutPage
