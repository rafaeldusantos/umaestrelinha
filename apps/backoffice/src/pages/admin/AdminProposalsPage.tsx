// `/admin/pedidos/montados` — a lista dos pedidos montados pelo painel (feature 89, ajuste de
// 2026-11-01: o item "Pedidos montados" da sidebar, logo abaixo de "Pedidos").
//
// É a MESMA lista da aba "Montados" de `/admin/pedidos` (`ProposalsList`), com cabeçalho próprio e o
// botão de montar. As duas entradas levam à mesma leitura; nenhuma regra mora aqui.

import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { PageHeader } from '@/shared/ui'
import { PROPOSAL_BUILDER_PATH, ProposalsList } from '@/features/order-proposal'

const AdminProposalsPage = () => (
  <div>
    <PageHeader
      title="Pedidos montados"
      subtitle="As sacolas que você montou para clientes, e o link de cada uma."
      actions={
        <Button asChild className="min-h-11">
          <Link to={PROPOSAL_BUILDER_PATH}>
            <Plus className="mr-1 h-4 w-4" aria-hidden /> Montar pedido
          </Link>
        </Button>
      }
    />
    <ProposalsList />
  </div>
)

export default AdminProposalsPage
