export interface GeneralSettings {
  store_name: string
  whatsapp: string
  whatsapp_message: string
  email: string
  instagram: string
  tiktok: string
}

export interface ShippingSettings {
  /**
   * A loja pratica frete grátis por valor de compra? (`FRG-01`)
   *
   * **É booleano próprio, e não `free_shipping_threshold > 0`.** A regra do `CLAUDE.md` contra
   * coluna derivável não alcança este caso: reusar o número como interruptor faria a dona **perder
   * o valor configurado** ao desligar — ela desliga em março e em maio precisa lembrar que era 150.
   * O precedente dentro deste mesmo objeto é unânime: `pix_enabled`+`pix_discount_percent`,
   * `card_enabled`+`max_installments`, `order_bump_enabled`+`order_bump_product_id`,
   * `google_shopping.enabled` — interruptor explícito ao lado do parâmetro.
   *
   * Quem responde "está ligado, e falta quanto?" é `freeShippingState` de
   * `@estrelinha/core/shipping`, e **nenhuma tela lê os dois campos por conta própria** —
   * `freeShippingSingleOwner.test.ts` derruba a suíte se alguma voltar a ler.
   */
  free_shipping_enabled: boolean
  free_shipping_threshold: number
  default_shipping_cost: number
  /**
   * **LEGADO — não é lido por nenhuma tela, e não é a origem da cotação.**
   *
   * O comentário anterior aqui afirmava que este campo era "o CEP de origem da cotação do Melhor
   * Envio". Não era: a origem sempre veio do `postal_code` do secret `MELHOR_ENVIO_SENDER_JSON`, o
   * mesmo endereço impresso na etiqueta. O campo era editável em `/admin/configuracoes` e não movia
   * um centavo — dois donos, um morto, e a documentação apontando para o morto.
   *
   * O input saiu da tela em 2026-09-05. A chave **continua no banco** porque migration aplicada é
   * imutável (`AD-017`), e continua aqui para que o tipo descreva a coluna que existe. Quem impede
   * uma tela de voltar a lê-la é `originZipNotRead.test.ts`.
   *
   * Para mudar a origem, muda-se o endereço na conta do Melhor Envio e o secret junto.
   */
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

/**
 * **`free_shipping_enabled` nasce `false`, e isso é decisão do usuário, não conservadorismo.**
 *
 * O custo é visível em produção: no primeiro deploy desta feature a loja **para** de anunciar e de
 * conceder frete grátis, até a Adri ligar em `/admin/configuracoes` → aba Frete. A alternativa
 * (nascer `true`, preservando o comportamento de hoje) foi oferecida e recusada — mesmo molde do
 * `google_shopping.enabled`, que também exige ato explícito da dona.
 *
 * Ele é lido pela migration `20260905120000_37-frete-gratis-configuravel.sql`, que o acrescenta à
 * chave `shipping` sem tocar nos outros campos. `storeSettingsDefaults.test.ts` lê esse `.sql` do
 * disco e compara: divergir não quebra build, tipo nem teste de componente — a loja só mostraria um
 * estado antes de a linha chegar do banco e outro depois, e o estado em questão é "esta loja dá
 * frete grátis?".
 *
 * `free_shipping_threshold` continua **150** e é preservado quando o interruptor desliga: o número é
 * a configuração dela, não um efeito colateral do estado ligado.
 */
export const DEFAULT_SHIPPING: ShippingSettings = {
  free_shipping_enabled: false,
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

/**
 * O interruptor do feed do Google Shopping (`GSH-15`, `GSH-16`).
 *
 * **`enabled` nasce `false`, e isso não é conservadorismo — é a ordem do cutover.** Enquanto o DNS de
 * `umaestrelinha.com.br` aponta para a loja antiga, a Content API do app da Nuvemshop ainda alimenta
 * a conta `685367464`. Uma segunda fonte publicando os mesmos `offer_id` no mesmo rótulo `BR`
 * disputaria item a item com ela.
 */
export interface GoogleShoppingSettings {
  /** Ligado por ato explícito da dona, depois do cutover. Desligado ⇒ o feed responde 404. */
  enabled: boolean
  /**
   * Já esteve ligado alguma vez?
   *
   * É o que faz o desligar **exigir confirmação**: antes de o Google já ter buscado, desligar é
   * inofensivo; depois, é remover os produtos do Shopping. Um booleano só não distingue os dois, e a
   * tela precisa distinguir para poder avisar.
   */
  ever_enabled: boolean
  /** Só exibição, para a dona conferir contra o painel do Google. O feed não o usa. */
  merchant_id: string
  /** Recuo de `products.google_product_category`. */
  default_product_category: string
  /** Escrito pela edge function a cada resposta 200. `null` = o Google ainda não buscou. */
  last_fetched_at: string | null
}

/**
 * Os vocabulários do **Google**, não os nossos (`GSH-20`).
 *
 * Existem em TypeScript e em `check` nomeado na migration `20260816130000`, e os dois precisam
 * concordar: divergir faz a tela oferecer um valor que o banco recusa (a dona descobre no save) ou o
 * banco aceitar um valor que o Merchant Center recusa (a dona descobre dias depois, item a item).
 * `googleShoppingSchema.test.ts` lê o `.sql` do disco e compara.
 */
export const GOOGLE_AGE_GROUPS = ['newborn', 'infant', 'toddler', 'kids', 'adult'] as const
export const GOOGLE_GENDERS = ['male', 'female', 'unisex'] as const

export type GoogleAgeGroup = (typeof GOOGLE_AGE_GROUPS)[number]
export type GoogleGender = (typeof GOOGLE_GENDERS)[number]

/**
 * O default do interruptor.
 *
 * Precisa dizer o MESMO que a migration `20260816130000_30-google-shopping.sql` grava —
 * `storeSettingsDefaults.test.ts` lê o `.sql` do disco e compara campo a campo. Divergir não quebra
 * build, tipo nem teste de componente: a tela só mostraria um estado antes de a linha chegar do
 * banco e outro depois, e o estado em questão é "o feed está ligado?".
 */
export const DEFAULT_GOOGLE_SHOPPING: GoogleShoppingSettings = {
  enabled: false,
  ever_enabled: false,
  merchant_id: '685367464',
  default_product_category: 'Apparel & Accessories > Jewelry',
  last_fetched_at: null,
}

export type SettingsKey =
  | 'general'
  | 'shipping'
  | 'payment'
  | 'seo'
  | 'abandoned_cart'
  | 'checkout'
  | 'material'
  | 'google_shopping'

export interface SettingsMap {
  general: GeneralSettings
  shipping: ShippingSettings
  payment: PaymentSettings
  seo: SeoSettings
  abandoned_cart: AbandonedCartSettings
  checkout: CheckoutSettings
  material: MaterialSettings
  google_shopping: GoogleShoppingSettings
}
