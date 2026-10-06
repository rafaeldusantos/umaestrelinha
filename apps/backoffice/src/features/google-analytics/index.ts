// Feature 61 — a seção Analytics de `/admin/google`. O painel que a página monta é o único export de
// UI; os hooks ficam expostos para quem precisar do estado da chave sem desenhar o cartão.
export { default as AnalyticsPanel } from './ui/AnalyticsPanel'
export { useAnalyticsSecretStatus, useSaveAnalyticsSecret } from './model/useAnalyticsSecret'
export { useLastPurchaseSend } from './model/useLastPurchaseSend'
