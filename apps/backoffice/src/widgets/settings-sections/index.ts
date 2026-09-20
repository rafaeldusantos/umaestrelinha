// A navegação e os painéis de `/admin/configuracoes` — feature 55.
//
// O widget é a camada certa porque ele COMPÕE features: o painel de Vendas monta o
// `CheckoutSettingsCard` e o de Notificações monta a `NotificationsTab`. Quem é dono de "quais
// seções existem" é `shared/lib/settingsSections.ts`, um nível abaixo, onde as features também
// alcançam.
export { default as SettingsSectionNav } from './ui/SettingsSectionNav'
export { SETTINGS_PANELS } from './model/panels'
