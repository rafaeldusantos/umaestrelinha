// `/admin/google` — as integrações da loja com o Google (feature 61, `ANL-01`, `AD-046`).
//
// Três donos, o molde de `AdminSettingsPage` (`AD-038`):
//
// - **quais seções existem** — `shared/lib/googleSections.ts`;
// - **qual está aberta** — a URL (`/admin/google/:secao`); a rota-mãe e o slug inexistente abrem
//   Analytics, **sem redirect**: é a rota-mãe que mora em `navGroups`, e um `<Navigate>` trocaria o
//   endereço da sidebar por um que ela não nomeia;
// - **o que cada uma desenha** — `GOOGLE_PANELS`, com montagem **condicional**: só o painel da seção
//   ativa existe no DOM. É o que mantém verdadeiro "trocar de seção descarta a edição não salva".
//
// A diferença para Configurações é só o desenho do registro: com duas seções ele é uma **fileira de
// links**, não um rail (`AD-046`).

import { useParams } from 'react-router-dom'
import {
  useAnalyticsSettings,
  useGoogleShoppingSettings,
} from '@estrelinha/core/hooks/useStoreSettings'
import { PageHeader } from '@/shared/ui'
import { GOOGLE_PANELS, GoogleSectionLinks } from '@/widgets/google-sections'
import { DEFAULT_GOOGLE_SECTION, findGoogleSection } from '@/shared/lib/googleSections'

const AdminGooglePage = () => {
  const { secao } = useParams<{ secao: string }>()
  const ativa = findGoogleSection(secao)?.slug ?? DEFAULT_GOOGLE_SECTION

  // O estado de cada integração é lido AQUI, e não pelos painéis, porque a fileira mostra os dois ao
  // mesmo tempo — e só um painel está montado. Os hooks leem o mesmo cache de `store_settings` que
  // os painéis, então não há segunda requisição nem segunda resposta.
  const analytics = useAnalyticsSettings()
  const shopping = useGoogleShoppingSettings()

  const Painel = GOOGLE_PANELS[ativa]

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title="Google"
        subtitle="As integrações da loja com o Google: o Analytics, que mede a navegação e as vendas, e o Shopping, que publica o catálogo."
      />

      <GoogleSectionLinks
        ativa={ativa}
        ligada={{ analytics: analytics.enabled, shopping: shopping.enabled }}
      />

      <div data-testid={`google-panel-${ativa}`}>
        <Painel />
      </div>
    </div>
  )
}

export default AdminGooglePage
