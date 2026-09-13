import { useState } from 'react'
import { KeyRound, Pencil, Plus, ShieldOff, Trash2, Users } from 'lucide-react'
import { Badge } from '@estrelinha/ui/badge'
import { Button } from '@estrelinha/ui/button'
import { AdminTable, EmptyState, PageHeader, TableSkeleton, type AdminColumn } from '@/shared/ui'
import {
  type AdminUser,
  useAdminUsers,
} from '@/features/admin-users/api/useAdminUsers'
import AdminUserEditorDialog, {
  type AcessoDraft,
} from '@/features/admin-users/ui/AdminUserEditorDialog'
import DeleteAccountDialog from '@/features/admin-users/ui/DeleteAccountDialog'

/**
 * `/admin/usuarios` — quem entra no painel (feature 48).
 *
 * Mora no **rodapé** da sidebar, junto de Configurações: é administração do sistema, e não um dos
 * quatro eixos por fila da loja (Vendas / Descontos / Catálogo / Loja).
 *
 * A distinção que dá sentido à tela são as **duas ações destrutivas lado a lado, com consequências
 * opostas**: `Remover do painel` tira o acesso e preserva conta e histórico; `Apagar conta` destrói
 * tudo e é recusada quando há rastro na loja. Rotulá-las igual — ou oferecer só a segunda — foi
 * exatamente o que este desenho recusou.
 */

const dataCurta = (iso: string | null): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

const AdminUsersPage = () => {
  const { users, loading, error, refetch, create, update, revoke, remove, resetPassword } =
    useAdminUsers()

  const [draft, setDraft] = useState<AcessoDraft | undefined>(undefined)
  const [editorAberto, setEditorAberto] = useState(false)
  const [aApagar, setAApagar] = useState<AdminUser | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [recado, setRecado] = useState<string | null>(null)

  const abrirNovo = () => {
    setDraft(undefined)
    setEditorAberto(true)
  }

  const abrirEdicao = (u: AdminUser) => {
    setDraft({ id: u.id, name: u.name, email: u.email })
    setEditorAberto(true)
  }

  const limpar = () => {
    setAviso(null)
    setRecado(null)
  }

  const remover = async (u: AdminUser) => {
    limpar()
    const motivo = await revoke(u.id)
    if (motivo) setAviso(motivo)
    else setRecado(`${u.name || u.email} não tem mais acesso ao painel. A conta e o histórico ficam.`)
  }

  const enviarLink = async (u: AdminUser) => {
    limpar()
    const motivo = await resetPassword(u.id)
    if (motivo) setAviso(motivo)
    else setRecado(`Enviamos um código de redefinição para ${u.email}.`)
  }

  const columns: AdminColumn<AdminUser>[] = [
    {
      key: 'pessoa',
      header: 'Quem',
      cell: u => (
        <div className="min-w-0">
          <p className="font-medium text-foreground">
            {u.name || '—'}
            {u.is_self && (
              <Badge variant="secondary" className="ml-2 align-middle">
                você
              </Badge>
            )}
          </p>
          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
        </div>
      ),
    },
    {
      key: 'ultimo_acesso',
      header: 'Último acesso',
      cell: u => (
        <span className="text-sm text-muted-foreground">
          {u.last_sign_in_at ? dataCurta(u.last_sign_in_at) : 'nunca entrou'}
        </span>
      ),
    },
    {
      key: 'desde',
      header: 'Desde',
      cell: u => <span className="text-sm text-muted-foreground">{dataCurta(u.created_at)}</span>,
    },
    {
      key: 'acoes',
      header: '',
      align: 'right',
      cell: u => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Editar ${u.name || u.email}`}
            onClick={() => abrirEdicao(u)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Enviar link de redefinição para ${u.email}`}
            onClick={() => void enviarLink(u)}
          >
            <KeyRound className="w-4 h-4" />
          </Button>
          {/* As duas destrutivas. `is_self` desabilita as duas com o motivo no `title`, porque a
              recusa que só aparece depois do clique faz a dona pensar que algo quebrou. */}
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remover ${u.name || u.email} do painel`}
            title={u.is_self ? 'Você não pode remover o seu próprio acesso' : undefined}
            disabled={u.is_self}
            onClick={() => void remover(u)}
          >
            <ShieldOff className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Apagar a conta de ${u.name || u.email}`}
            title={u.is_self ? 'Você não pode apagar a sua própria conta' : undefined}
            disabled={u.is_self}
            onClick={() => setAApagar(u)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Usuários do painel"
        subtitle="Quem pode entrar no painel e gerenciar a loja. Remover o acesso preserva a conta e o histórico; apagar a conta não."
        icon={Users}
        actions={
          <Button onClick={abrirNovo}>
            <Plus className="w-4 h-4 mr-2" />
            Novo acesso
          </Button>
        }
      />

      {aviso && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {aviso}
        </p>
      )}
      {recado && (
        <p role="status" className="mb-4 text-sm text-muted-foreground">
          {recado}
        </p>
      )}

      {/* Lista vazia e lista ilegível não são o mesmo estado. Aqui a diferença é maior que o normal:
          "nenhum acesso" seria um painel em que ninguém entra — se fosse verdade. */}
      {error ? (
        <EmptyState
          icon={Users}
          message="Não conseguimos carregar a lista de acessos."
          hint={error}
          action={<Button onClick={() => void refetch()}>Tentar de novo</Button>}
        />
      ) : loading ? (
        <TableSkeleton />
      ) : (
        <AdminTable
          columns={columns}
          data={users}
          rowKey={u => u.id}
          empty={{
            icon: Users,
            message: 'Nenhum acesso cadastrado.',
            hint: 'Crie o primeiro acesso para que alguém consiga entrar no painel.',
          }}
        />
      )}

      <AdminUserEditorDialog
        open={editorAberto}
        draft={draft}
        onClose={() => setEditorAberto(false)}
        onSave={(name, email, password) => {
          limpar()
          return draft?.id
            ? update(draft.id, name, email)
            : create({ name, email, password })
        }}
      />

      <DeleteAccountDialog
        open={aApagar !== null}
        email={aApagar?.email ?? ''}
        name={aApagar?.name ?? ''}
        onClose={() => setAApagar(null)}
        onRevoke={() => {
          const alvo = aApagar
          setAApagar(null)
          if (alvo) void remover(alvo)
        }}
        onConfirm={async () => {
          limpar()
          return aApagar ? await remove(aApagar.id) : null
        }}
      />
    </div>
  )
}

export default AdminUsersPage
