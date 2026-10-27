import { cn } from '@estrelinha/ui/lib/utils'
import { canStartProduction } from '@estrelinha/core/material'
import { SAVING } from '@estrelinha/core/orders'

import type { PedidoDoDetalhe } from '@/entities/order'
import { BOTAO_SECUNDARIO } from '@/shared/ui/campo'

import { devolverFoco } from '../model/foco'
import type { AcaoDoPedido } from '../model/useAcaoDoPedido'
import AlertaDaAcao from './AlertaDaAcao'

export const COLOCAR_EM_PRODUCAO = 'Colocar em produção'

/**
 * "Colocar em produção" no fim do bloco Material (feature `82`, `ENV-25`, A10).
 *
 * Quem diz SE aparece é `canStartProduction` (`core`): só com o envelope na bancada
 * (`material_recebido`) e o pedido não cancelado — a MESMA função que guarda `runAppAction`. Grava SÓ
 * o material (`{ tipo: 'producao' }` ⇒ `set_material_status` para `em_producao`); o status do pedido
 * continua com "Iniciar separação" no rodapé. A ação é a do pedido (`acao`): a mesma trava, o mesmo
 * aviso ("Pedido em produção.", de `actionConfirmation`) e o mesmo erro do pedido — que aparece JUNTO
 * DO BOTÃO (`role="alert"`), e não mais no rodapé, em cima de "Iniciar separação" (feature `82`, Fase 5,
 * T17, `BUG-20261026-erro-de-uma-acao-aparece-em-outra`). Se o pedido mudou e o botão saiu, a frase fica
 * sozinha no lugar dele até a próxima ação (o molde do rodapé sem ação, `MAA-35`).
 *
 * No sucesso o botão sai da tela (o material foi a `em_producao`), e o foco vai ao título da página —
 * sem isso ele caía no `<body>` (prova em navegador da `82`, T15). Na recusa e na falha o botão fica, e
 * o foco com ele.
 */
export interface ColocarEmProducaoProps {
  pedido: PedidoDoDetalhe
  acao: AcaoDoPedido
}

const ColocarEmProducao = ({ pedido, acao }: ColocarEmProducaoProps) => {
  const erro = acao.travado ? null : acao.erroDe(['producao'])
  const podeComecar = canStartProduction(pedido)
  if (!podeComecar && !erro) return null
  const alerta = erro && (
    <AlertaDaAcao
      className={podeComecar ? 'mt-2' : 'mt-3.5'}
      erro={erro}
      aoTentarDeNovo={(retentativa) => {
        if (!acao.travado) void acao.executar(pedido, retentativa)
      }}
    />
  )
  if (!podeComecar) return alerta
  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!acao.travado) void acao.executar(pedido, { tipo: 'producao' }, { aoConcluir: () => devolverFoco(null) })
        }}
        aria-disabled={acao.travado ? 'true' : undefined}
        data-testid="colocar-em-producao"
        className={cn(
          BOTAO_SECUNDARIO,
          'mt-3.5 flex min-h-11 items-center justify-center border border-estrelinha-primary px-4 py-2 text-center aria-disabled:opacity-70 [overflow-wrap:anywhere]',
        )}
      >
        {acao.travado ? SAVING : COLOCAR_EM_PRODUCAO}
      </button>
      {alerta}
    </>
  )
}

export default ColocarEmProducao
