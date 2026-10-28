import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { Textarea } from '@estrelinha/ui/textarea'
import { productPath } from '@estrelinha/core/routes'
import { DESCRIPTION_MAX, descriptionFromHtml, productPageMeta } from '@estrelinha/core/seo'
import { SEO_TITLE_FIELD_MAX } from '@estrelinha/core/seo/suggestion'

interface Props {
  /** O SEO curado (pode estar vazio). */
  title: string
  description: string
  slug: string
  /** O nome e a descrição (HTML) do produto, no estado ATUAL do formulário — feature 84. */
  name: string
  productDescription: string
  /** A descrição da loja (`store_settings.seo`); ausente, o piso é `STORE_DESCRIPTION_FLOOR`. */
  storeDescription?: string | null
  onTitleChange: (v: string) => void
  onDescriptionChange: (v: string) => void
}

const AutoBadge = () => (
  // `max-w-full`: a 360/200 % o selo passava ~21px da caixa. `whitespace-nowrap`: a palavra não parte ao
  // meio ("automáti / co", reteste do QA) — ela cabe numa caixa de 166px mesmo a 200 %.
  <span className="max-w-full whitespace-nowrap rounded-pill bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
    automático
  </span>
)

/**
 * A prévia de busca e os campos de SEO. O slug NÃO é editado aqui desde a 11/T32: quem o edita é o
 * `SlugField`, que verifica disponibilidade e cuida do 301. Manter um segundo editor seria repor o
 * defeito 01 (dois donos do mesmo dado) dentro da própria aba que o corrigiu.
 *
 * Feature 84 (`SIA-05..09`): a prévia é o que a loja SERVE — `productPageMeta`, a mesma função —, e
 * não um texto de exemplo. Com os campos vazios ela mostra o derivado do nome e da descrição, marcado
 * "automático".
 */
const SeoPreview = ({
  title,
  description,
  slug,
  name,
  productDescription,
  storeDescription,
  onTitleChange,
  onDescriptionChange,
}: Props) => {
  const meta = productPageMeta(
    { name, description: productDescription, seo_title: title, seo_description: description },
    storeDescription,
  )
  const titleDerived = title.trim() === ''
  const descriptionDerived = description.trim() === ''
  // A prévia promete o que o Google vai mostrar: o caminho tem de ser o canônico (`URL-01`), não o
  // legado que responde por 301.
  const displayUrl = `umaestrelinha.com.br${productPath(slug || 'slug-do-produto')}`

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="seo-title">Título SEO</Label>
        <Input
          id="seo-title"
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder={name.trim()}
          maxLength={SEO_TITLE_FIELD_MAX}
        />
        <p className="text-xs text-muted-foreground">
          {title.length}/{SEO_TITLE_FIELD_MAX} · {meta.title.length} com a marca
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="seo-description">Descrição SEO</Label>
        <Textarea
          id="seo-description"
          value={description}
          onChange={e => onDescriptionChange(e.target.value)}
          placeholder={descriptionFromHtml(productDescription)}
          maxLength={DESCRIPTION_MAX}
          rows={2}
        />
        <p className="text-xs text-muted-foreground">{description.length}/{DESCRIPTION_MAX} caracteres</p>
      </div>
      <div className="min-w-0 p-4 bg-muted/30 rounded-xl border border-border">
        <p className="text-xs text-muted-foreground mb-1">Preview no Google</p>
        {/* Selo EMBAIXO do texto, nunca ao lado: com a fonte grande, ao lado ele comia a largura e o título
            virava "J…" (prova em navegador, 390 a 200 %). */}
        <div className="flex min-w-0 flex-col items-start gap-0.5" data-testid="seo-preview-title">
          {/* Sem corte nenhum: a prévia serve para a Adri LER o texto. Com `truncate` e depois com 2 linhas,
              a 390/200 % o título ficava "TESTE- / 84-RT-…" (QA e reteste). O corte real é do Google. */}
          <p className="w-full min-w-0 text-[#1a0dab] text-base leading-tight break-words">{meta.title}</p>
          {titleDerived && <AutoBadge />}
        </div>
        <p className="text-[#006621] text-xs truncate">{displayUrl}</p>
        <div className="flex min-w-0 flex-col items-start gap-0.5" data-testid="seo-preview-description">
          <p className="w-full min-w-0 text-sm text-muted-foreground break-words">{meta.description}</p>
          {descriptionDerived && <AutoBadge />}
        </div>
      </div>
    </div>
  )
}

export default SeoPreview
