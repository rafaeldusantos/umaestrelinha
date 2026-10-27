import { useEffect } from 'react'
import { SAVING, appPrimaryAction } from '@estrelinha/core/orders'

import { nomeDaLinha, type LinhaDaLista } from '@/entities/order'
import { TENTAR_DE_NOVO } from '@/shared/ui/leitura'

import { ERROS_DO_RODAPE } from '../model/erros'
import { useAcaoDoPedido } from '../model/useAcaoDoPedido'
import { useFolhaNoHistorico } from '../model/useFolhaNoHistorico'
import FolhaDoRastreio from './FolhaDoRastreio'

/**
 * A ação no cartão da lista (feature `75`, `MAA-16`, `MAA-20`, `MAA-36`, `MAA-37`, A13, A14b, Q5;
 * design §3.6).
 *
 * - **Irmão** da linha (o `<Link>`), nunca dentro dela: botão dentro de link é interativo aninhado
 *   (Q5). Em fluxo normal, abaixo do conteúdo do cartão — nunca `absolute` sobre ele. Tocar no botão
 *   não navega; o resto do cartão continua abrindo o detalhe.
 * - **O mesmo rótulo e o mesmo plano do rodapé** (`appPrimaryAction`, `core`): cancelado e entregue
 *   sem botão, retirada em separação com "Marcar como retirado". O rastreio abre a MESMA folha.
 * - **A mesma trava** do detalhe (`useAcaoDoPedido`, em módulo): com o cartão e o rodapé montados,
 *   uma escrita só. O erro do pedido (`role="alert"`) fica no cartão até a próxima ação.
 * - **A recusa** (`erroBruto`) sobe à página por `aoRecusa` (R11): a vigia da recusa é dela.
 * - Depois de gravar, a lista é relida (as chaves de A21): o pedido que saiu do recorte sai da lista.
 * - **O nome diz QUAL pedido** (C04, `MAA-36`): o rótulo visível primeiro (o rótulo dentro do nome) e
 *   depois `nomeDaLinha` — o mesmo dono do nome do link. Sem ele, o recorte "Aguardando material" são
 *   vinte botões "Recebi o material" idênticos para quem navega por botões no leitor de tela.
 */
export interface BotaoDaAcaoProps {
  linha: LinhaDaLista
  aoRecusa?: (erro: unknown) => void
}

const BotaoDaAcao = ({ linha, aoRecusa }: BotaoDaAcaoProps) => {
  const primaria = appPrimaryAction(linha)
  const acao = useAcaoDoPedido(linha.id)
  const controle = useFolhaNoHistorico(linha, 'acao')
  // O cartão oferece as mesmas ações do rodapé: só o erro delas (feature `82`, T17).
  const erro = acao.travado ? null : acao.erroDe(ERROS_DO_RODAPE)

  useEffect(() => {
    if (acao.erroBruto) aoRecusa?.(acao.erroBruto)
  }, [acao.erroBruto, aoRecusa])

  if (primaria.action === 'nenhuma' && !erro) return null

  const tocar = () => {
    if (acao.travado) return
    if (primaria.plano.tipo === 'folha') controle.abrir()
    else void acao.executar(linha, { tipo: 'primaria' })
  }
  const retentativa = erro?.retentativa ?? null
  const texto = acao.travado ? SAVING : primaria.label

  return (
    <div data-testid="acao-do-cartao" className="space-y-2">
      {erro && (
        <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-estrelinha-alert [overflow-wrap:anywhere]">
          <p className="min-w-0 flex-1">{erro.frase}</p>
          {retentativa && (
            <button
              type="button"
              onClick={() => {
                if (!acao.travado) void acao.executar(linha, retentativa)
              }}
              className="min-h-11 font-medium underline underline-offset-4"
            >
              {TENTAR_DE_NOVO}
            </button>
          )}
        </div>
      )}
      {primaria.action !== 'nenhuma' && (
        <button
          type="button"
          onClick={tocar}
          aria-disabled={acao.travado ? 'true' : undefined}
          aria-label={`${texto}, ${nomeDaLinha(linha)}`}
          data-acao={primaria.action}
          className="min-h-11 w-full rounded-sm bg-estrelinha-primary px-4 py-2 text-sm font-medium text-estrelinha-on-primary hover:bg-estrelinha-primary-strong aria-disabled:opacity-70 [overflow-wrap:anywhere]"
        >
          {texto}
        </button>
      )}
      <FolhaDoRastreio row={linha} origem="acao" controle={controle} acao={acao} />
    </div>
  )
}

export default BotaoDaAcao
