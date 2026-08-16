import { useEffect, useState } from 'react'
import { Button } from '@estrelinha/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@estrelinha/ui/dialog'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { Textarea } from '@estrelinha/ui/textarea'
import { FAQ_ANSWER_MAX, FAQ_QUESTION_MAX, faqRefusal } from '@estrelinha/core/faq'

export interface FaqDraft {
  id?: string
  question: string
  answer: string
}

interface Props {
  open: boolean
  /** `undefined` = criar; com `id` = editar. */
  draft?: FaqDraft
  onClose: () => void
  /** Devolve o motivo da recusa, ou `null` quando gravou. */
  onSave: (question: string, answer: string) => Promise<string | null>
}

/**
 * Criar e editar uma entrada da biblioteca — `FAQ-12`, `FAQ-18`.
 *
 * **A recusa vem de `faqRefusal`, a mesma que o hook chama antes de gravar e que o `check` da
 * migration repete em SQL.** Três lugares, uma régua: o componente barra cedo para a dona não perder
 * o texto, o hook barra porque a escrita pode não vir daqui, e o banco barra porque é o único que não
 * pode ser contornado.
 */
const FaqEditorDialog = ({ open, draft, onClose, onSave }: Props) => {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!open) return
    setQuestion(draft?.question ?? '')
    setAnswer(draft?.answer ?? '')
    setErro(null)
  }, [open, draft])

  const editando = Boolean(draft?.id)

  const salvar = async () => {
    const recusa = faqRefusal(question, answer)
    if (recusa) {
      setErro(recusa)
      return
    }

    setSalvando(true)
    const motivo = await onSave(question, answer)
    setSalvando(false)

    if (motivo) {
      setErro(motivo)
      return
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={aberto => !aberto && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar pergunta' : 'Nova pergunta'}</DialogTitle>
          <DialogDescription>
            {editando
              ? 'A resposta vale para todos os produtos que usam o padrão. Quem tem resposta própria não é alterado.'
              : 'A pergunta entra na biblioteca e pode ser usada em quantos produtos você quiser.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="faq-question">Pergunta</Label>
              <span className="text-xs text-muted-foreground" data-testid="faq-question-counter">
                {question.trim().length} / {FAQ_QUESTION_MAX}
              </span>
            </div>
            <Input
              id="faq-question"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Como envio meu material de DNA?"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="faq-answer">Resposta</Label>
              <span className="text-xs text-muted-foreground" data-testid="faq-answer-counter">
                {answer.trim().length} / {FAQ_ANSWER_MAX}
              </span>
            </div>
            {/* Texto puro, não HTML: medido, zero das 3.476 respostas do catálogo usa tag. Um editor
                rico aqui abriria na resposta a mesma superfície que a descrição paga um sanitizador
                inteiro para conter. */}
            <Textarea
              id="faq-answer"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              rows={5}
              placeholder="Após a compra, você recebe as instruções para enviar seu material com segurança."
            />
          </div>

          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando…' : editando ? 'Salvar' : 'Criar pergunta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default FaqEditorDialog
