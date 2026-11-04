// O card "Observação" do pedido — o texto que só quem administra lê.
//
// Autossuficiente: recebe só o `orderId`, lê e grava sozinho. A página do pedido o monta logo depois
// do Recado da cliente, e a página da proposta concluída monta o mesmo card com o `order_id` dela.
//
// Rotulado com a ORIGEM, como o Recado: são três coisas diferentes na mesma página — o Recado a
// cliente escreveu, a Nota interna é um histórico só de acréscimo, e a Observação é um texto
// editável que a cliente nunca recebe.

import { useEffect, useId, useRef, useState } from 'react'
import { Skeleton } from '@estrelinha/ui/skeleton'
import { Textarea } from '@estrelinha/ui/textarea'
import { Button } from '@estrelinha/ui/button'
import {
  ORDER_ADMIN_NOTE_MAX,
  adminNoteAuthorLine,
  adminNoteLength,
  adminNoteRefusal,
  normalizeAdminNote,
} from '@estrelinha/core/orders'
import { ActionButton, CharCounter } from '@/shared/ui'
import { usePendingAction } from '@/shared/lib/usePendingAction'
import { blocoDe, devolverFoco } from '@/shared/lib/foco'
import { useOrderAdminNote } from '../api/useOrderAdminNote'

const FALHOU_LER = 'Não consegui ler a observação deste pedido.'
const FALHOU_SALVAR = 'A observação não foi salva. Tente de novo.'

interface Props {
  orderId: string
}

export const OrderAdminNoteCard = ({ orderId }: Props) => {
  const campoId = useId()
  const { nota, carregando, falhou, tentarDeNovo, salvar } = useOrderAdminNote(orderId)
  const { pendente, rodar, anunciar, regiaoViva } = usePendingAction()
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const [focarDepois, setFocarDepois] = useState(false)

  // O campo acompanha a observação gravada sempre que ela muda (primeira leitura, gravação, revalidação).
  const gravada = nota?.note ?? ''
  useEffect(() => {
    setTexto(gravada)
  }, [gravada])

  // O foco volta ao botão (ou ao bloco) DEPOIS do commit: durante a gravação ele está desabilitado.
  useEffect(() => {
    if (!focarDepois) return
    devolverFoco(botao.current, blocoDe(botao.current))
    setFocarDepois(false)
  }, [focarDepois, pendente])

  const mudou = normalizeAdminNote(texto) !== normalizeAdminNote(gravada)
  // A regra é uma só (`core`): a tela conta e recusa como o dono da escrita e o `check` do banco —
  // texto aparado, por ponto de código. Sem `maxLength` nativo, que contaria unidades de UTF-16.
  const recusa = adminNoteRefusal(texto)
  const gravando = pendente === 'observacao'

  const onSalvar = async () => {
    setErro(null)
    const r = await rodar('observacao', 'Salvando observação…', () => salvar(texto))
    if (r === undefined) return
    setFocarDepois(true)
    if (r.tipo === 'ok') {
      anunciar(r.nota ? 'Observação salva' : 'Observação apagada')
      return
    }
    // O texto fica no campo, como na nota interna.
    setErro(r.tipo === 'recusado' ? r.motivo : FALHOU_SALVAR)
    anunciar('')
  }

  const autoria = adminNoteAuthorLine(nota)

  return (
    <section
      aria-labelledby={`${campoId}-titulo`}
      className="rounded-xl border-l-4 border-l-estrelinha-admin-amber border-y border-r border-border bg-estrelinha-admin-card p-4"
    >
      <h2 id={`${campoId}-titulo`} className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Observação
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">Só quem administra vê. A cliente não recebe.</p>

      {carregando && (
        <div data-testid="observacao-carregando" className="mt-3 space-y-2">
          <Skeleton className="h-20 w-full motion-reduce:animate-none" />
          <Skeleton className="h-11 w-28 motion-reduce:animate-none" />
        </div>
      )}

      {falhou && (
        <div role="alert" className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <p>{FALHOU_LER}</p>
          <Button type="button" variant="outline" size="sm" className="mt-2 min-h-11" onClick={tentarDeNovo}>
            Tentar de novo
          </Button>
        </div>
      )}

      {!carregando && !falhou && (
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
            placeholder="Escrever uma observação sobre este pedido..."
            disabled={gravando}
            onChange={(e) => {
              setTexto(e.target.value)
              setErro(null)
            }}
            className="min-h-20 w-full min-w-0 text-sm"
          />
          {recusa && (
            <p className="text-sm text-destructive">{recusa}</p>
          )}
          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <p className="min-w-0 text-xs text-muted-foreground">{autoria}</p>
            <ActionButton
              ref={botao}
              type="button"
              size="sm"
              alvo44
              aria-label={gravando ? undefined : 'Salvar observação'}
              disabled={!mudou || recusa !== null}
              pending={gravando}
              pendingLabel="Salvando observação…"
              onClick={onSalvar}
              className="ml-auto"
            >
              Salvar
            </ActionButton>
          </div>
        </div>
      )}
      {regiaoViva}
    </section>
  )
}

export default OrderAdminNoteCard
