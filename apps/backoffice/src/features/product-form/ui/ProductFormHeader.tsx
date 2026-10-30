import { useEffect } from 'react'
import { ChevronRight, Loader2, Save, Trash2 } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Badge } from '@estrelinha/ui/badge'

interface Props {
  productName: string
  isEdit: boolean
  /** `true` = já está visível na loja. Vira o badge de status. */
  isPublished: boolean
  isDirty: boolean
  /** `Date.now()` do último rascunho gravado, ou `null`. */
  draftSavedAt: number | null
  saving: boolean
  onBack: () => void
  onDiscard: () => void
  onSave: () => void
}

const secondsAgo = (savedAt: number) => Math.max(0, Math.round((Date.now() - savedAt) / 1000))

/**
 * Cabeçalho fixo do formulário (PFM-16 / P1.7 AC 10-11).
 *
 * Por que fixo: o formulário tem 5 abas e um inspetor, e as ações de salvar ficavam no topo de uma
 * página que rola. Com a grade aberta, salvar exigia subir a tela inteira.
 *
 * Uma ação só: *Salvar* grava o que está no formulário e NÃO mexe na visibilidade. Produto em
 * rascunho continua rascunho, produto na loja continua na loja. Quem decide estar ou não na loja é
 * o "Ativar/Desativar" da coluna Publicação (`ProductActiveControl`). Havia um *Salvar e publicar*
 * que gravava `is_active = true`, e salvar um produto desativado o punha na loja sem querer.
 */
const ProductFormHeader = ({
  productName,
  isEdit,
  isPublished,
  isDirty,
  draftSavedAt,
  saving,
  onBack,
  onDiscard,
  onSave,
}: Props) => {
  // P1.7 AC 11: `⌘S`/`Ctrl+S`. O `preventDefault` é o ponto — sem ele o navegador abre o "salvar
  // página como", que é a última coisa que o admin quer ao apertar salvar num formulário.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 's' || !(event.metaKey || event.ctrlKey)) return
      event.preventDefault()
      if (saving) return
      onSave()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onSave, saving])

  // Gruda só a partir de `md` (feature 67, D1). Até a 67 este `sticky` nunca grudou — o `main` do
  // painel era `overflow-auto` —, e no celular o cabeçalho embrulha em três linhas: medido, 165px
  // de 844 presos no topo, abaixo da barra de 56 do painel. No celular ele rola, como sempre rolou.
  return (
    <header className="z-20 -mx-4 md:sticky md:top-0 mb-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <nav className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="Trilha">
            <button type="button" onClick={onBack} className="hover:text-foreground hover:underline">
              Produtos
            </button>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            <span className="truncate text-foreground">
              {productName.trim() || (isEdit ? 'Produto' : 'Novo produto')}
            </span>
          </nav>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-foreground">
              {productName.trim() || (isEdit ? 'Editar produto' : 'Novo produto')}
            </h1>
            <Badge variant={isPublished ? 'default' : 'secondary'}>
              {isPublished ? 'Publicado' : 'Rascunho'}
            </Badge>
            {isDirty && <Badge variant="outline">Alterações não salvas</Badge>}
            {draftSavedAt !== null && (
              <span className="text-xs text-muted-foreground">
                Rascunho salvo automaticamente · há {secondsAgo(draftSavedAt)} s
              </span>
            )}
          </div>
        </div>

        <div className="flex max-w-full flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onDiscard} disabled={saving}>
            <Trash2 className="mr-1 h-4 w-4" /> Descartar
          </Button>
          <Button
            type="button"
            size="sm"
            className="gradient-cta text-white"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Salvar
          </Button>
        </div>
      </div>
    </header>
  )
}

export default ProductFormHeader
