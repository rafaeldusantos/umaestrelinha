import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { ChevronDown, ChevronUp, GripVertical, Plus, X } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { Badge } from '@estrelinha/ui/badge'
import { cn } from '@estrelinha/ui/lib/utils'
import { cartesian } from '@estrelinha/core/pricing'
import type { ProductOption } from '@estrelinha/supabase/types'
import {
  findLibraryEntry,
  remainingValues,
  suggestOptionNames,
  suggestOptionValues,
  suggestValueSets,
  type OptionLibraryEntry,
} from '@/entities/product'
import { dobrarTexto } from '@/shared/lib/texto'
import { parseOptionValues } from '../model/parseOptionValues'
import type { OptionsChange } from '../model/gridSync'

/** O teto de opções por produto (A7 na 07): 3 na página do produto, 2 no card da vitrine. */
export const MAX_AXES = 3

/** Frase da recusa de nome repetido (OPV-23) — a grade não se reconcilia enquanto ela durar. */
export const DUPLICATE_OPTION_NAME = 'Já existe uma opção com este nome.'

interface Props {
  options: ProductOption[]
  /**
   * As opções novas E a operação que as produziu (feature 81). A página precisa da operação, não
   * só do array: renomear e trocar valores produzem arrays parecidos e pedem reconciliações
   * diferentes da grade (`syncGrid`).
   */
  onChange: (options: ProductOption[], change: OptionsChange) => void
  /** Nomes e valores já usados no catálogo. Ausente ou vazia ⇒ texto livre, sem erro (OPV-21). */
  library?: readonly OptionLibraryEntry[]
}

/** `position` sempre igual ao índice: é o que a loja usa para ordenar os seletores (PST-05 AC 1). */
const reindex = (options: ProductOption[]): ProductOption[] =>
  options.map((option, index) => ({ ...option, position: index }))

/** OPV-23: o índice de cada opção cujo nome (pela dobra) já apareceu numa opção ANTERIOR. */
const duplicatedIndexes = (options: readonly ProductOption[]): Set<number> => {
  const seen = new Set<string>()
  const dup = new Set<number>()
  options.forEach((option, index) => {
    const folded = dobrarTexto(option.name.trim())
    if (folded === '') return
    if (seen.has(folded)) dup.add(index)
    seen.add(folded)
  })
  return dup
}

/**
 * Navegação de teclado do combobox, a mesma dos dois campos. `ativa = -1` quer dizer "ninguém
 * escolhido": Enter só escolhe da lista depois de a Adri descer nela com a seta — sem isso, digitar
 * um nome novo e apertar Enter trocaria o texto dela pela primeira sugestão.
 */
const useListNav = (count: number) => {
  const [aberta, setAberta] = useState(false)
  const [ativa, setAtiva] = useState(-1)
  const visivel = aberta && count > 0

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>, escolher: (i: number) => void): boolean => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setAberta(true)
      setAtiva(i => (visivel ? Math.min(i + 1, count - 1) : 0))
      return true
    }
    if (event.key === 'ArrowUp' && visivel) {
      event.preventDefault()
      setAtiva(i => Math.max(i - 1, 0))
      return true
    }
    if (event.key === 'Enter' && visivel && ativa >= 0) {
      // Sem isto o Enter submeteria o formulário do produto inteiro.
      event.preventDefault()
      escolher(Math.min(ativa, count - 1))
      return true
    }
    if (event.key === 'Escape' && visivel) {
      event.preventDefault()
      setAberta(false)
      return true
    }
    return false
  }

  return { aberta, setAberta, ativa, setAtiva, visivel, onKeyDown }
}

interface ListProps {
  id: string
  label: string
  items: string[]
  ativa: number
  onHover: (i: number) => void
  onPick: (i: number) => void
}

/** A lista de sugestões. `onMouseDown` com `preventDefault` impede o `blur` do campo antes do clique. */
const SuggestionList = ({ id, label, items, ativa, onHover, onPick }: ListProps) => (
  <ul
    id={id}
    role="listbox"
    aria-label={label}
    className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg"
  >
    {items.map((item, i) => (
      <li
        key={item}
        id={`${id}-${i}`}
        role="option"
        aria-selected={i === ativa}
        onMouseDown={event => event.preventDefault()}
        onMouseEnter={() => onHover(i)}
        onClick={() => onPick(i)}
        className={cn(
          'flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-sm text-foreground',
          i === ativa && 'bg-muted',
        )}
      >
        <span className="truncate">{item}</span>
      </li>
    ))}
  </ul>
)

interface NameFieldProps {
  id: string
  value: string
  library: readonly OptionLibraryEntry[]
  onChange: (name: string) => void
}

