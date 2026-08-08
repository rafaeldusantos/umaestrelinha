import { useState } from 'react'
import { Plus, Pencil, Trash2, Sparkles, ImagePlus } from 'lucide-react'
import { useAdminMockups, type MockupTemplateInput } from '@/entities/mockup'
import { MockupTemplateDialog } from '@/features/mockup-studio'
import { PageHeader, AdminTable, EmptyState, type AdminColumn } from '@/shared/ui'
import { Button } from '@estrelinha/ui/button'
import { Badge } from '@estrelinha/ui/badge'
import { Switch } from '@estrelinha/ui/switch'
import { toast } from '@estrelinha/ui/hooks/use-toast'
import type { MockupTemplate } from '@estrelinha/supabase/types'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@estrelinha/ui/alert-dialog'

const AdminMockupsPage = () => {
  const { templates, loading, create, update, remove } = useAdminMockups()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MockupTemplate | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const openNew = () => { setEditing(null); setDialogOpen(true) }

  const handleSave = async (data: MockupTemplateInput): Promise<Error | null> => {
    const err = editing ? await update(editing.id, data) : await create(data)
    return err ? new Error(err.message) : null
  }

  const handleToggle = async (t: MockupTemplate) => {
    const err = await update(t.id, { is_active: !t.is_active })
    if (err) toast({ title: 'Erro ao atualizar', variant: 'destructive' })
  }

  const handleDelete = async () => {
    if (!deleting) return
    const err = await remove(deleting)
    if (err) toast({ title: 'Erro ao excluir', variant: 'destructive' })
    else toast({ title: 'Mockup excluído!' })
    setDeleting(null)
  }

  const columns: AdminColumn<MockupTemplate>[] = [
    {
      key: 'thumb',
      header: 'Fundo',
      cell: t => (
        <img src={t.background_url} alt={t.name} className="h-12 w-12 rounded-lg border border-border object-cover" />
      ),
    },
    {
      key: 'name',
      header: 'Nome',
      cell: t => (
        <div>
          <p className="font-medium text-foreground">{t.name}</p>
          <p className="text-xs text-muted-foreground">{t.overlay_url ? 'Com overlay' : 'Sem overlay'} · {t.blend_mode}</p>
        </div>
      ),
    },
    {
      key: 'active',
      header: 'Ativo',
      align: 'center',
      cell: t => (
        <div className="flex items-center justify-center gap-2">
          <Switch checked={t.is_active} onCheckedChange={() => handleToggle(t)} />
          {t.is_active
            ? <Badge variant="secondary" className="text-xs">Ativo</Badge>
            : <Badge variant="outline" className="text-xs text-muted-foreground">Inativo</Badge>}
        </div>
      ),
    },
    {
      key: 'sort_order',
      header: 'Ordem',
      align: 'center',
      cell: t => <span className="text-muted-foreground">{t.sort_order}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: t => (
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setDialogOpen(true) }} aria-label="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleting(t.id)} aria-label="Excluir">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Mockups"
        subtitle="Templates para gerar fotos realistas de bottons"
        icon={Sparkles}
        actions={
          <Button className="gradient-cta text-white" onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" /> Novo mockup
          </Button>
        }
      />

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Carregando...</div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={ImagePlus}
          message="Nenhum mockup ainda"
          hint="Crie um template com fundo, overlay e área da arte para gerar fotos de produto."
          action={
            <Button className="gradient-cta text-white" onClick={openNew}>
              <Plus className="mr-1 h-4 w-4" /> Novo mockup
            </Button>
          }
        />
      ) : (
        <AdminTable columns={columns} data={templates} rowKey={t => t.id} />
      )}

      <MockupTemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={editing}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mockup?</AlertDialogTitle>
            <AlertDialogDescription>
              Os assets (fundo e overlay) serão removidos. Imagens de produto já geradas permanecem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default AdminMockupsPage
