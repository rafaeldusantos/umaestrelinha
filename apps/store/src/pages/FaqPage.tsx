// Feature 46 / `FAQL-01` — a página de perguntas frequentes da loja.
//
// ⚠️ **Casca da T9.** A rota entra no `App.tsx` junto com a classificação em `ROUTE_SLUGS` e
// `SITEMAP_STATIC_PATHS` porque os quatro guardas de rota são **bidirecionais**: separar as duas
// metades deixaria a árvore vermelha entre uma task e outra, e commit que não passa no gate não é
// atômico. O conteúdo — busca, assuntos, acordeão, JSON-LD e o fecho de contato — chega na T17.

import { FAQ_PATH } from '@estrelinha/core/routes'
import { useCanonical } from '@/shared/lib/useCanonical'

const FaqPage = () => {
  useCanonical(FAQ_PATH)

  return (
    <div className="container py-10">
      <h1 className="font-display text-[34px] leading-[41px] tracking-tight text-estrelinha-ink">
        Perguntas frequentes
      </h1>
    </div>
  )
}

export default FaqPage
