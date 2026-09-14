// O registro `tipo → editor` da Home (feature 24, T30).
//
// Molde do `HOME_SECTION_RENDERERS` da loja, e pelo mesmo motivo de ferramenta: um módulo que
// exporta um componente **e** uma constante quebra o fast refresh do Vite. Aqui o registro também
// carrega a **recusa** do tipo, porque quem sabe o que aquele formulário exige é o próprio
// formulário — o casco não pode adivinhar se falta `alt`, se falta destino ou se o limite estourou.
//
// **Tipo sem editor não é erro**: os dois de P3 entram no catálogo sem tela e podem nunca ganhar
// uma. O casco desenha um cartão dizendo isso, em vez de uma tela em branco.

import type { ComponentType } from 'react'
import type { HomeSection, HomeSectionConfig, HomeSectionType } from '@estrelinha/core/home'
import type { AdminCategory } from '@/entities/category'
import type { DraftItem } from '../model/sectionDraft'
import {
  bannerGridRefusal,
  collectionFeatureRefusal,
  collectionRowsRefusal,
  heroCarouselRefusal,
  heroRefusal,
  productCarouselRefusal,
  textSectionRefusal,
} from '../model/sectionRefusals'
import BannerGridEditor from './BannerGridEditor'
import CollectionFeatureEditor from './CollectionFeatureEditor'
import CollectionRowsEditor from './CollectionRowsEditor'
import FeaturedProductsEditor from './FeaturedProductsEditor'
import HeroCarouselEditor from './HeroCarouselEditor'
import HeroEditor from './HeroEditor'
import TextSectionEditor from './TextSectionEditor'

/**
 * Um produto, como os seletores do painel precisam dele. `AdminProduct` satisfaz.
 *
 * **`slug` e `is_active` são obrigatórios desde a feature 50**, e os dois são carga, não conforto:
 *
 * - `slug` é o que a escolha congela em `DraftItem.product_slug` para a PRÉVIA saber que a peça
 *   está no ar antes de qualquer gravação (`DST-24`). Sem ele, `resolveItem` trata todo produto
 *   recém-escolhido como fora do ar, e o bloco em edição aparece vazio justamente enquanto a dona
 *   o monta.
 * - `is_active` é o que faz o painel dizer a MESMA coisa que a loja desenha (`AD-024`, `R-02`): o
 *   painel lê o catálogo como admin e enxerga produto despublicado; a cliente, como `anon`, não.
 *
 * Os dois são **obrigatórios de propósito**. Opcionais, um construtor que os esquecesse compilaria
 * e a tela mentiria em silêncio; obrigatórios, é o `tsc` que acha todos os construtores.
 */
export interface EditorProduct {
  id: string
  name: string
  slug: string
  is_active: boolean
}

export interface SectionEditorProps {
  section: HomeSection
  /** O rascunho — **nunca** `section.config`. Ver `model/sectionDraft`. */
  config: HomeSectionConfig
  /** Aplica um pedaço do `config`. Patch, e não substituição, para o campo não precisar do resto. */
  onConfigChange: (patch: Partial<HomeSectionConfig>) => void
  items: DraftItem[]
  onItemsChange: (next: DraftItem[]) => void
  categories: readonly AdminCategory[]
  products: readonly EditorProduct[]
}

export interface SectionEditorEntry {
  Body: ComponentType<SectionEditorProps>
  /**
   * Por que este rascunho não pode ser salvo — ou `null` quando pode.
   *
   * `string | null` como toda recusa deste projeto: `strictNullChecks: false` não estreita união
   * discriminada por literal booleano, e ler o motivo no ramo do `else` seria TS2339.
   */
  refusal?: (config: HomeSectionConfig, items: readonly DraftItem[]) => string | null
}

export const SECTION_EDITORS: Partial<Record<HomeSectionType, SectionEditorEntry>> = {
  hero: { Body: HeroEditor, refusal: heroRefusal },
  hero_carousel: { Body: HeroCarouselEditor, refusal: heroCarouselRefusal },
  banner_grid: { Body: BannerGridEditor, refusal: bannerGridRefusal },
  collection_rows: { Body: CollectionRowsEditor, refusal: collectionRowsRefusal },
  collection_feature: { Body: CollectionFeatureEditor, refusal: collectionFeatureRefusal },
  // Feature 50 — o único bloco da Home que fala de PEÇA, e não de coleção. O tipo é o
  // `product_carousel` que o `check` já aceitava desde a 24; o que faltava era tela.
  product_carousel: { Body: FeaturedProductsEditor, refusal: productCarouselRefusal },
  // Quatro tipos, UM editor: a faixa institucional, os chips, a newsletter e a faixa de vantagens
  // fazem a mesma pergunta, e o que muda entre elas é a lista de campos — que é dado. A recusa
  // recebe o tipo por fora porque a faixa aceita de `limit` é de cada um.
  trust_bar: { Body: TextSectionEditor, refusal: textSectionRefusal('trust_bar') },
  brand_statement: { Body: TextSectionEditor, refusal: textSectionRefusal('brand_statement') },
  trending_tags: { Body: TextSectionEditor, refusal: textSectionRefusal('trending_tags') },
  newsletter: { Body: TextSectionEditor, refusal: textSectionRefusal('newsletter') },
}
