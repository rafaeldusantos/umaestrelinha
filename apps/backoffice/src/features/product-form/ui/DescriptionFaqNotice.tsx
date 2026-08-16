import { HelpCircle } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { extractFaqPairs, stripFaqBlock } from '@estrelinha/core/faq'

interface Props {
  description: string
  /** Recebe a descrição já sem o bloco. Altera o rascunho — **não** grava. */
  onRemove: (semBloco: string) => void
  /** Leva para a aba `Perguntas`. */
  onGoToFaqTab: () => void
}

/**
 * O aviso de que parte desta descrição **não aparece na loja** — `FAQ-27`, `FAQ-28`.
 *
 * É a contrapartida obrigatória de uma decisão do usuário: as perguntas viraram cadastro, mas a
 * descrição **não** foi alterada no banco (nada é destruído, e a origem na Nuvemshop segue intacta).
 * O preço disso é que o painel mostra um texto que a loja filtra no render.
 *
 * Sem este aviso, a dona edita perguntas aqui, salva, e a loja não muda — defeito silencioso, do
 * mesmo tipo que este repositório já pagou caro três vezes (`AD-012`, `collections`, `PRM-12`). Com
 * ele, o efeito fica visível na hora e ela ganha a opção que o importador não teve permissão de tomar.
 *
 * A remoção usa **a mesma** `stripFaqBlock` que a loja usa para filtrar e que o importador usa para
 * extrair: uma fronteira, três consumidores.
 */
const DescriptionFaqNotice = ({ description, onRemove, onGoToFaqTab }: Props) => {
  const pares = extractFaqPairs(description)
  if (pares.length === 0) return null

  return (
    <div
      className="flex flex-wrap items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40"
      data-testid="description-faq-notice"
    >
      <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
      <div className="min-w-0 flex-1">
        <p className="text-foreground">
          Este texto tem {pares.length} pergunta{pares.length > 1 ? 's' : ''} frequente
          {pares.length > 1 ? 's' : ''}, e a loja <strong>não</strong> mostra {pares.length > 1 ? 'elas' : 'ela'}{' '}
          aqui — as perguntas do produto ficam na aba Perguntas.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onGoToFaqTab}>
          Ver a aba Perguntas
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onRemove(stripFaqBlock(description))}
        >
          Remover o bloco da descrição
        </Button>
      </div>
    </div>
  )
}

export default DescriptionFaqNotice
