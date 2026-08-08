// PLS-03 — corrigir na linha, com teclado.
//
// `Enter` salva, `Tab` salva e avança, `Esc` cancela. O avanço é do navegador: salvar no `keydown`
// **sem** `preventDefault` deixa o `Tab` mover o foco naturalmente para o próximo campo editável,
// que é o comportamento que a AC pede sem reimplementar navegação de foco.
//
// Célula travada não vira texto mudo: mostra o valor com o motivo em `title`, porque desabilitar
// sem explicar lê como bug (é literal na spec).

import { useEffect, useRef, useState } from 'react'
import { MoneyInput } from '@/shared/ui'
import { Input } from '@nanapin/ui/input'

interface Props {
  value: number
  /** `money` usa a máscara pt-BR de `@nanapin/core/formatters`; `integer` é estoque. */
  kind: 'money' | 'integer'
  label: string
  disabled?: boolean
  /** Texto exibido quando a célula não é editável — e o porquê, em `title`. */
  lockedLabel?: React.ReactNode
  lockedReason?: string
  onCommit: (next: number) => void
}

const InlineEditCell = ({
  value,
  kind,
  label,
  disabled = false,
  lockedLabel,
  lockedReason,
  onCommit,
}: Props) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<number | null>(value)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [editing, value])

  if (disabled) {
    return (
      <span
        className="cursor-help text-muted-foreground"
        title={lockedReason}
        aria-label={lockedReason ? `${label}: ${lockedReason}` : label}
      >
        {lockedLabel}
      </span>
    )
  }

  const commit = () => {
    const next = draft ?? 0
    setEditing(false)
    if (next !== value) onCommit(next)
  }

  if (!editing) {
    return (
      <button
        type="button"
        aria-label={`Editar ${label}`}
        onClick={() => setEditing(true)}
        className="rounded px-1 py-0.5 text-right hover:bg-muted"
      >
        {lockedLabel}
      </button>
    )
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      // Cancelar devolve o valor do servidor — o rascunho não sobrevive ao `Esc`.
      setDraft(value)
      setEditing(false)
      return
    }
    // `Tab`: salva e deixa o foco seguir sozinho para a próxima célula editável.
    if (event.key === 'Tab') commit()
  }

  return (
    <div ref={wrapperRef} onKeyDown={handleKeyDown} className="inline-block w-28">
      {kind === 'money' ? (
        <MoneyInput
          autoFocus
          aria-label={label}
          value={draft}
          onChange={setDraft}
          onBlur={commit}
          className="h-8 text-right text-xs"
        />
      ) : (
        <Input
          autoFocus
          type="number"
          min={0}
          aria-label={label}
          value={draft ?? 0}
          onChange={event => setDraft(Number(event.target.value))}
          onBlur={commit}
          className="h-8 text-right text-xs"
        />
      )}
    </div>
  )
}

export default InlineEditCell
