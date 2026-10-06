// Qual componente é o corpo de cada seção de `/admin/google` — feature 61 (`AD-046`).
//
// Molde literal de `widgets/settings-sections/model/panels.tsx`: o registro
// (`shared/lib/googleSections.ts`) diz quais seções existem; este mapa diz o que cada uma desenha.
// São dois arquivos porque o corpo vem de `features/`, e `shared` não importa `features`. O par é
// bidirecional e testado ao lado.

import type { ComponentType } from 'react'
import { AnalyticsPanel } from '@/features/google-analytics'
import { GoogleShoppingPanel } from '@/features/google-shopping'
import type { GoogleSectionSlug } from '@/shared/lib/googleSections'

/**
 * `Record`, e não `Partial`: um slug novo no registro sem painel é erro de compilação, não uma
 * seção que abre em branco. O sentido contrário (painel sem seção) o `tsc` não pega — o teste pega.
 */
export const GOOGLE_PANELS: Record<GoogleSectionSlug, ComponentType> = {
  analytics: AnalyticsPanel,
  shopping: GoogleShoppingPanel,
}
