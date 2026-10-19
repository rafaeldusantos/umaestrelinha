/**
 * A página de uma OPÇÃO da peça — feature 68 (SVR-01..11, SVR-20).
 *
 * **Um dono, quatro leitores**: a página do produto na loja, a edge function `product-page` (o
 * `<head>` servido), o gerador do sitemap e o painel. Escrita em cada um, a pergunta "esta opção tem
 * página própria, e qual é o endereço dela?" teria quatro respostas, e o juiz da divergência seria o
 * Google: o sitemap anunciaria uma URL que a página não declara canônica, e nada quebraria.
 *
 * A regra, em uma frase: a opção marcada num filtro (feature 67) do PRIMEIRO eixo que tenha opção
 * marcada e ao menos dois textos entre as variações elegíveis ganha título, canônica e entrada no
 * sitemap próprios; todo o resto continua sendo a peça.
 *
 * Imports por ARQUIVO e com extensão explícita, `import type` incluso: a edge function chega aqui
 * por caminho relativo (Deno), e um especificador sem a extensão derruba o worker antes da primeira
 * linha. Os tipos são estruturais e declarados aqui — o grafo não importa pacote nenhum.
 */
import type { OptionMark } from '../filters/types.ts'
import { productPath } from '../routes/routes.ts'
import { feedExclusion } from '../shopping/eligibility.ts'
import { publicVariantId } from '../shopping/identity.ts'
import { variantByPublicId, variantPath } from '../shopping/offer.ts'
import type {
  OfferProductEligibility,
  OfferProductIdentity,
  OfferVariantEligibility,
  OfferVariantIdentity,
} from '../shopping/types.ts'
import { brandedTitle } from './brand.ts'
import { productPageMeta, type PageMeta } from './pages.ts'
import { summarize } from './text.ts'

/** Um eixo de `products.options`. `values` é a ordem dos textos no painel. */
export interface VariantSeoAxis {
  name: string
  values?: readonly string[] | null
  position?: number | null
}

/**
 * O que a REGRA (quais opções têm página) lê da peça — o sitemap não tem mais que isto. A loja passa
 * o `Product` inteiro; as functions, a projeção.
 */
export interface VariantSeoRuleProduct extends OfferProductEligibility {
  slug: string
  options?: readonly VariantSeoAxis[] | null
  /** As marcações por opção JÁ restritas à leitura pública (RLS, ou `publicOptionMarks`). */
  option_marks?: readonly OptionMark[] | null
}

/** O que o `<head>` lê da peça, além da regra. */
export interface VariantSeoProduct extends VariantSeoRuleProduct, OfferProductIdentity {
  name: string
  description?: string | null
  seo_title?: string | null
  seo_description?: string | null
}

/** O que a regra lê de uma variação. */
export interface VariantSeoVariant extends OfferVariantEligibility, OfferVariantIdentity {
  position?: number | null
  option_values?: Readonly<Record<string, string>> | null
}

export interface VariantSeoInput<
  V extends VariantSeoVariant = VariantSeoVariant,
  P extends VariantSeoRuleProduct = VariantSeoRuleProduct,
> {
  product: P
  variants: readonly V[]
}

/** Uma opção com página própria. `path` é o caminho canônico, sem origem. */
export interface IndexableOption<V extends VariantSeoVariant = VariantSeoVariant> {
  axis: string
  text: string
  variant: V
  path: string
}

/**
 * O que um `?variant=` significa para o `<head>`. Discriminado por literal de STRING
 * (`strictNullChecks: false` não estreita booleano). `opened` é a variação pedida quando ela é
 * elegível — é ela que a página abre e que a oferta do JSON-LD declara.
 */
export type VariantPage<V extends VariantSeoVariant = VariantSeoVariant> =
  | { kind: 'option'; option: IndexableOption<V>; opened: V }
  | { kind: 'product'; opened: V | null }

/** Comparação por código de caractere — estável em qualquer runtime, ao contrário de `localeCompare`. */
const porCodigo = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

/**
 * As variações elegíveis (ativas, com preço, de peça ativa — `feedExclusion === null`), na régua da
 * representante: menor `position`, desempate pelo `publicVariantId` crescente. **Estoque não entra**:
 * a canônica tem de ser estável, e preferir estoque trocaria a canônica de id cada vez que a primeira
 * cor esgota e volta.
 */
