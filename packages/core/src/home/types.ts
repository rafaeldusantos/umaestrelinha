// Feature 24 — a composição da Home, como **dado**.
//
// A Home já era dinâmica: as fileiras saem de `categories` por `sort_order`, a grade de banners de
// quem tem `banner_url`, e os números da faixa de vantagens de `store_settings`. O que ainda estava
// cravado no `.tsx` era a **composição** — quais seções existem, em que ordem, com que texto e com
// que limite. Estes são os tipos que a movem para o banco.
//
// Módulo **sem React e sem Supabase**, pelo mesmo motivo de `core/routes` e `core/material`: o guarda
// que compara este catálogo com o `check (type in …)` da migration precisa importá-lo de dentro de um
// teste que lê arquivo do disco.

/**
 * Os tipos de bloco que a Home aceita.
 *
 * **Não há tipo de contagem regressiva nem de prova social, e a ausência é a regra** (`HOME-06`):
 * `DropCountdown` e `SocialProof` saíram na feature 20 por decisão ética — depoimento inventado sobre
 * a morte de alguém tem peso diferente de depoimento inventado sobre um acessório. Um catálogo
 * genérico de blocos os traria de volta pela porta do painel, e por isso o guarda assere a
 * **ausência** dos dois, não só a presença dos dez.
 */
export type HomeSectionType =
  | 'hero'
  | 'trust_bar'
  | 'banner_grid'
  | 'collection_rows'
  | 'brand_statement'
  | 'trending_tags'
  | 'newsletter'
  | 'collection_feature'
  | 'product_carousel'
  | 'category_grid'

/**
 * Os arranjos da grade de banners.
 *
 * `hero_pair` é **a grade de hoje** — um grande à esquerda e dois empilhados à direita —, e é o
 * default por isso: `HOME-04` exige que a virada não mude a página.
 *
 * No celular todo arranjo empilha em coluna de largura cheia. Medido: o contêiner deixa 358px em
 * 390, e `quad` proporcional daria **82px** por célula — a arte da loja tem texto embutido, e texto
 * dentro de 82px é ilegível em ~90% dos acessos.
 */
export type HomeBannerLayout = 'single' | 'pair' | 'hero_pair' | 'quad'

/**
 * O `config jsonb` de uma seção.
 *
 * **Guarda só texto, número e URL de imagem — nunca referência.** Toda referência a categoria ou
 * produto mora em `HomeSectionItem`, onde tem FK de verdade. Essa é a linha divisória que impede o
 * defeito do `menu_promo` (`AD-014`: id em jsonb não dispara `on delete set null`, então toda leitura
 * precisa validar o destino em runtime) de reentrar por outra porta.
 *
 * Um só tipo para os dez blocos, com tudo opcional, e não dez interfaces numa união: `config` chega
 * do banco como `jsonb` — uma união discriminada exigiria um `narrow` por leitura, e
 * `strictNullChecks: false` não estreitaria nada. Quem diz o que cada tipo aceita é `sectionMeta` e o
 * editor daquele tipo.
 */
export interface HomeSectionConfig {
  /** `hero`, `brand_statement` — o sobretítulo com a régua em `accent`. */
  eyebrow?: string
  /** `hero` — a 1ª linha do título, em `ink`. */
  title_line1?: string
  /** `hero` — a 2ª linha do título, em `primary`. As duas cores são `HOME-16`, não decoração. */
  title_line2?: string
  /** `hero`, `brand_statement`. */
  paragraph?: string
  /** `hero`, `newsletter`, `collection_feature`. */
  cta_label?: string
  /** `hero`. Validado por `ctaHrefRefusal` — nunca grava CTA que leva a 404 (`HOME-20`). */
  cta_href?: string
  /** `hero`. Sem imagem, o hero cai na arte da marca (`HOME-17`). */
  image_url?: string
  /** `hero`. Obrigatório para salvar quando há imagem (`HOME-18`). */
  image_alt?: string
  /** `banner_grid`. */
  layout?: HomeBannerLayout
  /** `collection_rows`, `trending_tags`, `product_carousel`, `category_grid`. */
  limit?: number
  /** `brand_statement`, `trending_tags`, `newsletter`, `collection_feature`, e os dois de P3. */
  title?: string
  /** `trending_tags`, `newsletter`. */
  subtitle?: string
  /** `collection_feature` — o texto curto ao lado da imagem. */
  text?: string
  /** `brand_statement` — a assinatura de quem faz. */
  author_name?: string
  /** `brand_statement`. */
  author_role?: string
  /** `brand_statement` — o link de escape. */
  link_label?: string
  /** `brand_statement`. */
  link_href?: string
  /**
   * `brand_statement` — o aninhamento, e **quem o carrega é a própria faixa**.
   *
   * `null` (ou ausente) renderiza no lugar dela mesma, como irmã. `0` renderiza **dentro** da seção
   * de fileiras imediatamente anterior, depois da fileira de índice 0 — que é onde a Home de hoje a
   * põe (`INTERLUDE_AFTER = 0`).
   *
   * Na faixa e não em `collection_rows` porque assim há **um dono**: se a seção de fileiras dissesse
   * "minha interlude é a seção X", desligar a X deixaria a fileira apontando para um fantasma e as
   * duas linhas precisariam concordar. Do jeito escolhido, desligar a faixa é desligar a faixa.
   */
  interlude_after?: number | null
  /** `product_carousel` — de onde vêm os produtos quando não há curadoria (P3). */
  source?: string
}

