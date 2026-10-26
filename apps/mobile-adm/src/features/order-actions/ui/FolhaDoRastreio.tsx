import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@estrelinha/ui/sheet'
import { cn } from '@estrelinha/ui/lib/utils'
import { SAVING, normalizeTrackingCode, trackingCodeRefusal, type TrackingSheetOrigin } from '@estrelinha/core/orders'

import type { LinhaDaLista } from '@/entities/order'
import { useTecladoVirtual } from '@/shared/lib/useTecladoVirtual'
import { AVISO_DE_ERRO, CAMPO, ROTULO } from '@/shared/ui/campo'

import { lerErro } from '../model/erros'
import type { AcaoDoPedido } from '../model/useAcaoDoPedido'
import type { FolhaNoHistorico } from '../model/useFolhaNoHistorico'

export const ROTULO_DO_CAMPO = 'Código de rastreio'
export const AGORA_NAO = 'Agora não'
export const SALVAR = 'Salvar'

/**
 * A folha do rastreio (feature `75`, `MAA-10`..`MAA-13`, `MAA-20`, `MAA-32`, `MAA-34`, A23; design
 * §3.6, §3.8, §3.9).
 *
 * Aberta pelo rodapé do detalhe, pelo botão do cartão e por "Informar/Alterar" da Entrega — quem abre
 * é o dono de `controle` (`useFolhaNoHistorico`), e a folha só desenha o que `trackingSheet` (`core`)
 * diz para aquele estado: título, frase e valor inicial. Nenhuma frase de regra mora aqui.
 *
 * - O campo normaliza ENQUANTO ela digita (`normalizeTrackingCode`: maiúsculas, sem espaços), e o
 *   código curto é recusado NO campo, sem ir à rede (`trackingCodeRefusal`, `MAA-12`).
 * - "Salvar" vai à porta pela ação do pedido (`acao.executar`, a MESMA trava do rodapé e do cartão);
 *   no ar, "Salvando…" com `aria-disabled` (o botão continua focável).
 * - **Fecha só depois do sucesso** (`MAA-13`) — e fecha no `aoConcluir`, ANTES de a releitura chegar:
 *   o pedido relido em `shipped` não oferece mais esta folha, e a folha ainda aberta leria isso como
 *   "o pedido mudou com a folha aberta" (`MAA-26`).
 * - Com falha, a folha fica, com o erro do pedido (`role="alert"`) e "Salvar" de volta.
 *   SPEC_DEVIATION (precisão — o design não diz): a PARCIAL do rastreio (o código gravou, o status não)
 *   também fecha a folha. O código já está salvo, e o "Tentar de novo" de `MAA-15` (a) é do rodapé —
 *   "a folha não aparece no DOM" depois dele; mantê-la aberta pediria à Adri que salvasse de novo o
 *   que já gravou.
 * - `hideClose`: o X do canto tem 16 px. Fecham "Agora não", o fundo, o Escape e o voltar do Android
 *   (a entrada do histórico, `useFolhaNoHistorico`); enquanto salva, nada fecha.
 * - Sobe a altura do teclado virtual (`useTecladoVirtual`): no Chrome Android o teclado sobrepõe o
 *   conteúdo `fixed`, e o campo ficaria por baixo dele.
 * - **O foco volta a quem abriu** (`BUG-20261024-folha-fecha-e-foco-cai-no-body`, C03). A folha é um
 *   `<Sheet>` controlado, sem `SheetTrigger`: o Radix só devolve o foco ao gatilho que ele conhece, e
 *   sem gatilho deixava o foco no `<body>` (o leitor de tela recomeçava do topo). Quem abriu é lido em
 *   `onOpenAutoFocus` — o Radix o chama ANTES de mover o foco, então `document.activeElement` ainda é o
 *   controle de origem — e `onCloseAutoFocus` o devolve, por qualquer caminho de fechar. Se ele saiu da
 *   tela (o rodapé some quando o envio é salvo), o ponto estável é o título da página (`main h1`).
 *   `preventScroll`: devolver o foco não rola a página.
 * - Menos movimento: o `SheetContent` anima por `data-[state=…]:animate-…`, e só o par NO MESMO
 *   seletor desliga — `motion-reduce:animate-none` puro perde em especificidade (R2).
 */
