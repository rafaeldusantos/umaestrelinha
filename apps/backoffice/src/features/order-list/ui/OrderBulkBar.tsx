// `PED-16` — a barra de seleção da listagem de pedidos, com as cinco ações que a operação repete.
//
// Molde de `features/bulk-edit/ui/BulkBar.tsx`. Componente próprio é o que permite testar cada ação
// sem montar a listagem inteira.

import { ArrowRight, CheckCircle2, Download, MessageCircle, Printer } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { BULK_LIMIT } from '../model/bulkMaterial'

interface Props {
  count: number
  /** Total do filtro — habilita "selecionar os N do filtro" enquanto a seleção for menor. */
  total: number
  busy?: boolean
  onMaterialReceived: () => void
  onAdvanceStatus: () => void
  onPickSlips: () => void
  onChargeMaterial: () => void
  onExport: () => void
  onSelectAll: () => void
  onClear: () => void
}

const OrderBulkBar = ({
  count, total, busy = false,
  onMaterialReceived, onAdvanceStatus, onPickSlips, onChargeMaterial, onExport,
  onSelectAll, onClear,
}: Props) => {
  const acimaDoTeto = count > BULK_LIMIT

  return (
    <div
      className="mb-3 rounded-xl border border-primary/30 bg-primary/5 p-3"
      role="toolbar"
      aria-label="Ações em massa"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium">
          {count} selecionado{count === 1 ? '' : 's'}
        </span>

        {count < total && (
          <Button variant="ghost" size="sm" onClick={onSelectAll} disabled={busy}>
            Selecionar os {total} do filtro
          </Button>
        )}

        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

        {/* A primeira ação é a que a bancada repete mais: o envelope chegou. */}
        <Button size="sm" onClick={onMaterialReceived} disabled={busy}>
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Marcar material recebido
        </Button>
        <Button size="sm" variant="outline" onClick={onAdvanceStatus} disabled={busy}>
          <ArrowRight className="mr-1 h-3.5 w-3.5" /> Avançar status
        </Button>
        <Button size="sm" variant="outline" onClick={onPickSlips} disabled={busy}>
          <Printer className="mr-1 h-3.5 w-3.5" /> Folhas de separação
        </Button>
        <Button size="sm" variant="outline" onClick={onChargeMaterial} disabled={busy}>
          <MessageCircle className="mr-1 h-3.5 w-3.5" /> Cobrar material
        </Button>
        <Button size="sm" variant="outline" onClick={onExport} disabled={busy}>
          <Download className="mr-1 h-3.5 w-3.5" /> Exportar
        </Button>

        <Button variant="ghost" size="sm" className="ml-auto" onClick={onClear} disabled={busy}>
          Limpar seleção
        </Button>
      </div>

      {acimaDoTeto && (
        // Avisar ANTES, e não truncar em silêncio: um lote que age sobre 50 de 80 sem dizer nada é
        // a mesma família de defeito da leitura truncada pelo PostgREST.
        <p className="mt-2 text-xs text-estrelinha-admin-amber">
          O lote age sobre os primeiros {BULK_LIMIT}. Para os outros {count - BULK_LIMIT}, filtre
          mais e repita — cada linha é uma ida ao servidor.
        </p>
      )}
    </div>
  )
}

export default OrderBulkBar
