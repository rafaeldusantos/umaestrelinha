import { lerClientes, lerVendas } from './csv/parse.ts'
import { aplicarRecorte } from './csv/recorte.ts'
import {
  type ProdutoLocal,
  type VariacaoLocal,
  buildIndex,
} from './map/catalogMatch.ts'
import { mapCategories } from './map/category.ts'
import { planImages } from './map/image.ts'
import { mapOrder } from './map/order.ts'
import { mapProduct } from './map/product.ts'
import { dedupeSkus } from './map/sku.ts'
import { mapVariants } from './map/variant.ts'
import type { RawCategory, RawProduct } from './nuvemshop/types.ts'
import { createReport, type Report } from './report.ts'
import type { BytesCache } from './write/cache.ts'
import { writeCategories } from './write/categories.ts'
import { type DbLike, selectAll } from './write/db.ts'
import { writeFaqs } from './write/faqs.ts'
import { writeProductImages, writeProducts, writeVariantImages, type ProductImageRow, type ProductItem } from './write/products.ts'
import { writeOrders } from './write/orders.ts'
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
export type StopAfter = 'categorias' | 'produtos' | 'perguntas' | 'imagens' | 'pedidos'

export interface RunOptions {
  dryRun?: boolean
  stopAfter?: StopAfter
  /** Recorte para ensaio: os N primeiros produtos da origem. */
  limit?: number
  /** Imagens em paralelo. Ver `DEFAULT_CONCURRENCY` — o gargalo é o Storage, não o CDN. */
  concurrency?: number
  /**
   * Feature 35 — os dois CSV exportados do painel da Nuvemshop.
   *
   * Ausentes, a fase 4 **não roda**: ela é opcional porque o catálogo (fases 1–3) é útil sozinho, e
   * porque o arquivo é exportado à mão e nem sempre está à mão.
   */
  vendas?: Buffer
  clientes?: Buffer
  /** Sobrescreve o estado operacional dos pedidos já importados. Ver `write/orders.ts`. */
  ressincronizarEstado?: boolean
  /** Apaga e regrava os itens dos pedidos já importados. */
  reimportarItens?: boolean
  /**
   * Roda **só** a fase 4, pulando o catálogo inteiro.
   *
   * O `--only` genérico foi rejeitado (ver `StopAfter`) porque as fases 1–3 passam resultado em
   * memória umas para as outras: produtos precisam do mapa de uuid das categorias, imagens precisam
   * do uuid do produto. **A fase 4 é diferente, e é a única**: ela lê o catálogo do BANCO, não da
   * fase anterior. Então ela é a única que pode rodar sozinha sem fingir independência.
   *
   * Existe porque a razão de re-execução é assimétrica: o catálogo muda raramente, e os pedidos
   * mudam a cada export. Sem isto, reimportar pedidos custaria 3.660 uploads de imagem.
   */
  somentePedidos?: boolean
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
  // O default é a ÚLTIMA fase, e mudou de `imagens` para `pedidos` na feature 35. Tivesse ficado em
  // `imagens`, a fase 4 nunca rodaria sem alguém passar `--stop-after=pedidos` — e não rodar é
  // indistinguível de rodar sem achar nada.
  const { dryRun = false, stopAfter = 'pedidos', limit, concurrency = DEFAULT_CONCURRENCY } = options
  const log = deps.log ?? (() => {})
  const writeDeps = { supabase: deps.supabase, report, dryRun, log }

  try {
    if (options.somentePedidos === true) {
      await importarPedidos(deps, options, report, log)
      return report
    }

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

    // ---- 2b · perguntas frequentes (feature 28) --------------------------
    //
    // Depois dos produtos porque precisa dos uuids, e ANTES das imagens porque é barata (duas
    // leituras e dois lotes de insert) e a fase de imagem é a longa: um erro de FAQ aparece em
    // segundos em vez de depois de 3.660 downloads.
    //
    // A descrição vem do MAPEAMENTO, e não de uma releitura do banco: é o mesmo texto que
    // `writeProducts` acabou de gravar, e reler custaria uma varredura de 691 linhas para chegar ao
    // mesmo lugar.
    log('fase 2b · perguntas frequentes')
    await writeFaqs(
      paraGravar
        .map(item => ({
          id: productUuids.get(item.product.nuvemshop_id) ?? '',
          description: item.product.description ?? null,
        }))
        .filter(p => p.id !== ''),
      writeDeps,
    )
    if (stopAfter === 'perguntas') return report

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
      // `images[].id` da origem → URL do Storage. É a chave que `VariantRow.image_nuvemshop_id`
      // usa, e é o que dá a foto de cada cor ao card da loja (`COR-01`). Imagem `failed` **não**
      // entra aqui, de propósito: é a ausência no mapa que produz o `null` de `COR-02`.
      const urlPorImagem = new Map<number, string>()

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
        urlPorImagem.set(plan.nuvemshop_id, outcome.url)
      }

