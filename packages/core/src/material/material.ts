// Feature 22 — o material afetivo e a gravação, como **regra pura**.
//
// Vive em `@estrelinha/core` porque cinco consumidores que não podem divergir leem daqui: a página do
// produto, o carrinho, a confirmação do pedido, o backoffice e o importador do catálogo. Módulo sem
// dependência **de propósito** — o guarda que compara esta máquina de estado com a que está escrita
// em SQL precisa poder importá-lo de dentro de um teste que lê arquivo do disco, sem arrastar React
// nem Supabase junto.
//
// O registro do negócio é **memorial**: boa parte de quem compra acabou de perder alguém. Todo
// rótulo daqui aparece em tela, e nenhum deles usa linguagem festiva, eufemismo ou diminutivo.

// ---------------------------------------------------------------------------------------------
// Os materiais
// ---------------------------------------------------------------------------------------------

export type MaterialKind =
  | 'leite_materno'
  | 'cabelo'
  | 'cinzas'
  | 'pelo_pet'
  | 'dente_leite'
  | 'coto_umbilical'
  | 'placenta'
  | 'flores'
  | 'penas'
  | 'outro'

/**
 * A lista fechada. Derivada das fichas da board `5MC-0` **mais** os nomes reais do catálogo — foi a
 * medição que trouxe `coto_umbilical` (51 produtos) e `penas`, que não estavam na lista original.
 *
 * A mesma lista existe como `check` em `products.material_kinds`: valor fora dela é recusado pelo
 * banco, em vez de virar rótulo em branco na loja.
 */
export const MATERIAL_KINDS: readonly MaterialKind[] = [
  'leite_materno',
  'cabelo',
  'cinzas',
  'pelo_pet',
  'dente_leite',
  'coto_umbilical',
  'placenta',
  'flores',
  'penas',
  'outro',
]

export const MATERIAL_KIND_LABELS: Record<MaterialKind, string> = {
  leite_materno: 'Leite materno',
  cabelo: 'Mecha de cabelo',
  cinzas: 'Cinzas',
  pelo_pet: 'Pelo do pet',
  dente_leite: 'Dente de leite',
  coto_umbilical: 'Coto umbilical',
  placenta: 'Placenta',
  flores: 'Flores',
  penas: 'Penas',
  outro: 'Outro material',
}

/** O `id` da âncora da ficha em `/como-enviar-o-material`. É o enum com hífen, e nada mais. */
export const materialAnchor = (kind: MaterialKind): string => kind.replace(/_/g, '-')

export const isMaterialKind = (value: unknown): value is MaterialKind =>
  typeof value === 'string' && (MATERIAL_KINDS as readonly string[]).includes(value)

/**
 * Normaliza o que veio do banco. Tolerância a dado torto é deliberada e segue a regra de
 * `normalizeImages`: um `material_kinds` corrompido faz o produto perder a lista, não a página.
 */
export const toMaterialKinds = (value: unknown): MaterialKind[] =>
  Array.isArray(value) ? value.filter(isMaterialKind) : []

export const materialKindLabel = (kind: MaterialKind): string =>
  MATERIAL_KIND_LABELS[kind] ?? String(kind)

// ---------------------------------------------------------------------------------------------
// "Exige material" e "quais materiais" são DOIS dados
// ---------------------------------------------------------------------------------------------

/**
 * A leitura preguiçosa seria "lista vazia ⇒ não exige", e ela apaga exatamente a peça de material
 * livre: a que exige, entra na fila, e ainda não sabe qual — porque a escolha acontece no WhatsApp,
 * fora da loja. São **três** situações, não duas:
 *
 * | situação | `requires_material` | `material_kinds` | o que a loja diz |
 * | --- | :---: | --- | --- |
 * | corrente, acessório | `false`/`null` | — | nada |
 * | Árvore da Vida | `true` | `cabelo`, `coto_umbilical` | "você vai enviar cabelo e coto umbilical" |
 * | peça de material livre | `true` | **vazia** | "o material será combinado com a Adri" |
 *
 * **`null` é o terceiro estado de `requires_material`, e significa "nunca decidido".** É o marcador
 * que permite ao importador semear os 689 produtos do catálogo real sem apagar a curadoria da dona
 * na execução seguinte. Ninguém compara a coluna crua: todo consumidor passa por aqui, e aqui `null`
 * é `false` — que é o comportamento seguro.
 */
export interface MaterialRequirement {
  requires_material?: boolean | null
  material_kinds?: unknown
}

export const requiresMaterial = (row: MaterialRequirement | null | undefined): boolean =>
  row?.requires_material === true

