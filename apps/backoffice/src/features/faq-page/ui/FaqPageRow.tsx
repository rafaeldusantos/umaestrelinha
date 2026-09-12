import { GripVertical, MinusCircle, Pencil } from 'lucide-react'
import { Badge } from '@estrelinha/ui/badge'
import { Button } from '@estrelinha/ui/button'
import type { AdminFaqPageItem } from '../api/useAdminFaqPage'

/**
 * Uma linha da página de perguntas — `FAQL-22`, `FAQL-23`.
 *
 * **As colunas da direita têm largura FIXA (`shrink-0`)**, e não é decoração: sem elas, o selo, o
 * aviso e as ações se deslocam a cada linha, porque o texto da pergunta tem comprimento desigual.
 * Uma lista onde os botões dançam é uma lista em que se clica no botão errado.
 *
 * **"em N produtos" só aparece com N > 0.** Um selo dizendo "zero" é ruído em 26 linhas — e a
 * ausência já diz o que precisa: esta pergunta é só da página. É divergência declarada do artboard,
 * que desenhava um "só nesta página" em cinza.
 */
const FaqPageRow = ({
  item,
  onEditar,
  onRemover,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  item: AdminFaqPageItem
  onEditar: (item: AdminFaqPageItem) => void
  onRemover: (item: AdminFaqPageItem) => void
  onDragStart?: (faqId: string) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (faqId: string) => void
}) => {
  const inativa = !item.is_active

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('text/plain', item.faq_id)
        onDragStart?.(item.faq_id)
      }}
      onDragOver={onDragOver}
      onDrop={e => {
        e.preventDefault()
        onDrop?.(item.faq_id)
      }}
      data-faq-id={item.faq_id}
      className={`flex flex-row items-center gap-4 border-b border-border/60 px-5 py-3 last:border-b-0 ${
        inativa ? 'bg-muted/40' : ''
      }`}
    >
      <GripVertical
        aria-hidden
        className="w-4 h-4 shrink-0 cursor-grab text-muted-foreground"
      />

      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex flex-row items-center gap-2">
          <p className={`text-sm font-medium truncate ${inativa ? 'text-muted-foreground' : 'text-foreground'}`}>
            {item.question || 'Pergunta fora do ar'}
          </p>
          {inativa && (
            <Badge variant="outline" className="shrink-0 text-[10.5px] uppercase tracking-wide">
              Fora do ar
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {/* O literal do aviso é asserido no teste: é a frase que explica o efeito combinado dos
              dois eixos (ativa na biblioteca × presente na página), e apagá-la deixaria o selo sem
              significado. */}
          {inativa
            ? 'Desativada na biblioteca — não aparece nesta página nem em nenhum produto.'
            : item.answer_override
              ? `Texto próprio desta página: ${item.answer_override}`
              : item.answer}
        </p>
      </div>

      <div className="flex flex-row items-center justify-end w-[150px] shrink-0">
        {item.usage > 0 && (
          <Badge variant="secondary" className="whitespace-nowrap">
            em {item.usage} {item.usage === 1 ? 'produto' : 'produtos'}
          </Badge>
        )}
      </div>

      <div className="flex flex-row items-center justify-end gap-1 w-[88px] shrink-0">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Editar “${item.question}”`}
          onClick={() => onEditar(item)}
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Tirar “${item.question}” da página`}
          onClick={() => onRemover(item)}
        >
          <MinusCircle className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

export default FaqPageRow
