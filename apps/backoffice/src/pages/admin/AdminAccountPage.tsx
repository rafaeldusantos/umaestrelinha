import { UserCog } from 'lucide-react'
import { useAuthContext } from '@estrelinha/auth'
import { PageHeader, FormCard } from '@/shared/ui'
import ChangePasswordCard from '@/features/account/ui/ChangePasswordCard'

/**
 * `/admin/conta` — a conta de quem está logada (feature 48).
 *
 * Separada de `/admin/configuracoes` de propósito: aquela tela guarda configuração **da loja**, que
 * é compartilhada entre todo mundo que administra. Senha é pessoal, e misturar as duas faria uma
 * preferência individual morar no meio de ajustes que valem para a vitrine inteira.
 */
const AdminAccountPage = () => {
  const { user, customer } = useAuthContext()

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        icon={UserCog}
        title="Minha conta"
        subtitle="Seus dados de acesso ao painel."
      />

      <FormCard title="Quem está conectada" description="Para mudar nome ou e-mail, peça a quem administra os acessos.">
        <dl className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-x-3">
            <dt className="text-muted-foreground w-24 shrink-0">Nome</dt>
            <dd className="font-medium text-foreground">{customer?.name || '—'}</dd>
          </div>
          <div className="flex flex-wrap gap-x-3">
            <dt className="text-muted-foreground w-24 shrink-0">E-mail</dt>
            <dd className="font-medium text-foreground break-all">{user?.email || '—'}</dd>
          </div>
        </dl>
      </FormCard>

      <ChangePasswordCard />
    </div>
  )
}

export default AdminAccountPage
