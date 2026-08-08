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

export const DEFAULT_GENERAL: GeneralSettings = {
  store_name: 'Nanita',
  whatsapp: '',
  whatsapp_message: 'Olá! Estou navegando no site e gostaria de tirar uma dúvida.',
  email: 'contato@nanita.com.br',
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
  title: 'Nanita — Bottons temáticos de pop culture',
  description: 'Bottons únicos de anime, K-pop, filmes, séries, games e bandas. Drops semanais.',
  og_image: '',
}

export const DEFAULT_ABANDONED_CART: AbandonedCartSettings = {
  threshold_hours: 4,
  auto_email_enabled: false,
  auto_email_hours: 24,
  reminder_coupon_code: '',
}

export type SettingsKey =
  | 'general'
  | 'shipping'
  | 'payment'
  | 'seo'
  | 'abandoned_cart'
  | 'checkout'

export interface SettingsMap {
  general: GeneralSettings
  shipping: ShippingSettings
  payment: PaymentSettings
  seo: SeoSettings
  abandoned_cart: AbandonedCartSettings
  checkout: CheckoutSettings
}
