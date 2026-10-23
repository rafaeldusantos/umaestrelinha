// Feature 80 (FOR-07, FOR-08) — o nome do fornecedor, com a sugestão dos já cadastrados.
//
// Um combobox de verdade (`role="combobox"` + `listbox`), e não um `<datalist>`: o `datalist`
// compara com acento e maiúsculas do jeito do navegador, não oferece "Criar", e no Safari do iPhone
// não mostra a lista de forma confiável — e o painel também é aberto no celular da dona.
//
// A lista aparece com o campo focado e um termo digitado. `onMouseDown` com `preventDefault` nas
// opções é o que impede o `blur` do campo de fechar a lista ANTES de o clique chegar.

import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { Plus } from 'lucide-react'
import { Input } from '@estrelinha/ui/input'
import { cn } from '@estrelinha/ui/lib/utils'
import { SUPPLIER_NAME_MAX } from '@estrelinha/core/suppliers'
import { canCreateSupplier, suggestSuppliers, type Supplier } from '../model/suggest'

interface Props {
  id: string
  value: string
  onChange: (name: string) => void
  suppliers: Supplier[]
  /** Para o foco da recusa do save (`focusField`). */
  dataField?: string
}

type Opcao = { kind: 'supplier'; name: string; key: string } | { kind: 'create'; name: string; key: string }

const SupplierNameField = ({ id, value, onChange, suppliers, dataField }: Props) => {
  const listId = useId()
  const [aberta, setAberta] = useState(false)
  const [ativa, setAtiva] = useState(0)

  const opcoes = useMemo<Opcao[]>(() => {
    const sugeridas: Opcao[] = suggestSuppliers(suppliers, value).map(s => ({ kind: 'supplier', name: s.name, key: s.id }))
    if (canCreateSupplier(suppliers, value)) {
      sugeridas.push({ kind: 'create', name: value.trim().replace(/\s+/g, ' '), key: '__criar__' })
    }
    return sugeridas
  }, [suppliers, value])

  const visivel = aberta && opcoes.length > 0

  const escolher = (opcao: Opcao) => {
    onChange(opcao.name)
    setAberta(false)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAberta(true)
      setAtiva(i => (visivel ? Math.min(i + 1, opcoes.length - 1) : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAtiva(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && visivel) {
      // Sem isto o Enter submeteria o formulário do produto inteiro.
      e.preventDefault()
      escolher(opcoes[Math.min(ativa, opcoes.length - 1)])
    } else if (e.key === 'Escape' && visivel) {
      e.preventDefault()
      setAberta(false)
    }
  }

  return (
    <div className="relative">
      <Input
        id={id}
        data-field={dataField}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={visivel}
        aria-controls={listId}
        aria-activedescendant={visivel ? `${listId}-${ativa}` : undefined}
        autoComplete="off"
        maxLength={SUPPLIER_NAME_MAX}
        placeholder="Ex.: Ateliê Prata"
        value={value}
        onChange={e => {
          onChange(e.target.value)
          setAberta(true)
          setAtiva(0)
        }}
        onFocus={() => setAberta(true)}
        onBlur={() => setAberta(false)}
        onKeyDown={onKeyDown}
      />
      {visivel && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Fornecedores cadastrados"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg"
        >
          {opcoes.map((opcao, i) => (
            <li
              key={opcao.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === ativa}
              onMouseDown={e => e.preventDefault()}
              onMouseEnter={() => setAtiva(i)}
              onClick={() => escolher(opcao)}
              className={cn(
                'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm',
                i === ativa ? 'bg-muted text-foreground' : 'text-foreground',
              )}
            >
              {opcao.kind === 'create' ? (
                <>
                  <Plus className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="truncate">Criar ‘{opcao.name}’</span>
                </>
              ) : (
                <span className="truncate">{opcao.name}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default SupplierNameField
