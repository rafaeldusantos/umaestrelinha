import { ListChecks } from 'lucide-react'
import { PageHeader } from '@/shared/ui'
import { BUY_TOGETHER_SUBTITLE, BuyTogetherTabs, useBuyTogetherLists } from '@/features/buy-together-lists'
import { AdoptionReport } from '@/features/buy-together-adoption'

/** `/admin/compre-junto/adesao` — a aba Adesão do Compre Junto: como as peças compradas junto saem. */
const AdminBuyTogetherAdoptionPage = () => {
  const { listas, loading, error } = useBuyTogetherLists()

  return (
    <div>
      <PageHeader title="Compre Junto" subtitle={BUY_TOGETHER_SUBTITLE} icon={ListChecks} />
      <BuyTogetherTabs listas={loading || error ? undefined : listas.length} />
      <AdoptionReport />
    </div>
  )
}

export default AdminBuyTogetherAdoptionPage
