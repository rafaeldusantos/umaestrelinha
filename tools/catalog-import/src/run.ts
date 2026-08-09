import { mapCategories } from './map/category.ts'
import { planImages } from './map/image.ts'
import { mapProduct } from './map/product.ts'
import { dedupeSkus } from './map/sku.ts'
import { mapVariants } from './map/variant.ts'
import type { RawCategory, RawProduct } from './nuvemshop/types.ts'
import { createReport, type Report } from './report.ts'
import type { BytesCache } from './write/cache.ts'
import { writeCategories } from './write/categories.ts'
import { type DbLike, selectAll } from './write/db.ts'
import { writeProductImages, writeProducts, type ProductImageRow, type ProductItem } from './write/products.ts'
import { ensureImage, existingPaths, type StorageClientLike } from './write/storage.ts'

/**
 * Até onde ir. É "para depois desta fase", e não "roda só esta":
 * produtos precisam do mapa de uuid que as categorias produzem, e imagens precisam do uuid do
 * produto. Um `--only=produtos` literal teria de reler o que a fase anterior gravou só para fingir
 * independência que não existe.
 *
 * SPEC_DEVIATION: o `tasks.md` do T14 chamava esta flag de `--only`.
 * Reason: `only` prometia isolamento que as dependências entre fases tornam impossível; o nome novo
 * descreve o que a flag de fato faz.
 */
export type StopAfter = 'categorias' | 'produtos' | 'imagens'

export interface RunOptions {
  dryRun?: boolean
  stopAfter?: StopAfter
  /** Recorte para ensaio: os N primeiros produtos da origem. */
  limit?: number
  /** Imagens em paralelo. Ver `DEFAULT_CONCURRENCY` — o gargalo é o Storage, não o CDN. */
  concurrency?: number
}

export interface RunDeps {
  sleep?: (ms: number) => Promise<void>
  nuvemshop: {
    listCategories(): Promise<RawCategory[]>
    listProducts(): Promise<RawProduct[]>
  }
  supabase: DbLike & StorageClientLike
  supabaseUrl: string
  cache: BytesCache
  fetch: typeof globalThis.fetch
  log?: (message: string) => void
}

/**
 * Imagens em paralelo. **3 é medido, não chutado.**
 *
 * O primeiro valor foi 6, escolhido por "parece razoável". Rodando contra o catálogo real, o
 * Supabase local devolveu **86 respostas `504` do Kong** e **691 timeouts em ~3.660 uploads** — 19%.
 * Pior: o upload SUCEDIA no servidor e o gateway estourava só na resposta, então o cliente via falha
 * onde havia sucesso (o arquivo que abortou o terceiro import estava gravado no Storage).
 *
 * O gargalo não é o CDN da Nuvemshop, que aguenta bem mais: é o container único de Storage do
 * ambiente local, recebendo corpos de até 1,1 MB. Um import one-shot não ganha nada indo mais
 * rápido do que a outra ponta aceita.
 */
const DEFAULT_CONCURRENCY = 3

/**
 * Executa `worker` sobre `items` com no máximo `limit` em voo, **parando limpo na primeira falha**.
 *
 * A versão ingênua (`await Promise.all(runners)` com o worker lançando direto) tem um defeito que só
 * aparece rodando de verdade: `Promise.all` rejeita no primeiro erro, mas **não cancela os outros
 * runners** — eles seguem consumindo a fila enquanto o chamador já escreveu o relatório e voltou.
 * Foi exatamente o que aconteceu no primeiro import real: o relatório registrou 290 imagens
 * enquanto o Storage recebia 3.651. Um relatório que descreve um estado que não é o do banco é pior
 * do que relatório nenhum.
 *
 * Aqui nenhum runner rejeita: o erro é guardado, a fila para de ser distribuída, e só depois de
 * TODOS terminarem é que ele sobe.
 */
const pool = async <T>(items: readonly T[], limit: number, worker: (item: T) => Promise<void>) => {
  let cursor = 0
  let falha: unknown = null

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length && falha === null) {
      const index = cursor
      cursor += 1
      try {
        await worker(items[index])
      } catch (err) {
        falha = falha ?? err
      }
    }
  })

  await Promise.all(runners)
  if (falha !== null) throw falha
}

/**
 * As quatro fases, na única ordem possível.
 *
 * Categoria antes de produto (o vínculo N:N precisa do uuid), produto antes de variação (FK),
 * produto antes de imagem (`products.images` precisa da linha). Não é preferência de leitura: cada
 * seta é uma dependência de dados.
 *
 * Qualquer `throw` — backoff esgotado da API (`CAT-06`) ou Storage fora — **para o import** com
 * relatório parcial e código de saída diferente de zero. Seguir para a fase seguinte deixaria
 * catálogo pela metade sem ninguém saber.
 */