export const materialKindsOf = (row: MaterialRequirement | null | undefined): MaterialKind[] =>
  toMaterialKinds(row?.material_kinds)

/** Lista legível: `''` quando não exige, `'a combinar'` quando exige sem dizer qual. */
export const MATERIAL_TO_BE_AGREED = 'a combinar'

/**
 * Aceita `readonly string[]`, e não `MaterialKind[]`, porque quem chama vem do banco: `Product` e
 * `order_items` carregam `text[]`. Tipar estreito aqui obrigaria `@estrelinha/supabase` a importar
 * este módulo — ciclo entre pacotes por causa de um tipo. O que não é material conhecido é filtrado.
 */
export const materialSummary = (
  requires: boolean,
  kinds: readonly string[] = [],
): string => {
  if (!requires) return ''
  const labels = kinds.filter(isMaterialKind).map(materialKindLabel)
  if (labels.length === 0) return MATERIAL_TO_BE_AGREED
  if (labels.length === 1) return labels[0]
  return `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`
}

// ---------------------------------------------------------------------------------------------
// A máquina de estado do material — independente da de pagamento
// ---------------------------------------------------------------------------------------------

export type MaterialStatus =
  | 'nao_aplicavel'
  | 'aguardando_material'
  | 'material_enviado'
  | 'material_recebido'
  | 'em_producao'

export const MATERIAL_STATUSES: readonly MaterialStatus[] = [
  'nao_aplicavel',
  'aguardando_material',
  'material_enviado',
  'material_recebido',
  'em_producao',
]

export const MATERIAL_STATUS_LABELS: Record<MaterialStatus, string> = {
  nao_aplicavel: 'Sem material',
  aguardando_material: 'Aguardando material',
  material_enviado: 'Material a caminho',
  material_recebido: 'Material recebido',
  em_producao: 'Em produção',
}

export const isMaterialStatus = (value: unknown): value is MaterialStatus =>
  typeof value === 'string' && (MATERIAL_STATUSES as readonly string[]).includes(value)

export const toMaterialStatus = (value: unknown): MaterialStatus =>
  isMaterialStatus(value) ? value : 'nao_aplicavel'

/**
 * Para onde cada estado pode ir.
 *
 * **`aguardando_material → material_recebido` é obrigatório, não atalho.** Informar o rastreio é
 * opcional — a cliente pode avisar pelo WhatsApp, ou não avisar nada e o envelope simplesmente
 * chegar. Sem o salto direto, a Adri não teria como registrar o recebimento do caso mais comum.
 *
 * `nao_aplicavel` é terminal: não há material neste pedido, e inventar transição a partir dele seria
 * deixar a fila mentir. `em_producao` também é terminal **aqui** — daí em diante quem manda é
 * `orders.status`, que é outra máquina.
 *
 * Esta tabela tem uma cópia em SQL (o `where` de `set_material_status`), porque só o banco impede
 * uma requisição forjada e só o TypeScript produz o motivo legível que a AC pede. As duas são presas
 * uma à outra por `materialTransitions.test.ts`, que lê a migration do disco.
 */
export const MATERIAL_TRANSITIONS: Record<MaterialStatus, readonly MaterialStatus[]> = {
  nao_aplicavel: [],
  aguardando_material: ['material_enviado', 'material_recebido'],
  material_enviado: ['material_recebido'],
  material_recebido: ['em_producao'],
  em_producao: [],
}

/** Os estados a partir dos quais se chega em `to` — inclusive ele mesmo, que é a idempotência. */
export const materialTransitionSources = (to: MaterialStatus): MaterialStatus[] =>
  MATERIAL_STATUSES.filter(from => from === to || MATERIAL_TRANSITIONS[from].includes(to))

/**
 * O motivo da recusa, ou `null` quando a transição vale.
 *
 * **`string | null`, e não união discriminada por literal booleano.** `tsconfig.base.json` tem
 * `strictNullChecks: false`, e nesse modo `{ ok: true } | { ok: false; reason: string }` **não
 * estreita**: ler `verdict.reason` no ramo do `else` é TS2339. Mesmo formato de `reservedSlugRefusal`
 * e de `menuSlotRefusal`.
 *
 * **Transição para o próprio estado é sucesso.** É o que faz duas admins clicando ao mesmo tempo
 * convergirem para o resultado de uma só, sem estado intermediário inválido.
 */
