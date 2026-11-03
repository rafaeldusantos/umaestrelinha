import { useNavigate } from 'react-router-dom'
import { BuyTogetherFormCard, BuyTogetherListsIndex, BuyTogetherTabs, useBuyTogetherLists } from '@/features/buy-together-lists'

/** `/admin/compre-junto` — a aba Listas do Compre Junto (o índice); a aba Adesão é `/admin/compre-junto/adesao`. */
const AdminBuyTogetherPage = () => {
  const navigate = useNavigate()
  const { listas, loading, error, refetch } = useBuyTogetherLists()

  return (
    <BuyTogetherListsIndex
      listas={listas}
      aside={
        <>
          <BuyTogetherTabs listas={loading || error ? undefined : listas.length} />
          <BuyTogetherFormCard />
        </>
      }
      loading={loading}
      error={error}
      onRetry={refetch}
      onNew={() => navigate('/admin/compre-junto/listas/nova')}
      onOpen={id => navigate(`/admin/compre-junto/listas/${id}`)}
    />
  )
}

export default AdminBuyTogetherPage
