import { useState } from 'react'
import { EstrelinhaSymbol } from '@/shared/ui/brand'

/**
 * A faixa da newsletter — board `67W-0`.
 *
 * **O painel é `primary-strong`, não ouro.** O remap mecânico da Fase 3 trocou
 * o rosa Carimbo por `accent` e deixou aqui a maior superfície chapada da loja
 * em ouro — o lote 3 marcou isso para esta task, e o board responde: a banda é
 * slate escuro, e o **ouro aparece só no botão**, que é o único elemento que
 * precisa saltar. Ouro em bloco também não sustentaria texto: sobre `accent`,
 * `ink` até lê, mas qualquer rótulo claro dentro dele reprovaria.
 *
 * O botão é `accent` com texto **`ink`** (4,78:1), e não o `primary-strong`
 * que o board escreve: aquele par mede 4,21:1 e reprova em AA num rótulo de
 * 13px. É a única divergência de cor desta faixa, e está medida em
 * `contrast.test.ts`.
 *
 * **Um campo só, e não os três do board.** A `5MC-0` desenha nome, telefone e
 * e-mail; esta newsletter não tem destino nenhum para nome e telefone, e pedir
 * dado que ninguém guarda é coleta sem finalidade. Quando houver lista de
 * verdade, os campos nascem com ela.
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
        <div className="flex flex-col items-center gap-8 rounded-lg bg-estrelinha-primary-strong px-6 py-10 md:flex-row md:gap-14 md:px-16 md:py-11">
          {/* O símbolo da marca ocupa a coluna que no board leva o selo
              circular: `on-primary` sobre `primary-strong`, 9,60:1. */}
          <EstrelinhaSymbol size={58} tone="onInk" className="shrink-0" />

          {submitted ? (
            <div className="flex w-full flex-col gap-1 text-center md:text-left">
              <p className="font-display text-[23px] leading-7 text-estrelinha-on-primary">
                Tudo certo!
              </p>
              <p className="text-sm font-light text-estrelinha-on-primary/80">
                Você vai receber as novidades da loja no seu e-mail.
              </p>
            </div>
          ) : (
            <div className="flex w-full flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="font-display text-[23px] leading-7 text-estrelinha-on-primary">
                  Quer saber das novidades?
                </h3>
                <p className="text-sm font-light leading-[18px] text-estrelinha-on-primary/80">
                  Cadastre-se e fique por dentro das novidades da loja.
                </p>
              </div>

              <form
                noValidate
                onSubmit={handleSubmit}
                className="flex flex-col gap-3 sm:flex-row sm:items-center"
              >
                <label htmlFor="newsletter-email" className="sr-only">
                  Seu e-mail
                </label>
                {/* Sem `border`: o contorno do controle é o recorte do campo
                    branco contra a banda `primary-strong` — 12,4:1, bem acima
                    dos 3:1 da WCAG 1.4.11. */}
                <input
                  id="newsletter-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-mail"
                  required
                  className="h-[50px] w-full min-w-0 rounded-sm sm:flex-1 bg-estrelinha-surface px-4 text-sm font-light text-estrelinha-ink outline-none placeholder:text-estrelinha-ink-soft focus:ring-2 focus:ring-estrelinha-accent"
                />
                <button
                  type="submit"
                  className="h-[50px] shrink-0 rounded-sm bg-estrelinha-accent px-8 text-[13px] font-semibold uppercase tracking-[0.06em] text-estrelinha-ink transition-colors hover:bg-estrelinha-on-primary"
                >
                  Me cadastrar
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default NewsletterBanner
