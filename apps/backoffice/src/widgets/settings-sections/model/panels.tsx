// Qual componente é o corpo de cada seção de Configurações — feature 55.
//
// ## Por que este mapa não mora dentro do registro
//
// `SETTINGS_SECTIONS` (`shared/lib/settingsSections.ts`) é o dono de "quais seções existem". Ele
// precisa estar em `shared` porque **duas features** o leem — `notification-settings` para o link de
// `CFG-21` e `home-composition` para os dois de `CFG-19` —, e `features` não importa de `widgets`.
//
// O corpo de duas das quatro seções vem justamente de `features/`. Se o componente morasse no
// registro, `shared` importaria `features`: a inversão de camada mais grave que a FSD deste
// repositório admite, e o `eslint-plugin-boundaries` a apontaria (em `warn`, que é o modo em que
// ninguém vê).
//
// Então são dois arquivos, e o par entre eles é **bidirecional e testado**: nem seção sem painel
// (que renderizaria o vazio), nem painel sem seção (que ficaria no bundle para sempre sem ninguém
// conseguir alcançá-lo). É o molde de `menuIconCatalog.test.ts`.
//
// ## `NotificationsTab` entra aqui direto desde a feature 56
//
// Havia um `NotificationsSection` entre os dois, e o comentário no topo dele dizia por que ele
// existia: "o cabeçalho que as outras seções ganham do `FormCard` — e que esta não pode ganhar,
// porque o corpo dela já são quinze cards". `LEG-18` mudou aquele cabeçalho de casa — o campo
// "Pedido para a prévia" foi para a linha do título, e o campo é estado da aba —, e o que sobrou
// naquele arquivo era `() => <NotificationsTab />`. Ele foi apagado em vez de virar invólucro vazio.

import type { ComponentType } from 'react'
import { SalesSection, ShippingMaterialSection, StoreDataSection } from '@/features/settings'
import { NotificationsTab } from '@/features/notification-settings'
import type { SettingsSectionSlug } from '@/shared/lib/settingsSections'

/**
 * O tipo é `Record<SettingsSectionSlug, …>`, e não `Partial<…>`: acrescentar um slug ao registro sem
 * dar painel a ele passa a ser **erro de compilação**, não uma seção que abre em branco.
 *
 * O `tsc` pega esse sentido. O outro — painel sem seção — ele não pega, e é por isso que o guarda
 * ao lado é bidirecional.
 */
export const SETTINGS_PANELS: Record<SettingsSectionSlug, ComponentType> = {
  'dados-da-loja': StoreDataSection,
  vendas: SalesSection,
  'frete-e-material': ShippingMaterialSection,
  notificacoes: NotificationsTab,
}
