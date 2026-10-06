import { useEffect } from 'react'
import { useAnalyticsSettings, useStoreSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { useCookieConsentStore } from '@/entities/cookie-consent'
import {
  applyConsent,
  canMeasure,
  flushPendingEvents,
  loadGtag,
  setAnalyticsSettings,
} from '@/shared/lib/analytics'

/**
 * Feature 61 · ANL-08, AVS-05 — lê `store_settings.analytics` e carrega o gtag quando pode medir.
 *
 * **Não é montado em modo prévia** (`AVS-08`): o `App` o deixa de fora, e marca a prévia no módulo
 * de medição também, para o `track` de qualquer tela recusar.
 *
 * O efeito reroda em duas mudanças, e as duas importam:
 *
 * - **a configuração**: chega depois do primeiro render (o padrão é desligado), e a dona pode
 *   desligar ou trocar o ID no painel — vale a partir da próxima leitura (`ANL-08`);
 * - **a escolha da cliente**: quem recusou e depois toca "Aceitar todos" volta a ser medida sem
 *   recarregar a página, e quem recusa liga a bandeira de desligamento do gtag já carregado.
 *
 * Leitura que falha devolve desligado (`useAnalyticsSettings`), então nenhum script é injetado sem
 * a loja saber que pode.
 */
const AnalyticsLoader = () => {
  const settings = useAnalyticsSettings()
  // "Leu ou falhou": antes disso o valor acima é o PADRÃO, não a configuração — e decidir por ele
  // descartaria a fila do primeiro `page_view`. Falha conta como lida: desligado é o estado seguro.
  const { isFetched } = useStoreSettings()
  const statistics = useCookieConsentStore(s => s.statistics)

  useEffect(() => {
    if (!isFetched) return
    setAnalyticsSettings(settings)
    if (canMeasure()) loadGtag(settings.measurement_id)
    applyConsent()
    flushPendingEvents()
  }, [isFetched, settings, statistics])

  return null
}

export default AnalyticsLoader
