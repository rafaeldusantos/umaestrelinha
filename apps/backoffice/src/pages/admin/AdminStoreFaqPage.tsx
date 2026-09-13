import { useMemo, useState } from 'react'
import { ExternalLink, Info, MessageCircleQuestion, Plus } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { FAQ_PAGE_CATEGORIES, faqQuestionKey } from '@estrelinha/core/faq'
import { FAQ_PATH } from '@estrelinha/core/routes'
import { EmptyState, PageHeader, TableSkeleton } from '@/shared/ui'
import { useAdminFaqs } from '@/features/faq-library/api/useAdminFaqs'
import { useAdminFaqPage, type AdminFaqPageItem } from '@/features/faq-page/api/useAdminFaqPage'
import AddQuestionDialog from '@/features/faq-page/ui/AddQuestionDialog'
import FaqPageGroupCard from '@/features/faq-page/ui/FaqPageGroupCard'

/**
 * `/admin/perguntas-frequentes` — a curadoria da página pública (feature 46).
 *
 * Mora no grupo **Loja** da sidebar, e não em Catálogo: é curadoria do que a cliente VÊ, a mesma
 * régua que trouxe o Menu da loja para lá. O conteúdo que ela cura mora na **Biblioteca de
 * perguntas** — que é a tela que os produtos também usam, e que foi renomeada nesta feature
 * justamente para a diferença caber no nome.
 *
 * **O aviso de resposta compartilhada é a peça mais importante da tela.** Sem ele, a Adri editaria
 * uma resposta aqui sem saber que ela alcança as páginas de produto — e é o alcance que faz esta
 * arquitetura valer a pena.
 */
const AdminStoreFaqPage = () => {
  const {
    items,
    loading,
    error,
    refetch,
    adicionar,
    criarEAdicionar,
    remover,
    reordenar,
    moverDeAssunto,
  } = useAdminFaqPage()
  const { faqs } = useAdminFaqs()

  const [busca, setBusca] = useState('')
  const [dialogoAberto, setDialogoAberto] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const filtrados = useMemo(() => {
    const chave = faqQuestionKey(busca)
    if (chave === '') return items
    return items.filter(
      i => faqQuestionKey(i.question).includes(chave) || faqQuestionKey(i.answer).includes(chave),
    )
  }, [items, busca])

  const publicadas = items.filter(i => i.is_active).length
  const foraDoAr = items.length - publicadas

  const executar = async (acao: Promise<string | null>) => setAviso(await acao)

  return (
    <div>
      <PageHeader
        title="Página de perguntas"
        subtitle="O que a cliente vê em /perguntas-frequentes. As respostas saem da mesma biblioteca que os produtos usam — editar aqui alcança as duas telas."
        icon={MessageCircleQuestion}
        actions={
          <div className="flex flex-row items-center gap-2">
            <Button variant="outline" asChild>
              <a href={FAQ_PATH} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver na loja
              </a>
            </Button>
            <Button onClick={() => setDialogoAberto(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar pergunta
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-row items-center gap-4">
        <Input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar pergunta ou resposta"
          aria-label="Buscar pergunta ou resposta"
          className="max-w-sm"
        />
        {!loading && !error && (
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? 'pergunta' : 'perguntas'} na página · {publicadas}{' '}
            {publicadas === 1 ? 'publicada' : 'publicadas'}
            {foraDoAr > 0 && ` · ${foraDoAr} fora do ar`}
          </p>
        )}
      </div>

      {aviso && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {aviso}
        </p>
      )}

      {error ? (
        <EmptyState
          icon={MessageCircleQuestion}
          message="Não foi possível ler a página de perguntas."
          hint={error}
          action={<Button onClick={() => void refetch()}>Tentar de novo</Button>}
        />
      ) : loading ? (
        <TableSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon={MessageCircleQuestion}
          message="A página de perguntas está vazia."
          hint="Acrescente perguntas da biblioteca — elas aparecem em /perguntas-frequentes na hora, sem publicar nada."
          action={<Button onClick={() => setDialogoAberto(true)}>Adicionar pergunta</Button>}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {FAQ_PAGE_CATEGORIES.map(({ key, label }) => {
            const doAssunto = filtrados.filter(i => i.category === key)
            if (doAssunto.length === 0) return null

            return (
              <FaqPageGroupCard
                key={key}
                label={label}
                items={doAssunto}
                onEditar={(item: AdminFaqPageItem) => {
                  // A edição do TEXTO mora na Biblioteca: é lá que a resposta tem dono. Daqui se
                  // abre a tela certa, em vez de duplicar o editor.
                  window.open(`/admin/perguntas?q=${encodeURIComponent(item.question)}`, '_blank')
                }}
                onRemover={item => void executar(remover(item.faq_id))}
                onReordenar={ordem => void executar(reordenar(key, ordem))}
                onMoverParaCa={faqId => void executar(moverDeAssunto(faqId, key))}
              />
            )
          })}

          <div className="flex flex-row items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
            <Info aria-hidden className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-foreground">
                A resposta é a mesma nos dois lugares.
              </p>
              <p className="text-sm text-muted-foreground">
                Uma pergunta marcada como “em N produtos” também aparece na página daquelas peças.
                Editar o texto na biblioteca muda nos dois de uma vez — é isso que impede a loja de
                responder duas coisas diferentes para a mesma dúvida.
              </p>
            </div>
          </div>
        </div>
      )}

      <AddQuestionDialog
        open={dialogoAberto}
        biblioteca={faqs}
        jaNaPagina={items.map(i => i.faq_id)}
        onClose={() => setDialogoAberto(false)}
        onEscolher={adicionar}
        onCriar={criarEAdicionar}
      />
    </div>
  )
}

export default AdminStoreFaqPage
