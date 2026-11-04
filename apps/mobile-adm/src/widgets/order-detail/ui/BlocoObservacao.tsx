import type { ReactNode } from 'react'
import { adminNoteAuthorLine } from '@estrelinha/core/orders'
import type { Bloco, ObservacaoDoPedido } from '@/entities/order'
import { TENTAR_DE_NOVO } from '@/shared/ui/leitura'
import { BlocoDoDetalhe } from './BlocoDoDetalhe'

export const TITULO_DA_OBSERVACAO = 'Observação'
/** A falha é do bloco: "sem observação" nunca é a frase de "o banco não respondeu". */
export const FALHA_DA_OBSERVACAO = 'Não consegui ler a observação deste pedido.'

/**
 * O bloco "Observação" do detalhe do pedido — o texto que só quem administra lê. Só desenha: a frase de
 * autoria ("Atualizada em … às … por …", só a última edição) é `adminNoteAuthorLine` de `core`, a MESMA
 * do painel. A ação ("Adicionar observação"/"Editar") e a folha são de `features/order-actions`,
 * compostas pela página e passadas em `acao` — o bloco não decide o que elas fazem.
 *
 * - com observação: o texto (quebras de linha preservadas), a autoria e a ação;
 * - sem observação: só a ação;
 * - a leitura falhou: a frase própria e "Tentar de novo" (relê o detalhe inteiro); nenhuma ação, que
 *   abriria a folha vazia sobre um texto que talvez exista.
 */
const BlocoObservacao = ({
  observacao,
  acao,
  tentarDeNovo,
}: {
  observacao: Bloco<ObservacaoDoPedido | null>
  acao: ReactNode
  tentarDeNovo: () => void
}) => {
  if (observacao.estado === 'falhou') {
    return (
      <BlocoDoDetalhe id="observacao" titulo={TITULO_DA_OBSERVACAO}>
        <div className="space-y-3 py-2">
          <p className="text-sm text-estrelinha-ink-soft [overflow-wrap:anywhere]">{FALHA_DA_OBSERVACAO}</p>
          <button
            type="button"
            onClick={tentarDeNovo}
            className="min-h-12 rounded-sm border border-estrelinha-primary bg-estrelinha-surface px-4 text-sm font-medium text-estrelinha-primary"
          >
            {TENTAR_DE_NOVO}
          </button>
        </div>
      </BlocoDoDetalhe>
    )
  }
  const nota = (observacao as { estado: 'ok'; dado: ObservacaoDoPedido | null }).dado
  const autoria = adminNoteAuthorLine(nota)
  return (
    <BlocoDoDetalhe id="observacao" titulo={TITULO_DA_OBSERVACAO}>
      {nota && (
        <>
          <p data-parte="texto" className="whitespace-pre-wrap text-sm text-estrelinha-ink [overflow-wrap:anywhere]">
            {nota.note}
          </p>
          {autoria && (
            <p data-parte="autoria" className="mt-1.5 text-xs text-estrelinha-ink-soft [overflow-wrap:anywhere]">
              {autoria}
            </p>
          )}
        </>
      )}
      <div className={nota ? 'mt-1' : undefined}>{acao}</div>
    </BlocoDoDetalhe>
  )
}

export default BlocoObservacao
