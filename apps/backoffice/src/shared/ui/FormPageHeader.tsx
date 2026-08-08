// O cabeçalho das telas de formulário do grupo `Descontos` (feature 18 / T3, DSC-03).
//
// É a parte de `ProductFormHeader` que NÃO é do produto. Lá o cabeçalho carrega rascunho automático,
// selo `Publicado`/`Rascunho` e dois botões de save com significados diferentes — coisas do
// formulário de produto, que tem 30 campos e cinco abas. O que sobra é o que qualquer formulário em
// rota própria precisa e nenhum dos dois tinha: a trilha de volta, o aviso de pendência e um save com
// atalho.
//
// Por que sticky: as duas telas rolam (o repetidor de faixas cresce), e um save que sai da viewport
// obriga a subir a página inteira para gravar.

import { useEffect } from 'react'
import { ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@nanapin/ui/button'
import { Badge } from '@nanapin/ui/badge'

interface Props {
  /** O primeiro nível da trilha — o grupo da sidebar. Não é link: o grupo não tem tela. */
  group: string
  /** O segundo nível: a listagem de onde se veio. É o link de volta. */
  parentLabel: string
  /** O terceiro nível e o título — o nome do registro, ou `Novo cupom` na criação. */
  title: string
  /** `true` some com o selo de pendência (nada foi mexido ainda). */
  isDirty: boolean
  saving: boolean
  /** Rótulo do primário: `Salvar promoção` / `Salvar cupom`. */
  saveLabel: string
  onBack: () => void
  onSave: () => void
}

const FormPageHeader = ({
  group,
  parentLabel,
  title,
  isDirty,
  saving,
  saveLabel,
  onBack,
  onSave,
}: Props) => {
  // O `preventDefault` é o ponto do atalho: sem ele o `⌘S` abre o "salvar página como" do navegador,
  // que é a última coisa que se quer ao apertar salvar dentro de um formulário.
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

  return (
    <header className="sticky top-0 z-20 -mx-4 mb-6 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <nav className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="Trilha">
            <span>{group}</span>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            <button type="button" onClick={onBack} className="hover:text-foreground hover:underline">
              {parentLabel}
            </button>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            <span className="truncate text-foreground">{title}</span>
          </nav>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="font-heading truncate text-xl font-bold text-foreground">{title}</h1>
            {isDirty && <Badge variant="outline">Alterações não salvas</Badge>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="gradient-cta border-0 text-primary-foreground"
            onClick={onSave}
            disabled={saving}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saveLabel}
            {/* O atalho anunciado no próprio botão (board): sem isso ele é um segredo. */}
            <kbd className="ml-2 hidden rounded border border-white/30 px-1 text-[11px] font-normal sm:inline">
              ⌘S
            </kbd>
          </Button>
        </div>
      </div>
    </header>
  )
}

export default FormPageHeader
