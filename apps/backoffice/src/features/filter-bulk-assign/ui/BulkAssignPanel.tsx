// A marcação em massa de um valor — feature 66 (`FLT-15`..`FLT-20`, `FLT-42`, `FLT-43`).
//
// Busca, categoria, "marcadas / não marcadas" e "Com a tag…" só RECORTAM a lista; a seleção é das
// caixas; e quem grava são os dois botões do pé, cada um numa requisição só. Nada é otimista: a
// coluna "Marcada" só muda depois que o banco respondeu (`FLT-19`), e uma falha deixa a seleção
// exatamente como estava.

import { useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { cn } from '@estrelinha/ui/lib/utils'
import type { ProdutoParaMarcar } from '@/entities/product'
import {
  RECORTE_INICIAL,
  dividirSelecao,
  produtosLabel,
  recortar,
  tagsComContagem,
  type Recorte,
  type Situacao,
} from '../model/recorte'

interface Props {
  valueName: string
  produtos: readonly ProdutoParaMarcar[]
  categorias: readonly { id: string; name: string }[]
  marcadas: ReadonlySet<string>
  /** Grava as marcações. Devolve a frase do erro, ou `null`. */
  onMark: (ids: string[]) => Promise<string | null>
  onUnmark: (ids: string[]) => Promise<string | null>
}

const SITUACOES: { valor: Situacao; rotulo: string }[] = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'marcadas', rotulo: 'Marcadas' },
  { valor: 'nao-marcadas', rotulo: 'Não marcadas' },
]

const SELECT_CLASS = 'h-11 min-w-0 rounded-md border border-input bg-background px-3 text-sm text-foreground'

const BulkAssignPanel = ({ valueName, produtos, categorias, marcadas, onMark, onUnmark }: Props) => {
  const [recorte, setRecorte] = useState<Recorte>(RECORTE_INICIAL)
  const [selecionadas, setSelecionadas] = useState<Set<string>>(() => new Set())
  const [gravando, setGravando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const visiveis = useMemo(() => recortar(produtos, recorte, marcadas), [produtos, recorte, marcadas])
  const tags = useMemo(() => tagsComContagem(produtos), [produtos])
  const nomeDaCategoria = useMemo(() => new Map(categorias.map(c => [c.id, c.name])), [categorias])

  const mudar = (patch: Partial<Recorte>) => setRecorte(atual => ({ ...atual, ...patch }))

  const todosVisiveisSelecionados = visiveis.length > 0 && visiveis.every(p => selecionadas.has(p.id))

  /** "Selecionar todos" pega SÓ os visíveis no recorte (`FLT-18`). Tocar de novo desfaz os mesmos. */
  const alternarTodos = () =>
    setSelecionadas(atual => {
      const proxima = new Set(atual)
      if (todosVisiveisSelecionados) visiveis.forEach(p => proxima.delete(p.id))
      else visiveis.forEach(p => proxima.add(p.id))
      return proxima
    })

  const alternar = (id: string) =>
    setSelecionadas(atual => {
      const proxima = new Set(atual)
      if (proxima.has(id)) proxima.delete(id)
      else proxima.add(id)
      return proxima
    })

  const { marcar, remover } = dividirSelecao(selecionadas, marcadas)

  const gravar = async (acao: 'marcar' | 'remover') => {
    setGravando(true)
    setErro(null)
    const motivo = acao === 'marcar' ? await onMark(marcar) : await onUnmark(remover)
    setGravando(false)
    if (motivo) {
      // A seleção FICA (`FLT-19`): a dona tenta de novo sem refazer a busca e as caixas.
      setErro(motivo)
      return
    }
    setSelecionadas(new Set())
  }

  return (
    <section aria-label={`Marcar peças em “${valueName}”`} className="rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap gap-2 border-b border-border p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar peça pelo nome"
            placeholder="Buscar peça pelo nome"
            value={recorte.termo}
            onChange={e => mudar({ termo: e.target.value })}
            className="h-11 pl-9"
          />
        </div>
        <select
          aria-label="Categoria"
          value={recorte.categoria}
          onChange={e => mudar({ categoria: e.target.value })}
          className={SELECT_CLASS}
        >
          <option value="">Todas as categorias</option>
          {categorias.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Com a tag…"
          value={recorte.tag}
          onChange={e => mudar({ tag: e.target.value })}
          className={SELECT_CLASS}
        >
          <option value="">Com a tag…</option>
          {tags.map(({ tag, total }) => (
            <option key={tag} value={tag}>
              {tag} ({total})
            </option>
          ))}
        </select>
        <div role="group" aria-label="Situação" className="flex rounded-md bg-muted p-1">
          {SITUACOES.map(({ valor, rotulo }) => (
            <button
              key={valor}
              type="button"
              aria-pressed={recorte.situacao === valor}
              onClick={() => mudar({ situacao: valor })}
              className={cn(
                'min-h-11 rounded px-3 text-sm',
                recorte.situacao === valor ? 'bg-card font-medium text-foreground shadow-sm' : 'text-muted-foreground',
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      <label className="flex min-h-11 items-center gap-3 border-b border-border bg-muted/40 px-3 text-sm font-medium text-foreground">
        <input
          type="checkbox"
          className="h-5 w-5 shrink-0"
          checked={todosVisiveisSelecionados}
          disabled={visiveis.length === 0}
          onChange={alternarTodos}
        />
        <span>
          Selecionar todos ({visiveis.length}) · {selecionadas.size}{' '}
          {selecionadas.size === 1 ? 'selecionada' : 'selecionadas'}
        </span>
      </label>

      {visiveis.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhuma peça neste recorte.</p>
      ) : (
        <ul className="divide-y divide-border" aria-label="Peças">
          {visiveis.map(p => {
            const marcada = marcadas.has(p.id)
            const nomesDasCategorias = p.category_ids.map(id => nomeDaCategoria.get(id)).filter(Boolean)
            return (
              <li key={p.id}>
                <label className="flex min-h-[60px] cursor-pointer items-center gap-3 px-3 py-2">
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0"
                    aria-label={p.name}
                    checked={selecionadas.has(p.id)}
                    onChange={() => alternar(p.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {p.name}
                      {!p.is_active && <span className="ml-2 text-xs font-normal text-muted-foreground">rascunho</span>}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {nomesDasCategorias.join(', ') || 'sem categoria'}
                      {p.tags.length > 0 ? ` · tags: ${p.tags.join(', ')}` : ''}
                    </span>
                  </span>
                  <span
                    data-testid={`situacao-${p.id}`}
                    className={cn('shrink-0 text-xs', marcada ? 'font-semibold text-foreground' : 'text-muted-foreground')}
                  >
                    {marcada ? 'Marcada' : 'Não marcada'}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-b-2xl border-t border-border bg-card p-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {selecionadas.size === 1 ? '1 peça selecionada' : `${selecionadas.size} peças selecionadas`}
          </p>
          <p className="text-xs text-muted-foreground">
            “Selecionar todos” pega só as {visiveis.length} desta lista recortada.
          </p>
          {erro && (
            <p role="alert" className="mt-1 text-xs font-medium text-destructive">
              {erro}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          className="h-11"
          disabled={gravando || remover.length === 0}
          onClick={() => void gravar('remover')}
        >
          Remover de {produtosLabel(remover.length)}
        </Button>
        <Button className="h-11" disabled={gravando || marcar.length === 0} onClick={() => void gravar('marcar')}>
          <Check className="mr-2 h-4 w-4" />
          Marcar {produtosLabel(marcar.length)}
        </Button>
      </div>
    </section>
  )
}

export default BulkAssignPanel
