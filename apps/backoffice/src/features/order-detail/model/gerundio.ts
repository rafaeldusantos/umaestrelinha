// Feature `88` · `CRG-01` — o rótulo no gerúndio de cada mudança de status, mostrado NO botão enquanto
// a gravação corre ("Marcando como enviado…"). Um lugar só: o botão do Próximo passo e o diálogo de
// aviso da página dizem a mesma frase, e duas escritas divergiriam sem nada quebrar.

const GERUNDIO_DO_STATUS: Record<string, string> = {
  pending: 'Mudando o status…',
  paid: 'Mudando para Pago…',
  separating: 'Iniciando separação…',
  shipped: 'Marcando como enviado…',
  delivered: 'Marcando como entregue…',
  cancelled: 'Cancelando…',
}

/** `retirada`: o pedido de retirada no escritório "entregue" é retirado (feature `63`). */
export const gerundioDoStatus = (status: string, retirada = false): string =>
  retirada && status === 'delivered' ? 'Marcando como retirado…' : (GERUNDIO_DO_STATUS[status] ?? 'Mudando o status…')