      await writeProductImages(productId, galeria, writeDeps)
      await writeVariantImages(item.variants, urlPorImagem, writeDeps)
    })
    if (stopAfter === 'imagens') return report

    // ---- 4 · pedidos e clientes (feature 35) -----------------------------
    //
    // DEPOIS das imagens, e a ordem é dependência de dado: o casamento de item precisa de
    // `products.nuvemshop_id` e `product_variants.nuvemshop_id`, que a fase 2 grava. Rodar antes
    // produz 100% de itens órfãos — e o piso de casamento do relatório é quem acusa.
    //
    // A fonte NÃO é a API: o plano da loja é o Essencial, e os escopos `read_orders`/
    // `read_customers` exigem Escala ou Next. São dois CSV exportados do painel.
    await importarPedidos(deps, options, report, log)

    log('fase 5 · relatório')
    return report
  } catch (err) {
    report.aborted((err as Error).message)
    log(`PAROU: ${(err as Error).message}`)
    return report
  }
}

/**
 * A fase 4 — pedidos e clientes, dos dois CSV.
 *
 * Separada em função própria porque é **opcional**: sem `--vendas`, a fase inteira sai do caminho e
 * o import continua sendo o do catálogo. Um `if` embutido no meio de `run` esconderia isso.
 */
const importarPedidos = async (
  deps: RunDeps,
  options: RunOptions,
  report: Report,
  log: (m: string) => void,
): Promise<void> => {
  if (!options.vendas) {
    log('fase 4 · pedidos — pulada (sem --vendas)')
    return
  }

  log('fase 4 · pedidos e clientes')

  const produtos = await selectAll<ProdutoLocal>(
    deps.supabase.from('products'),
    'id, name, nuvemshop_id, requires_material, material_kinds',
    'ler produtos para casar itens',
  )
  const variacoes = await selectAll<VariacaoLocal>(
    deps.supabase.from('product_variants'),
    'id, product_id, sku, option_values',
    'ler variações para casar itens',
  )

  // O aviso vem ANTES da fase, e não depois: rodar com o catálogo vazio produz 100% de órfãos, e
  // sem esta linha quem lê o relatório procuraria o defeito no casamento em vez da ordem de
  // execução. O piso de casamento reprova o gate de qualquer forma.
  if (produtos.length === 0) {
    log('  ⚠ 0 produtos no catálogo local — TODOS os itens ficarão órfãos. Rode as fases 1–3 antes.')
  }

  const index = buildIndex(produtos, variacoes)
  const { dentro, fora } = aplicarRecorte(lerVendas(options.vendas))
  report.outOfRange(fora.length)
  log(`  ${dentro.length} pedido(s) no recorte · ${fora.length} fora (loja anterior)`)

  const mapeados = dentro.map(pedido => mapOrder(pedido, index))

  await writeOrders(mapeados, {
    supabase: deps.supabase,
    report,
    dryRun: options.dryRun ?? false,
    log,
    ressincronizarEstado: options.ressincronizarEstado,
    reimportarItens: options.reimportarItens,
  })

  // As clientes são DERIVADAS dos pedidos pela view `customer_directory` (`AD-023`) — nada é
  // escrito em `customers`. O CSV de clientes entra só como conferência, e para dizer quantas
  // ficaram de fora por nunca terem comprado.
  const emails = new Set(mapeados.map(m => m.order.customer_email.toLowerCase()))
  report.customersDerived(emails.size)

  if (options.clientes) {
    const clientes = lerClientes(options.clientes)
    const semPedido = clientes.filter(c => !emails.has(c.email.toLowerCase()))
    report.customersWithoutOrders(semPedido.length)
    log(`  ${emails.size} cliente(s) derivada(s) dos pedidos · ${semPedido.length} sem pedido no recorte`)
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