export const run = async (deps: RunDeps, options: RunOptions = {}): Promise<Report> => {
  const report = createReport()
  const { dryRun = false, stopAfter = 'imagens', limit, concurrency = DEFAULT_CONCURRENCY } = options
  const log = deps.log ?? (() => {})
  const writeDeps = { supabase: deps.supabase, report, dryRun, log }

  try {
    // ---- 1 · categorias --------------------------------------------------
    log('fase 1 · categorias')
    const rawCategories = await deps.nuvemshop.listCategories()
    const categoryUuids = await writeCategories(mapCategories(rawCategories), writeDeps)
    if (stopAfter === 'categorias') return report

    // ---- 2 · produtos e variações ---------------------------------------
    log('fase 2 · produtos e variações')
    const rawProducts = await deps.nuvemshop.listProducts()
    const recorte = typeof limit === 'number' ? rawProducts.slice(0, limit) : rawProducts

    const items: Array<ProductItem & { raw: RawProduct }> = []
    for (const raw of recorte) {
      const mapping = mapProduct(raw)
      if (mapping.kind === 'skip') {
        // Pulado no MAPEAMENTO, antes de chegar à escrita — então é aqui que ele entra na conta,
        // senão a conferência de `CAT-08` não fecha.
        report.read('produtos')
        report.skipped('produtos', {
          slug: mapping.slug, nuvemshop_id: mapping.nuvemshop_id, motivo: mapping.reason,
        })
        report.read('variacoes', raw.variants.length)
        for (let i = 0; i < raw.variants.length; i += 1) report.skipped('variacoes')
        continue
      }
      items.push({ raw, product: mapping.row, variants: mapVariants(raw) })
    }

    const slugByProduct = new Map(items.map(i => [i.product.nuvemshop_id, i.product.slug]))
    const doLote = new Set(items.flatMap(i => i.variants.map(v => v.nuvemshop_id)))
    const { variants: deduped, discarded } = dedupeSkus(
      items.flatMap(i => i.variants),
      slugByProduct,
      await skusOcupados(deps.supabase, doLote),
    )
    report.skusDiscarded(discarded)

    const porVariacao = new Map(deduped.map(v => [v.nuvemshop_id, v]))
    const paraGravar = items.map(i => ({
      ...i,
      variants: i.variants.map(v => porVariacao.get(v.nuvemshop_id) ?? v),
    }))

    const productUuids = await writeProducts(paraGravar, categoryUuids, writeDeps)
    if (stopAfter === 'produtos') return report

    // ---- 3 · imagens -----------------------------------------------------
    if (dryRun) {
      // A fase inteira sai do caminho, EXPLICITAMENTE. Num banco vazio ela já não faria nada (sem
      // uuid de produto não há galeria a gravar), mas num banco já importado o `uuid` existe — e aí
      // um `--dry-run` baixaria e SUBIRIA as 3.660 imagens. Depender daquele acidente seria um
      // dry-run que grava.
      log('fase 3 · imagens — pulada em dry-run')
      return report
    }

    log('fase 3 · imagens')
    await pool(paraGravar, concurrency, async item => {
      const productId = productUuids.get(item.product.nuvemshop_id)
      if (!productId) return

      const storageDeps = {
        fetch: deps.fetch,
        supabase: deps.supabase,
        supabaseUrl: deps.supabaseUrl,
        cache: deps.cache,
        sleep: deps.sleep,
        log,
      }

      // UMA listagem por produto, antes do laço: descobrir "já está lá" pelo erro de duplicata
      // custaria o corpo inteiro de cada imagem.
      const jaNoStorage = await existingPaths(item.product.nuvemshop_id, storageDeps)

      const galeria: ProductImageRow[] = []
      for (const plan of planImages(item.raw)) {
        const outcome = await ensureImage(plan, storageDeps, jaNoStorage)

        if (outcome.kind === 'failed') {
          // `CAT-07`: o produto entra sem esta foto. Nunca o contrário.
          report.imageFailed({ storageBase: plan.storageBase, url: plan.webpUrl, motivo: outcome.motivo })
          continue
        }

        if (outcome.kind === 'new') report.imageNew()
        else report.imageReused()
        galeria.push({ url: outcome.url, alt: plan.alt, source: 'import' })
      }

      await writeProductImages(productId, galeria, writeDeps)
    })

    log('fase 4 · relatório')
    return report
  } catch (err) {
    report.aborted((err as Error).message)
    log(`PAROU: ${(err as Error).message}`)
    return report
  }
}

/**
 * SKUs ocupados por variações que **este import não escreve** — linha criada à mão no admin.
 *
 * As do próprio lote são excluídas de propósito: a variação que já tem o SKU no banco é a mesma que
 * está sendo atualizada, e tratá-la como "ocupado" a faria perder o próprio código a cada execução.
 */
const skusOcupados = async (supabase: DbLike, doLote: ReadonlySet<number>): Promise<Set<string>> => {
  // Paginado pelo mesmo motivo das leituras de `writeProducts`: o PostgREST corta em 1.000 linhas,
  // e um conjunto de "ocupados" truncado deixaria passar colisão de SKU justamente nas variações
  // mais recentes.
  const linhas = await selectAll<{ nuvemshop_id: number | null; sku: string | null }>(
    supabase.from('product_variants'),
    'nuvemshop_id, sku',
    'ler SKUs ocupados',
  )

  return new Set(
    linhas
      .filter(v => v.sku !== null && v.sku !== '' && !(v.nuvemshop_id !== null && doLote.has(v.nuvemshop_id)))
      .map(v => v.sku as string),
  )
}
