import type { CategoryRow } from '../map/category.ts'
import { CURATED_EXCLUDED, CURATED_INACTIVE } from '../map/category.ts'
import type { Report } from '../report.ts'
import { type DbLike, selectAll, unwrap } from './db.ts'

interface ExistingCategory {
  id: string
  nuvemshop_id: number | null
  slug: string
  active: boolean
  sort_order: number
}

export interface CategoryWriteDeps {
  supabase: DbLike
  report: Report
  dryRun?: boolean
  log?: (message: string) => void
}

/**
 * Campos que a **loja** manda e a origem não sobrescreve (`CAT-12`).
 *
 * `active` e `sort_order` são curadoria de vitrine; `show_in_menu` e `menu_promo` são o menu, que
 * `AD-014` diz ser recorte curado em `/admin/menu`. Reescrevê-los na segunda execução desfaria em
 * silêncio o trabalho feito no admin — inclusive as quatro categorias desativadas de propósito.
 *
 * Eles entram no **insert** (a origem é o único dado disponível quando a linha nasce) e ficam de
 * fora do **update**, onde a divergência vira linha de relatório em vez de escrita.
 */
const VITRINE = ['active', 'sort_order', 'show_in_menu', 'menu_promo'] as const

/**
 * Grava as categorias e devolve o mapa `nuvemshop_id → uuid`, que os produtos usam para o vínculo.
 *
 * A ordem de `rows` **precisa** ser topológica (`mapCategories` garante): `parent_id` é resolvido
 * para o uuid da pai **já gravada**, então uma filha que chegasse antes apontaria para nada
 * (`CAT-05`).
 */
export const writeCategories = async (
  rows: readonly CategoryRow[],
  deps: CategoryWriteDeps,
): Promise<Map<number, string>> => {
  const { supabase, report } = deps

  const existentes = await selectAll<ExistingCategory>(
    supabase.from('categories'),
    'id, nuvemshop_id, slug, active, sort_order',
    'ler categorias existentes',
  )

  const porNuvemshop = new Map(
    existentes.filter(c => c.nuvemshop_id !== null).map(c => [c.nuvemshop_id as number, c]),
  )
  const porSlug = new Map(existentes.map(c => [c.slug, c]))

  // As excluídas não chegam em `rows` — `mapCategories` já as cortou. Quem as apaga é este bloco, e
  // ele olha para o que EXISTE no banco: uma execução anterior pode tê-las criado. Fora do laço
  // principal de propósito, porque não são leitura da origem e não entram na conferência
  // `lidos = criados + atualizados + pulados`.
  for (const [nuvemshopId, motivo] of CURATED_EXCLUDED) {
    const existente = porNuvemshop.get(nuvemshopId)
    if (!existente) continue

    report.categoryExcluded({ nuvemshop_id: nuvemshopId, slug: existente.slug, motivo })
    if (!deps.dryRun) {
      unwrap(
        'apagar categoria excluída por curadoria',
        await supabase.from('categories').delete().eq('id', existente.id),
      )
    }
    porNuvemshop.delete(nuvemshopId)
    porSlug.delete(existente.slug)
  }

  const uuidPorNuvemshop = new Map<number, string>()

  for (const row of rows) {
    report.read('categorias')

    const curada = CURATED_INACTIVE.get(row.nuvemshop_id)
    if (curada) {
      report.categoryCurated({ nuvemshop_id: row.nuvemshop_id, slug: row.slug, motivo: curada })
    }

    const existente = porNuvemshop.get(row.nuvemshop_id)
    const parentId = row.parent_nuvemshop_id === null
      ? null
      : uuidPorNuvemshop.get(row.parent_nuvemshop_id) ?? null

    const catalogo = {
      nuvemshop_id: row.nuvemshop_id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      parent_id: parentId,
    }

    if (existente) {
      if (existente.active !== row.active) {
        report.showcasePreserved({
          entidade: 'categorias',
          slug: row.slug,
          campo: 'active',
          origem: String(row.active),
          loja: String(existente.active),
        })
      }
      if (existente.sort_order !== row.sort_order) {
        report.showcasePreserved({
          entidade: 'categorias',
          slug: row.slug,
          campo: 'sort_order',
          origem: String(row.sort_order),
          loja: String(existente.sort_order),
        })
      }

      if (!deps.dryRun) {
        unwrap('atualizar categoria', await supabase.from('categories').update(catalogo).eq('id', existente.id))
      }
      uuidPorNuvemshop.set(row.nuvemshop_id, existente.id)
      report.updated('categorias')
      continue
    }

    // Slug é UNIQUE. Um registro local com o mesmo slug e OUTRO `nuvemshop_id` não pode ser
    // adotado às cegas — seria assumir que duas coisas com o mesmo endereço são a mesma coisa.
    const colisao = porSlug.get(row.slug)
    if (colisao && colisao.nuvemshop_id !== row.nuvemshop_id) {
      deps.log?.(`categoria ${row.slug} colide com registro existente — pulada`)
      report.skipped('categorias')
      continue
    }

    if (deps.dryRun) {
      report.created('categorias')
      continue
    }

    const criada = unwrap(
      'criar categoria',
      await supabase
        .from('categories')
        .insert<{ id: string }>({ ...catalogo, active: row.active, sort_order: row.sort_order })
        .select('id')
        .single(),
    )

    uuidPorNuvemshop.set(row.nuvemshop_id, criada.id)
    porSlug.set(row.slug, {
      id: criada.id, nuvemshop_id: row.nuvemshop_id, slug: row.slug,
      active: row.active, sort_order: row.sort_order,
    })
    report.created('categorias')
  }

  return uuidPorNuvemshop
}

export const CAMPOS_DE_VITRINE = VITRINE
