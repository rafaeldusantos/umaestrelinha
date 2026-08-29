// Feature 30 — o feed que o Merchant Center busca.
//
// `index.ts` é só wiring (env, client, `Deno.serve`); toda a lógica está aqui, com dependências
// injetadas, para rodar em vitest fora do Deno (`AD-004`).
//
// ---------------------------------------------------------------------------------------------
// A REGRA QUE NÃO PODE SER AFROUXADA: FEED PARCIAL É PIOR QUE FEED AUSENTE
// ---------------------------------------------------------------------------------------------
// O Merchant Center trata a **ausência** de um item no feed como pedido de remoção. Logo:
//
//   • leitura truncada em 1.000 linhas  ⇒ 2.233 ofertas removidas, em silêncio
//   • zero ofertas elegíveis            ⇒ catálogo inteiro removido
//   • erro de leitura devolvendo []     ⇒ idem
//
// Nos três casos a resposta é **503 sem corpo de feed**: o Google mantém a última leitura boa e
// tenta de novo. O teto de 1.000 linhas do PostgREST já custou a este projeto o `selectAll` do
// importador (`db.test.ts`); aqui o mesmo erro é externo, demorado de descobrir e caro de reverter.

import {
  feedExclusion,
  pickCategoryProductCategory,
  renderFeedXml,
  resolveOffer,
  type CategoryTaxonomy,
  type FeedChannel,
  type OfferInputProduct,
  type OfferInputVariant,
  type ShoppingOffer,
} from '../../../packages/core/src/shopping/index.ts'
import {
  POSTGREST_PAGE_SIZE,
  readAllPages,
} from '../../../packages/core/src/paging/index.ts'

/**
 * O PostgREST devolve no máximo 1.000 linhas por requisição, e não avisa quando trunca.
 *
 * Feature 33: o número passou a ter um dono só (`@estrelinha/core/paging`), porque a function do
 * sitemap virou o segundo consumidor do mesmo teto. O nome local continua exportado — é o que os
 * testes desta function medem, e renomeá-lo não acrescentaria nada.
 */
export const FEED_PAGE_SIZE = POSTGREST_PAGE_SIZE

/** Uma variação com o produto dela, como o join do PostgREST devolve. */
export interface FeedRow {
  variant: OfferInputVariant
  product: OfferInputProduct
  /** As categorias do produto (`GSH-23`). Vazio ⇒ a taxonomia cai no padrão da loja. */
  categories?: CategoryTaxonomy[]
}

export interface GoogleShoppingConfig {
  enabled: boolean
  default_product_category?: string | null
}

export interface FeedDeps {
  /** `store_settings.google_shopping`. `null` quando a linha não existe. */
  readConfig: () => Promise<GoogleShoppingConfig | null>
  /** Contagem EXATA de `product_variants`. É a régua contra a qual a leitura é conferida. */
  countRows: () => Promise<number>
  /** Uma página, em ordem estável. `from`/`to` inclusivos, como o `range` do PostgREST. */
  readPage: (from: number, to: number) => Promise<FeedRow[]>
  /** Carimba `last_fetched_at`. Falhar aqui **não** derruba o feed. */
  markFetched: () => Promise<void>
  /** A origem pública da loja. Sem ela o `<g:link>` sairia com host errado. */
  origin: string
  channel: FeedChannel
}

const texto = (corpo: string, status: number): Response =>
  new Response(corpo, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

const log = (entry: Record<string, unknown>): void => console.log(JSON.stringify(entry))

/**
 * Lê o catálogo inteiro, ou **falha**.
 *
 * @throws quando o total lido não bate com a contagem exata — o único sinal disponível de que a
 * leitura foi truncada. Devolver o que veio seria publicar um feed que instrui o Google a remover o
 * que faltou.
 */
export const readAllRows = async (deps: FeedDeps): Promise<FeedRow[]> =>
  await readAllPages<FeedRow>({
    total: await deps.countRows(),
    readPage: deps.readPage,
    pageSize: FEED_PAGE_SIZE,
    label: 'catálogo',
    // A consequência é do FEED, não da paginação — e por isso viaja como parâmetro em vez de ficar
    // embutida na função compartilhada: o sitemap trunca com o mesmo mecanismo e outro custo.
    consequence: 'feed parcial instrui o Google a remover o que falta',
  })

/** As ofertas elegíveis, na ordem em que vieram. A regra de inclusão tem um dono: `feedExclusion`. */
export const toOffers = (
  linhas: readonly FeedRow[],
  origin: string,
  defaultProductCategory?: string | null,
): ShoppingOffer[] =>
  linhas
    .filter(({ product, variant }) => feedExclusion(product, variant) === null)
    .map(({ product, variant, categories }) =>
      resolveOffer(product, variant, {
        origin,
        defaultProductCategory,
        categoryProductCategory: pickCategoryProductCategory(categories ?? []),
      }),
    )

export const handleFeed = async (deps: FeedDeps): Promise<Response> => {
  let config: GoogleShoppingConfig | null
  try {
    config = await deps.readConfig()
  } catch (e) {
    log({ fn: 'google-feed', erro: 'config', detalhe: String(e) })
    return texto('configuração indisponível', 503)
  }

  // Desligado: a fonte de dados nem existe no Merchant Center ainda. 404 é inofensivo, e é o que
  // impede o feed de disputar os `offer_id` com a Content API da Nuvemshop antes do cutover.
  if (!config?.enabled) return texto('integração desligada', 404)

  if (!deps.origin) {
    log({ fn: 'google-feed', erro: 'origin_ausente' })
    return texto('origem da loja não configurada', 503)
  }

  let linhas: FeedRow[]
  try {
    linhas = await readAllRows(deps)
  } catch (e) {
    log({ fn: 'google-feed', erro: 'leitura', detalhe: String(e) })
    return texto('catálogo indisponível', 503)
  }

  let xml: string
  try {
    xml = renderFeedXml(
      toOffers(linhas, deps.origin, config.default_product_category),
      deps.channel,
    )
  } catch (e) {
    // Feed vazio e `offer_id` duplicado chegam aqui: `renderFeedXml` recusa os dois, e recusar é o
    // desfecho certo — os dois removeriam ofertas vivas do Shopping.
    log({ fn: 'google-feed', erro: 'geracao', detalhe: String(e) })
    return texto('feed indisponível', 503)
  }

  // O carimbo é diagnóstico, não parte da entrega. Falhar aqui e derrubar o feed trocaria um
  // problema de observabilidade por um de catálogo.
  try {
    await deps.markFetched()
  } catch (e) {
    log({ fn: 'google-feed', erro: 'carimbo', detalhe: String(e) })
  }

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
    },
  })
}
