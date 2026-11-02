import { useNavigate } from 'react-router-dom'
import { BuyTogetherListsIndex, useBuyTogetherLists } from '@/features/buy-together-lists'

/** `/admin/compre-junto` — o índice das listas do Compre Junto. */
const AdminBuyTogetherPage = () => {
  const navigate = useNavigate()
  const { listas, loading, error, refetch } = useBuyTogetherLists()

  return (
    <BuyTogetherListsIndex
      listas={listas}
      loading={loading}
      error={error}
      onRetry={refetch}
      onNew={() => navigate('/admin/compre-junto/listas/nova')}
      onOpen={id => navigate(`/admin/compre-junto/listas/${id}`)}
    />
  )
}

export default AdminBuyTogetherPage