const elegiveisEmOrdem = <V extends VariantSeoVariant>(product: VariantSeoRuleProduct, variants: readonly V[]): V[] =>
  variants
    .filter(v => feedExclusion(product, v) === null)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || porCodigo(publicVariantId(a), publicVariantId(b)))

/**
 * A variação que representa uma OPÇÃO (SVR-04). Nome próprio de propósito: `representativeVariant`
 * (`shopping/offer.ts`) responde outra pergunta — a variação que representa a PEÇA — e prefere
 * estoque. Duas "representantes" com regras diferentes e o mesmo nome seriam o defeito 01 no tamanho
 * de um identificador.
 */
export const optionRepresentative = <V extends VariantSeoVariant>(
  input: VariantSeoInput<V>,
  axis: string,
  text: string,
): V | null => elegiveisEmOrdem(input.product, input.variants).find(v => v.option_values?.[axis] === text) ?? null

/** Os eixos na ordem de `products.options` (`position`, e a ordem de chegada quando falta). */
const eixosEmOrdem = (options: readonly VariantSeoAxis[] | null | undefined): VariantSeoAxis[] =>
  (options ?? [])
    .map((o, i) => ({ o, i }))
    .sort((a, b) => (a.o.position ?? a.i) - (b.o.position ?? b.i) || a.i - b.i)
    .map(({ o }) => o)

/**
 * As opções com página própria (SVR-01..06).
 *
 * - O eixo é o PRIMEIRO, na ordem de `options`, com ao menos um texto indexável **e** ao menos dois
 *   textos distintos entre as elegíveis (SVR-02). Um texto só seria a página da peça com outro título.
 * - Texto indexável: marcado (qualquer valor) e com ao menos uma variação elegível (SVR-03), exato.
 * - Ordem: a dos textos em `options[eixo].values`; um texto de variação ausente dali vai ao fim, na
 *   ordem da grade (medido em 2026-10-19 no banco local: zero de 5.903 textos fora de `values`).
 */
export const indexableOptions = <V extends VariantSeoVariant>(input: VariantSeoInput<V>): IndexableOption<V>[] => {
  const { product } = input
  const elegiveis = elegiveisEmOrdem(product, input.variants)
  const marcas = product.option_marks ?? []

  for (const eixo of eixosEmOrdem(product.options)) {
    const representantes = new Map<string, V>()
    for (const v of elegiveis) {
      const texto = v.option_values?.[eixo.name]
      if (typeof texto === 'string' && texto !== '' && !representantes.has(texto)) representantes.set(texto, v)
    }
    if (representantes.size < 2) continue

    const marcados = [...representantes.keys()].filter(t =>
      marcas.some(m => m.option_name === eixo.name && m.option_value === t),
    )
    if (marcados.length === 0) continue

    const ordem = eixo.values ?? []
    const posicao = (t: string): number => {
      const i = ordem.indexOf(t)
      return i === -1 ? ordem.length : i
    }
    const grade = [...representantes.keys()]
    return marcados
      .sort((a, b) => posicao(a) - posicao(b) || grade.indexOf(a) - grade.indexOf(b))
      .map(texto => {
        const variant = representantes.get(texto)!
        return { axis: eixo.name, text: texto, variant, path: variantPath(product, variant) }
      })
  }
  return []
}

/**
 * O que o `?variant=` da URL significa (SVR-07): **opção** quando resolve (`variantByPublicId`, as
 * duas formas de id) para uma variação elegível cujo texto no eixo indexável é indexável — seja ela
 * a representante ou não —; **peça** em todo outro caso.
 */
export const resolveVariantPage = <V extends VariantSeoVariant>(
  input: VariantSeoInput<V>,
  param: string | null | undefined,
): VariantPage<V> => {
  const pedida = variantByPublicId(input.variants, param)
  if (!pedida || feedExclusion(input.product, pedida) !== null) return { kind: 'product', opened: null }

  const opcoes = indexableOptions(input)
  const eixo = opcoes[0]?.axis
  const texto = eixo === undefined ? undefined : pedida.option_values?.[eixo]
  const opcao = opcoes.find(o => o.text === texto)
  return opcao ? { kind: 'option', option: opcao, opened: pedida } : { kind: 'product', opened: pedida }
}