/** OPV-18: o nome da opção, com os nomes do catálogo. Texto livre continua valendo. */
const OptionNameField = ({ id, value, library, onChange }: NameFieldProps) => {
  const listId = useId()
  const sugestoes = useMemo(
    () => suggestOptionNames(library, value).map(entry => entry.name),
    [library, value],
  )
  const nav = useListNav(sugestoes.length)

  const escolher = (i: number) => {
    onChange(sugestoes[i])
    nav.setAberta(false)
  }

  return (
    <div className="relative">
      <Input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={nav.visivel}
        aria-controls={nav.visivel ? listId : undefined}
        aria-activedescendant={nav.visivel && nav.ativa >= 0 ? `${listId}-${nav.ativa}` : undefined}
        autoComplete="off"
        value={value}
        placeholder="Tamanho, Cor, Pack…"
        onChange={event => {
          onChange(event.target.value)
          nav.setAberta(true)
          nav.setAtiva(-1)
        }}
        onFocus={() => nav.setAberta(true)}
        onBlur={() => nav.setAberta(false)}
        onKeyDown={event => nav.onKeyDown(event, escolher)}
      />
      {nav.visivel && (
        <SuggestionList
          id={listId}
          label="Nomes usados no catálogo"
          items={sugestoes}
          ativa={nav.ativa}
          onHover={nav.setAtiva}
          onPick={escolher}
        />
      )}
    </div>
  )
}

interface ValuesFieldProps {
  id: string
  option: ProductOption
  entry: OptionLibraryEntry | null
  onAdd: (values: string[]) => void
}

/** O campo de valores: colar por vírgula (PFM-07 AC 3) e, com nome conhecido, sugestões (OPV-20). */
const OptionValuesField = ({ id, option, entry, onAdd }: ValuesFieldProps) => {
  const listId = useId()
  const [draft, setDraft] = useState('')
  const sugestoes = useMemo(
    () => (draft.trim() === '' ? [] : suggestOptionValues(entry, draft, option.values)),
    [entry, draft, option.values],
  )
  const nav = useListNav(sugestoes.length)

  const commit = () => {
    const added = parseOptionValues(draft, option.values)
    if (added.length > 0) onAdd(added)
    setDraft('')
  }

  const escolher = (i: number) => {
    onAdd([sugestoes[i]])
    setDraft('')
    nav.setAtiva(-1)
  }

  return (
    <div className="relative">
      <Input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={nav.visivel}
        aria-controls={nav.visivel ? listId : undefined}
        aria-activedescendant={nav.visivel && nav.ativa >= 0 ? `${listId}-${nav.ativa}` : undefined}
        autoComplete="off"
        value={draft}
        placeholder="Cole ou digite: 3,5 cm, 4,5 cm, 5,5 cm"
        onChange={event => {
          setDraft(event.target.value)
          nav.setAberta(true)
          nav.setAtiva(-1)
        }}
        onFocus={() => nav.setAberta(true)}
        onKeyDown={event => {
          if (nav.onKeyDown(event, escolher)) return
          if (event.key !== 'Enter' && event.key !== 'Tab') return
          if (draft.trim() === '') return
          event.preventDefault()
          commit()
        }}
        onBlur={() => {
          nav.setAberta(false)
          commit()
        }}
      />
      {nav.visivel && (
        <SuggestionList
          id={listId}
          label="Valores usados no catálogo"
          items={sugestoes}
          ativa={nav.ativa}
          onHover={nav.setAtiva}
          onPick={escolher}
        />
      )}
    </div>
  )
}

/**
 * Editor das opções do produto (PFM-07; feature 81, OPV-17..20, OPV-23).
 *
 * Substituiu os dois campos fixos "Tamanhos (vírgula)" e "Acabamentos (vírgula)". Desde a 81 cada
 * mudança sai com a OPERAÇÃO que a produziu (`OptionsChange`), e os nomes e valores sugeridos vêm do
 * próprio catálogo (`library`) — não há lista de modelos para manter.
 */
