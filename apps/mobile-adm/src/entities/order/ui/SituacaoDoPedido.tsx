import { orderSituation, type SituationInput, type SituationTone } from '@estrelinha/core/orders'

/**
 * O selo da situação do pedido no app do ateliê (feature `73`, `MAI-14`).
 *
 * **Não decide nada**: o rótulo e o tom são de `orderSituation` (`@estrelinha/core/orders`), o mesmo
 * dono da loja (`situacaoComDonoUnico`), pedido com o público `'atelie'`: a mesma chave e o mesmo
 * tom da loja, na voz de quem administra — "Aguardando material" e "Material a caminho", nunca o
 * "seu material" da cliente (`BUG-20261022-situacao-fala-com-a-cliente-no-atelie`).
 * Aqui mora só a APRESENTAÇÃO do tom, e ela é a da loja
 * (`apps/store/src/entities/order/ui/OrderSituationBadge.tsx`, a "Régua dos selos"), com uma
 * diferença: o ponto usa os tokens de texto do tom (`alert`, `done`) em vez dos dois hex que a loja
 * escreve à mão — o app não declara cor fora da paleta.
 */
const PILULA: Record<SituationTone, string> = {
  wait: 'bg-estrelinha-wait-soft text-estrelinha-wait',
  alert: 'bg-estrelinha-alert-soft text-estrelinha-alert',
  done: 'bg-estrelinha-done-soft text-estrelinha-done',
  progress: 'bg-estrelinha-serenity text-estrelinha-primary-strong',
  neutral: 'bg-estrelinha-ground-deep text-estrelinha-ink',
}

const PONTO: Record<SituationTone, string> = {
  wait: 'bg-estrelinha-accent',
  alert: 'bg-estrelinha-alert',
  done: 'bg-estrelinha-done',
  progress: 'bg-estrelinha-primary',
  neutral: 'bg-estrelinha-ink-soft',
}

/**
 * **O rótulo nunca é cortado** (`BUG-20261023-ultimos-pedidos-estoura-com-fonte-maxima`). Na fonte
 * padrão ele cabe numa linha — a linha de Últimos pedidos quebra ANTES de o selo apertar. Com a
 * fonte do sistema a 165 %+ numa tela de 360, a pílula sozinha já é mais larga que a linha: aí o
 * texto desce para uma segunda linha dentro dela, em vez de virar "Aguardando pag…". Perder a
 * situação é pior que uma pílula mais alta, e só acontece nessa escala.
 */
const SituacaoDoPedido = ({ pedido }: { pedido: SituationInput }) => {
  const { key, label, tone } = orderSituation(pedido, 'atelie')
  return (
    <span
      data-situation={key}
      data-tone={tone}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-pill px-2.5 py-[3px] text-xs font-medium leading-4 ${PILULA[tone]}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${PONTO[tone]}`} />
      <span className="min-w-0">{label}</span>
    </span>
  )
}

export default SituacaoDoPedido
