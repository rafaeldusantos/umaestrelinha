import { useMemo, useState } from 'react'
import { GripVertical, Plus, RotateCcw, Sparkles, Trash2 } from 'lucide-react'
import { Badge } from '@estrelinha/ui/badge'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Textarea } from '@estrelinha/ui/textarea'
import { cn } from '@estrelinha/ui/lib/utils'
import { FAQ_ANSWER_MAX, faqQuestionKey } from '@estrelinha/core/faq'
import { FormCard } from '@/shared/ui'
import type { AdminFaq } from '@/features/faq-library/api/useAdminFaqs'
import FaqEditorDialog from '@/features/faq-library/ui/FaqEditorDialog'
import { useFaqSuggestions } from '@/features/product-form/api/useFaqSuggestions'
import type { ProductFaqSelection } from '@/features/product-form/model/planFaqLinks'

/**
 * Acima disto o painel avisa — e **não recusa**.
 *
 * 8 é o máximo medido no catálogo real. Um teto rígido recusaria dado que já existe; um aviso
 * informa sem impedir, que é o que a dona precisa para decidir.
 */
export const FAQ_AVISO_ACIMA_DE = 8

interface Props {
  /** As perguntas do produto, na ordem. */
  value: readonly ProductFaqSelection[]
  onChange: (proximo: ProductFaqSelection[]) => void
  /** A biblioteca inteira, para buscar e para resolver o texto de cada vínculo. */
  library: readonly AdminFaq[]
  /** As categorias do produto — a sugestão sai delas. */
  categoryIds: readonly string[]
  /** Cria uma entrada nova na biblioteca. Devolve o motivo da recusa, ou `null`. */
  onCreate: (question: string, answer: string) => Promise<string | null>
}

/**
 * A aba `Perguntas` do formulário do produto — `FAQ-16`, `FAQ-17`, `FAQ-34`, `FAQ-37`.
 *
 * Três blocos, nesta ordem: **o que o produto tem**, **o que sugerimos** e **de onde tirar mais**. A
 * sugestão vem antes da busca de propósito: em 84% dos casos ela já traz o que a dona ia procurar, e
 * pôr a busca primeiro faria o caminho longo parecer o caminho normal.
 */