const OptionsEditor = ({ options, onChange, library = [] }: Props) => {
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const ordered = [...options].sort((a, b) => a.position - b.position)
  const combinations = cartesian(ordered).length
  // Os fatores escritos são os MESMOS que `cartesian` multiplica (nome e valores): uma opção com
  // valores e o nome apagado (OPV-24) fazia o resumo dizer "3 × 2 × 1 = 2" (QA da 81).
  const axesWithValues = ordered.filter(o => o.name.trim() !== '' && o.values.length > 0)
  const duplicated = duplicatedIndexes(ordered)

  const setAxis = (index: number, patch: Partial<ProductOption>, change: OptionsChange) =>
    onChange(
      reindex(ordered.map((option, i) => (i === index ? { ...option, ...patch } : option))),
      change,
    )

  const addAxis = () =>
    onChange(reindex([...ordered, { name: '', values: [], position: ordered.length }]), {
      kind: 'addOption',
    })

  const removeAxis = (index: number) =>
    onChange(reindex(ordered.filter((_, i) => i !== index)), { kind: 'removeOption', index })

  const move = (from: number, to: number) => {
    if (to < 0 || to >= ordered.length || from === to) return
    const next = [...ordered]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(reindex(next), { kind: 'move', from, to })
  }

  const addValues = (index: number, added: string[]) => {
    // Pela dobra, como as sugestões: "3,5 CM" já é "3,5 cm" e não vira um segundo valor.
    const presentes = new Set(ordered[index].values.map(v => dobrarTexto(v.trim())))
    const fresh = added.filter(v => !presentes.has(dobrarTexto(v.trim())))
    if (fresh.length === 0) return
    setAxis(index, { values: [...ordered[index].values, ...fresh] }, { kind: 'values', index })
  }

  const removeValue = (index: number, value: string) =>
    setAxis(index, { values: ordered[index].values.filter(v => v !== value) }, { kind: 'values', index })

  const nomeDe = (option: ProductOption, index: number) => option.name || `opção ${index + 1}`

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* PFM-07 AC 4: a conta do cruzamento no cabeçalho. É a informação que evita declarar
            5 × 4 × 3 e só descobrir as 60 linhas depois. */}
        <p className="text-sm text-muted-foreground" data-testid="options-summary">
          {ordered.length} de {MAX_AXES} opções
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
          // Com a fonte do sistema grande, o `whitespace-nowrap` do botão o deixava mais largo que
          // o card e o body rolava na horizontal (QA da 81).
          className="h-auto min-h-9 max-w-full whitespace-normal py-1.5"
          onClick={addAxis}
          disabled={ordered.length >= MAX_AXES}
          title={ordered.length >= MAX_AXES ? `Máximo de ${MAX_AXES} opções por produto` : undefined}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar opção
        </Button>
      </div>

      {ordered.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Sem opções, o produto tem um preço só. Adicione uma opção (Tamanho, Cor…) para vender por
          variação.
        </p>
      )}

      {ordered.map((option, index) => {
        const entry = findLibraryEntry(library, option.name)
        const conjuntos = suggestValueSets(entry, option.values)
        const chips = remainingValues(entry, option.values)
        const nome = nomeDe(option, index)
        return (
          <div
            key={index}
            draggable
            onDragStart={() => setDragIdx(index)}
            onDragOver={event => event.preventDefault()}
            onDrop={event => {
              event.preventDefault()
              if (dragIdx !== null && dragIdx !== index) move(dragIdx, index)
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
                <Label htmlFor={`option-name-${index}`}>Nome da opção</Label>
                <OptionNameField
                  id={`option-name-${index}`}
                  value={option.name}
                  library={library}
                  onChange={name => setAxis(index, { name }, { kind: 'rename', index })}
                />
                {duplicated.has(index) && (
                  <p role="alert" className="text-xs text-destructive">
                    {DUPLICATE_OPTION_NAME}
                  </p>
                )}
              </div>
              {/* Botões de ordem, além do arraste: teclado e leitor de tela não arrastam. */}
              <div className="flex shrink-0 flex-col">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label={`Mover ${nome} para cima`}
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label={`Mover ${nome} para baixo`}
                  disabled={index === ordered.length - 1}
                  onClick={() => move(index, index + 1)}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-destructive"
                aria-label={`Remover ${nome}`}
                onClick={() => removeAxis(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`option-values-${index}`}>Valores</Label>
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

              {/* OPV-19 (A1), decidido em 2026-10-26 pela recomendação do QA: os CONJUNTOS mais usados
                  daquele nome (um toque aplica o conjunto inteiro) e os chips que ainda não foram
                  usados — que ficam enquanto sobrar algum. Nada entra sem um toque da Adri. A regra
                  mora em `entities/product/lib/optionLibrary.ts`; aqui só se desenha. */}
              {(conjuntos.length > 0 || chips.length > 0) && (
                <div className="space-y-3 rounded-xl border border-dashed border-border p-3">
                  {conjuntos.length > 0 && (
                    <div role="group" aria-label="Conjuntos mais usados" className="space-y-2">
                      <p className="text-xs text-muted-foreground">Conjuntos mais usados</p>
                      <div className="flex flex-wrap gap-1.5">
                        {conjuntos.map(set => {
                          const produtos = set.count === 1 ? '1 produto' : `${set.count} produtos`
                          return (
                            <button
                              key={set.values.join('\u0000')}
                              type="button"
                              aria-label={`Usar ${set.values.join(', ')} (${produtos})`}
                              onClick={() => addValues(index, set.missing)}
                              className="flex min-h-11 max-w-full flex-col items-start justify-center rounded-xl border border-border bg-background px-3 py-1.5 text-left text-sm text-foreground hover:bg-muted"
                            >
                              <span className="break-words">{set.values.join(', ')}</span>
                              <span className="text-xs text-muted-foreground">em {produtos}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {chips.length > 0 && (
                    <div role="group" aria-label="Valores usados em outros produtos" className="space-y-2">
                      <p className="text-xs text-muted-foreground">Valores usados em outros produtos</p>
                      <div className="flex flex-wrap gap-1.5">
                        {chips.map(value => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => addValues(index, [value])}
                            className="min-h-11 rounded-full border border-border bg-background px-3 text-sm text-foreground hover:bg-muted"
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <OptionValuesField
                id={`option-values-${index}`}
                option={option}
                entry={entry}
                onAdd={added => addValues(index, added)}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default OptionsEditor
