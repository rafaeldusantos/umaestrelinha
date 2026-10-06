// Feature 61 · `ANL-07` — o passo a passo de onde criar a chave secreta, na própria tela.
//
// O aviso de "ligado sem chave" aponta para cá (pelo `id`), e é por isso que este cartão existe no
// painel e não num documento: a dona lê no momento em que está travada, com o Google aberto ao lado.
// Os nomes dos menus são os do GA4 em português, como aparecem para ela.

import { ExternalLink } from 'lucide-react'
import { SECRET_HELP_STEPS } from '../model/copy'

export const SECRET_HELP_ID = 'onde-criar-a-chave'


const SecretHelpCard = () => (
  <section
    id={SECRET_HELP_ID}
    aria-labelledby="ga-onde-criar"
    className="scroll-mt-6 space-y-3.5 rounded-2xl border border-primary/20 bg-primary/5 p-5"
  >
    <h2 id="ga-onde-criar" className="text-[15px] font-semibold text-foreground">
      Onde criar a chave secreta
    </h2>
    <ol className="space-y-2.5">
      {SECRET_HELP_STEPS.map((passo, i) => (
        <li key={passo} className="flex gap-2.5">
          <span className="w-5 shrink-0 text-xs font-bold leading-5 text-primary" aria-hidden>
            {i + 1}
          </span>
          <span className="text-sm text-foreground">{passo}</span>
        </li>
      ))}
    </ol>
    <a
      className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline"
      href="https://analytics.google.com/"
      target="_blank"
      rel="noopener noreferrer"
    >
      Abrir o Google Analytics <ExternalLink className="h-3.5 w-3.5" aria-hidden />
    </a>
  </section>
)

export default SecretHelpCard
