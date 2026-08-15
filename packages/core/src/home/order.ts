import type { HomeSection } from './types'

/**
 * A ordem de exibição: `position`, e o desempate por `id`.
 *
 * **`position` não é único no banco, de propósito.** Empate é estado possível — duas admins
 * reordenando ao mesmo tempo —, e resolvê-lo com uma constraint faria a segunda gravação falhar em
 * vez de convergir. O desempate é de **leitura** (`HOME-12`), e é o que faz dois carregamentos
 * consecutivos mostrarem a mesma ordem: sem ele, quem decide entre duas seções empatadas é o que o
 * Postgres devolver, e a Home muda de forma entre dois F5.
 *
 * Comparação lexicográfica crua, e não `localeCompare`: `id` é uuid, não texto de gente. Sem locale
 * explícito `localeCompare` usa o do host, e o desempate deixaria de ser o mesmo em duas máquinas —
 * exatamente o defeito que o desempate existe para fechar.
 */
const byPosition = (a: HomeSection, b: HomeSection): number =>
  (a.position ?? 0) - (b.position ?? 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/** A lista na ordem da Home. Não muta a entrada — a mesma lista pode ser lida por duas telas. */
export const orderSections = (sections: readonly HomeSection[]): HomeSection[] =>
  [...sections].sort(byPosition)

/**
 * O que o arraste grava.
 *
 * Devolve **posições absolutas** e **só das linhas que mudaram de lugar** (`HOME-11`). As duas metades
 * importam, por motivos diferentes:
 *
 * - **absolutas** é o que torna a gravação idempotente: mandar o mesmo conjunto duas vezes deixa a
 *   Home no mesmo estado. Um `position + 1` relativo composto duas vezes empurraria a seção duas
 *   vezes, e duas admins clicando junto divergiriam;
 * - **só as que mudaram** é o que impede arrastar a primeira para a segunda de reescrever a lista
 *   inteira — cada linha desnecessária é uma chance de sobrescrever a curadoria que outra pessoa
 *   acabou de salvar.
 *
 * `null` quando um dos dois ids não está na lista: soltar sobre uma seção que já não existe (a
 * listagem estava velha) não pode virar uma renumeração calculada sobre dado incompleto. `[]` quando
 * a seção é solta sobre ela mesma — nada mudou, e nada precisa ser gravado.
 *
 * Molde de `reorderWithinParent` (`backoffice/features/category-list/model/categoryTree.ts`), **por
 * cópia e não por import**: aquela filtra por pai e devolve `null` entre ramos, esta não tem árvore.
 * A consolidação num `reorderByIndex` genérico está registrada como candidata no `BACKLOG.md`.
 */
export const reorderSections = (
  sections: readonly HomeSection[],
  draggedId: string,
  targetId: string,
): { id: string; position: number }[] | null => {
  const dragged = sections.find(s => s.id === draggedId)
  const target = sections.find(s => s.id === targetId)
  if (!dragged || !target) return null
  if (draggedId === targetId) return []

  const ordered = orderSections(sections)
  const from = ordered.findIndex(s => s.id === draggedId)
  const to = ordered.findIndex(s => s.id === targetId)

  const reordered = [...ordered]
  reordered.splice(to, 0, ...reordered.splice(from, 1))

  return reordered
    .map((section, index) => ({ id: section.id, position: index + 1 }))
    .filter(entry => {
      const antes = sections.find(s => s.id === entry.id)
      return (antes?.position ?? 0) !== entry.position
    })
}
