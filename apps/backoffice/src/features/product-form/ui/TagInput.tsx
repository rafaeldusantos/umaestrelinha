import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Badge } from '@nanapin/ui/badge'
import { Button } from '@nanapin/ui/button'
import { Input } from '@nanapin/ui/input'
import { findSimilarTag, isSameTag, parseTags } from '../model/normalizeTag'
import { MAX_TAGS } from '../model/taxonomyLabels'

interface Props {
  tags: string[]
  onChange: (tags: string[]) => void
  /** Tags do catálogo, da mais usada para a menos usada (A19: vem de consulta agregada). */
  suggestions?: string[]
  countByTag?: Record<string, number>
}

/**
 * Tags como **tokens**, não como string separada por vírgula (PFM-06).
 *
 * O campo antigo era um `Input` de texto livre cujo conteúdo virava `split(',')` no save. Foi ele
 * que criou `Naruto`, `naruto` e `naruto ` como três tags no catálogo.
 */
const TagInput = ({ tags, onChange, suggestions = [], countByTag = {} }: Props) => {
  const [draft, setDraft] = useState('')
  /** A colisão sutil aguardando decisão. `null` = nada pendente. */
  const [collision, setCollision] = useState<{ candidate: string; existing: string } | null>(null)

  const full = tags.length >= MAX_TAGS

  const add = (candidates: string[]) => {
    const next = [...tags]
    for (const candidate of candidates) {
      if (next.length >= MAX_TAGS) break
      // Duplicata EXATA some sem avisar: não há decisão a tomar (AC 11).
      if (next.some(tag => tag === candidate)) continue

      // Diferença só por acento/caixa/espaço: SUGERE, não substitui (AC 9). A tag entra como
      // digitada e a decisão fica pendente — tirar a escolha de quem cadastra é o erro oposto.
      const similar = findSimilarTag(candidate, [...next, ...suggestions])
      if (similar) setCollision({ candidate, existing: similar })

      next.push(candidate)
    }
    onChange(next)
  }

  const commitDraft = () => {
    const parsed = parseTags(draft)
    if (parsed.length > 0) add(parsed)
    setDraft('')
  }

  const remove = (tag: string) => onChange(tags.filter(t => t !== tag))

  /** Resolve a colisão trocando a digitada pela que já existe no catálogo. */
  const useExisting = () => {
    if (!collision) return
    onChange(
      tags
        .map(tag => (tag === collision.candidate ? collision.existing : tag))
        // Trocar pode gerar duplicata exata com uma tag que já estava lá.
        .filter((tag, index, all) => all.indexOf(tag) === index),
    )
    setCollision(null)
  }

  const available = suggestions.filter(
    suggestion => !tags.some(tag => isSameTag(tag, suggestion)),
  )

  return (
    <div className="space-y-2">
      {/* Idem `CategoryMultiSelect`: faixa de chips só existe com chip. */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <Badge key={tag} variant="secondary" className="gap-1 py-1 pl-2 pr-1">
              {tag}
              <button
                type="button"
                aria-label={`Remover tag ${tag}`}
                onClick={() => remove(tag)}
                className="rounded-full p-0.5 hover:bg-background/60"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Input
        aria-label="Tags"
        value={draft}
        disabled={full}
        placeholder={full ? `Limite de ${MAX_TAGS} tags atingido` : 'Digite e pressione Enter'}
        onChange={event => setDraft(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ',' || event.key === 'Tab') {
            if (draft.trim() === '') return
            event.preventDefault()
            commitDraft()
            return
          }
          // `Backspace` em campo VAZIO remove o último chip (AC 6) — com texto, apaga letra.
          if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
            event.preventDefault()
            remove(tags[tags.length - 1])
          }
        }}
        onBlur={commitDraft}
      />

      {/* Como criar a tag virou a descrição do card e a contagem virou o badge do cabeçalho — os
          dois lugares do artboard. Aqui fica só o que é AÇÃO: o teto atingido, que pede um gesto. */}
      {full && (
        <p className="text-xs text-muted-foreground">Remova uma tag para adicionar outra.</p>
      )}

      {collision && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-2 text-sm dark:border-amber-800 dark:bg-amber-950/40"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <span className="flex-1">
            <strong>{collision.candidate}</strong> parece a mesma coisa que{' '}
            <strong>{collision.existing}</strong>, que já existe no catálogo.
          </span>
          <Button type="button" size="sm" variant="outline" onClick={useExisting}>
            Usar a existente
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setCollision(null)}>
            Manter
          </Button>
        </div>
      )}

      {available.length > 0 && !full && (
        <div className="space-y-1" data-testid="tag-suggestions">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Sugeridas — mais usadas
          </p>
          <div className="flex flex-wrap gap-1.5">
          {available.slice(0, 8).map(suggestion => (
            <button
              key={suggestion}
              type="button"
              onClick={() => add([suggestion])}
              className="rounded-pill border border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-nana-violet/50 hover:text-foreground"
            >
              {suggestion}
              {countByTag[suggestion] ? ` · ${countByTag[suggestion]}` : ''}
            </button>
          ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TagInput
