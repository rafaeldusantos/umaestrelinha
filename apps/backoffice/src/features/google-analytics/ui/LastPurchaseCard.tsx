// Feature 61 · `ANL-10`/`ANL-11` — "as compras estão chegando ao Google?".
//
// O cartão responde a pergunta pela última compra que **saiu** — número, quando, valor — e diz,
// quando houver, quantas compras aprovadas nos últimos 30 dias ficaram de fora e por quê. Recusa da
// cliente e falha no envio são contadas separado: a primeira é escolha dela e não pede ação; a
// segunda é defeito e pede.
//
// Três regras de leitura, e cada uma existe porque a alternativa engana:
//
// - **sem envio nenhum ⇒ "Nenhuma compra enviada ainda"**, nunca um zero: "0" ao lado de "Última
//   compra enviada" parece número quebrado (`ANL-11`);
// - **erro de leitura ⇒ a falha é desta tela**, nunca "nenhuma compra": a segunda frase faria a
//   dona achar que a integração parou;
// - **"enviado ao Google", nunca "aceito"**: o servidor sabe que enviou; se o Google contou, só o
//   DebugView diz.

import { formatOrderNumber } from '@estrelinha/core/orders'
import { formatPrice } from '@estrelinha/core/formatters'
import { InfoBanner } from '@/shared/ui'
import { useLastPurchaseSend } from '../model/useLastPurchaseSend'
import { declinedSentence, failedSentence, formatSentAt } from '../model/copy'

const LastPurchaseCard = () => {
  const { data, isLoading, isError } = useLastPurchaseSend()

  return (
    <section
      aria-labelledby="ga-ultima-compra"
      className="space-y-3.5 rounded-2xl border border-border bg-card p-5"
      data-testid="analytics-last-send"
    >
      <h2
        id="ga-ultima-compra"
        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        Última compra enviada
      </h2>

      {isLoading && <p className="text-sm text-muted-foreground">Conferindo os envios…</p>}

      {isError && (
        <p className="text-sm text-destructive" role="alert">
          Não foi possível ler os envios agora. Isto é uma falha desta tela — não diz nada sobre as
          compras.
        </p>
      )}

      {data && (
        <>
          {data.last ? (
            <div className="space-y-1">
              <p className="text-lg font-semibold text-foreground">
                Pedido {formatOrderNumber(data.last.order_number)}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatSentAt(data.last.ga_purchase_at)} · {formatPrice(data.last.total)} · enviado
                ao Google
              </p>
            </div>
          ) : (
            <p className="text-sm text-foreground">Nenhuma compra enviada ainda</p>
          )}

          {data.declined > 0 && (
            <InfoBanner data-testid="analytics-declined-count">
              {declinedSentence(data.declined)}
            </InfoBanner>
          )}
          {data.failed > 0 && (
            <InfoBanner data-testid="analytics-failed-count">{failedSentence(data.failed)}</InfoBanner>
          )}
        </>
      )}
    </section>
  )
}

export default LastPurchaseCard
