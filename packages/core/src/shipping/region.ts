// A região do CEP — domínio puro, e o dono único da pergunta "de que região do Brasil é este CEP?".
//
// O frete grátis pode valer só para algumas regiões (a campanha Sul + Sudeste), e quem pergunta é a
// faixa da sacola, o checkout, o pedido montado e as functions que recalculam o frete. Escrita em
// cada um, a faixa numérica de uma região divergiria sem nada quebrar — a cliente veria "liberado"
// numa tela e pagaria o frete na outra. Por isso a régua mora aqui, uma vez, e o rótulo das regiões
// também.
//
// ⚠️ Este arquivo NÃO importa nada, de propósito, no molde de `pickup.ts`: as edge functions o
// alcançam por caminho relativo, e no Deno todo especificador relativo precisa da extensão
// explícita — inclusive os de tipo. `shipping/__tests__/denoReach.test.ts` guarda isso.

/** As cinco regiões, pelo slug que `store_settings.shipping.free_shipping_regions` guarda. */
export type RegionSlug = 'sul' | 'sudeste' | 'centro-oeste' | 'nordeste' | 'norte'

/**
 * As cinco regiões, na ordem fixa em que toda superfície as lista: Sul, Sudeste, Centro-Oeste,
 * Nordeste, Norte. É também o padrão da configuração — campo ausente vale as cinco.
 */
export const FREE_SHIPPING_REGIONS: readonly RegionSlug[] = Object.freeze([
  'sul',
  'sudeste',
  'centro-oeste',
  'nordeste',
  'norte',
] as RegionSlug[])

/** O rótulo de cada região, como a cliente e a dona o leem. */
export const REGION_LABELS: Readonly<Record<RegionSlug, string>> = Object.freeze({
  norte: 'Norte',
  nordeste: 'Nordeste',
  'centro-oeste': 'Centro-Oeste',
  sudeste: 'Sudeste',
  sul: 'Sul',
})

/** As siglas dos estados de cada região, na ordem em que a frase do ⓘ as escreve. */
export const REGION_STATES: Readonly<Record<RegionSlug, readonly string[]>> = Object.freeze({
  norte: Object.freeze(['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO']),
  nordeste: Object.freeze(['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE']),
  'centro-oeste': Object.freeze(['DF', 'GO', 'MT', 'MS']),
  sudeste: Object.freeze(['SP', 'RJ', 'MG', 'ES']),
  sul: Object.freeze(['PR', 'SC', 'RS']),
})

/**
 * As faixas dos Correios, pelos cinco primeiros dígitos, de ponta a ponta inclusive. O Norte e o
 * Centro-Oeste se intercalam entre 76800 e 78999 (RO, TO, MT), e é por isso que a régua é uma
 * tabela e não uma comparação por primeiro dígito.
 */
const FAIXAS: ReadonlyArray<readonly [number, number, RegionSlug]> = [
  [1000, 39999, 'sudeste'],
  [40000, 65999, 'nordeste'],
  [66000, 69999, 'norte'],
  [70000, 76799, 'centro-oeste'],
  [76800, 76999, 'norte'],
  [77000, 77999, 'norte'],
  [78000, 78899, 'centro-oeste'],
  [78900, 78999, 'norte'],
  [79000, 79999, 'centro-oeste'],
  [80000, 99999, 'sul'],
]

/**
 * A região do CEP, ou `null` quando ela é desconhecida.
 *
 * Aceita só oito dígitos, com ou sem o hífen da máscara (e espaço em volta). CEP vazio, incompleto,
 * com letra ou fora de toda faixa (`00000`–`00999`) é desconhecido — e, na tela, vale como "sem
 * CEP". Letra não é descartada: tirar o que não é dígito faria `01a310100` virar um CEP válido.
 */
export function regionOfCep(cep: string | null | undefined): RegionSlug | null {
  const texto = String(cep ?? '').trim()
  if (!/^\d{5}-?\d{3}$/.test(texto)) return null
  const prefixo = Number(texto.slice(0, 5))
  for (const [de, ate, regiao] of FAIXAS) {
    if (prefixo >= de && prefixo <= ate) return regiao
  }
  return null
}

const isRegionSlug = (valor: unknown): valor is RegionSlug =>
  typeof valor === 'string' && (FREE_SHIPPING_REGIONS as readonly string[]).includes(valor)

/** Os slugs válidos de uma lista, sem repetição, na ordem fixa. */
const naOrdem = (lista: readonly unknown[]): RegionSlug[] =>
  FREE_SHIPPING_REGIONS.filter((regiao) => lista.some((item) => item === regiao && isRegionSlug(item)))

/**
 * As regiões que valem para uma configuração.
 *
 * **Campo ausente (ou que não é lista) vale as cinco** — a linha antiga de `store_settings`, de
 * antes da região existir, continua se comportando igual depois do deploy. Uma lista vale pelos
 * slugs válidos dela, na ordem fixa; lista vazia continua vazia (o frete grátis fica inativo, e o
 * painel recusa gravá-la).
 */
export function effectiveRegions(valor: unknown): RegionSlug[] {
  if (!Array.isArray(valor)) return [...FREE_SHIPPING_REGIONS]
  return naOrdem(valor)
}

/** "A", "A e B", "A, B e C". */
const juntar = (partes: string[]): string =>
  partes.length <= 1 ? (partes[0] ?? '') : `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`

/** As regiões de fato limitam o frete grátis? Nenhuma e as cinco não têm o que dizer. */
const limitadas = (regioes: RegionSlug[]): boolean =>
  regioes.length > 0 && regioes.length < FREE_SHIPPING_REGIONS.length

/**
 * O rótulo das regiões — "Sul e Sudeste" —, em ordem fixa e com "e" antes da última. `null` com as
 * cinco (os textos não falam de região) e com nenhuma.
 */
export function regionsLabel(slugs: readonly unknown[]): string | null {
  const regioes = naOrdem(slugs ?? [])
  if (!limitadas(regioes)) return null
  return juntar(regioes.map((regiao) => REGION_LABELS[regiao]))
}

/**
 * O trecho de regiões da frase do ⓘ — "no Sul (PR, SC, RS) e no Sudeste (SP, RJ, MG, ES)". O artigo
 * é "no" para as cinco. `null` com as cinco e com nenhuma.
 */
export function regionsWithStates(slugs: readonly unknown[]): string | null {
  const regioes = naOrdem(slugs ?? [])
  if (!limitadas(regioes)) return null
  return juntar(
    regioes.map((regiao) => `no ${REGION_LABELS[regiao]} (${REGION_STATES[regiao].join(', ')})`),
  )
}
