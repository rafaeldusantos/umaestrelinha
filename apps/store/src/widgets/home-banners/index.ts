export { default as HomeBannerGrid, type HomeBannerItem } from './ui/HomeBannerGrid'

// `pickHomeBanners`, `HOME_BANNER_SLOTS` e `HomeBanner` mudaram de casa na T35 da feature 24: a
// derivação passou a ter UM dono, em `@estrelinha/core/home`, porque o painel precisa da mesma
// regra e não importa de `apps/store`. Reexportá-los daqui devolveria a segunda porta.
