import { useState } from 'react'

/**
 * Banner do clube — artboards 22 e 23.
 *
 * É o único bloco da página inteiramente em CARIMBO: o "momento de cor" da
 * home, e o único lugar onde o rosa de preenchimento ocupa uma seção inteira.
 * Justamente por isso não leva mais nada colorido dentro — tipografia em
 * Grafite, campo branco, botão em Grafite, e um disco branco com o desconto em
 * Carmim.
 *
 * O texto é Grafite CHAPADO, sem véu. Sobre Carimbo, Grafite lê a 5,22:1 e
 * qualquer opacidade come esse contraste; o véu só existe sobre superfícies
 * escuras, onde a base é branca.
 */
const NewsletterBanner = () => {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) setSubmitted(true)
  }

  return (
    <section className="py-10 md:py-14">
      <div className="container">
        <div className="flex flex-col items-center gap-8 rounded-[32px] bg-estrelinha-accent px-6 py-10 md:flex-row md:justify-between md:gap-12 md:px-16 md:py-14">
          {submitted ? (
            <div className="flex w-full flex-col items-center gap-2 py-4 text-center">
              <span className="text-4xl" role="img" aria-label="Confete">
                🎉
              </span>
              <p className="font-display text-[28px] font-semibold tracking-[-0.02em] text-estrelinha-ink">
                Tudo certo!
              </p>
              <p className="text-[16px] text-estrelinha-ink">
                Você vai receber um cupom de 10% OFF no e-mail.
              </p>
            </div>
          ) : (
            <>
              <div className="flex w-full flex-col gap-4 md:max-w-[560px]">
                <h3 className="font-display text-[28px] font-semibold leading-[1.15] tracking-[-0.03em] text-estrelinha-ink md:text-[36px]">
                  Entra no clube da Nana
                </h3>
                <p className="text-[15px] leading-relaxed text-estrelinha-ink md:text-[17px]">
                  Drops antes de todo mundo, promo secreta e 10% OFF no primeiro pedido.
                </p>

                <form
                  noValidate
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-2 rounded-sm bg-white p-1.5 sm:flex-row sm:items-center"
                >
                  <label htmlFor="newsletter-email" className="sr-only">
                    Seu e-mail
                  </label>
                  <input
                    id="newsletter-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="min-w-0 flex-1 bg-transparent px-5 py-2.5 text-[15px] text-estrelinha-ink outline-none placeholder:text-estrelinha-ink-soft"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-sm bg-estrelinha-ink px-6 py-3.5 font-display text-[15px] font-semibold text-white transition-transform hover:scale-[1.03] active:scale-100 md:text-[16px]"
                  >
                    Quero 10% OFF
                  </button>
                </form>

                <p className="text-[13px] text-estrelinha-ink">
                  Sem spam. Só coisa boa. Cancele quando quiser.
                </p>
              </div>

              {/* Selo do desconto — disco branco, o respiro dentro do rosa. */}
              <div
                className="flex h-[150px] w-[150px] shrink-0 flex-col items-center justify-center rounded-full bg-white md:h-[196px] md:w-[196px]"
                aria-hidden
              >
                <span className="font-display text-[46px] font-semibold leading-none tracking-[-0.03em] text-estrelinha-primary md:text-[58px]">
                  10%
                </span>
                <span className="mt-1 text-[12px] font-bold uppercase tracking-[0.18em] text-estrelinha-ink">off</span>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export default NewsletterBanner
