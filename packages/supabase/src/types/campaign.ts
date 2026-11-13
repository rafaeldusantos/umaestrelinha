// As linhas das tabelas das campanhas de desconto, como o PostgREST as devolve. Escritas à mão: tipo
// de banco é afirmação, e a prova de que o painel lê e grava cada uma é o probe contra o banco local.

/**
 * `campaigns` — uma campanha. `ends_at` é EXCLUSIVO: a vigência é `[starts_at, ends_at)`. O painel
 * mostra e digita o último minuto que vale (`@estrelinha/core/campaigns`, `end.ts`).
 */
export interface DbCampaign {
  id: string
  name: string
  /** Até 14 caracteres; sai em maiúsculas na faixa do cartão. */
  badge_text: string
  /** `#RRGGBB` — a cor da faixa (fundo do texto, cor do percentual). */
  band_color: string
  /** `#RRGGBB` — a cor de destaque (cor do texto, fundo do percentual). */
  accent_color: string
  starts_at: string
  ends_at: string
  active: boolean
  created_at: string
  updated_at: string
}

/** `campaign_percents` — um percentual que a campanha oferece (1 a 70, até cinco). */
export interface DbCampaignPercent {
  campaign_id: string
  percent: number
}

/** `product_campaigns` — a marcação de uma peça numa campanha, com um dos percentuais dela. */
export interface DbProductCampaign {
  product_id: string
  campaign_id: string
  percent: number
  created_at: string
}

/** `campaign_percent_usage` — quantas peças usam cada percentual de cada campanha. */
export interface DbCampaignPercentUsage {
  campaign_id: string
  percent: number
  products: number
}
