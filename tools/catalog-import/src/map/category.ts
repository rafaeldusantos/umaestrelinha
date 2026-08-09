import type { RawCategory } from '../nuvemshop/types.ts'
import { loc } from './loc.ts'

/** Uma linha de `public.categories`, antes de o `parent_id` virar uuid (isso é do layer de escrita). */
export interface CategoryRow {
  nuvemshop_id: number
  name: string
  slug: string
  description: string | null
  /** `null` = raiz. O layer de escrita resolve para o uuid da pai já gravada. */
  parent_nuvemshop_id: number | null
  sort_order: number
  active: boolean
}

/**
 * Categorias que **não entram no catálogo** — decisão do usuário em 2026-08-09, feature `23`.
 *
 * Diferente de `CURATED_INACTIVE`, que preserva a linha desativada: aqui a categoria não é
 * importada, e a linha que já existir no banco é **apagada** pelo layer de escrita. São duas que
 * não têm volta pela vitrine — uma é resíduo da loja anterior, a outra não é categoria de produto.
 *
 * Chaveada por `nuvemshop_id` e não por slug, pelos mesmos dois motivos de `CURATED_INACTIVE`:
 *
 * 1. **Slug muda na origem.** É o mesmo motivo de a chave de idempotência ser o id (`CAT-01`).
 *    Curadoria presa a um slug renomeado deixa de aplicar, em silêncio.
 * 2. **Uma destas categorias tem, como slug, a marca anterior da loja.** Chavear por slug plantaria
 *    aquela string em código novo, contra a varredura que a feature `20` deixou de pé (`AD-016`).
 *    Vale para o comentário também: descrever o caso sem escrever a string é parte da regra.
 */
export const CURATED_EXCLUDED: ReadonlyMap<number, string> = new Map([
  [32509753, 'Brinquedos — vazia, e o handle da origem é a marca anterior da loja'],
  [32697621, 'Rastreio — não é categoria de produto'],
])

/**
 * Categorias que entram DESATIVADAS por curadoria — decisão do usuário em 2026-08-09.
 *
 * Chaveada por `nuvemshop_id` e não por slug, pelo mesmo motivo `1` acima.
 *
 * As duas entram com o **slug preservado** (`CAT-02`): desativar não é apagar, e reativar é um
 * clique em `/admin/categorias`.
 */
export const CURATED_INACTIVE: ReadonlyMap<number, string> = new Map([
  [35119124, 'Black Friday — a loja não está em Black Friday, e urgência fabricada é proibida na vitrine'],
  [34729760, 'Profissões — vazia'],
])

/**
 * `RawCategory[]` → `CategoryRow[]`, **com toda pai antes de qualquer filha sua**.
 *
 * A ordem topológica é requisito e não conveniência (`CAT-05`): o layer de escrita resolve
 * `parent_id` para o uuid da pai **já gravada**, então uma filha que chegue antes apontaria para
 * nada.
 *
 * ## A ordenação, que a origem não tem
 *
 * A resposta de `/categories` **não traz campo de ordem** — medido nas 39, e o
 * `apiShape.test.ts` guarda essa ausência. A única ordem que a origem expressa é a posição dentro
 * do array `subcategories[]` do pai. Daí a regra:
 *
 *  - padrão: índice entre os IRMÃOS, na ordem em que a resposta os devolveu;
 *  - quando o pai lista a filha em `subcategories[]`: **esse** índice vence.
 *
 * As duas pontas do `if` são a mesma ideia — "a posição entre irmãos" —, e a segunda só existe
 * porque é a única declaração explícita de ordem que a Nuvemshop faz.
 */
export const mapCategories = (raw: readonly RawCategory[]): CategoryRow[] => {
  // O corte vem ANTES de qualquer derivação, e é isso que o faz ser "como se a origem não tivesse
  // mandado": `known`, o índice entre irmãos e a ordenação topológica passam a enxergar só o que
  // sobra, então a `sort_order` das raízes continua contígua em vez de ficar com buracos.
  //
  // Filha de categoria excluída viraria RAIZ — é como `parentOf` trata pai ausente. As duas
  // excluídas são folhas, e o teste assere isso na fixture em vez de assumir.
  const incluidas = raw.filter(c => !CURATED_EXCLUDED.has(c.id))

  const known = new Set(incluidas.map(c => c.id))
  const byId = new Map(incluidas.map(c => [c.id, c]))

  // `parent` fora da resposta é tratado como raiz: melhor uma categoria no topo do que uma
  // categoria com `parent_id` apontando para um registro que não existe.
  const parentOf = (c: RawCategory): number | null =>
    c.parent && known.has(c.parent) ? c.parent : null

  const siblingIndex = new Map<number, number>()
  const seenPerParent = new Map<number | null, number>()
  for (const c of incluidas) {
    const parent = parentOf(c)
    const n = seenPerParent.get(parent) ?? 0
    seenPerParent.set(parent, n + 1)
    siblingIndex.set(c.id, n)
  }

  const sortOrder = (c: RawCategory): number => {
    const parent = parentOf(c)
    if (parent !== null) {
      const declared = byId.get(parent)!.subcategories.indexOf(c.id)
      if (declared >= 0) return declared
    }
    return siblingIndex.get(c.id)!
  }

  const toRow = (c: RawCategory): CategoryRow => ({
    nuvemshop_id: c.id,
    name: loc(c.name),
    slug: loc(c.handle),
    description: loc(c.description) || null,
    parent_nuvemshop_id: parentOf(c),
    sort_order: sortOrder(c),
    active: c.visibility === 'visible' && !CURATED_INACTIVE.has(c.id),
  })

  // Ordenação topológica estável: cada passada emite quem já tem pai emitido, na ordem da resposta.
  const emitted = new Set<number>()
  const rows: CategoryRow[] = []
  let pending = [...incluidas]

  while (pending.length > 0) {
    const ready = pending.filter(c => {
      const parent = parentOf(c)
      return parent === null || emitted.has(parent)
    })

    // Sem progresso só acontece com ciclo. Lançar é o comportamento certo: seguir emitiria filhas
    // com pai inexistente, e um `while` sem esta saída não termina.
    if (ready.length === 0) {
      throw new Error(
        `ciclo na hierarquia de categorias da Nuvemshop: ${pending.map(c => c.id).join(', ')}`,
      )
    }

    for (const c of ready) {
      rows.push(toRow(c))
      emitted.add(c.id)
    }
    pending = pending.filter(c => !emitted.has(c.id))
  }

  return rows
}