/**
 * Um item curado de uma seção — a lista que a dona escolheu a dedo.
 *
 * **Curadoria é a PRESENÇA de itens, não uma flag.** Ter itens é o override; não ter é a derivação de
 * hoje (`pickHomeBanners` / `pickHomeCollections` / `pickTrendingCategories`). Uma flag
 * `'auto' | 'manual'` seria dois donos do mesmo dado — o "defeito 01" do projeto — e teria um estado
 * inalcançável: `manual` com zero itens é indistinguível de `auto` na loja e diferente no banco.
 * "Voltar ao automático" (`HOME-33`) vira um `delete`, que é uma operação e não uma sincronização.
 */
export interface HomeSectionItem {
  id: string
  section_id: string
  position: number
  /**
   * Destino: **no máximo um** dos três. Zero é o estado órfão, e é legítimo — o `on delete set null`
   * das FKs o produz quando a categoria ou o produto de destino é apagado. Um CHECK de igualdade no
   * banco faria a **exclusão da categoria falhar**; "exatamente um para salvar" é regra de formulário
   * (`destinationRefusal`), a única camada onde "ainda não escolhi" e "perdi o que tinha" se
   * distinguem.
   */
  category_id: string | null
  product_id: string | null
  /**
   * O slug do produto de destino, **embutido pela consulta** — emenda `E5`.
   *
   * A linha guarda o id, e o caminho canônico de um produto exige o slug (`/produtos/:slug`).
   * Consultar `products` por id a partir da Home seria uma segunda ida ao banco; `useProducts()`
   * baixaria o catálogo inteiro, que é o defeito que a feature 23 fechou. A relação embutida
   * (`items:home_section_items(*, product:products(slug))`) resolve numa consulta só, sem coluna
   * redundante.
   *
   * **Ausente significa "fora do ar", e quem decide isso é a RLS** — medido no probe de 2026-08-15:
   * produto despublicado volta com `product: null` e o `product_id` intacto. É `HOME-24` valendo no
   * banco em vez de num filtro do cliente.
   */
  product_slug?: string | null
  href: string | null
  /** Arte própria (banner livre). Sem imagem, a seção deriva a arte do destino. */
  image_url: string | null
  alt: string | null
  /**
   * O rótulo congelado no momento da escolha.
   *
   * Não é desnormalização preguiçosa: depois do `SET NULL` não há de onde ler o nome da coleção
   * apagada, e `HOME-24` pede que o painel **diga** o que se perdeu. Sem ele a mensagem seria "este
   * banner perdeu o destino"; com ele é "a coleção **Prata 925** foi apagada". A loja nunca o lê.
   */
  label_snapshot: string | null
}

/** Uma seção da Home. */
export interface HomeSection {
  id: string
  type: HomeSectionType
  position: number
  /** Seção nova nasce `false` (`HOME-10`). O hero não pode ser desligado (`HOME-08`). */
  active: boolean
  config: HomeSectionConfig
  /** Vazio ou ausente = derivação de hoje. Ver `HomeSectionItem`. */
  items?: HomeSectionItem[]
}
