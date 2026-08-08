import { AlertTriangle, Check, Loader2, X } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { Switch } from '@estrelinha/ui/switch'
import { useSlugAvailability } from '../model/useSlugAvailability'

/** O domínio da loja, em slot fixo. Fora do input, como `R$` nos campos de moeda. */
export const STORE_URL_PREFIX = 'nanita.com.br/produto/'

interface Props {
  slug: string
  onChange: (slug: string) => void
  /** Id do produto em edição — ele não colide consigo mesmo. */
  productId?: string | null
  /** O slug que está no banco. Diferente do atual ⇒ a URL mudou. */
  savedSlug?: string
  /** Produto já visível na loja: é o que torna o 301 necessário (PFM-04 AC 6). */
  isPublished: boolean
  redirectEnabled: boolean
  onRedirectToggle: (enabled: boolean) => void
}

/**
 * O **único** campo editável de slug (PFM-02, PFM-03, PFM-04).
 *
 * Antes havia dois — um em Geral e um em SEO —, que é o defeito 01: dois donos do mesmo dado.
 * Em Geral agora fica só a linha de leitura (`SlugReadonlyLine`).
 */
const SlugField = ({
  slug,
  onChange,
  productId,
  savedSlug = '',
  isPublished,
  redirectEnabled,
  onRedirectToggle,
}: Props) => {
  const { status, suggestion } = useSlugAvailability(slug, productId)
  // O aviso de 301 só faz sentido para produto que JÁ está na loja: um rascunho não tem link salvo
  // por ninguém.
  const slugChanged = savedSlug !== '' && slug.trim() !== savedSlug
  const showRedirect = isPublished && slugChanged

  return (
    <div className="space-y-2">
      <Label htmlFor="slug">URL personalizada</Label>
      <div className="flex items-center gap-0">
        <span className="rounded-l-md border border-r-0 border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
          {STORE_URL_PREFIX}
        </span>
        <Input
          id="slug"
          data-field="slug"
          className="rounded-l-none"
          value={slug}
          onChange={event => onChange(event.target.value)}
        />
      </div>

      <p className="flex items-center gap-1.5 text-xs" data-testid="slug-status">
        {status === 'checking' && (
          <>
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            <span className="text-muted-foreground">Verificando…</span>
          </>
        )}
        {status === 'available' && (
          <>
            <Check className="h-3 w-3 text-green-600" aria-hidden="true" />
            <span className="text-green-600">Disponível</span>
          </>
        )}
        {status === 'taken' && (
          <>
            <X className="h-3 w-3 text-destructive" aria-hidden="true" />
            <span className="text-destructive">
              Já existe.{' '}
              {suggestion && (
                <button
                  type="button"
                  className="underline"
                  onClick={() => onChange(suggestion)}
                >
                  Usar {suggestion}
                </button>
              )}
            </span>
          </>
        )}
        {status === 'invalid' && (
          <span className="text-destructive">
            Use só letras minúsculas, números e hífen.
          </span>
        )}
        {status === 'error' && (
          <span className="text-muted-foreground">
            Não foi possível verificar agora — o banco ainda recusa duplicata no save.
          </span>
        )}
      </p>

      {showRedirect && (
        <div
          role="alert"
          className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40"
        >
          <p className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
            <span>
              Este produto já está publicado em{' '}
              <strong>
                {STORE_URL_PREFIX}
                {savedSlug}
              </strong>
              . Mudar a URL quebra os links já postados — inclusive o do Instagram.
            </span>
          </p>
          <label className="flex items-center gap-2">
            <Switch
              checked={redirectEnabled}
              onCheckedChange={onRedirectToggle}
              aria-label="Criar redirecionamento 301 do endereço antigo"
            />
            <span>Redirecionar o endereço antigo para o novo (301)</span>
          </label>
        </div>
      )}
    </div>
  )
}

export default SlugField
