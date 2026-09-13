// Os banners gravados de uma superfície — o dono único da leitura.
//
// Mora num módulo próprio desde a feature 47, e não dentro do `MenuBannerEditor`, porque dois
// componentes a consomem: o editor, que os desenha, e a aba "Banners" do `MenuEntryEditor`, que
// mostra **quantos são**. Contagem e dado contado têm de sair do mesmo predicado (`AD-025`,
// `FOCO-32`) — uma segunda leitura na aba diria "2" com o editor mostrando 3, e nada quebraria.

import { menuBannerSlots, type MenuBanner, type MenuSurface } from '@estrelinha/core/menu'

/** Os banners crus de uma superfície, já sem o que não é objeto. */
export const bannersGravados = (raw: unknown, surface: MenuSurface): MenuBanner[] =>
  menuBannerSlots(raw, surface).filter(
    b => b !== null && typeof b === 'object' && !Array.isArray(b),
  ) as MenuBanner[]