/**
 * Uma linha de `product_option_filter_values` como a `product-page` a lê: com a chave de serviço, que
 * ignora RLS, e com o grupo do valor embutido.
 */
export interface OptionMarkRow extends OptionMark {
  filter_values?: { filter_groups?: { is_active?: boolean | null } | null } | null
}

/**
 * A réplica da leitura pública das marcações para quem lê com a chave de serviço (SVR-20): só as de
 * grupo ATIVO. Sem ela o HTML servido declararia página para um grupo desligado, enquanto a loja e o
 * sitemap (que leem pela RLS) não. A outra metade da policy — peça ativa — não precisa de réplica:
 * `feedExclusion` já a exige de toda variação elegível.
 */
export const publicOptionMarks = (rows: readonly OptionMarkRow[] | null | undefined): OptionMark[] =>
  (rows ?? [])
    .filter(r => r.filter_values?.filter_groups?.is_active === true)
    .map(r => ({ option_name: r.option_name, option_value: r.option_value, value_id: r.value_id }))

/** O `<head>` de uma URL de produto: o metadado, o caminho canônico (sem origem) e o que o `?variant=` significou. */
export interface ProductHead<V extends VariantSeoVariant = VariantSeoVariant> {
  meta: PageMeta
  canonicalPath: string
  page: VariantPage<V>
}

/** O teto do título COM a marca. Acima dele a opção — que é o que distingue a página — ficaria cortada. */
export const OPTION_TITLE_BRAND_MAX = 60

const colapsado = (texto: string): string => texto.replace(/\s+/g, ' ').trim()

/**
 * O título de uma página de opção (SVR-08): `"{nome} — {texto}"`, espaços colapsados, com a marca só
 * quando o resultado com ela cabe em 60 caracteres (contados em code points). Nunca cortado.
 *
 * O NOME e não o `seo_title`: centenas de `seo_title` já terminam em marca, e emendar a opção depois
 * dela é frágil. Se o próprio nome já trouxer a marca (medido em 2026-10-19 no banco local: zero de
 * 702), a marca não é acrescentada — nunca em dobro, por construção.
 */
/**
 * O título da opção SEM a marca: `"{nome} — {texto}"`, espaços colapsados. É o `name` de cada
 * `Product` do `ProductGroup` (SVR-31) e a base de `optionTitle` — a composição tem um dono só.
 */
export const optionPlainTitle = (nome: string, texto: string): string => colapsado(`${colapsado(nome)} — ${texto}`)

const optionTitle = (nome: string, texto: string): string => {
  const nomeLimpo = colapsado(nome)
  const base = optionPlainTitle(nomeLimpo, texto)
  if (brandedTitle(nomeLimpo) === nomeLimpo) return base
  const comMarca = brandedTitle(base)
  return [...comMarca].length <= OPTION_TITLE_BRAND_MAX ? comMarca : base
}

/**
 * O `<head>` de `/produtos/<slug>?variant=<param>` — **a régua única** de SVR-08..11, chamada igual
 * pela página da loja e pela edge function `product-page`.
 *
 * - **opção** ⇒ título de opção; descrição `summarize("{texto}. {descrição da peça}")`, com a
 *   descrição da peça vinda de `productPageMeta` (curada → derivada → loja → piso); canônica = o
 *   caminho da opção (a representante, mesmo quando a URL aponta outra variação do mesmo texto).
 * - **peça** ⇒ `productPageMeta` intocado e canônica `productPath(slug)`, sem query.
 *
 * Nenhum outro parâmetro da URL entra: quem chama passa só o valor de `?variant=`.
 */
export const productHead = <V extends VariantSeoVariant>(
  input: VariantSeoInput<V, VariantSeoProduct>,
  param: string | null | undefined,
  storeDescription?: string | null,
): ProductHead<V> => {
  const { product } = input
  const page = resolveVariantPage(input, param)
  const daPeca = productPageMeta(product, storeDescription)
  if (page.kind !== 'option') return { meta: daPeca, canonicalPath: productPath(product.slug), page }

  const { text, path } = page.option
  return {
    meta: {
      title: optionTitle(product.name, text),
      description: summarize(`${text}. ${daPeca.description}`),
      indexable: true,
    },
    canonicalPath: path,
    page,
  }
}
