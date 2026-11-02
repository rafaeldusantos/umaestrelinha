import { ListChecks } from 'lucide-react'
import { PageHeader } from '@/shared/ui'
import { BuyTogetherTabs } from '@/features/buy-together-lists'
import { AdoptionReport } from '@/features/buy-together-adoption'

/** `/admin/compre-junto/adesao` — a aba Adesão do Compre Junto: como as peças compradas junto saem. */
const AdminBuyTogetherAdoptionPage = () => (
  <div>
    <PageHeader title="Compre Junto" subtitle="Como as peças oferecidas junto com as joias estão saindo." icon={ListChecks} />
    <BuyTogetherTabs />
    <AdoptionReport />
  </div>
)

export default AdminBuyTogetherAdoptionPage
