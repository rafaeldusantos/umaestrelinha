/**
 * As classes dos campos e botões do app do ateliê, num lugar só: borda de campo é `field` (3,63:1,
 * WCAG 1.4.11), nunca `line`; ação é `rounded-sm`; todo alvo tem 48 px de altura.
 */
export const CAMPO =
  'h-12 rounded-md border border-estrelinha-field bg-estrelinha-surface px-3 text-base text-estrelinha-ink placeholder:text-estrelinha-ink-soft'

export const ROTULO = 'text-sm font-medium text-estrelinha-ink'

export const BOTAO_PRIMARIO =
  'h-12 w-full rounded-sm bg-estrelinha-primary text-base font-medium text-estrelinha-on-primary hover:bg-estrelinha-primary-strong'

export const BOTAO_SECUNDARIO =
  'min-h-12 w-full rounded-sm bg-transparent text-sm font-medium text-estrelinha-primary hover:bg-estrelinha-ground-deep'

export const AVISO_DE_ERRO =
  'rounded-md border border-estrelinha-alert/30 bg-estrelinha-alert-soft p-3 text-sm text-estrelinha-alert'
