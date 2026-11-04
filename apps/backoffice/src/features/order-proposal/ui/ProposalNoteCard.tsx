// O card "Observação" da página da proposta. Edita em qualquer status não concluído —
// aberta, expirada, cancelada — pela ação própria `note`, que NÃO sobe a versão nem muda o que o link
// da cliente mostra. A proposta concluída não monta este card: lá a observação é a do PEDIDO, e a
// página monta `OrderAdminNoteCard` com o `order_id`.
//
// Mesmo desenho e mesma régua do card do pedido: o texto aparado, contado por ponto de código
// (`core`), sem `maxLength` nativo; a gravação não desmonta o campo, e o foco volta ao botão.

import { useEffect, useId, useRef, useState } from 'react'
import { Textarea } from '@estrelinha/ui/textarea'
import { ORDER_ADMIN_NOTE_MAX, adminNoteLength, adminNoteRefusal, normalizeAdminNote } from '@estrelinha/core/orders'
import { ActionButton, CharCounter } from '@/shared/ui'
import { usePendingAction } from '@/shared/lib/usePendingAction'
import { blocoDe, devolverFoco } from '@/shared/lib/foco'

export const PROPOSAL_NOTE_SAVE_FAILED = 'A observação não foi salva. Tente de novo.'

interface Props {
  /** A observação gravada na proposta; `null` sem observação. */
  note: string | null
  /** Grava (vazio apaga). Lança com a frase do servidor na falha. */
  onSave: (adminNote: string | null) => Promise<unknown>
}

const ProposalNoteCard = ({ note, onSave }: Props) => {
  const campoId = useId()
  const { pendente, rodar, anunciar, regiaoViva } = usePendingAction()
  const gravada = note ?? ''
  const [texto, setTexto] = useState(gravada)
  const [erro, setErro] = useState<string | null>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const [focarDepois, setFocarDepois] = useState(false)

  // O campo acompanha a observação gravada sempre que ela muda (a releitura depois de salvar).
  useEffect(() => {
    setTexto(gravada)
  }, [gravada])

  useEffect(() => {
    if (!focarDepois) return
    devolverFoco(botao.current, blocoDe(botao.current))
    setFocarDepois(false)
  }, [focarDepois, pendente])

  const mudou = normalizeAdminNote(texto) !== normalizeAdminNote(gravada)
  const recusa = adminNoteRefusal(texto)
  const gravando = pendente === 'observacao'

  const salvar = async () => {
    setErro(null)
    const valor = normalizeAdminNote(texto) || null
    try {
      const r = await rodar('observacao', 'Salvando observação…', () => onSave(valor))
      if (r === undefined) return
      anunciar(valor ? 'Observação salva' : 'Observação apagada')
    } catch (e) {
      setErro((e as Error)?.message || PROPOSAL_NOTE_SAVE_FAILED)
      anunciar('')
    }
    setFocarDepois(true)
  }

  return (
    <section
      aria-labelledby={`${campoId}-titulo`}
      className="rounded-xl border-l-4 border-l-estrelinha-admin-amber border-y border-r border-border bg-estrelinha-admin-card p-4"
    >
      <h2 id={`${campoId}-titulo`} className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Observação
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Só quem administra vê. A cliente não recebe, e editar não muda o link. Ela passa ao pedido quando a cliente concluir.
      </p>
      <div className="mt-3 space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <label htmlFor={campoId} className="sr-only">
            Observação
          </label>
          <span className="ml-auto">
            <CharCounter value={texto} count={adminNoteLength(texto)} limit={ORDER_ADMIN_NOTE_MAX} />
          </span>
        </div>
        <Textarea
          id={campoId}
          value={texto}
          rows={3}
          placeholder="Escrever uma observação sobre esta proposta..."
          disabled={gravando}
          onChange={(e) => {
            setTexto(e.target.value)
            setErro(null)
          }}
          className="min-h-20 w-full min-w-0 text-sm"
        />
        {recusa && <p className="text-sm text-destructive">{recusa}</p>}
        {erro && (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        )}
        <div className="flex justify-end">
          <ActionButton
            ref={botao}
            type="button"
            size="sm"
            alvo44
            aria-label={gravando ? undefined : 'Salvar observação'}
            disabled={!mudou || recusa !== null}
            pending={gravando}
            pendingLabel="Salvando observação…"
            onClick={salvar}
          >
            Salvar
          </ActionButton>
        </div>
      </div>
      {regiaoViva}
    </section>
  )
}

export default ProposalNoteCard
