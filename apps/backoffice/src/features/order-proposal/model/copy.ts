// Os endereços e as frases das telas da proposta (feature 89). Um lugar só, para a página e o teste
// lerem a mesma frase.

export const PROPOSAL_PAGE_PATH = (id: string): string => `/admin/pedidos/montados/${id}`
export const PROPOSAL_EDIT_PATH = (id: string): string => `/admin/pedidos/montar/${id}`
export const PROPOSAL_DUPLICATE_PATH = (id: string): string => `/admin/pedidos/montar?duplicar=${encodeURIComponent(id)}`
export const PROPOSAL_BUILDER_PATH = '/admin/pedidos/montar'
export const PROPOSALS_LIST_PATH = '/admin/pedidos/montados'

export const NOT_EDITABLE = 'Esta proposta não pode mais ser editada.'
export const VERSION_CONFLICT_TEXT = 'Esta proposta mudou em outra aba. Recarreguei.'
// A frase do link sem loja tem um dono em `core`, lida também pelo app do ateliê.
export { LINK_WITHOUT_STORE } from '@estrelinha/core/proposals'
// uma gravação só (a proposta e o endereço juntos). A falha não deixou nada gravado. O dono é
// `core`, lido também pelo app do ateliê.
export { PROPOSAL_SAVE_FAILED as SAVE_FAILED } from '@estrelinha/core/proposals'

// LNK-01, LNK-05
export const NO_PHONE = 'Sem telefone — copie o link'
export const RENEW_WARNING = 'Renovar gera um link novo. O link antigo para de funcionar na hora.'
// a proposta gravada sem a cifra do token (antes da chave, ou sem ela) não tem como mostrar o link.
export const LINK_UNAVAILABLE =
  'O link desta proposta não pode ser mostrado de novo. Gere um link novo — o anterior para de funcionar.'
// Cancelada ou concluída: o link não vale mais, e não há o que fazer com ele.
export const LINK_CLOSED = 'Link encerrado.'
// LNK-06
export const LINK_EXPIRED = 'Este link venceu. Renovar gera um link novo e trava os preços de hoje.'
// QA da 89: o que a região viva da página diz depois de renovar ou cancelar.
export const RENEWED_ANNOUNCE = 'Link novo gerado. O link antigo parou de funcionar.'
export const CANCELLED_ANNOUNCE = 'Proposta cancelada.'
export const CANCEL_CONFIRM = 'Cancelar esta proposta? O link passa a dizer que o pedido não está mais disponível.'

// HIS-01
export const PROPOSAL_EVENT_LABELS: Record<string, string> = {
  created: 'Criada',
  edited: 'Editada',
  link_sent: 'Link enviado',
  viewed: 'Vista pela cliente',
  renewed: 'Link renovado',
  cancelled: 'Cancelada',
  completed: 'Concluída',
}
export const PROPOSAL_CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'pelo WhatsApp',
  copy: 'link copiado',
}

// HIS-02
// uma origem só, a mesma do app do ateliê — o dono é `core`.
export { PROPOSAL_ORIGIN_LABEL as ORDER_ORIGIN_PREFIX } from '@estrelinha/core/proposals'
export const MANUAL_DISCOUNT_LABEL = 'Desconto combinado'

// LNK-04
export const PROPOSALS_EMPTY = 'Nenhum pedido montado ainda.'
export const PROPOSALS_READ_FAILED = 'Não consegui ler os pedidos montados.'
