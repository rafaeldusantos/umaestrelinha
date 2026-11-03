import { useNavigate, useParams } from 'react-router-dom'
import { ListChecks } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { BuyTogetherListEditor, useBuyTogetherLists } from '@/features/buy-together-lists'
import { EmptyState, TableSkeleton } from '@/shared/ui'

/**
 * `/admin/compre-junto/listas/nova` e `/admin/compre-junto/listas/:id` — o editor de uma lista.
 *
 * As duas rotas são irmãs com o mesmo `element`, como `/admin/home` e `/admin/home/:sectionId`: a
 * tela troca a lista e não desmonta.
 */
const AdminBuyTogetherListPage = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { listas, loading, error, refetch } = useBuyTogetherLists()
  const voltar = () => navigate('/admin/compre-junto')

  if (id === undefined) {
    return <BuyTogetherListEditor lista={null} onBack={voltar} onCreated={novo => navigate(`/admin/compre-junto/listas/${novo}`, { replace: true })} onDeleted={voltar} />
  }

  if (error) {
    return (
      <EmptyState
        icon={ListChecks}
        message="Não foi possível ler a lista."
        hint={error}
        action={<Button onClick={refetch}>Tentar de novo</Button>}
      />
    )
  }
  if (loading) return <TableSkeleton />

  const lista = listas.find(l => l.id === id) ?? null
  if (!lista) {
    return (
      <EmptyState
        icon={ListChecks}
        message="Esta lista não existe mais."
        action={<Button onClick={voltar}>Voltar às listas</Button>}
      />
    )
  }

  return <BuyTogetherListEditor key={lista.id} lista={lista} onBack={voltar} onCreated={() => undefined} onDeleted={voltar} />
}

export default AdminBuyTogetherListPage
