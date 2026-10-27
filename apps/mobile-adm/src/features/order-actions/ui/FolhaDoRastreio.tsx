import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@estrelinha/ui/sheet'
import { cn } from '@estrelinha/ui/lib/utils'
import { SAVING, normalizeMaterialTrackingCode, normalizeTrackingCode, trackingCodeRefusal } from '@estrelinha/core/orders'
import type { PedidoDaAcao } from '@estrelinha/core/order-actions'

import type { LinhaDaLista } from '@/entities/order'
import { useTecladoVirtual } from '@/shared/lib/useTecladoVirtual'
import { CAMPO, ROTULO } from '@/shared/ui/campo'

import { lerErro, type OrigemDoErro } from '../model/erros'
import { devolverFoco } from '../model/foco'
import type { AcaoDoPedido } from '../model/useAcaoDoPedido'
import type { CopiaDaFolha, FolhaNoHistorico, OrigemDaFolha } from '../model/useFolhaNoHistorico'
import AlertaDaAcao from './AlertaDaAcao'

export const ROTULO_DO_CAMPO = 'Código de rastreio'
export const AGORA_NAO = 'Agora não'
export const SALVAR = 'Salvar'
const PLACEHOLDER = 'Ex.: AN123456789BR'

/**
 * A folha do rastreio (feature `75`, `MAA-10`..`MAA-13`, `MAA-20`, `MAA-32`, `MAA-34`, A23; design
 * §3.6, §3.8, §3.9).
 *
 * Aberta pelo rodapé do detalhe, pelo botão do cartão e por "Informar/Alterar" da Entrega — quem abre
 * é o dono de `controle` (`useFolhaNoHistorico`), e a folha só desenha o que `trackingSheet` (`core`)
 * diz para aquele estado: título, frase e valor inicial. Nenhuma frase de regra mora aqui.
 *
 * - O campo normaliza ENQUANTO ela digita (`normalizeTrackingCode`: maiúsculas, sem espaços), e o
 *   código curto é recusado NO campo, sem ir à rede (`trackingCodeRefusal`, `MAA-12`). O do ENVELOPE
 *   usa a forma única do envelope (`normalizeMaterialTrackingCode`: também sem hífen e ponto — Fase 5
 *   da `82`, T19), ao digitar e ao salvar; a recusa do curto é julgada sobre ela.
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
 * - **Feature `82` (`ENV-05`, `ENV-07`, `ENV-12`)**: com `origem="material"` a mesma folha grava o
 *   código do envelope da CLIENTE. O rótulo e o placeholder vêm da cópia de `materialTrackingSheet`
 *   (`core`), e o pedido à porta é `{ tipo: 'rastreio-do-material' }` — a RPC `set_material_tracking`,
 *   nunca o `tracking_code` de saída. Todo o resto (foco, teclado, histórico, trava, fecha só no
 *   sucesso, menos movimento) é o mesmo — parametrizar, não duplicar.
 * - **Feature `82`, Fase 5 (T17)**: a folha desenha só o erro da ação DELA — a do envelope, o de
 *   `rastreio-do-material`; a do rastreio de saída, o de `rastreio`. Abrir a folha não mostra a falha
 *   de outra ação do mesmo pedido (`BUG-20261026-erro-de-uma-acao-aparece-em-outra`).
 * - **T16**: com retentativa no erro (a falha de rede do envelope), "Tentar de novo" reenvia o MESMO
 *   código pela ação do pedido e, no sucesso, fecha a folha (`BUG-20261026-rede-cai-ao-salvar-…`).
 */
/** De quem é o erro que cada folha desenha. */
const ERROS_DA_FOLHA: Record<'material' | 'saida', readonly OrigemDoErro[]> = {
  material: ['rastreio-do-material'],
  saida: ['rastreio'],
}
export interface FolhaDoRastreioProps {
  row: LinhaDaLista
  origem: OrigemDaFolha
  controle: FolhaNoHistorico<CopiaDaFolha>
  acao: AcaoDoPedido
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

  // Cada ABERTURA começa do valor que a cópia de `core` dá para o estado de agora — só na abertura.
  // Feature `82` (Edge Cases): a releitura (realtime) com a folha aberta e a linha ainda editável não
  // apaga o que ela digitou, mesmo que o código salvo tenha mudado no banco (a cliente o informou pela
  // loja). Achado pelo teste da `82`: com `valorInicial` na dependência, o campo voltava ao do banco.
  const valorDaAbertura = useRef(valorInicial)
  valorDaAbertura.current = valorInicial
  useEffect(() => {
    if (!aberta) return
    setValor(valorDaAbertura.current)
    setRecusa(null)
  }, [aberta])

  if (!folha) return null
  const normalizar = origem === 'material' ? normalizeMaterialTrackingCode : normalizeTrackingCode
  const erro = acao.erroDe(ERROS_DA_FOLHA[origem === 'material' ? 'material' : 'saida'])
  const rotulo = 'rotulo' in folha ? folha.rotulo : ROTULO_DO_CAMPO
  const placeholder = 'placeholder' in folha ? folha.placeholder : PLACEHOLDER

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    if (acao.travado) return
    // T19: o código do envelope é julgado e enviado na forma única — o valor inicial vem do banco e
    // pode ter sido gravado com hífen antes do conserto.
    const codigoDoEnvelope = origem === 'material' ? normalizar(valor) : valor
    const motivo = trackingCodeRefusal(codigoDoEnvelope)
    if (motivo) {
      setRecusa(motivo)
      campo.current?.focus()
      return
    }
    setRecusa(null)
    const pedido: PedidoDaAcao =
      origem === 'material' ? { tipo: 'rastreio-do-material', codigo: codigoDoEnvelope } : { tipo: 'rastreio', codigo: valor, origem }
    const ok = await acao.executar(row, pedido, { aoConcluir: fechar })
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
              {rotulo}
            </label>
            <input
              ref={campo}
              id={idDoCampo}
              value={valor}
              onChange={(ev) => {
                setValor(normalizar(ev.target.value))
                if (recusa) setRecusa(null)
              }}
              placeholder={placeholder}
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

          {erro && !acao.travado && (
            <AlertaDaAcao
              erro={erro}
              aoTentarDeNovo={(retentativa) => {
                if (!acao.travado) void acao.executar(row, retentativa, { aoConcluir: fechar })
              }}
            />
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
