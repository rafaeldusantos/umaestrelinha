// Campanhas de desconto — a forma mínima que as regras de `core` leem.
//
// Folha: sem import. As colunas são as da tabela `campaigns` (os tipos completos moram em
// `@estrelinha/supabase/types/campaign`, que este pacote não importa para continuar alcançável pelo
// Deno).

/**
 * A vigência de uma campanha. `ends_at` é EXCLUSIVO: a campanha vale de `starts_at` (inclusive) até
 * o instante anterior a `ends_at`. O painel mostra o último minuto que vale (`lastMinuteOf`).
 */
export interface CampaignWindow {
  starts_at: string
  ends_at: string
  active: boolean
}

export interface CampaignIdentity extends CampaignWindow {
  id: string
  name: string
}

/** Instante aceito pelas regras: ISO, `Date` ou milissegundos. */
export type Instant = string | number | Date
