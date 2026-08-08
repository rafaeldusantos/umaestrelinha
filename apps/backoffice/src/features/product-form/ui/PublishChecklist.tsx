import { AlertCircle, Check } from 'lucide-react'
import { FormCard } from '@/shared/ui'
import { checklistProgress } from '../model/summaryFacts'
import type { ChecklistItem } from '../model/checklist'

interface Props {
  items: ChecklistItem[]
  /** Leva ao campo pendente. A aba precisa ser aberta antes do foco — o Radix desmonta a inativa. */
  onFocusField: (item: ChecklistItem) => void
}

/**
 * O inspetor "Pronto para publicar" (PFM-14).
 *
 * Cada item pendente é **acionável**: clicar leva ao campo. Um checklist que só informa a pendência
 * obriga o admin a caçar o campo em 5 abas, que é o problema que ele deveria resolver.
 */
const PublishChecklist = ({ items, onFocusField }: Props) => {
  const progress = checklistProgress(items)

  return (
    <FormCard
      title="Pronto para publicar"
      /* RFN-07 AC 4: a contagem sai da descrição e vira badge, como no artboard. */
      action={
        <span
          className="rounded-pill bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
          data-testid="checklist-badge"
        >
          {progress.label}
        </span>
      }
    >
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Progresso do checklist"
        aria-valuenow={progress.done}
        aria-valuemin={0}
        aria-valuemax={progress.total}
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.round(progress.ratio * 100)}%` }}
        />
      </div>

      <ul className="space-y-2">
        {items.map(item => (
          <li key={item.id}>
            {item.ok ? (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
                <span>{item.label}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onFocusField(item)}
                className="-m-1 flex w-full items-start gap-2 rounded-lg p-1 text-left text-sm transition-colors hover:bg-muted/60"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-foreground">{item.label}</span>
                  {item.hint && <span className="block text-xs text-muted-foreground">{item.hint}</span>}
                </span>
                {/* RFN-07 AC 5: a ação fica à direita do item, como no desenho — e diz `Ir →` em
                    TODOS, inclusive no SEO.
                    O item de SEO dizia `Gerar` e não gerava nada: clicar só trocava de aba e deixava
                    título e descrição vazios (BUG-20260802-gerar-do-seo-nao-gera-nada). A AC pede o
                    rótulo `Gerar`, mas `AD-011` mantém geração de texto de SEO FORA de escopo — não há
                    provedor no projeto nem AC descrevendo o texto. Entre um rótulo que mente e um que
                    descreve o que o clique faz, fica o segundo.
                    Não confundir com o `Gerar` do alt-text (aba Mídia, PMD-01 AC 2): esse existe, é
                    template determinístico, e continua como está. */}
                <span className="shrink-0 self-center text-xs font-medium text-primary">Ir →</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </FormCard>
  )
}

export default PublishChecklist
