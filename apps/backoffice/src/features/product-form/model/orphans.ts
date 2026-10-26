// As órfãs da grade — feature 81 (OPV-04, OPV-25).
//
// `syncGrid` nunca tira da grade uma linha com id real: ela fica e vai para `orphans`, e a página
// pergunta a `order_items` se aquela variação já foi vendida (a FK `order_items.variant_id` é
// `NO ACTION`). Esta função aplica as respostas — e as aplica **por id sobre a grade ATUAL**, porque
// a consulta é assíncrona e a Adri pode ter editado a grade enquanto ela estava no ar. Restaurar o
// estado de antes da consulta desfaria essa edição em silêncio.

import type { ProductVariant } from '@estrelinha/supabase/types'

export interface OrphanVerdict {
  id: string
  outcome: 'remove' | 'pause'
  /** O nome da variação, para o aviso que nomeia as vendidas. */
  label: string
}

/** A resposta da consulta de pedidos — a mesma forma de `DeleteCheck` da grade. */
export interface OrphanOrderCheck {
  orders: number
  /** `false` quando a consulta FALHOU: na dúvida, a linha não é apagada. */
  verified?: boolean
}

/**
 * Vendida **ou** consulta que falhou ⇒ pausa; só a linha comprovadamente sem pedido sai.
 *
 * Mesma régua da exclusão em massa da grade (`bulkDelete`, `VariantsTable.tsx`): uma falha de rede
 * nunca pode virar a exclusão de uma variação que tem histórico.
 */
export const orphanVerdict = (id: string, label: string, check: OrphanOrderCheck): OrphanVerdict => ({
  id,
  label,
  outcome: check.verified === false || check.orders > 0 ? 'pause' : 'remove',
})

/**
 * Aplica os vereditos **por id**: `remove` tira a linha, `pause` põe `is_active: false`. Id que não
 * está mais na grade é ignorado. `paused` são os rótulos das pausadas, na ordem dos vereditos.
 */
export const applyOrphanChecks = (
  variants: readonly ProductVariant[],
  verdicts: readonly OrphanVerdict[],
): { variants: ProductVariant[]; paused: string[] } => {
  const present = new Set(variants.map(v => v.id))
  const applicable = verdicts.filter(v => present.has(v.id))
  if (applicable.length === 0) return { variants: [...variants], paused: [] }

  const remove = new Set(applicable.filter(v => v.outcome === 'remove').map(v => v.id))
  const pause = new Set(applicable.filter(v => v.outcome === 'pause').map(v => v.id))

  const next = variants
    .filter(v => !remove.has(v.id))
    .map(v => (pause.has(v.id) && v.is_active ? { ...v, is_active: false } : v))

  return {
    variants: next,
    paused: applicable.filter(v => v.outcome === 'pause').map(v => v.label),
  }
}

/**
 * OPV-04: o aviso de pausadas ACUMULA de uma edição para a outra, sem repetir um rótulo que já está
 * nele. A régua compara só com o que o aviso já mostra (`prev`): dentro de um mesmo lote, duas linhas
 * com o mesmo rótulo continuam aparecendo as duas — são duas variações (ver `validation.md`, rodada 3).
 */
export const mergePausedLabels = (prev: readonly string[], paused: readonly string[]): string[] => [
  ...prev,
  ...paused.filter(label => !prev.includes(label)),
]

/**
 * Os ids de cada rótulo pausado, acumulados como o aviso (o mesmo id não entra duas vezes).
 * Existe para o aviso poder perguntar à grade de AGORA se a linha continua pausada.
 */
export const mergePausedIds = (
  prev: ReadonlyMap<string, readonly string[]>,
  verdicts: readonly OrphanVerdict[],
): Map<string, string[]> => {
  const next = new Map<string, string[]>([...prev].map(([label, ids]) => [label, [...ids]]))
  for (const verdict of verdicts) {
    if (verdict.outcome !== 'pause') continue
    const ids = next.get(verdict.label) ?? []
    if (!ids.includes(verdict.id)) next.set(verdict.label, [...ids, verdict.id])
  }
  return next
}

/**
 * OPV-04: o aviso nomeia as que AINDA estão pausadas. Ligar "Ativa" na grade — o que o próprio aviso
 * manda fazer — tira a linha dele; sem isso a frase dizia "ficaram pausadas" ao lado de uma linha
 * ligada (BUG-20261026-aviso-de-pausa-continua-depois-de-reativar). Linha que saiu da grade também
 * sai do aviso.
 */
export const stillPausedLabels = (
  labels: readonly string[],
  idsByLabel: ReadonlyMap<string, readonly string[]>,
  variants: readonly ProductVariant[],
): string[] =>
  labels.filter(label =>
    (idsByLabel.get(label) ?? []).some(id => variants.some(v => v.id === id && !v.is_active)),
  )
