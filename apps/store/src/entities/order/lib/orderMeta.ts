// "2 out 2026 · 1 peça" — a linha de identificação de um pedido (feature 59, `DET-01`, `LST-02`).
//
// Dois leitores no mesmo app — o cabeçalho do detalhe (`/pedido/:id`) e a lista da conta —, então
// a regra mora na camada estritamente abaixo dos dois (`AD-033`). A data é composta das partes de
// `core` (`formatShortDate` + `calendarParts`), nunca de um segundo formatador: o dia e o mês saem
// iguais aos do selo e da linha do tempo.
import { calendarParts, formatShortDate } from '@estrelinha/core/orders'

/** A soma das quantidades — duas unidades da mesma peça são duas peças. */
export const piecesCount = (items: readonly { quantity?: number | null }[] | null | undefined): number =>
  (items ?? []).reduce((total, item) => total + (Number(item?.quantity) || 0), 0)

/** "1 peça" / "2 peças". */
export const piecesLabel = (items: readonly { quantity?: number | null }[] | null | undefined): string => {
  const n = piecesCount(items)
  return `${n} ${n === 1 ? 'peça' : 'peças'}`
}

/** "2 out 2026" — dia, mês abreviado e ano, no fuso da loja. `null` quando a data é ilegível. */
export const orderDateLabel = (valor: string | null | undefined): string | null => {
  const curta = formatShortDate(valor)
  const partes = calendarParts(valor)
  if (!curta || !partes) return null
  return `${curta} ${partes.year}`
}

const PRAZO = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  timeZone: 'America/Sao_Paulo',
})

/**
 * "11 de outubro" — o "até …" do PIX novo (`repixDeadline`), no detalhe e na conta. Mês por extenso
 * porque é prazo, não carimbo; fuso da loja, não do aparelho. `null` quando não há data legível.
 */
export const deadlineLabel = (prazo: Date | null | undefined): string | null => {
  if (!prazo || Number.isNaN(prazo.getTime())) return null
  return PRAZO.format(prazo)
}

/**
 * O subtítulo caloroso do detalhe (`DET-01`, decisão do usuário em 2026-10-04): a mesma página é a
 * confirmação logo depois de pagar **e** o lugar aonde a cliente volta meses depois. "É nosso!" num
 * pedido entregue em agosto se lê como erro, então a frase só aparece enquanto ela é verdade.
 *
 * - `'pago'` → "É nosso!": pago e ainda no ateliê.
 * - `'registrado'` → "Pedido registrado": o pagamento ainda não caiu.
 * - `null` → sem subtítulo: enviado, entregue, cancelado, reembolsado, ou PIX expirado/recusado —
 *   a situação e o estado do topo já dizem tudo.
 *
 * "Pago" é `paid_at`, e não `payment_status`, pelo mesmo motivo do `STO-01`: a frase de e-mail ao
 * lado decide por `paid_at`, e as duas falam do mesmo instante. Decidir por colunas diferentes faria
 * a página dizer "É nosso!" acima de "Estamos aguardando a confirmação do pagamento".
 *
 * As chaves são `pago`/`registrado`, e não o vocabulário de `orders.status`: este mapa NÃO é uma
 * tabela de rótulos de status (`situacaoComDonoUnico.test.ts` recusaria, e com razão).
 */
export type ConfirmationHeadline = 'pago' | 'registrado'

export const confirmationHeadline = (o: {
  status?: string | null
  payment_status?: string | null
  paid_at?: string | null
}): ConfirmationHeadline | null => {
  if (o.status === 'cancelled' || o.status === 'shipped' || o.status === 'delivered') return null
  if (o.payment_status === 'refunded') return null
  // PIX expirado ou pagamento recusado: "aguardando a confirmação" prometeria algo que não vem —
  // quem fala é o estado do topo ("O código PIX expirou"). Achado da prova em navegador da `59`.
  if (o.payment_status === 'expired' || o.payment_status === 'rejected') return null
  return o.paid_at ? 'pago' : 'registrado'
}

/** O literal de cada subtítulo — um lugar só, lido pela página e pelos testes. */
export const CONFIRMATION_HEADLINES: Record<ConfirmationHeadline, string> = {
  pago: 'É nosso!',
  registrado: 'Pedido registrado',
}
