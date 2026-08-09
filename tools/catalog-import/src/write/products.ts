import type { ProductRow } from '../map/product.ts'
import type { VariantRow } from '../map/variant.ts'
import type { Report } from '../report.ts'
import { type DbLike, selectAll, unwrap } from './db.ts'

export interface ProductImageRow {
  url: string
  alt: string | null
  source: 'import'
}

export interface ProductItem {
  product: ProductRow
  variants: VariantRow[]
}

interface ExistingProduct {
  id: string
  nuvemshop_id: number | null
  slug: string
  is_active: boolean
}

interface ExistingVariant {
  id: string
  nuvemshop_id: number | null
  product_id: string
}

export interface ProductWriteDeps {
  supabase: DbLike
  report: Report
  dryRun?: boolean
  log?: (message: string) => void
}

/**
 * Campos que a **loja** manda (`CAT-12`), pelo mesmo motivo das categorias: são decisão de vitrine,
 * tomada no admin, e a origem não tem opinião melhor do que a da dona.
 *
 * `base_price` está na lista por um motivo diferente e mais forte: quem é dono dele é o **trigger**
 * `sync_product_base_price` (`20260801120400`), que o deriva de `min(price)` das variações ativas.
 * Escrevê-lo no update seria disputar a coluna com o banco — e perder na próxima gravação de
 * variação, de forma intermitente.
 */
export const CAMPOS_DE_VITRINE = [
  'is_active', 'sort_order', 'is_featured', 'is_new', 'is_promo', 'base_price',
] as const

const catalogoDoProduto = (row: ProductRow) => ({
  nuvemshop_id: row.nuvemshop_id,
  name: row.name,
  slug: row.slug,
  description: row.description,
  seo_title: row.seo_title,
  seo_description: row.seo_description,
  video_url: row.video_url,
  options: row.options,
  stock_policy: row.stock_policy,
  stock_total: row.stock_total,
  weight_kg: row.weight_kg,
  width_cm: row.width_cm,
  height_cm: row.height_cm,
  length_cm: row.length_cm,
})

const linhaDaVariacao = (variant: VariantRow, productId: string) => ({
  product_id: productId,
  nuvemshop_id: variant.nuvemshop_id,
  name: variant.name,
  sku: variant.sku,
  price: variant.price,
  compare_price: variant.compare_price,
  stock: variant.stock,
  option_values: variant.option_values,
  weight_kg: variant.weight_kg,
  is_active: variant.is_active,
  position: variant.position,
})

/**
 * Grava produtos, variações e o vínculo N:N. Devolve `nuvemshop_id → uuid` do produto.
 *
 * `categoryUuids` vem de `writeCategories`: o vínculo usa o uuid local, e uma categoria que não
 * esteja no mapa (pulada por colisão de slug) simplesmente não gera linha — o produto entra com as
 * categorias que existem, em vez de falhar inteiro.
 */
