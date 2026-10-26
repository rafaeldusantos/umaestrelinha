import { queueAge, queueAgeLabel } from '@estrelinha/core/material'
import type { QueueBlockId } from '@estrelinha/core/orders'
import type { OverviewQueue } from '@estrelinha/core/stats'

/** O campo da resposta de `store_overview` que conta cada bloco. Exaustivo pelo `Record`. */
export const CONTAGEM_DO_BLOCO: Record<QueueBlockId, keyof Omit<OverviewQueue, 'aguardando_desde' | 'precisa_acao'>> = {
  aguardando: 'aguardando',
  'a-separar': 'a_separar',
  'sem-rastreio': 'sem_rastreio',
  'pix-aguardando': 'pix_aguardando',
}

/** "o mais antigo há 9 dias" — a idade de `queueAge`, a MESMA do painel, contra o instante do servidor. */
export const idadeDoMaisAntigo = (fila: OverviewQueue, lidoEm: string): string | null => {
  if (fila.aguardando === 0) return null
  const idade = queueAge(fila.aguardando_desde, new Date(lidoEm))
  return idade ? `o mais antigo ${queueAgeLabel(idade)}` : null
}
