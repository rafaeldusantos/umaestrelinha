// Campanhas de desconto — os tetos do cadastro e as cores do selo.
//
// Folha: sem import nenhum. A migration das campanhas tem a cópia SQL destes números nos `check`, e
// o guarda dela (`campanhasSchema.test.ts`, na suíte da loja) IMPORTA estas constantes e compara.

/** O nome aparece no título da vitrine e no bloco da Home. */
export const CAMPAIGN_NAME_MAX = 40

/** O texto do selo cabe no cartão de 173 px do celular ao lado do bloco do percentual. */
export const CAMPAIGN_BADGE_MAX = 14

export const CAMPAIGN_PERCENT_MIN = 1
export const CAMPAIGN_PERCENT_MAX = 70

/** Quantos percentuais uma campanha oferece ao cadastro da peça. */
export const CAMPAIGN_PERCENTS_MAX = 5

/** O par de cores do selo é usado cruzado: um número só decide se serve. */
export const CAMPAIGN_CONTRAST_MIN = 4.5

/** O formato que o banco aceita para as duas cores (`check` da migration). */
export const CAMPAIGN_HEX = /^#[0-9A-Fa-f]{6}$/

export interface CampaignColors {
  /** A cor da faixa: fundo do texto, e cor do percentual. */
  band: string
  /** A cor de destaque: cor do texto, e fundo do percentual. */
  accent: string
}

/** Preto e ouro do protótipo (7,4:1). É com elas que a campanha nasce. */
export const CAMPAIGN_DEFAULT_COLORS: CampaignColors = { band: '#161514', accent: '#C2A063' }

/** As três combinações prontas da tela de cadastro. */
export const CAMPAIGN_COLOR_PRESETS: ReadonlyArray<{ label: string } & CampaignColors> = [
  { label: 'Preto e ouro', band: '#161514', accent: '#C2A063' },
  { label: 'Ardósia e ouro', band: '#23303A', accent: '#B8945F' },
  { label: 'Vinho e rosa', band: '#6E2433', accent: '#F6DCD8' },
]