export const writeProducts = async (
  items: readonly ProductItem[],
  categoryUuids: ReadonlyMap<number, string>,
  deps: ProductWriteDeps,
): Promise<Map<number, string>> => {
  const { supabase, report } = deps

  // PAGINADO, e não `select` simples: o PostgREST devolve no máximo 1.000 linhas por resposta, e
  // esta tabela tem 3.356. Ler truncado faz toda variação além da 1.000ª parecer nova — o INSERT
  // então colide em `product_variants_nuvemshop_id_key` e a idempotência quebra justamente na
  // segunda execução, que é onde ela precisa funcionar.
  const produtosExistentes = await selectAll<ExistingProduct>(
    supabase.from('products'),
    'id, nuvemshop_id, slug, is_active',
    'ler produtos existentes',
  )

  const variacoesExistentes = await selectAll<ExistingVariant>(
    supabase.from('product_variants'),
    'id, nuvemshop_id, product_id',
    'ler variações existentes',
  )

  const porNuvemshop = new Map(
    produtosExistentes.filter(p => p.nuvemshop_id !== null).map(p => [p.nuvemshop_id as number, p]),
  )
  const porSlug = new Map(produtosExistentes.map(p => [p.slug, p]))

  const variacoesPorProduto = new Map<string, ExistingVariant[]>()
  for (const v of variacoesExistentes) {
    const lista = variacoesPorProduto.get(v.product_id) ?? []
    lista.push(v)
    variacoesPorProduto.set(v.product_id, lista)
  }

  const uuidPorNuvemshop = new Map<number, string>()

  for (const { product, variants } of items) {
    report.read('produtos')
    report.read('variacoes', variants.length)

    const existente = porNuvemshop.get(product.nuvemshop_id)
    let productId: string

    if (existente) {
      if (existente.is_active !== product.is_active) {
        report.showcasePreserved({
          entidade: 'produtos',
          slug: product.slug,
          campo: 'is_active',
          origem: String(product.is_active),
          loja: String(existente.is_active),
        })
      }
      productId = existente.id
      if (!deps.dryRun) {
        unwrap(
          'atualizar produto',
          await supabase.from('products').update(catalogoDoProduto(product)).eq('id', productId),
        )
      }
      report.updated('produtos')
    } else {
      const colisao = porSlug.get(product.slug)
      if (colisao && colisao.nuvemshop_id !== product.nuvemshop_id) {
        deps.log?.(`produto ${product.slug} colide com registro existente — pulado`)
        report.skipped('produtos', {
          slug: product.slug, nuvemshop_id: product.nuvemshop_id, motivo: 'slug_em_uso',
        })
        // Nenhuma variação deste produto entra. Contar TODAS é o que mantém a conferência de
        // `CAT-08` fechando: lidas = criadas + atualizadas + puladas.
        for (let i = 0; i < variants.length; i += 1) report.skipped('variacoes')
        continue
      }

      if (deps.dryRun) {
        report.created('produtos')
        report.created('variacoes', variants.length)
        continue
      }

      const criado: { id: string } = unwrap(
        'criar produto',
        await supabase
          .from('products')
          .insert<{ id: string }>({
            ...catalogoDoProduto(product),
            base_price: product.base_price,
            is_active: product.is_active,
          })
          .select('id')
          .single(),
      )
      productId = criado.id
      porSlug.set(product.slug, {
        id: productId, nuvemshop_id: product.nuvemshop_id, slug: product.slug, is_active: product.is_active,
      })
      report.created('produtos')
    }

    uuidPorNuvemshop.set(product.nuvemshop_id, productId)

    // ---- variações -------------------------------------------------------
    const jaGravadas = new Map(
      (variacoesPorProduto.get(productId) ?? [])
        .filter(v => v.nuvemshop_id !== null)
        .map(v => [v.nuvemshop_id as number, v]),
    )

    if (deps.dryRun) {
      // Conta pelo que o banco já tem, e não tudo como atualizado: um dry-run cujos números não
      // batem com a execução real não serve para conferir nada.
      for (const variant of variants) {
        if (jaGravadas.has(variant.nuvemshop_id)) report.updated('variacoes')
        else report.created('variacoes')
      }
      continue
    }

    for (const variant of variants) {
      const existenteVariacao = jaGravadas.get(variant.nuvemshop_id)
      if (existenteVariacao) {
        unwrap(
          'atualizar variação',
          await supabase.from('product_variants')
            .update(linhaDaVariacao(variant, productId))
            .eq('id', existenteVariacao.id),
        )
        report.updated('variacoes')
      } else {
        unwrap(
          'criar variação',
          await supabase.from('product_variants')
            .insert<{ id: string }>(linhaDaVariacao(variant, productId))
            .select('id')
            .single(),
        )
        report.created('variacoes')
      }
    }

    // Variação que sumiu da origem é DESATIVADA, nunca apagada: `order_items.variant_id` referencia
    // a linha, e apagar deixaria o histórico do pedido sem a linha que foi vendida.
    const recebidas = new Set(variants.map(v => v.nuvemshop_id))
    const sumidas = [...jaGravadas.values()].filter(v => !recebidas.has(v.nuvemshop_id as number))
    if (sumidas.length > 0) {
      unwrap(
        'desativar variações ausentes na origem',
        await supabase.from('product_variants')
          .update({ is_active: false })
          .in('id', sumidas.map(v => v.id)),
      )
    }

    // ---- vínculo N:N -----------------------------------------------------
    const vinculos = product.category_nuvemshop_ids
      .map((id, index) => ({ categoryId: categoryUuids.get(id), index }))
      .filter((v): v is { categoryId: string; index: number } => Boolean(v.categoryId))
      .map(({ categoryId, index }) => ({
        product_id: productId, category_id: categoryId, position: index,
      }))

    unwrap(
      'limpar vínculos de categoria',
      await supabase.from('product_categories').delete().eq('product_id', productId),
    )
    if (vinculos.length > 0) {
      unwrap('gravar vínculos de categoria', await supabase.from('product_categories').insertMany(vinculos))
    }
  }

  return uuidPorNuvemshop
}

/** Grava a galeria depois que as imagens estão no Storage. Separado porque depende da fase 3. */
export const writeProductImages = async (
  productId: string,
  images: readonly ProductImageRow[],
  deps: ProductWriteDeps,
): Promise<void> => {
  if (deps.dryRun) return
  unwrap(
    'gravar imagens do produto',
    await deps.supabase.from('products').update({ images }).eq('id', productId),
  )
}
