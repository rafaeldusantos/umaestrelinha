import type { BuyTogetherAddon } from '../../model/useBuyTogether'

/** Lista sempre pede a peça, mesmo com uma só; peça avulsa só pede quando tem grade a escolher. */
export const addonHasChoice = (addon: BuyTogetherAddon): boolean =>
  addon.kind === 'list' || !addon.pieces[0].simple

/** O adicional tem algo a escolher, a gravar ou a avisar — ou seja, tem painel. */
export const addonNeedsPanel = (addon: BuyTogetherAddon): boolean =>
  addonHasChoice(addon) || addon.engravingEnabled || addon.missing !== null

export const panelIdOf = (addon: BuyTogetherAddon): string => `buy-together-panel-${addon.id}`

