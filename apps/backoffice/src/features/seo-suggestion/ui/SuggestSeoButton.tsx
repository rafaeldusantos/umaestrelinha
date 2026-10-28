// Feature 84 (`SIA-10`, `SIA-11`, `SIA-12`, `SIA-20`) — o botão "Sugerir com IA" e o "Desfazer".
//
// Só desenha: o estado é do `useSeoSuggestion`, que a página monta (ver o comentário dele). Os dois
// botões têm alvo de 44px (`h-11`), e o giro do indicador vem com o par `motion-reduce:` — o guarda
// `animacaoRespeitaMovimento` lê este arquivo.
//
// O foco (conserto do QA, `BUG-20261027-sugerir-e-desfazer-soltam-o-foco`): em voo e com a IA não
// configurada o botão é desabilitado por `aria-disabled`, NÃO pelo `disabled` nativo — nos dois casos
// ele acabou de ser tocado e está focado, e o nativo jogava o foco no `<body>`. O toque é ignorado aqui
// (e o hook ignora de novo). Só o "sem nome" (`SIA-11`) segue com o nativo: ali o foco está no campo
// Nome, nunca no botão. E o "Desfazer" some ao ser usado, então o foco passa para "Sugerir com IA".

import { useRef } from 'react'
import { Loader2, Sparkles, Undo2 } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import type { SeoSuggestionStatus } from '../model/useSeoSuggestion'
import {
  SEO_SUGGESTION_LABEL,
  SEO_SUGGESTION_LOADING,
  SEO_SUGGESTION_NEEDS_NAME,
  SEO_SUGGESTION_UNDO,
} from '../model/copy'

interface Props {
  /** O nome do produto, no estado atual do formulário. Vazio ⇒ desabilitado (`SIA-11`). */
  name: string
  status: SeoSuggestionStatus
  message: string | null
  canUndo: boolean
  onSuggest: () => void
  onUndo: () => void
}

const SuggestSeoButton = ({ name, status, message, canUndo, onSuggest, onUndo }: Props) => {
  const semNome = name.trim() === ''
  const carregando = status === 'loading'
  // Desligado sem soltar o foco: em voo, e com a IA não configurada (`SIA-20`).
  const inerte = carregando || status === 'disabled'
  const sugerirRef = useRef<HTMLButtonElement>(null)

  const tocarSugerir = () => {
    if (semNome || inerte) return
    onSuggest()
  }
  const tocarDesfazer = () => {
    onUndo()
    // O "Desfazer" vai sumir com o foco dentro: entrega-o ao botão vizinho, que continua montado.
    sugerirRef.current?.focus()
  }

  return (
    <div className="space-y-1.5" data-testid="seo-suggestion">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          ref={sugerirRef}
          className="h-auto min-h-11 max-w-full whitespace-normal text-left aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
          onClick={tocarSugerir}
          disabled={semNome}
          aria-disabled={inerte ? true : undefined}
          aria-describedby={semNome ? 'seo-suggestion-hint' : undefined}
        >
          {carregando ? (
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
          {carregando ? SEO_SUGGESTION_LOADING : SEO_SUGGESTION_LABEL}
        </Button>
        {canUndo && (
          <Button type="button" variant="ghost" className="h-auto min-h-11 max-w-full whitespace-normal text-left" onClick={tocarDesfazer}>
            <Undo2 className="h-4 w-4" aria-hidden="true" />
            {SEO_SUGGESTION_UNDO}
          </Button>
        )}
      </div>
      {semNome && (
        <p id="seo-suggestion-hint" className="text-xs text-muted-foreground">
          {SEO_SUGGESTION_NEEDS_NAME}
        </p>
      )}
      <p className="text-xs text-muted-foreground" aria-live="polite" role="status">
        {message ?? ''}
      </p>
    </div>
  )
}

export default SuggestSeoButton
