// O "Marcar" de uma opção — feature 67 (`VFL-01`, `VFL-04`).
//
// A lista dos valores, agrupada por grupo e na ordem do painel, com busca (a dobra da `51`,
// `dobrarTexto`). Um valor que já está marcado na PEÇA TODA aparece desabilitado, com o motivo em
// texto: a marcação da peça toda vence a da opção na loja, e marcar os dois seria dizer a mesma
// coisa duas vezes.

import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Input } from '@estrelinha/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@estrelinha/ui/popover'
import type { AdminFilterGroup } from '@/entities/filter'
import { dobrarTexto } from '@/shared/lib/texto'

interface Props {
  /** O que a opção é — vai no nome acessível do botão: "Marcar Cor = Prata 925". */
  rotulo: string
  grupos: readonly AdminFilterGroup[]
  marcados: ReadonlySet<string>
  naPecaToda: ReadonlySet<string>
  onToggle: (valueId: string) => void
}

const MarkPopover = ({ rotulo, grupos, marcados, naPecaToda, onToggle }: Props) => {
  const [termo, setTermo] = useState('')
  const visiveis = useMemo(() => {
    const t = dobrarTexto(termo.trim())
    return grupos
      .map(g => ({ ...g, values: t === '' ? g.values : g.values.filter(v => dobrarTexto(v.name).includes(t)) }))
      .filter(g => g.values.length > 0)
  }, [grupos, termo])

  return (
    <Popover onOpenChange={aberto => !aberto && setTermo('')}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Marcar ${rotulo}`}
          className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-border bg-card px-4 text-sm text-muted-foreground hover:bg-muted"
        >
          <Plus aria-hidden className="h-4 w-4" />
          Marcar
        </button>
      </PopoverTrigger>
      {/* D4 da prova em navegador: a largura já cabia em 390 (358 = 390 − 32), mas `align="start"`
          ancora na borda do gatilho, e sem `collisionPadding` o Radix só desloca até ENCOSTAR na
          janela — o popover saía em x = 32 e terminava em 390, sem gutter. 16 é o gutter do painel. */}
      <PopoverContent align="start" collisionPadding={16} className="w-[min(360px,calc(100vw-32px))] p-0">
        <div className="relative border-b border-border p-3">
          <Search aria-hidden className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar valor"
            placeholder="Buscar valor"
            value={termo}
            onChange={e => setTermo(e.target.value)}
            className="h-11 pl-9"
          />
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          {visiveis.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhum valor com “{termo.trim()}”.</p>
          ) : (
            visiveis.map(g => (
              <div key={g.id} role="group" aria-label={g.name} className="border-b border-border last:border-b-0">
                <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.name}</p>
                {g.values.map(v => {
                  const travado = naPecaToda.has(v.id)
                  return (
                    <label
                      key={v.id}
                      className="flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2 text-sm text-foreground aria-disabled:cursor-default"
                      aria-disabled={travado || undefined}
                    >
                      <input
                        type="checkbox"
                        className="h-5 w-5 shrink-0"
                        checked={travado || marcados.has(v.id)}
                        disabled={travado}
                        onChange={() => onToggle(v.id)}
                      />
                      <span className="min-w-0">
                        <span className={travado ? 'block text-muted-foreground' : 'block'}>{v.name}</span>
                        {travado && <span className="block text-xs text-muted-foreground">Já vale para a peça toda</span>}
                      </span>
                    </label>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default MarkPopover