export const materialTransitionRefusal = (
  from: MaterialStatus,
  to: MaterialStatus,
): string | null => {
  if (!isMaterialStatus(to)) return `“${String(to)}” não é um estado de material.`
  if (!isMaterialStatus(from)) return `“${String(from)}” não é um estado de material.`
  if (from === to) return null
  if (MATERIAL_TRANSITIONS[from].includes(to)) return null

  if (from === 'nao_aplicavel') {
    return 'Este pedido não exige material afetivo — não há material para registrar.'
  }

  const sources = materialTransitionSources(to).filter(s => s !== to)
  if (sources.length === 0) {
    return `“${MATERIAL_STATUS_LABELS[to]}” não é alcançável a partir de nenhum estado.`
  }

  return (
    `Este pedido está em “${MATERIAL_STATUS_LABELS[from]}”. ` +
    `“${MATERIAL_STATUS_LABELS[to]}” só é possível a partir de ` +
    `${sources.map(s => `“${MATERIAL_STATUS_LABELS[s]}”`).join(' ou ')}.`
  )
}

/**
 * O estado em que o pedido nasce.
 *
 * A fila é sobre **"algo está a caminho"**, não sobre saber o quê: um item que exige material sem
 * dizer qual entra em `aguardando_material` como qualquer outro.
 */
export const initialMaterialStatus = (
  items: readonly MaterialRequirement[],
): MaterialStatus =>
  (items ?? []).some(requiresMaterial) ? 'aguardando_material' : 'nao_aplicavel'

/** O pedido aparece na fila de material? `nao_aplicavel` e `em_producao` já saíram dela. */
export const isInMaterialQueue = (status: MaterialStatus): boolean =>
  status === 'aguardando_material' || status === 'material_enviado'

// ---------------------------------------------------------------------------------------------
// Gravação — derivada da variação, nunca de coluna nova
// ---------------------------------------------------------------------------------------------

/**
 * O eixo já existe no catálogo real: **35 produtos, 626 variações — o terceiro maior** —, e **33 dos
 * 35 cobram a mais** (mediana R$ 42, até R$ 112). Logo o liga/desliga não precisa ser construído: ele
 * existe e **precifica**, por `product_variants`. O que não existia era o texto e o limite.
 */
export const ENGRAVING_AXIS = 'Com gravação'

/**
 * Caixa e acento não distinguem eixo. O catálogo real tem `Tipo de elo`, `Tipos de elo` e
 * `Tipos de Elo` como três grafias do mesmo eixo — comparar a string crua é como perder um deles.
 *
 * O corte do acento é `\p{Diacritic}`, e **não** uma faixa literal de combinantes: um `[◌̀-◌ͯ]`
 * escrito com os caracteres crus fica invisível no editor e some numa normalização de arquivo, sem
 * quebrar nada visível — a função simplesmente pararia de tirar acento.
 */
const normalizeText = (value: string): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()

const ENGRAVING_AXIS_KEY = normalizeText(ENGRAVING_AXIS)

/** O produto **oferece** gravação em alguma variação? É o que decide mostrar o limite no cadastro. */
export const hasEngravingAxis = (options: readonly { name?: string }[] | null | undefined): boolean =>
  (options ?? []).some(option => normalizeText(String(option?.name ?? '')) === ENGRAVING_AXIS_KEY)

/**
 * A **variação escolhida** grava? O mesmo produto tem linhas `Sim` e `Não`, então perguntar ao
 * produto mostraria o campo para quem escolheu a linha que não grava — e o texto iria para o pedido.
 */
export const hasEngraving = (
  optionValues: Record<string, string> | null | undefined,
): boolean => {
  for (const [name, value] of Object.entries(optionValues ?? {})) {
    if (normalizeText(name) === ENGRAVING_AXIS_KEY) return normalizeText(String(value)) === 'sim'
  }
  return false
}

/**
 * O teto quando o produto não declara o dele.
 *
 * **Não é "sem limite".** Um pingente não comporta o que uma pulseira comporta, e sem teto um texto
 * colado de mil caracteres entra no pedido e a Adri descobre na bancada. 20 é conservador de
 * propósito: é o cadastro que sobe, nunca o código.
 */
export const DEFAULT_ENGRAVING_MAX_CHARS = 20

export const engravingLimit = (max: number | null | undefined): number =>
  typeof max === 'number' && Number.isFinite(max) && max > 0
    ? Math.floor(max)
    : DEFAULT_ENGRAVING_MAX_CHARS

/** Texto só de espaços **é vazio** — gravação é opcional, e espaço em branco não é pedido. */
export const normalizeEngraving = (text: string | null | undefined): string | null => {
  const trimmed = String(text ?? '').trim()
  return trimmed === '' ? null : trimmed
}

