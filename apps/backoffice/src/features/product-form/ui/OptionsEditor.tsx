import { useState } from 'react'
import { ChevronDown, ChevronUp, GripVertical, Plus, X } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { Badge } from '@estrelinha/ui/badge'
import { cartesian } from '@estrelinha/core/pricing'
import type { ProductOption } from '@estrelinha/supabase/types'
import { parseOptionValues } from '../model/parseOptionValues'

/** O teto de eixos por produto (A7 na 07): 3 na página do produto, 2 no card da vitrine. */
export const MAX_AXES = 3

/** Sugestões do desenho. Nome é livre — os presets só evitam digitar o de sempre. */
const PRESETS = ['Tamanho', 'Acabamento', 'Cor', 'Estampa', 'Pack']

interface Props {
  options: ProductOption[]
  onChange: (options: ProductOption[]) => void
}

/** `position` sempre igual ao índice: é o que a loja usa para ordenar os seletores (PST-05 AC 1). */
const reindex = (options: ProductOption[]): ProductOption[] =>
  options.map((option, index) => ({ ...option, position: index }))

/**
 * Editor dos eixos do produto (PFM-07).
 *
 * Substitui os dois campos fixos "Tamanhos (vírgula)" e "Acabamentos (vírgula)". O catálogo real já
 * tem Cor, Estampa e Pack, e dois campos fixos não representam isso.
 */
const OptionsEditor = ({ options, onChange }: Props) => {
  const [valueDrafts, setValueDrafts] = useState<Record<number, string>>({})
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const ordered = [...options].sort((a, b) => a.position - b.position)
  const combinations = cartesian(ordered).length
  const axesWithValues = ordered.filter(o => o.values.length > 0)

  const setAxis = (index: number, patch: Partial<ProductOption>) =>
    onChange(reindex(ordered.map((option, i) => (i === index ? { ...option, ...patch } : option))))

  const addAxis = () =>
    onChange(reindex([...ordered, { name: '', values: [], position: ordered.length }]))

  const removeAxis = (index: number) => onChange(reindex(ordered.filter((_, i) => i !== index)))

  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= ordered.length) return
    const next = [...ordered]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    onChange(reindex(next))
  }

  const commitValues = (index: number) => {
    const draft = valueDrafts[index] ?? ''
    const added = parseOptionValues(draft, ordered[index].values)
    if (added.length > 0) setAxis(index, { values: [...ordered[index].values, ...added] })
    setValueDrafts(drafts => ({ ...drafts, [index]: '' }))
  }

  const removeValue = (index: number, value: string) =>
    setAxis(index, { values: ordered[index].values.filter(v => v !== value) })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* PFM-07 AC 4: a conta do cruzamento no cabeçalho. É a informação que evita o admin
            declarar 5 × 4 × 3 e só descobrir as 60 linhas depois de gerar a grade. */}
        <p className="text-sm text-muted-foreground" data-testid="options-summary">
          {ordered.length} de {MAX_AXES} eixos
          {axesWithValues.length > 0 && (
            <>
              {' · '}
              {axesWithValues.map(o => o.values.length).join(' × ')} = {combinations} variações
            </>
          )}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addAxis}
          disabled={ordered.length >= MAX_AXES}
          title={ordered.length >= MAX_AXES ? `Máximo de ${MAX_AXES} eixos por produto` : undefined}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar eixo
        </Button>
      </div>

      {ordered.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Sem eixos, o produto tem um preço só. Adicione um eixo (Tamanho, Cor…) para vender por
          variação.
        </p>
      )}

      {ordered.map((option, index) => (
        <div
          key={index}
          draggable
          onDragStart={() => setDragIdx(index)}
          onDragOver={event => event.preventDefault()}
          onDrop={event => {
            event.preventDefault()
            if (dragIdx !== null && dragIdx !== index) move(dragIdx, index - dragIdx)
            setDragIdx(null)
          }}
          onDragEnd={() => setDragIdx(null)}
          className={`rounded-xl border border-border bg-card p-3 space-y-3 ${
            dragIdx === index ? 'opacity-50' : ''
          }`}
        >
          <div className="flex items-start gap-2">
            <GripVertical
              className="mt-2 h-4 w-4 shrink-0 cursor-grab text-muted-foreground"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor={`axis-name-${index}`}>Eixo {index + 1}</Label>
              <Input
                id={`axis-name-${index}`}
                list={`axis-presets-${index}`}
                value={option.name}
                placeholder="Tamanho, Cor, Pack…"
                onChange={event => setAxis(index, { name: event.target.value })}
              />
              {/* `datalist` em vez de Combobox: presets são sugestão, e o nome é livre. Um Command
                  do shadcn aqui obrigaria a escolher da lista ou a inventar um "outro". */}
              <datalist id={`axis-presets-${index}`}>
                {PRESETS.map(preset => (
                  <option key={preset} value={preset} />
                ))}
              </datalist>
            </div>
            {/* Botões de ordem, além do arraste: teclado e leitor de tela não arrastam. */}
            <div className="flex shrink-0 flex-col">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                aria-label={`Mover ${option.name || `eixo ${index + 1}`} para cima`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                aria-label={`Mover ${option.name || `eixo ${index + 1}`} para baixo`}
                disabled={index === ordered.length - 1}
                onClick={() => move(index, 1)}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-destructive"
              aria-label={`Remover ${option.name || `eixo ${index + 1}`}`}
              onClick={() => removeAxis(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`axis-values-${index}`}>Valores</Label>
            <div className="flex flex-wrap gap-1.5">
              {option.values.map(value => (
                <Badge key={value} variant="secondary" className="gap-1 py-1 pl-2 pr-1">
                  {value}
                  <button
                    type="button"
                    aria-label={`Remover valor ${value}`}
                    onClick={() => removeValue(index, value)}
                    className="rounded-full p-0.5 hover:bg-background/60"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              id={`axis-values-${index}`}
              value={valueDrafts[index] ?? ''}
              placeholder="Cole ou digite: 3,5 cm, 4,5 cm, 5,5 cm"
              onChange={event =>
                setValueDrafts(drafts => ({ ...drafts, [index]: event.target.value }))
              }
              onKeyDown={event => {
                if (event.key !== 'Enter' && event.key !== 'Tab') return
                if ((valueDrafts[index] ?? '').trim() === '') return
                event.preventDefault()
                commitValues(index)
              }}
              onBlur={() => commitValues(index)}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default OptionsEditor
