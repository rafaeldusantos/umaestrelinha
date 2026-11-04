import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@estrelinha/ui/sheet'
import { cn } from '@estrelinha/ui/lib/utils'
import { ORDER_ADMIN_NOTE_MAX, SAVING, adminNoteLength, adminNoteRefusal, normalizeAdminNote } from '@estrelinha/core/orders'

import type { ObservacaoDoPedido } from '@/entities/order'
import { useTecladoVirtual } from '@/shared/lib/useTecladoVirtual'
import { CAMPO, ROTULO } from '@/shared/ui/campo'

import { devolverFoco } from '../model/foco'
import type { CopiaDaObservacao, FolhaNoHistorico } from '../model/useFolhaNoHistorico'
import type { ObservacaoDoPedidoAcao } from '../model/useObservacaoDoPedido'
import AlertaDaAcao from './AlertaDaAcao'
import { AGORA_NAO, SALVAR } from './FolhaDoRastreio'

export const TITULO_ADICIONAR_OBSERVACAO = 'Adicionar observação'
export const TITULO_EDITAR_OBSERVACAO = 'Editar observação'
export const FRASE_DA_OBSERVACAO = 'Só quem administra vê. A cliente não recebe.'
export const ROTULO_DA_OBSERVACAO = 'Observação'

/**
 * A folha da observação do pedido — molde de `FolhaDoRastreio` (feature `75`): no histórico
 * (o voltar do Android a fecha), `hideClose` (o X do canto tem 16 px), sobe com o teclado virtual,
 * fecha só no sucesso e nada fecha enquanto salva, e o foco volta a quem abriu (ou ao título da página).
 *
 * - **A regra é de `core`**: o contador conta pelo `adminNoteLength` (o texto aparado, por ponto de
 *   código — a régua do `check` do banco) e "Salvar" fica indisponível quando `adminNoteRefusal`
 *   recusa. Sem `maxLength` nativo: ele contaria unidades de UTF-16 e cortaria o que o banco aceita.
 * - "Salvar" também fica indisponível quando o texto não mudou (aparado, como é gravado): salvar o
 *   mesmo texto não diz nada, e o vazio sem observação gravada apagaria o que não existe.
 * - Vazio com observação gravada APAGA a observação (a regra do dono).
 * - Com falha, a folha fica, com o erro da observação (`role="alert"`) e o texto digitado.
 * - Menos movimento: os dois pares no MESMO seletor de estado, na folha e no fundo (R2 da `75`).
 */
export interface FolhaDaObservacaoProps {
  controle: FolhaNoHistorico<CopiaDaObservacao>
  observacao: ObservacaoDoPedidoAcao
  /** A observação gravada, ou `null` quando o pedido não tem. */
  gravada: ObservacaoDoPedido | null
}

const FolhaDaObservacao = ({ controle, observacao, gravada }: FolhaDaObservacaoProps) => {
  const { aberta, fechar } = controle
  const teclado = useTecladoVirtual()
  const [valor, setValor] = useState('')
  const campo = useRef<HTMLTextAreaElement>(null)
  const quemAbriu = useRef<HTMLElement | null>(null)
  const idDoCampo = useId()
  const idDoContador = useId()
  const idDaRecusa = useId()
  const textoGravado = gravada?.note ?? ''

  // Cada ABERTURA começa do texto gravado — só na abertura: a releitura com a folha aberta não apaga
  // o que ela digitou (a mesma régua da folha do rastreio).
  const textoDaAbertura = useRef(textoGravado)
  textoDaAbertura.current = textoGravado
  useEffect(() => {
    if (aberta) setValor(textoDaAbertura.current)
  }, [aberta])

  const recusa = adminNoteRefusal(valor)
  const mudou = normalizeAdminNote(valor) !== normalizeAdminNote(textoGravado)
  const indisponivel = observacao.travado || recusa !== null || !mudou

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    if (indisponivel) return
    await observacao.salvar(valor, { aoConcluir: fechar })
  }

  return (
    <Sheet
      open={aberta}
      onOpenChange={(abrir) => {
        if (!abrir && !observacao.travado) fechar()
      }}
    >
      <SheetContent
        side="bottom"
        hideClose
        style={{ bottom: teclado }}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          const ativo = document.activeElement
          quemAbriu.current = ativo instanceof HTMLElement && ativo !== document.body ? ativo : null
          campo.current?.focus()
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          devolverFoco(quemAbriu.current)
          quemAbriu.current = null
        }}
        overlayClassName="motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none"
        className="max-h-[90dvh] overflow-y-auto rounded-t-lg border-estrelinha-line bg-estrelinha-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-estrelinha-ink motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none"
      >
        <form onSubmit={salvar} noValidate className="mx-auto max-w-lg space-y-4">
          <div className="space-y-1">
            <SheetTitle className="font-display text-lg text-estrelinha-ink [overflow-wrap:anywhere]">
              {gravada ? TITULO_EDITAR_OBSERVACAO : TITULO_ADICIONAR_OBSERVACAO}
            </SheetTitle>
            <SheetDescription className="text-sm text-estrelinha-ink-soft [overflow-wrap:anywhere]">{FRASE_DA_OBSERVACAO}</SheetDescription>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <label htmlFor={idDoCampo} className={ROTULO}>
                {ROTULO_DA_OBSERVACAO}
              </label>
              <span
                id={idDoContador}
                data-testid="contador-da-observacao"
                className={cn('ml-auto text-xs tabular-nums', recusa ? 'text-estrelinha-alert' : 'text-estrelinha-ink-soft')}
              >
                {adminNoteLength(valor)} / {ORDER_ADMIN_NOTE_MAX}
              </span>
            </div>
            <textarea
              ref={campo}
              id={idDoCampo}
              value={valor}
              rows={5}
              readOnly={observacao.travado}
              onChange={(ev) => setValor(ev.target.value)}
              aria-invalid={recusa ? 'true' : undefined}
              aria-describedby={recusa ? `${idDoContador} ${idDaRecusa}` : idDoContador}
              className={cn(CAMPO, 'h-auto min-h-32 w-full min-w-0 resize-none py-3 [overflow-wrap:anywhere]', recusa && 'border-estrelinha-alert')}
            />
            {recusa && (
              <p id={idDaRecusa} className="text-sm text-estrelinha-alert [overflow-wrap:anywhere]">
                {recusa}
              </p>
            )}
          </div>

          {observacao.erro && !observacao.travado && <AlertaDaAcao erro={observacao.erro} aoTentarDeNovo={() => {}} />}

          <div className="flex flex-col-reverse gap-2 min-[360px]:flex-row">
            <button
              type="button"
              onClick={() => {
                if (!observacao.travado) fechar()
              }}
              className="min-h-12 flex-1 rounded-sm px-4 text-base font-medium text-estrelinha-primary hover:bg-estrelinha-ground-deep"
            >
              {AGORA_NAO}
            </button>
            <button
              type="submit"
              aria-disabled={indisponivel ? 'true' : undefined}
              className="min-h-12 flex-1 rounded-sm bg-estrelinha-primary px-4 text-base font-medium text-estrelinha-on-primary hover:bg-estrelinha-primary-strong aria-disabled:opacity-70"
            >
              {observacao.travado ? SAVING : SALVAR}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

export default FolhaDaObservacao
