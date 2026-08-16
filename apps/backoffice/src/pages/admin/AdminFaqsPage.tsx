import { useMemo, useState } from 'react'
import { HelpCircle, Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@estrelinha/ui/badge'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Switch } from '@estrelinha/ui/switch'
import { faqQuestionKey } from '@estrelinha/core/faq'
import { AdminTable, EmptyState, PageHeader, TableSkeleton, type AdminColumn } from '@/shared/ui'
import { useAdminCategories } from '@/entities/category/api/useAdminCategories'
import { useAdminFaqs, type AdminFaq } from '@/features/faq-library/api/useAdminFaqs'
import ApplyToCategoryDialog from '@/features/faq-library/ui/ApplyToCategoryDialog'
import FaqEditorDialog, { type FaqDraft } from '@/features/faq-library/ui/FaqEditorDialog'

/**
 * `/admin/perguntas` — a biblioteca (`FAQ-14`, `FAQ-15`).
 *
 * Mora no grupo **Catálogo** da sidebar, depois de Categorias: é conteúdo de catálogo, e não
 * curadoria de vitrine (que é o grupo `Loja`).
 *
 * A coluna **"em N produtos"** é a que dá sentido à tela: sem ela, editar uma resposta é uma decisão
 * às cegas — a diferença entre mexer em 3 páginas e mexer em 483.
 */
const AdminFaqsPage = () => {
  const { faqs, loading, error, refetch, create, update, toggle, remove } = useAdminFaqs()
  const { categories } = useAdminCategories()

  const [busca, setBusca] = useState('')
  const [draft, setDraft] = useState<FaqDraft | undefined>(undefined)
  const [editorAberto, setEditorAberto] = useState(false)
  const [lote, setLote] = useState<AdminFaq | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const filtradas = useMemo(() => {
    const chave = faqQuestionKey(busca)
    if (chave === '') return faqs
    return faqs.filter(
      f => f.question_key.includes(chave) || faqQuestionKey(f.answer).includes(chave),
    )
  }, [faqs, busca])

  const abrirNova = () => {
    setDraft(undefined)
    setEditorAberto(true)
  }

  const abrirEdicao = (faq: AdminFaq) => {
    setDraft({ id: faq.id, question: faq.question, answer: faq.answer })
    setEditorAberto(true)
  }

  const apagar = async (faq: AdminFaq) => {
    const motivo = await remove(faq.id)
    setAviso(motivo)
  }

  const columns: AdminColumn<AdminFaq>[] = [
    {
      key: 'question',
      header: 'Pergunta',
      cell: faq => (
        <div className="min-w-0">
          <p className="font-medium text-foreground">{faq.question}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{faq.answer}</p>
        </div>
      ),
    },
    {
      key: 'usage',
      header: 'Em quantos produtos',
      align: 'right',
      cell: faq =>
        faq.usage === 0 ? (
          <span className="text-muted-foreground">nenhum</span>
        ) : (
          <Badge variant="secondary">{faq.usage}</Badge>
        ),
    },
    {
      key: 'active',
      header: 'Na loja',
      align: 'center',
      cell: faq => (
        <Switch
          checked={faq.is_active}
          onCheckedChange={valor => void toggle(faq.id, valor)}
          aria-label={`${faq.is_active ? 'Desativar' : 'Ativar'} “${faq.question}”`}
        />
      ),
    },
    {
      key: 'acoes',
      header: '',
      align: 'right',
      cell: faq => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Editar “${faq.question}”`}
            onClick={() => abrirEdicao(faq)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Aplicar “${faq.question}” a uma categoria`}
            onClick={() => setLote(faq)}
          >
            <Layers className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Apagar “${faq.question}”`}
            onClick={() => void apagar(faq)}
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
        title="Perguntas frequentes"
        subtitle="A biblioteca que os produtos usam. Editar uma resposta aqui alcança todos os produtos que usam o padrão."
        icon={HelpCircle}
        actions={
          <Button onClick={abrirNova}>
            <Plus className="w-4 h-4 mr-2" />
            Nova pergunta
          </Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <Input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar pergunta ou resposta"
          aria-label="Buscar pergunta ou resposta"
        />
      </div>

      {aviso && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {aviso}
        </p>
      )}

      {/* Biblioteca vazia e biblioteca ilegível não são o mesmo estado — a tela de Coleções passou
          meses mostrando "vazio" sobre uma tabela que não existia (`AD-014`). */}
      {error ? (
        <EmptyState
          icon={HelpCircle}
          message="Não foi possível ler a biblioteca."
          hint={error}
          action={<Button onClick={() => void refetch()}>Tentar de novo</Button>}
        />
      ) : loading ? (
        <TableSkeleton />
      ) : (
        <AdminTable
          columns={columns}
          data={filtradas}
          rowKey={faq => faq.id}
          empty={{
            icon: HelpCircle,
            message:
              busca.trim() === ''
                ? 'A biblioteca está vazia.'
                : 'Nenhuma pergunta com esse texto.',
            hint:
              busca.trim() === ''
                ? 'As perguntas das descrições entram aqui quando o importador do catálogo roda.'
                : undefined,
          }}
        />
      )}

      <FaqEditorDialog
        open={editorAberto}
        draft={draft}
        onClose={() => setEditorAberto(false)}
        onSave={(question, answer) =>
          draft?.id ? update(draft.id, question, answer) : create(question, answer)
        }
      />

      <ApplyToCategoryDialog
        open={lote !== null}
        faqId={lote?.id ?? null}
        faqQuestion={lote?.question ?? ''}
        categories={categories}
        onClose={() => setLote(null)}
        onDone={() => void refetch()}
      />
    </div>
  )
}

export default AdminFaqsPage
