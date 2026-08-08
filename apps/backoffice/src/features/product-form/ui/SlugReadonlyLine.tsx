import { Link2 } from 'lucide-react'
import { STORE_URL_PREFIX } from './SlugField'

interface Props {
  slug: string
  /** `false` depois da primeira edição manual — o vínculo com o nome foi rompido (PFM-02 AC 3). */
  derivedFromName: boolean
  onEditInSeo: () => void
}

/**
 * A URL na aba **Geral**: texto, não campo (PFM-02 AC 1).
 *
 * Ter dois inputs de slug era o defeito 01. A linha aqui informa; editar é na aba SEO, num lugar só.
 *
 * O artboard resolve isso em **uma faixa**, não em duas linhas empilhadas: ícone, endereço e o
 * atalho para a aba SEO no mesmo eixo. O slug vem em peso maior que o domínio porque é a parte que
 * muda e a única que o admin decide.
 */
const SlugReadonlyLine = ({ slug, derivedFromName, onEditInSeo }: Props) => (
  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
    <Link2 className="h-3.5 w-3.5 shrink-0 text-nana-violet" aria-hidden="true" />
    <p className="min-w-0 flex-1 text-xs">
      <span className="text-muted-foreground">{STORE_URL_PREFIX}</span>
      <span className="font-semibold text-foreground">{slug || '…'}</span>
      <span className="text-muted-foreground">
        {' · '}
        {derivedFromName
          ? 'gerada do nome'
          : 'personalizada — mudar o nome não altera mais a URL'}
      </span>
    </p>
    <button
      type="button"
      onClick={onEditInSeo}
      className="shrink-0 text-xs font-semibold text-nana-violet hover:underline"
    >
      Editar em SEO →
    </button>
  </div>
)

export default SlugReadonlyLine
