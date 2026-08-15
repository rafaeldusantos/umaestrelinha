// O registro `tipo → editor` da Home (feature 24, T30).
//
// Molde do `HOME_SECTION_RENDERERS` da loja, e pelo mesmo motivo de ferramenta: um módulo que
// exporta um componente **e** uma constante quebra o fast refresh do Vite. Aqui o registro também
// carrega a **recusa** do tipo, porque quem sabe o que aquele formulário exige é o próprio
// formulário — o casco não pode adivinhar se falta `alt`, se falta destino ou se o limite estourou.
//
// **Tipo sem editor não é erro**: `collection_rows` (T31), `collection_feature` (T33) e os dois de
// P3 chegam depois ou nunca. O casco desenha um cartão dizendo isso, em vez de uma tela em branco.

import type { ComponentType } from 'react'
import type { HomeSection, HomeSectionConfig, HomeSectionType } from '@estrelinha/core/home'
import type { AdminCategory } from '@/entities/category'
import type { DraftItem } from '../model/sectionDraft'
import { heroEditorEntry } from './HeroEditor'

/** Um produto, como o seletor de destino precisa dele. `AdminProduct` satisfaz. */
export interface EditorProduct {
  id: string
  name: string
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
  hero: heroEditorEntry,
}
