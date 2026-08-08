import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { Textarea } from '@estrelinha/ui/textarea'

interface Props {
  title: string
  description: string
  slug: string
  onTitleChange: (v: string) => void
  onDescriptionChange: (v: string) => void
}

/**
 * A prévia de busca e os campos de SEO. O slug NÃO é editado aqui desde a 11/T32: quem o edita é o
 * `SlugField`, que verifica disponibilidade e cuida do 301. Manter um segundo editor seria repor o
 * defeito 01 (dois donos do mesmo dado) dentro da própria aba que o corrigiu.
 */
const SeoPreview = ({ title, description, slug, onTitleChange, onDescriptionChange }: Props) => {
  const displayTitle = title || 'Título do produto'
  const displayDesc = description || 'Descrição do produto para mecanismos de busca...'
  const displayUrl = `nanita.com.br/produto/${slug || 'slug-do-produto'}`

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Título SEO</Label>
        <Input value={title} onChange={e => onTitleChange(e.target.value)} placeholder="Título para mecanismos de busca" maxLength={60} />
        <p className="text-xs text-muted-foreground">{title.length}/60 caracteres</p>
      </div>
      <div className="space-y-1.5">
        <Label>Descrição SEO</Label>
        <Textarea value={description} onChange={e => onDescriptionChange(e.target.value)} placeholder="Descrição para mecanismos de busca" maxLength={160} rows={2} />
        <p className="text-xs text-muted-foreground">{description.length}/160 caracteres</p>
      </div>
      <div className="p-4 bg-muted/30 rounded-xl border border-border">
        <p className="text-xs text-muted-foreground mb-1">Preview no Google</p>
        <p className="text-[#1a0dab] text-base leading-tight truncate">{displayTitle}</p>
        <p className="text-[#006621] text-xs truncate">{displayUrl}</p>
        <p className="text-sm text-muted-foreground line-clamp-2">{displayDesc}</p>
      </div>
    </div>
  )
}

export default SeoPreview
