import { cn } from '@estrelinha/ui/lib/utils'
import { FALHA_AO_ABRIR_CLIENTE, NAO_ENCONTREI_CLIENTE } from '@/entities/customer'
import { BOTAO_SECUNDARIO } from '@/shared/ui/campo'

import { useAbrirCliente } from '../model/useAbrirCliente'

/**
 * O botão "Ver cliente" (feature `76`, `MAC-21`, A11) — do bloco Cliente do detalhe do pedido para a
 * ficha. 44 px de altura e a largura inteira; "Abrindo…" **não muda o tamanho** (as mesmas classes de
 * largura e altura nos dois estados, só o texto troca). A frase da falha fica na linha de baixo, nunca
 * dentro do botão: `role="status"` para "Não encontrei esta cliente." (não é erro, é um fato) e
 * `role="alert"` para "Não consegui abrir agora. Tente de novo." (o toque seguinte tenta de novo).
 *
 * O botão não some depois da falha: tentar de novo é tocar nele.
 */
export interface VerClienteProps {
  /** O e-mail do pedido — é por ele que a pessoa é procurada. */
  email: string
  /** A recusa (`42501`) da leitura sobe à vigia da página; ela não vira frase aqui. */
  aoRecusa?: (erro: unknown) => void
}

const CLASSES = cn(BOTAO_SECUNDARIO, 'min-h-11 border border-estrelinha-primary px-4 py-2 aria-disabled:opacity-70')

const VerCliente = ({ email, aoRecusa }: VerClienteProps) => {
  const { estado, abrir } = useAbrirCliente(email, aoRecusa)
  const abrindo = estado === 'abrindo'
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void abrir()}
        aria-disabled={abrindo ? 'true' : undefined}
        className={CLASSES}
      >
        {abrindo ? 'Abrindo…' : 'Ver cliente'}
      </button>
      {estado === 'nao-achou' && (
        <p role="status" className="text-sm text-estrelinha-ink-soft [overflow-wrap:anywhere]">
          {NAO_ENCONTREI_CLIENTE}
        </p>
      )}
      {estado === 'falhou' && (
        <p role="alert" className="text-sm text-estrelinha-alert [overflow-wrap:anywhere]">
          {FALHA_AO_ABRIR_CLIENTE}
        </p>
      )}
    </div>
  )
}

export default VerCliente
