import { useRef, useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@estrelinha/ui/sheet'
import { CUSTOMER_PARSE_TEXT_MAX, type CustomerParseMode } from '@estrelinha/core/customers'

import { devolverFoco } from '@/features/order-actions'
import type { FolhaNaEntrada } from '@/shared/lib/useFolhaNaEntrada'
import { ROTULO } from '@/shared/ui/campo'

import {
  CANCELAR,
  DICA_DO_TEXTO,
  FOLHA_DA_LEITURA,
  LENDO_O_TEXTO,
  LER_O_TEXTO,
  PREENCHER_A_MAO,
  TEXTO_DA_CONVERSA,
  TEXTO_NAO_FICA_GUARDADO,
  contadorDoTexto,
} from '../model/frasesDaMontagem'

/**
 * A folha "Colar texto" do passo 1 — molde de `FolhaDeConfirmacao`: no histórico (o voltar do Android
 * a fecha), sem o X do canto, e o foco volta a quem abriu. "Cancelar", o Esc e o voltar fecham também
 * durante a leitura: quem a usa desiste dela ao fechar (`useLeituraDoTexto().cancelar`).
 *
 * **O texto colado vive só aqui**, no estado do corpo da folha: o corpo desmonta ao fechar e leva o
 * texto junto. Nada vai a armazenamento, endereço, `history.state` ou título.
 */
export interface FolhaColarTextoProps {
  controle: FolhaNaEntrada
  escopo: CustomerParseMode
  lendo: boolean
  /** O desfecho sem campos: a folha fica aberta com a frase, e "Cancelar" vira "Preencher à mão". */
  erro: string | null
  aoLer: (texto: string) => void
}

const Corpo = ({ controle, escopo, lendo, erro, aoLer }: FolhaColarTextoProps) => {
  const [texto, setTexto] = useState('')
  const cabecalho = FOLHA_DA_LEITURA[escopo]
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="space-y-1">
        <SheetTitle className="font-display text-lg text-estrelinha-ink [overflow-wrap:anywhere]">{cabecalho.titulo}</SheetTitle>
        <SheetDescription className="text-sm text-estrelinha-ink-soft [overflow-wrap:anywhere]">{cabecalho.frase}</SheetDescription>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="texto-da-conversa" className={ROTULO}>
          {TEXTO_DA_CONVERSA}
        </label>
        <textarea
          id="texto-da-conversa"
          rows={7}
          maxLength={CUSTOMER_PARSE_TEXT_MAX}
          value={texto}
          placeholder={DICA_DO_TEXTO}
          aria-describedby="texto-da-conversa-nota"
          onChange={(e) => setTexto(e.target.value.slice(0, CUSTOMER_PARSE_TEXT_MAX))}
          className="min-h-40 w-full min-w-0 rounded-md border border-estrelinha-field bg-estrelinha-surface px-3 py-2 text-base text-estrelinha-ink placeholder:text-estrelinha-ink-soft"
        />
        <p id="texto-da-conversa-nota" className="flex flex-wrap justify-between gap-x-3 text-sm text-estrelinha-ink-soft">
          <span>{TEXTO_NAO_FICA_GUARDADO}</span>
          <span>{contadorDoTexto(texto.length, CUSTOMER_PARSE_TEXT_MAX)}</span>
        </p>
      </div>
      {erro && (
        <p role="alert" className="rounded-md border border-estrelinha-alert/30 bg-estrelinha-alert-soft p-3 text-sm text-estrelinha-alert">
          {erro}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 min-[360px]:flex-row">
        <button
          type="button"
          onClick={() => controle.fechar()}
          className="min-h-12 flex-1 rounded-sm px-4 text-base font-medium text-estrelinha-primary hover:bg-estrelinha-ground-deep"
        >
          {erro ? PREENCHER_A_MAO : CANCELAR}
        </button>
        <button
          type="button"
          disabled={lendo || texto.trim() === ''}
          onClick={() => aoLer(texto)}
          className="min-h-12 flex-1 rounded-sm bg-estrelinha-ink px-4 text-base font-medium text-estrelinha-on-primary disabled:opacity-60"
        >
          {lendo ? LENDO_O_TEXTO : LER_O_TEXTO}
        </button>
      </div>
    </div>
  )
}

const FolhaColarTexto = (p: FolhaColarTextoProps) => {
  const quemAbriu = useRef<HTMLElement | null>(null)
  return (
    <Sheet
      open={p.controle.aberta}
      onOpenChange={(abrir) => {
        if (!abrir) p.controle.fechar()
      }}
    >
      <SheetContent
        side="bottom"
        hideClose
        onOpenAutoFocus={() => {
          const ativo = document.activeElement
          quemAbriu.current = ativo instanceof HTMLElement && ativo !== document.body ? ativo : null
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          devolverFoco(quemAbriu.current)
          quemAbriu.current = null
        }}
        overlayClassName="motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none"
        className="max-h-[90dvh] overflow-y-auto rounded-t-lg border-estrelinha-line bg-estrelinha-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-estrelinha-ink motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none"
      >
        <Corpo {...p} />
      </SheetContent>
    </Sheet>
  )
}

export default FolhaColarTexto
