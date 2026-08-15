export interface GeneralSettings {
  store_name: string
  whatsapp: string
  whatsapp_message: string
  email: string
  instagram: string
  tiktok: string
}

export interface ShippingSettings {
  free_shipping_threshold: number
  default_shipping_cost: number
  origin_zip: string
  /** Dias úteis de produção somados ao prazo do transportador (SHP-09). */
  handling_days: number
}

/** Order bump do checkout one-page (BMP-01). */
export interface CheckoutSettings {
  order_bump_enabled: boolean
  order_bump_product_id: string | null
  order_bump_discount_percent: number
}

export interface PaymentSettings {
  pix_enabled: boolean
  pix_discount_percent: number
  card_enabled: boolean
  max_installments: number
  min_installment_value: number
}

export interface SeoSettings {
  title: string
  description: string
  og_image: string
}

export interface AbandonedCartSettings {
  threshold_hours: number
  auto_email_enabled: boolean
  auto_email_hours: number
  reminder_coupon_code: string
}

/**
 * Para onde a cliente posta o material afetivo (`MAT-01`).
 *
 * É **configuração**, não literal em `.tsx`, por um motivo prático: mudar de endereço é operação da
 * dona, e com o endereço no código ela viraria um deploy. `ShippingSettings.origin_zip` não serve —
 * é o CEP de origem da cotação do Melhor Envio, que é a remessa **de saída**; esta é a **de entrada**,
 * e precisa do endereço por extenso, com destinatário, para caber numa etiqueta escrita à mão.
 */
export interface MaterialSettings {
  /** A quem endereçar o envelope. Sem isto a cliente escreve o nome da loja e o correio devolve. */
  recipient: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  zip: string
  /** Observação livre da dona: horário de recebimento, aviso de embalagem, o que for. */
  notes: string
}

/**
 * Os defaults abaixo precisam dizer o MESMO que as duas migrations
 * `*_create_store_settings.sql` gravam. Divergir não quebra build, tipo nem
 * teste de componente — a loja só passa a mostrar um nome antes de a linha
 * chegar do banco e outro depois. É o mesmo defeito da paleta declarada em dois
 * arquivos, e o guarda é `storeSettingsDefaults.test.ts`, que lê as migrations
 * do disco e compara campo a campo.
 */
export const DEFAULT_GENERAL: GeneralSettings = {
  store_name: 'Uma Estrelinha',
  whatsapp: '',
  whatsapp_message: 'Olá! Vim pelo site e gostaria de tirar uma dúvida.',
  email: 'contato@umaestrelinha.com.br',
  instagram: '',
  tiktok: '',
}

export const DEFAULT_SHIPPING: ShippingSettings = {
  free_shipping_threshold: 150,
  default_shipping_cost: 9.9,
  origin_zip: '',
  handling_days: 2,
}

export const DEFAULT_CHECKOUT: CheckoutSettings = {
  order_bump_enabled: false,
  order_bump_product_id: null,
  order_bump_discount_percent: 50,
}

export const DEFAULT_PAYMENT: PaymentSettings = {
  pix_enabled: true,
  pix_discount_percent: 5,
  card_enabled: true,
  max_installments: 6,
  min_installment_value: 10,
}

export const DEFAULT_SEO: SeoSettings = {
  title: 'Uma Estrelinha - Joias afetivas artesanais em resina',
  description:
    'Joias feitas à mão em resina com o material que você envia: cinzas, leite materno, dente de leite e mecha de cabelo.',
  og_image: '',
}

export const DEFAULT_ABANDONED_CART: AbandonedCartSettings = {
  threshold_hours: 4,
  auto_email_enabled: false,
  auto_email_hours: 24,
  reminder_coupon_code: '',
}

/**
 * **Nasce com todos os campos vazios, e isso é a decisão.**
 *
 * Um endereço inventado como default é pior do que endereço nenhum quando o que viaja é
 * insubstituível: a cliente posta cinzas para um lugar que não existe e não há segunda via. Por isso
 * a página "Como enviar" **não renderiza** o bloco de endereço enquanto `street` estiver vazio —
 * mostra o convite a falar com a Adri no lugar.
 *
 * Também por isso esta chave **não tem seed em migration**: não há valor a semear, logo não há o que
 * divergir. `storeSettingsDefaults.test.ts` segue guardando as quatro chaves que **têm** valor no
 * SQL, e não é afrouxado para caber esta.
 */
export const DEFAULT_MATERIAL: MaterialSettings = {
  recipient: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zip: '',
  notes: '',
}

export type SettingsKey =
  | 'general'
  | 'shipping'
  | 'payment'
  | 'seo'
  | 'abandoned_cart'
  | 'checkout'
  | 'material'

export interface SettingsMap {
  general: GeneralSettings
  shipping: ShippingSettings
  payment: PaymentSettings
  seo: SeoSettings
  abandoned_cart: AbandonedCartSettings
  checkout: CheckoutSettings
  material: MaterialSettings
}
