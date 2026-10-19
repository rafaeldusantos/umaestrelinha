// A coluna dos motivos da fila — feature 67 (`VFL-18`, `VFL-25`).
//
// A busca, o grupo de filtro e a fonte só RECORTAM a lista (`recortarFila`). Cada linha é um motivo
// — "Opção Cor = Prata 925" em 73 peças é UMA linha —, com o valor sugerido, o alvo e quantas peças.

import { LayoutGrid, Search } from 'lucide-react'
import { Input } from '@estrelinha/ui/input'
import { cn } from '@estrelinha/ui/lib/utils'
import type { SuggestionGroup } from '@estrelinha/core/filters'
import type { AdminFilterGroup } from '@/entities/filter'
import {
  alvoLabel,
  pecasLabel,
  rotuloDoValor,
  type FonteDaFila,
  type RecorteDaFila,
  type ValorDaFila,
} from '../model/fila'

const FONTES: { valor: FonteDaFila; rotulo: string }[] = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'option', rotulo: 'Opção' },
  { valor: 'name', rotulo: 'Nome' },
  { valor: 'tag', rotulo: 'Tag' },
]

interface Props {
  motivos: readonly SuggestionGroup[]
  grupos: readonly AdminFilterGroup[]
  valores: ReadonlyMap<string, ValorDaFila>
  recorte: RecorteDaFila
  onRecorte: (patch: Partial<RecorteDaFila>) => void
  /** O motivo aberto (no computador sempre há um; no celular, só quando a URL diz). */
  abertoKey: string | null
  onAbrir: (key: string) => void
}

const ReasonList = ({ motivos, grupos, valores, recorte, onRecorte, abertoKey, onAbrir }: Props) => (
  <section aria-label="Motivos" className="overflow-hidden rounded-2xl border border-border bg-card">
    <div className="space-y-3 border-b border-border p-4">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Buscar no motivo"
          placeholder="Buscar no motivo (ex.: rosé, chaveiro)"
          value={recorte.termo}
          onChange={e => onRecorte({ termo: e.target.value })}
          className="h-11 pl-9"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Grupo de filtro"
          value={recorte.grupo}
          onChange={e => onRecorte({ grupo: e.target.value })}
          className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground"
        >
          <option value="">Todos os grupos</option>
          {grupos.map(g => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <div role="group" aria-label="Fonte" className="flex rounded-md bg-muted p-1">
          {FONTES.map(({ valor, rotulo }) => (
            <button
              key={valor}
              type="button"
              aria-pressed={recorte.fonte === valor}
              onClick={() => onRecorte({ fonte: valor })}
              className={cn(
                'min-h-11 rounded px-3 text-sm',
                recorte.fonte === valor ? 'bg-card font-medium text-foreground shadow-sm' : 'text-muted-foreground',
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>
    </div>

    {motivos.length === 0 ? (
      <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhum motivo neste recorte.</p>
    ) : (
      <ul className="divide-y divide-border">
        {motivos.map(g => {
          const aberto = abertoKey === g.key
          return (
            <li key={g.key}>
              <button
                type="button"
                aria-current={aberto ? 'true' : undefined}
                onClick={() => onAbrir(g.key)}
                className={cn(
                  'flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left',
                  aberto && 'lg:bg-muted',
                )}
              >
                <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <LayoutGrid className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-medium text-foreground">{g.reason}</span>
                  <span className="block break-words text-xs text-muted-foreground">
                    sugere {rotuloDoValor(valores.get(g.value_id))} · {alvoLabel(g)}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-medium text-foreground">{pecasLabel(g.suggestions.length)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    )}
  </section>
)

export default ReasonList