/** O motivo da recusa, ou `null`. Mesmo formato de `materialTransitionRefusal`, e pelo mesmo motivo. */
export const engravingRefusal = (
  text: string | null | undefined,
  max: number | null | undefined,
): string | null => {
  const value = normalizeEngraving(text)
  if (value === null) return null
  const limit = engravingLimit(max)
  if (value.length > limit) {
    return `A gravação tem ${value.length} caracteres e o limite desta peça é ${limit}.`
  }
  return null
}

// ---------------------------------------------------------------------------------------------
// Semente do catálogo real — inferência pelo NOME do produto
// ---------------------------------------------------------------------------------------------

/**
 * O catálogo importado tem **zero eixo de material** em 3.356 variações, e o material está no **nome
 * do produto**, em massa: 169 dizem "leite", 127 "cinzas", 85 "cabelo", 51 "coto", 50 "pet", 25
 * "dente", 25 "flores", 2 "penas".
 *
 * Esta função existe para a feature não nascer inerte — sem ela, a fila `aguardando_material` fica
 * vazia para sempre até alguém editar centenas de produtos à mão. Já aconteceu duas vezes neste
 * repositório (`PRM-12` e `collections`), e as duas passaram meses sem ninguém notar.
 *
 * É **inferência, não verdade**: quem decide é a dona, no cadastro. O importador só escreve onde
 * `requires_material` ainda é `null`.
 */
export interface InferredMaterial {
  requires: boolean
  kinds: MaterialKind[]
}

/**
 * `dente de leite` contém `leite`, e é outra coisa. Mascarar a expressão inteira ANTES de procurar
 * `leite` é o que impede 25 produtos de dente virarem leite materno. Não é hipótese — é o caso mais
 * frequente do catálogo depois de cor.
 */
const DENTE_DE_LEITE = /dente\s+de\s+leite/g

const REGRAS: readonly { kind: MaterialKind; re: RegExp }[] = [
  { kind: 'coto_umbilical', re: /\bcotos?\b|umbilical/ },
  { kind: 'dente_leite', re: /\bdentes?\b/ },
  { kind: 'cinzas', re: /\bcinzas?\b/ },
  { kind: 'cabelo', re: /\bcabelos?\b|\bmecha\b/ },
  { kind: 'pelo_pet', re: /\bpet\b|\bpelos?\s+de\s+pet\b/ },
  { kind: 'placenta', re: /\bplacenta\b/ },
  /**
   * **Flor é FORMA antes de ser material, e as duas convivem no mesmo catálogo.** Medido nos 689
   * nomes reais: "Berloque Afetivo Flor Lisa", "Pingente Menina Com Flor" e "Joia Afetiva Flor com
   * Cinzas de Cremação" usam a flor como **desenho da peça** — na última, o material é cinzas.
   *
   * Por isso o singular sozinho não conta. O que conta é o plural (`Buquê de Flores`, `Coração com
   * Flores`) ou o qualificador **natural**, que é o que distingue a flor que a cliente envia da flor
   * que é o formato do pingente ("Orquídea Roxa flor Natural").
   *
   * Errar para menos aqui é barato: quase todo produto de flor do catálogo declara **outro** material
   * junto (cabelo, leite, pet), então o pedido entra na fila do mesmo jeito. Errar para mais seria a
   * loja pedir que a cliente envie algo que a peça não usa.
   */
  { kind: 'flores', re: /\bflores\b|\bflor(es)?\s+natur(al|ais)\b/ },
  /**
   * Singular **e** plural, ao contrário de flor: os dois únicos produtos de pena do catálogo dizem
   * "Pena de Pássaro", no singular. Uma regra só de plural perdia os dois — e o `\b` inicial já
   * impede que "apenas" case.
   */
  { kind: 'penas', re: /\bpenas?\b/ },
  { kind: 'leite_materno', re: /\bleite\b/ },
]

export const inferMaterial = (name: string | null | undefined): InferredMaterial => {
  const normalized = normalizeText(String(name ?? '')).replace(DENTE_DE_LEITE, 'dente')
  const kinds: MaterialKind[] = []
  for (const { kind, re } of REGRAS) {
    if (re.test(normalized)) kinds.push(kind)
  }
  // A ordem final é a de `MATERIAL_KINDS`, não a das regras: assim "cabelo e coto umbilical" sai
  // sempre na mesma ordem, e o rótulo do pedido não muda entre duas execuções do importador.
  const ordered = MATERIAL_KINDS.filter(kind => kinds.includes(kind))
  return { requires: ordered.length > 0, kinds: [...ordered] }
}