const FaqTab = ({ value, onChange, library, categoryIds, onCreate }: Props) => {
  const [busca, setBusca] = useState('')
  const [criando, setCriando] = useState(false)
  const [arrastado, setArrastado] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const porId = useMemo(() => new Map(library.map(f => [f.id, f])), [library])
  const vinculadas = useMemo(() => new Set(value.map(v => v.faq_id)), [value])

  const { suggestions } = useFaqSuggestions(categoryIds, [...vinculadas])

  const resultados = useMemo(() => {
    const chave = faqQuestionKey(busca)
    if (chave === '') return []
    return library
      .filter(f => !vinculadas.has(f.id))
      .filter(f => f.question_key.includes(chave) || faqQuestionKey(f.answer).includes(chave))
      .slice(0, 8)
  }, [busca, library, vinculadas])

  const adicionar = (faq: AdminFaq | undefined, faqId?: string) => {
    const id = faq?.id ?? faqId
    if (!id) return
    if (vinculadas.has(id)) {
      setAviso('Esta pergunta já está no produto.')
      return
    }
    setAviso(null)
    onChange([
      ...value,
      { faq_id: id, answer_override: null, defaultAnswer: porId.get(id)?.answer ?? null },
    ])
  }

  const remover = (faqId: string) => onChange(value.filter(v => v.faq_id !== faqId))

  const setOverride = (faqId: string, texto: string | null) =>
    onChange(value.map(v => (v.faq_id === faqId ? { ...v, answer_override: texto } : v)))

  /** Mesmo arrasto nativo dos editores da Home — o projeto não tem biblioteca de DnD. */
  const soltar = (destino: string) => {
    if (!arrastado || arrastado === destino) return
    const de = value.findIndex(v => v.faq_id === arrastado)
    const para = value.findIndex(v => v.faq_id === destino)
    if (de === -1 || para === -1) return

    const proximo = [...value]
    const [movido] = proximo.splice(de, 1)
    proximo.splice(para, 0, movido)
    onChange(proximo)
    setArrastado(null)
  }

  return (
    <div className="space-y-4">
      <FormCard
        title="Perguntas deste produto"
        description="A cliente lê estas perguntas na página do produto, nesta ordem."
      >
        {value.length === 0 && (
          <p data-testid="faq-lista-vazia" className="py-2 text-sm text-muted-foreground">
            Este produto ainda não tem pergunta nenhuma — a seção “Perguntas Frequentes” não vai
            aparecer na loja.
          </p>
        )}

        {value.length > FAQ_AVISO_ACIMA_DE && (
          <p data-testid="faq-aviso-muitas" className="text-sm text-muted-foreground">
            {value.length} perguntas é bastante — a maior ficha do catálogo tem {FAQ_AVISO_ACIMA_DE}.
          </p>
        )}

        <div>
          {value.map((item, indice) => {
            const entrada = porId.get(item.faq_id)
            const padrao = entrada?.answer ?? ''
            const proprio = item.answer_override ?? null

            return (
              <div
                key={item.faq_id}
                data-testid={`faq-linha-${indice}`}
                draggable
                onDragStart={() => setArrastado(item.faq_id)}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  soltar(item.faq_id)
                }}
                className="flex items-start gap-3 border-b border-border/60 py-3 last:border-0"
              >
                <span className="flex w-4 shrink-0 justify-center pt-2">
                  <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" aria-hidden />
                </span>
                <span className="w-5 shrink-0 pt-2 text-xs font-semibold text-muted-foreground">
                  {indice + 1}
                </span>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                      {entrada?.question ?? 'Pergunta removida da biblioteca'}
                    </p>
                    {proprio !== null && (
                      <Badge variant="secondary" data-testid={`faq-propria-${indice}`}>
                        resposta própria
                      </Badge>
                    )}
                    {entrada && !entrada.is_active && (
                      <Badge variant="outline">desativada — não aparece na loja</Badge>
                    )}
                  </div>

                  {proprio === null ? (
                    <div className="flex flex-wrap items-start gap-2">
                      <p className="min-w-0 flex-1 text-sm text-muted-foreground">{padrao}</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="min-h-11"
                        onClick={() => setOverride(item.faq_id, padrao)}
                      >
                        Responder diferente nesta peça
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Textarea
                        aria-label={`Resposta desta peça para “${entrada?.question ?? ''}”`}
                        value={proprio}
                        rows={3}
                        maxLength={FAQ_ANSWER_MAX}
                        onChange={e => setOverride(item.faq_id, e.target.value)}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="min-h-11"
                        onClick={() => setOverride(item.faq_id, null)}
                      >
                        <RotateCcw className="mr-2 h-3.5 w-3.5" />
                        Voltar ao padrão
                      </Button>
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  aria-label={`Remover “${entrada?.question ?? item.faq_id}”`}
                  onClick={() => remover(item.faq_id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
        </div>

        {aviso && (
          <p role="alert" className="text-sm text-destructive">
            {aviso}
          </p>
        )}
      </FormCard>

      {/* `FAQ-34` — a sugestão. Vem antes da busca porque acerta 84% no catálogo real: pôr a busca
          primeiro faria o caminho longo parecer o normal. */}
      <FormCard
        title="Sugestões para este produto"
        description="Ranqueadas pelo que outros produtos das mesmas categorias respondem."
      >
        {suggestions.length === 0 ? (
          <p data-testid="faq-sem-sugestao" className="py-2 text-sm text-muted-foreground">
            Nenhuma sugestão por enquanto — sem categoria escolhida ou sem repertório na biblioteca.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {suggestions.map(s => {
                const entrada = porId.get(s.faq_id)
                if (!entrada) return null
                return (
                  <Button
                    key={s.faq_id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn('min-h-11 justify-start text-left')}
                    onClick={() => adicionar(entrada)}
                  >
                    <Plus className="mr-2 h-3.5 w-3.5 shrink-0" />
                    {entrada.question}
                  </Button>
                )
              })}
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="min-h-11"
              onClick={() => {
                const novos = suggestions
                  .filter(s => porId.has(s.faq_id) && !vinculadas.has(s.faq_id))
                  .map(s => ({
                    faq_id: s.faq_id,
                    answer_override: null,
                    defaultAnswer: porId.get(s.faq_id)?.answer ?? null,
                  }))
                if (novos.length > 0) onChange([...value, ...novos])
              }}
            >
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Adicionar todas
            </Button>
          </div>
        )}
      </FormCard>

      <FormCard
        title="Buscar na biblioteca"
        description="As perguntas são compartilhadas entre produtos — editar a resposta na biblioteca alcança todos que usam o padrão."
        action={
          <Button type="button" size="sm" variant="outline" onClick={() => setCriando(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Criar pergunta
          </Button>
        }
      >
        <Input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar pergunta na biblioteca"
          aria-label="Buscar pergunta na biblioteca"
        />

        {busca.trim() !== '' && resultados.length === 0 && (
          <p data-testid="faq-busca-vazia" className="text-sm text-muted-foreground">
            Nenhuma pergunta livre com esse texto. Crie uma nova.
          </p>
        )}

        <div className="flex flex-col" data-testid="faq-busca-resultados">
          {resultados.map(faq => (
            <button
              key={faq.id}
              type="button"
              onClick={() => adicionar(faq)}
              className="flex min-h-11 items-center justify-between gap-3 border-b border-border/60 py-2 text-left last:border-0 hover:bg-muted/40"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm text-foreground">{faq.question}</span>
                <span className="block truncate text-xs text-muted-foreground">{faq.answer}</span>
              </span>
              <Plus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          ))}
        </div>
      </FormCard>

      <FaqEditorDialog
        open={criando}
        onClose={() => setCriando(false)}
        onSave={onCreate}
      />
    </div>
  )
}

export default FaqTab
