import { useMemo, useState } from 'react'
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
import {
  FAQ_ANSWER_MAX,
  FAQ_PAGE_CATEGORIES,
  faqQuestionKey,
  faqRefusal,
} from '@estrelinha/core/faq'
import type { AdminFaq } from '@/features/faq-library/api/useAdminFaqs'

/**
 * Acrescentar pergunta à página — `FAQL-18`, `FAQL-19`.
 *
 * **As duas abas não são simetria de interface: são a decisão que mantém o corpus único.** A
 * biblioteca vem primeiro, com busca e com o "em N produtos" de cada entrada, porque reaproveitar é
 * o caminho certo e precisa ser o mais curto. Escrever uma nova continua disponível — só deixa de
 * ser o gesto padrão.
 *
 * **A recusa de duplicata acontece ANTES de qualquer escrita**, por `faqQuestionKey`, e nomeia a
 * entrada que já existe. O `unique` do banco é a segunda linha, não a primeira: um 23505 chegaria
 * como "erro ao salvar", e a dona não saberia que a resposta dela já está na loja.
 */
const AddQuestionDialog = ({
  open,
  biblioteca,
  jaNaPagina,
  onClose,
  onEscolher,
  onCriar,
}: {
  open: boolean
  /** As entradas da biblioteca, para a aba de reuso. */
  biblioteca: readonly AdminFaq[]
  /** Quem já está na página — não pode entrar duas vezes. */
  jaNaPagina: readonly string[]
  onClose: () => void
  onEscolher: (faqIds: string[], category: string) => Promise<string | null>
  onCriar: (question: string, answer: string, category: string) => Promise<string | null>
}) => {
  const [aba, setAba] = useState<'biblioteca' | 'nova'>('biblioteca')
  const [busca, setBusca] = useState('')
  const [escolhidas, setEscolhidas] = useState<string[]>([])
  const [assunto, setAssunto] = useState<string>(FAQ_PAGE_CATEGORIES[0].key)
  const [pergunta, setPergunta] = useState('')
  const [resposta, setResposta] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)

  const disponiveis = useMemo(() => {
    const chave = faqQuestionKey(busca)
    return biblioteca
      .filter(f => !jaNaPagina.includes(f.id))
      .filter(f => chave === '' || f.question_key.includes(chave) || faqQuestionKey(f.answer).includes(chave))
  }, [biblioteca, jaNaPagina, busca])

  const fechar = () => {
    setBusca('')
    setEscolhidas([])
    setPergunta('')
    setResposta('')
    setAviso(null)
    setAba('biblioteca')
    onClose()
  }

  const confirmar = async () => {
    setAviso(null)

    if (aba === 'biblioteca') {
      const motivo = await onEscolher(escolhidas, assunto)
      if (motivo) return setAviso(motivo)
      return fechar()
    }

    const recusa = faqRefusal(pergunta, resposta)
    if (recusa) return setAviso(recusa)

    // ⚠️ A dedup ANTES da escrita, e nomeando a entrada existente.
    const chave = faqQuestionKey(pergunta)
    const existente = biblioteca.find(f => f.question_key === chave)
    if (existente) {
      return setAviso(
        `Esta pergunta já existe na biblioteca como “${existente.question}”. ` +
          'Acrescente-a pela aba "Da biblioteca" — assim a resposta continua tendo um dono só.',
      )
    }

    const motivo = await onCriar(pergunta, resposta, assunto)
    if (motivo) return setAviso(motivo)
    fechar()
  }

  return (
    <Dialog open={open} onOpenChange={aberto => !aberto && fechar()}>
      <DialogContent className="max-w-[660px]">
        <DialogHeader>
          <DialogTitle>Adicionar pergunta à página</DialogTitle>
          <DialogDescription>
            Procure primeiro na biblioteca. Se a dúvida já tem resposta em algum produto,
            reaproveitar mantém a loja falando uma coisa só.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-row gap-1" role="tablist">
          {(
            [
              ['biblioteca', 'Da biblioteca'],
              ['nova', 'Escrever uma nova'],
            ] as const
          ).map(([chave, rotulo]) => (
            <button
              key={chave}
              type="button"
              role="tab"
              aria-selected={aba === chave}
              onClick={() => setAba(chave)}
              className={`h-9 rounded-lg px-4 text-sm ${
                aba === chave ? 'bg-primary font-semibold text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>

        {aba === 'biblioteca' ? (
          <div className="flex flex-col gap-3">
            <Input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar na biblioteca"
              aria-label="Buscar na biblioteca"
            />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {disponiveis.length} na biblioteca
            </p>
            <div className="flex max-h-[280px] flex-col overflow-y-auto">
              {disponiveis.map(f => (
                <label
                  key={f.id}
                  className="flex flex-row items-center gap-3 border-b border-border/60 py-3 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={escolhidas.includes(f.id)}
                    onChange={e =>
                      setEscolhidas(atual =>
                        e.target.checked ? [...atual, f.id] : atual.filter(id => id !== f.id),
                      )
                    }
                    className="h-4 w-4 shrink-0"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium text-foreground">{f.question}</span>
                    <span className="truncate text-xs text-muted-foreground">{f.answer}</span>
                  </span>
                  {f.usage > 0 && (
                    <span className="shrink-0 text-[11.5px] font-medium text-primary">
                      em {f.usage} {f.usage === 1 ? 'produto' : 'produtos'}
                    </span>
                  )}
                </label>
              ))}
              {disponiveis.length === 0 && (
                <p className="py-6 text-sm text-muted-foreground">
                  Nenhuma pergunta da biblioteca fora da página com esse texto.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="faq-pergunta">Pergunta</Label>
              <Input
                id="faq-pergunta"
                value={pergunta}
                onChange={e => setPergunta(e.target.value)}
                placeholder="Como devo enviar o material?"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="faq-resposta">Resposta</Label>
              <Textarea
                id="faq-resposta"
                value={resposta}
                onChange={e => setResposta(e.target.value)}
                rows={7}
                placeholder={'Linha em branco separa parágrafo.\n- Uma linha assim vira item de lista.'}
              />
              <p className="text-xs text-muted-foreground">
                {resposta.trim().length} de {FAQ_ANSWER_MAX} caracteres. Linha em branco separa
                parágrafo; linha começando com “- ” vira item de lista.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-row items-center gap-3">
          <Label htmlFor="faq-assunto" className="shrink-0 text-sm font-normal text-muted-foreground">
            Assunto na página
          </Label>
          <select
            id="faq-assunto"
            value={assunto}
            onChange={e => setAssunto(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          >
            {FAQ_PAGE_CATEGORIES.map(c => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {aviso && (
          <p role="alert" className="text-sm text-destructive">
            {aviso}
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={fechar}>
            Cancelar
          </Button>
          <Button onClick={() => void confirmar()}>
            {aba === 'biblioteca'
              ? `Adicionar ${escolhidas.length} ${escolhidas.length === 1 ? 'pergunta' : 'perguntas'}`
              : 'Criar e adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddQuestionDialog
