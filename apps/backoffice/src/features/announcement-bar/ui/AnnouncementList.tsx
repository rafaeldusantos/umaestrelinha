// A lista sanfonada dos avisos: um aberto por vez, arrastar para ordenar, subir/descer e tirar.
//
// O botão-resumo de cada aviso é o que o abre. Recolhido, o aviso recusado mostra a recusa abaixo do
// cabeçalho — senão o "Corrija o que está marcado" da barra apontaria para algo que ninguém vê.

import { useState } from 'react'
import { ChevronDown, ChevronUp, GripVertical, Trash2 } from 'lucide-react'
import { cn } from '@estrelinha/ui/lib/utils'
import {
  apoioDoAviso,
  recusasDoAviso,
  recusasPorCampo,
  tituloDoAviso,
  type AvisoRascunho,
} from '../model/rascunho'
import AnnouncementFields, { type CampoDeArte } from './AnnouncementFields'

const ICONE_44 =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors motion-reduce:transition-none hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent'

interface Props {
  avisos: AvisoRascunho[]
  abertoId: string | null
  recados: Record<string, Partial<Record<CampoDeArte, string>>>
  enviando: Record<string, Partial<Record<CampoDeArte, boolean>>>
  onToggle: (id: string) => void
  onMove: (de: number, para: number) => void
  onRemove: (id: string) => void
  onChange: (id: string, patch: Partial<AvisoRascunho>) => void
  onUpload: (id: string, campo: CampoDeArte, file: File | undefined) => void
}

const AnnouncementList = ({ avisos, abertoId, recados, enviando, onToggle, onMove, onRemove, onChange, onUpload }: Props) => {
  const [arrastando, setArrastando] = useState<number | null>(null)

  return (
    <ol data-testid="lista-de-avisos" className="space-y-2">
      {avisos.map((aviso, indice) => {
        const n = indice + 1
        const aberto = aviso.id === abertoId
        const recusas = recusasDoAviso(aviso, indice)
        const recusa = recusas.length > 0
        return (
          <li
            key={aviso.id}
            data-testid={`aviso-${indice}`}
            draggable
            onDragStart={() => setArrastando(indice)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault()
              if (arrastando !== null) onMove(arrastando, indice)
              setArrastando(null)
            }}
            className={cn('rounded-xl border p-2', recusa ? 'border-destructive/40' : 'border-border/60')}
          >
            <div className="flex items-center gap-1">
              <GripVertical className="hidden h-4 w-4 shrink-0 cursor-grab text-muted-foreground md:block" aria-hidden />
              <span className="w-5 shrink-0 text-center text-[11px] font-semibold text-muted-foreground">{n}</span>
              <button
                type="button"
                data-testid={`resumo-aviso-${indice}`}
                aria-expanded={aberto}
                aria-controls={`corpo-aviso-${aviso.id}`}
                onClick={() => onToggle(aviso.id)}
                className="flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-lg px-2 text-left hover:bg-muted/50"
              >
                <span className="block truncate text-sm font-medium text-foreground">{tituloDoAviso(aviso)}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{apoioDoAviso(aviso)}</span>
              </button>
              <button
                type="button"
                className={ICONE_44}
                disabled={indice === 0}
                aria-label={`Subir o aviso ${n}`}
                onClick={() => onMove(indice, indice - 1)}
              >
                <ChevronUp className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                className={ICONE_44}
                disabled={indice === avisos.length - 1}
                aria-label={`Descer o aviso ${n}`}
                onClick={() => onMove(indice, indice + 1)}
              >
                <ChevronDown className="h-4 w-4" aria-hidden />
              </button>
              <button type="button" className={ICONE_44} aria-label={`Tirar o aviso ${n}`} onClick={() => onRemove(aviso.id)}>
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>

            {!aberto && recusa && (
              <div data-testid={`recusa-recolhida-${indice}`} className="mt-1 space-y-0.5 pl-7 text-xs font-medium text-destructive">
                {recusas.map(motivo => (
                  <p key={motivo}>{motivo}</p>
                ))}
              </div>
            )}

            {aberto && (
              <div id={`corpo-aviso-${aviso.id}`} className="mt-3 border-t border-border/60 px-1 pt-3">
                <AnnouncementFields
                  aviso={aviso}
                  indice={indice}
                  recusas={recusasPorCampo(aviso, recusas)}
                  recados={recados[aviso.id] ?? {}}
                  enviando={enviando[aviso.id] ?? {}}
                  onChange={patch => onChange(aviso.id, patch)}
                  onUpload={(campoDeArte, file) => onUpload(aviso.id, campoDeArte, file)}
                />
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export default AnnouncementList
