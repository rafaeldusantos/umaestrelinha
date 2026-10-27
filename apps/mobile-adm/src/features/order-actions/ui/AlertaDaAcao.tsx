import { cn } from '@estrelinha/ui/lib/utils'

import { AVISO_DE_ERRO } from '@/shared/ui/campo'
import { TENTAR_DE_NOVO } from '@/shared/ui/leitura'

import type { ErroDaAcao } from '../model/erros'

/**
 * O erro de UMA ação, junto dela (feature `82`, Fase 5, T16/T17): a frase em `role="alert"` e, quando
 * o erro guarda uma retentativa, "Tentar de novo" (alvo de 44 px) — que reenvia `erro.retentativa` pela
 * ação do pedido (a mesma trava). Usado pela folha do rastreio, pelo bloco do envelope e por "Colocar em
 * produção"; o rodapé e o cartão têm o seu desde a `75`.
 */
export interface AlertaDaAcaoProps {
  erro: ErroDaAcao
  aoTentarDeNovo: (retentativa: NonNullable<ErroDaAcao['retentativa']>) => void
  className?: string
}

const AlertaDaAcao = ({ erro, aoTentarDeNovo, className }: AlertaDaAcaoProps) => {
  const retentativa = erro.retentativa
  return (
    <div role="alert" className={cn(AVISO_DE_ERRO, 'flex flex-wrap items-center gap-x-3 gap-y-1 [overflow-wrap:anywhere]', className)}>
      <p className="min-w-0 flex-1">{erro.frase}</p>
      {retentativa && (
        <button type="button" onClick={() => aoTentarDeNovo(retentativa)} className="min-h-11 font-medium underline underline-offset-4">
          {TENTAR_DE_NOVO}
        </button>
      )}
    </div>
  )
}

export default AlertaDaAcao
