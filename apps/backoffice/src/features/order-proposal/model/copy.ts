// Os endereços e as frases das telas da proposta (feature 89). Um lugar só, para a página e o teste
// lerem a mesma frase.

export const PROPOSAL_PAGE_PATH = (id: string): string => `/admin/pedidos/montados/${id}`
export const PROPOSAL_EDIT_PATH = (id: string): string => `/admin/pedidos/montar/${id}`
export const PROPOSAL_DUPLICATE_PATH = (id: string): string => `/admin/pedidos/montar?duplicar=${encodeURIComponent(id)}`
export const PROPOSAL_BUILDER_PATH = '/admin/pedidos/montar'
export const PROPOSALS_LIST_PATH = '/admin/pedidos?visao=montados'

export const NOT_EDITABLE = 'Esta proposta não pode mais ser editada.'
export const VERSION_CONFLICT_TEXT = 'Esta proposta mudou em outra aba. Recarreguei.'
export const LINK_WITHOUT_STORE =
  'O link foi criado, mas a loja não está configurada neste painel para montá-lo. Gere um link novo depois de configurar a loja.'
export const ADDRESS_SAVE_FAILED =
  'A proposta foi gravada, mas não consegui salvar o endereço no cadastro da cliente.'

// LNK-01, LNK-05
export const NO_PHONE = 'Sem telefone — copie o link'
export const RENEW_WARNING = 'Renovar gera um link novo. O link antigo para de funcionar na hora.'
export const LINK_NOT_IN_MEMORY =
  'O link só aparece logo depois de criado ou renovado. Para mandar de novo, gere um link novo — o anterior para de funcionar.'
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
export const ORDER_ORIGIN_PREFIX = 'Montado pelo painel'
export const MANUAL_DISCOUNT_LABEL = 'Desconto combinado'

// LNK-04
export const PROPOSALS_EMPTY = 'Nenhum pedido montado ainda.'
export const PROPOSALS_READ_FAILED = 'Não consegui ler os pedidos montados.'
