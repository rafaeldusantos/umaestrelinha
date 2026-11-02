import type { BuyTogetherAddon } from '../../model/useBuyTogether'

/** Lista sempre pede a peça, mesmo com uma só; peça avulsa só pede quando tem grade a escolher. */
export const addonHasChoice = (addon: BuyTogetherAddon): boolean =>
  addon.kind === 'list' || !addon.pieces[0].simple

/** O adicional tem algo a escolher, a gravar ou a avisar — ou seja, tem painel. */
export const addonNeedsPanel = (addon: BuyTogetherAddon): boolean =>
  addonHasChoice(addon) || addon.engravingEnabled || addon.missing !== null

export const panelIdOf = (addon: BuyTogetherAddon): string => `buy-together-panel-${addon.id}`


/**
 * A superfície do bloco (o `.cj` do protótipo): branca, com borda e raio em volta. A mesma no esqueleto e
 * no bloco pronto, para a chegada das peças não trocar a caixa.
 */
export const BUY_TOGETHER_SURFACE =
  'mt-6 flex flex-col gap-3.5 rounded-lg border border-estrelinha-line bg-estrelinha-surface px-4 pb-4 pt-[18px] lg:px-[22px] lg:pb-5 lg:pt-[22px]'