export interface FolhaDoRastreioProps {
  row: LinhaDaLista
  origem: TrackingSheetOrigin
  controle: FolhaNoHistorico
  acao: AcaoDoPedido
}

/** O título da página (`main h1`), focável por script sem entrar na ordem do Tab. */
const tituloDaPagina = (): HTMLElement | null => {
  const h1 = document.querySelector<HTMLElement>('main h1')
  if (h1 && !h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1')
  return h1
}

/** Devolve o foco a quem abriu a folha; se ele saiu da tela, ao título da página. */
const devolverFoco = (origem: HTMLElement | null) => {
  const alvo = origem && origem.isConnected ? origem : tituloDaPagina()
  alvo?.focus({ preventScroll: true })
}

const FolhaDoRastreio = ({ row, origem, controle, acao }: FolhaDoRastreioProps) => {
  const { folha, aberta, fechar } = controle
  const teclado = useTecladoVirtual()
  const [valor, setValor] = useState('')
  const [recusa, setRecusa] = useState<string | null>(null)
  const campo = useRef<HTMLInputElement>(null)
  /** O controle que tinha o foco quando a folha abriu. */
  const quemAbriu = useRef<HTMLElement | null>(null)
  const idDoCampo = useId()
  const idDaRecusa = useId()
  const valorInicial = folha?.valorInicial ?? ''

  // Cada abertura começa do valor que `trackingSheet` dá para o estado de AGORA.
  useEffect(() => {
    if (!aberta) return
    setValor(valorInicial)
    setRecusa(null)
  }, [aberta, valorInicial])

  if (!folha) return null

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    if (acao.travado) return
    const motivo = trackingCodeRefusal(valor)
    if (motivo) {
      setRecusa(motivo)
      campo.current?.focus()
      return
    }
    setRecusa(null)
    const ok = await acao.executar(row, { tipo: 'rastreio', codigo: valor, origem }, { aoConcluir: fechar })
    if (!ok && lerErro(row.id)?.retentativa?.tipo === 'rastreio') fechar()
  }

  return (
    <Sheet
      open={aberta}
      onOpenChange={(abrir) => {
        if (!abrir && !acao.travado) fechar()
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
            <SheetTitle className="font-display text-lg text-estrelinha-ink [overflow-wrap:anywhere]">{folha.titulo}</SheetTitle>
            <SheetDescription className="text-sm text-estrelinha-ink-soft [overflow-wrap:anywhere]">{folha.frase}</SheetDescription>
          </div>

          <div className="space-y-1.5">
            <label htmlFor={idDoCampo} className={ROTULO}>
              {ROTULO_DO_CAMPO}
            </label>
            <input
              ref={campo}
              id={idDoCampo}
              value={valor}
              onChange={(ev) => {
                setValor(normalizeTrackingCode(ev.target.value))
                if (recusa) setRecusa(null)
              }}
              placeholder="Ex.: AN123456789BR"
              autoCapitalize="characters"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={recusa ? 'true' : undefined}
              aria-describedby={recusa ? idDaRecusa : undefined}
              className={cn(CAMPO, 'w-full', recusa && 'border-estrelinha-alert')}
            />
            {recusa && (
              <p id={idDaRecusa} className="text-sm text-estrelinha-alert [overflow-wrap:anywhere]">
                {recusa}
              </p>
            )}
          </div>

          {acao.erro && !acao.travado && (
            <p role="alert" className={cn(AVISO_DE_ERRO, '[overflow-wrap:anywhere]')}>
              {acao.erro.frase}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 min-[360px]:flex-row">
            <button
              type="button"
              onClick={() => {
                if (!acao.travado) fechar()
              }}
              className="min-h-12 flex-1 rounded-sm px-4 text-base font-medium text-estrelinha-primary hover:bg-estrelinha-ground-deep"
            >
              {AGORA_NAO}
            </button>
            <button
              type="submit"
              aria-disabled={acao.travado ? 'true' : undefined}
              className="min-h-12 flex-1 rounded-sm bg-estrelinha-primary px-4 text-base font-medium text-estrelinha-on-primary hover:bg-estrelinha-primary-strong aria-disabled:opacity-70"
            >
              {acao.travado ? SAVING : SALVAR}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

export default FolhaDoRastreio
