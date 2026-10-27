import { useEffect, useRef } from 'react'
import { cn } from '@estrelinha/ui/lib/utils'
import { SAVING, appPrimaryAction } from '@estrelinha/core/orders'

import type { PedidoDoDetalhe } from '@/entities/order'
import { RESERVA_DO_RODAPE, RODAPE_NO_FIM } from '@/shared/ui/alturas'
import { AVISO_DE_ERRO } from '@/shared/ui/campo'
import { TENTAR_DE_NOVO } from '@/shared/ui/leitura'

import { publicarAlturaDoRodape, registrarRodape } from '../model/rodape'
import type { AcaoDoPedido } from '../model/useAcaoDoPedido'
import { useFolhaNoHistorico } from '../model/useFolhaNoHistorico'
import FolhaDoRastreio from './FolhaDoRastreio'

/**
 * O rodapé da ação no detalhe do pedido (feature `75`, `MAA-01`..`MAA-09`, `MAA-13`, `MAA-15`,
 * `MAA-16`, `MAA-20`..`MAA-26`, `MAA-31`, `MAA-35`, `MAA-38`, `MAA-40`; design §3.6).
 *
 * - **O rótulo e o plano são de `appPrimaryAction`** (`core`): o app não decide a ação de status
 *   nenhum (`regraDePedidoSoNoCore`). `nenhuma` (cancelado, entregue, `pending`, `shipped` com código)
 *   ⇒ sem botão. O plano `folha` abre a folha do rastreio; os outros vão à porta pela ação do pedido.
 * - **A ação vem da PÁGINA** (`acao`, `useAcaoDoPedido`): a página passa o `erroBruto` dela à vigia da
 *   recusa (`useRecusaDePapel`), e o rodapé, a folha e "Informar/Alterar" usam a mesma instância.
 * - **"Salvando…"** com `aria-disabled` enquanto a ação está no ar (`MAA-20`); o erro do pedido
 *   (`role="alert"`) logo acima do botão, e ele FICA até a próxima ação (`MAA-35`). Com retentativa
 *   (`PARTIAL_MATERIAL`, `PARTIAL_TRACKING`), "Tentar de novo" reenvia o que o hook guardou, sobre a
 *   linha RELIDA — sem reabrir a folha (`MAA-15` a, `MAA-40`). Os três estados são exclusivos: no
 *   ar não há erro; a confirmação é do host único do layout, e o sucesso limpa o erro.
 * - Sem ação mas COM erro (o pedido mudou e agora não oferece nada), o rodapé fica com a frase.
 * - **Fixo acima da barra de abas**, largura inteira, botão de `min-h-12`; a reserva no fim do
 *   conteúdo tem a MESMA altura (a medida, publicada na variável CSS, `shared/ui/alturas`), para o
 *   rodapé não cobrir o Histórico (`MAA-31`).
 */
export interface RodapeDaAcaoProps {
  pedido: PedidoDoDetalhe
  acao: AcaoDoPedido
}

const RodapeDaAcao = ({ pedido, acao }: RodapeDaAcaoProps) => {
  const primaria = appPrimaryAction(pedido)
  const controle = useFolhaNoHistorico(pedido, 'acao')
  const temBotao = primaria.action !== 'nenhuma'
  const erro = acao.travado ? null : acao.erro
  const montado = temBotao || !!erro
  const caixa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!montado) return
    return registrarRodape()
  }, [montado])

  useEffect(() => {
    const el = caixa.current
    if (!montado || !el) return
    publicarAlturaDoRodape(el.getBoundingClientRect().height)
    if (typeof ResizeObserver === 'undefined') return
    const observador = new ResizeObserver(() => publicarAlturaDoRodape(el.getBoundingClientRect().height))
    observador.observe(el)
    return () => observador.disconnect()
  }, [montado])

  if (!montado) return null

  const tocar = () => {
    if (acao.travado) return
    if (primaria.plano.tipo === 'folha') controle.abrir()
    else void acao.executar(pedido, { tipo: 'primaria' })
  }
  const retentativa = erro?.retentativa ?? null

  return (
    <>
      <div data-testid="reserva-do-rodape" aria-hidden="true" className={cn(RESERVA_DO_RODAPE, 'shrink-0')} />
      <div
        ref={caixa}
        data-testid="rodape-da-acao"
        className={cn(
          'fixed inset-x-0 z-30 bg-estrelinha-surface px-4 pt-3 shadow-[0_-1px_0_0_theme(colors.estrelinha.line)]',
          RODAPE_NO_FIM,
        )}
      >
        <div className="mx-auto max-w-lg space-y-2">
          {erro && (
            <div role="alert" className={cn(AVISO_DE_ERRO, 'flex flex-wrap items-center gap-x-3 gap-y-1 [overflow-wrap:anywhere]')}>
              <p className="min-w-0 flex-1">{erro.frase}</p>
              {retentativa && (
                <button
                  type="button"
                  onClick={() => {
                    if (!acao.travado) void acao.executar(pedido, retentativa)
                  }}
                  className="min-h-11 font-medium underline underline-offset-4"
                >
                  {TENTAR_DE_NOVO}
                </button>
              )}
            </div>
          )}
          {temBotao && (
            <button
              type="button"
              onClick={tocar}
              aria-disabled={acao.travado ? 'true' : undefined}
              data-acao={primaria.action}
              className="min-h-12 w-full rounded-sm bg-estrelinha-primary px-4 py-2 text-base font-medium text-estrelinha-on-primary hover:bg-estrelinha-primary-strong aria-disabled:opacity-70 [overflow-wrap:anywhere]"
            >
              {acao.travado ? SAVING : primaria.label}
            </button>
          )}
        </div>
      </div>
      <FolhaDoRastreio row={pedido} origem="acao" controle={controle} acao={acao} />
    </>
  )
}

export default RodapeDaAcao
