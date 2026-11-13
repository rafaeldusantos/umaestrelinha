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

/**
 * A campanha EM VIGÊNCIA marcada numa peça, como o mapeador da loja a entrega (`Product.campaign`).
 *
 * Só chega à loja a marcação da campanha que a RLS deixa passar (ligada, `starts_at <= now() <
 * ends_at`, peça ativa): a loja nunca decide a vigência com o relógio do navegador. Presente só
 * quando a campanha BAIXA o preço da peça; aí `Product.price` já é o preço com desconto e
 * `Product.compare_price`, o cheio.
 */
export interface ProductCampaign {
  id: string
  name: string
  badge_text: string
  band_color: string
  accent_color: string
  /** Exclusivo, como em `campaigns.ends_at`. */
  ends_at: string
  /** O percentual marcado nesta peça. */
  percent: number
  /**
   * Os preços de TABELA (os do cadastro, sem a campanha) da peça e de cada variação com preço
   * próprio, por id. `Product.price` e o `price` das variações já chegam com o desconto; quem
   * precisa do preço de tabela — o recálculo da sacola, que passa preço cheio + campanha a
   * `resolveOrderPricing` — lê daqui, nunca aplica a campanha de novo sobre o preço efetivo.
   */
  list_prices: {
    price: number
    compare_price: number | null
    variants: Record<string, { price: number; compare_price: number | null }>
  }
}
