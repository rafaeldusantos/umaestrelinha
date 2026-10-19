// "Também sugerir quando o texto tiver…" — os termos de sugestão de um valor (feature 67, `VFL-35`..
// `VFL-37`).
//
// O nome do valor sugere sempre; os termos acrescentam as grafias que não o contêm ("Dourado" ⇒
// Folheado a ouro). Cada acréscimo e cada remoção GRAVAM na hora — a lista inteira, pelo hook do
// catálogo —, e a recusa é a de `core` (`suggestTermRefusal`), mostrada antes da rede. A fila relê o
// catálogo e passa a considerar o termo sem recarregar.

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { FILTER_SUGGEST_TERMS_MAX, FILTER_SUGGEST_TERM_MAX, suggestTermRefusal } from '@estrelinha/core/filters'
import { CharCounter } from '@/shared/ui'

interface Props {
  nomeDoValor: string
  termos: readonly string[]
  /** Grava a lista inteira. Devolve a frase do erro, ou `null`. */
  onChange: (termos: string[]) => Promise<string | null>
}

const SuggestTermsField = ({ nomeDoValor, termos, onChange }: Props) => {
  const [novo, setNovo] = useState('')
  const [recusa, setRecusa] = useState<string | null>(null)
  const [gravando, setGravando] = useState(false)
  const idCampo = `termos-${nomeDoValor}`

  const gravar = async (lista: string[]) => {
    setGravando(true)
    const motivo = await onChange(lista)
    setGravando(false)
    setRecusa(motivo)
    return motivo
  }

  const acrescentar = async () => {
    const local = suggestTermRefusal(novo, termos, nomeDoValor)
    if (local) {
      setRecusa(local)
      return
    }
    // Só limpa o campo quando gravou: a recusa mantém o que a dona digitou.
    if (!(await gravar([...termos, novo.trim()]))) setNovo('')
  }

  return (
    <div className="space-y-2 rounded-xl bg-muted/40 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={idCampo} className="text-xs font-medium text-foreground">
          Também sugerir quando o texto tiver…
        </label>
        <span className="text-[11px] text-muted-foreground" data-testid="contador-termos">
          {termos.length} de {FILTER_SUGGEST_TERMS_MAX}
        </span>
      </div>
      {termos.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Termos de sugestão">
          {termos.map(t => (
            <li key={t}>
              <button
                type="button"
                disabled={gravando}
                aria-label={`Tirar o termo “${t}”`}
                onClick={() => void gravar(termos.filter(x => x !== t))}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm text-foreground"
              >
                {t}
                <X aria-hidden className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <Input
          id={idCampo}
          value={novo}
          maxLength={FILTER_SUGGEST_TERM_MAX}
          placeholder="ex.: dourado"
          onChange={e => setNovo(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void acrescentar()
            }
          }}
          className="h-11"
        />
        <CharCounter value={novo} limit={FILTER_SUGGEST_TERM_MAX} data-testid="contador-termo" />
        <Button type="button" variant="outline" className="h-11 shrink-0" disabled={gravando} onClick={() => void acrescentar()}>
          Acrescentar
        </Button>
      </div>
      {recusa && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {recusa}
        </p>
      )}
    </div>
  )
}

export default SuggestTermsField
