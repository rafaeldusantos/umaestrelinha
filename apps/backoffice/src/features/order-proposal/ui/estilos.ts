// As classes da montagem do pedido (feature 89, ajuste de 2026-11-01 pelo protótipo
// `Pedido - Montar.html`). Num lugar só para os cinco cartões da tela não divergirem: o selo, o
// segmentado e o link de ação são o mesmo desenho em cada um.

/** Selo neutro (o "p-pending" do protótipo). */
export const SELO = 'inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground'
/** Selo verde (o "p-paid"): a ficha nova, a promoção. */
export const SELO_VERDE =
  'inline-flex items-center rounded-full bg-estrelinha-admin-emerald/10 px-2.5 py-0.5 text-xs font-medium text-estrelinha-admin-emerald'
/** Selo âmbar: "Pede material da cliente". */
export const SELO_AMBAR =
  'inline-flex items-center rounded-full bg-estrelinha-admin-amber/10 px-2.5 py-0.5 text-xs font-medium text-estrelinha-admin-amber'

/** Aviso âmbar dentro de um cartão (sem telefone, cotação que falhou, ficha que já existe). */
export const AVISO_AMBAR = 'rounded-lg bg-estrelinha-admin-amber/10 px-3 py-2 text-sm text-estrelinha-admin-amber'

/** O link de ação de um cartão ("Trocar", "Tirar") — texto na cor primária, alvo de 44px. */
export const LINK_ACAO =
  'inline-flex min-h-11 items-center rounded-md px-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline'

/** O par segmentado ("Já é cliente" | "Cliente nova", "R$" | "%"). */
export const SEGMENTADO = 'inline-flex max-w-full flex-wrap gap-1 rounded-xl bg-muted p-1'
export const SEGMENTO =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-3.5 text-sm font-medium [overflow-wrap:anywhere] transition-colors motion-reduce:transition-none'
export const SEGMENTO_LIGADO = 'bg-card text-primary shadow-sm'
export const SEGMENTO_DESLIGADO = 'text-muted-foreground hover:text-foreground'

/** O avatar com a inicial da cliente. */
export const AVATAR =
  'flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading font-bold text-primary'

/** A primeira letra do nome (ou do e-mail), maiúscula. */
export const inicial = (nome: string, email = ''): string => (nome.trim() || email.trim() || '?').charAt(0).toUpperCase()
