// A biblioteca de opções — feature 81 (OPV-18..20, A2, A3).
//
// "Tamanho: 3,5 cm, 4,5 cm, 5,5 cm" é digitado em centenas de produtos. As sugestões do editor de
// opções vêm daqui, **derivadas** de `products.options` do catálogo inteiro — sem tabela de modelos,
// que seria um segundo dono do que o catálogo já diz (`CLAUDE.md`, consequência 2 do "defeito 01").
//
// Função pura: recebe as linhas, devolve a biblioteca. Quem lê o banco é `useOptionLibrary`. Ela não
// filtra produto nenhum — só agrega opções —, e por isso não tem nada a ver com a busca de produto
// (`buscarProdutos`), que tem dono próprio.

import { dobrarTexto } from '@/shared/lib/texto'

/**
 * O mínimo de uma opção que a biblioteca lê — a forma de `ProductOption`, declarada aqui porque
 * `entities/product/lib` é puro e não importa nada de `@estrelinha/supabase`, nem tipo
 * (`buscarProdutos.test.ts`). Estrutural: um `ProductOption` é atribuível a ela.
 */
export interface OpcaoDoCatalogo {
  name: string
  values: string[]
}

export interface OptionLibraryEntry {
  /** A grafia mais usada no catálogo (A3). */
  name: string
  /** Em quantos produtos o nome aparece. */
  count: number
  /** Os valores, na ordem de A2 — os chips individuais. */
  values: string[]
  /**
   * Os CONJUNTOS de valores que os produtos usam com este nome (OPV-19, A1), do mais usado ao menos
   * usado. É o que "um clique aplica" — a união de `values` junta escalas que não convivem numa peça
   * ("aro 9" ao lado de "45cm"; BUG-20261026-usar-os-valores-junta-o-catalogo-inteiro).
   */
  sets: OptionValueSet[]
}

export interface OptionValueSet {
  /** Os valores, na grafia e na ordem do primeiro produto que usou o conjunto. */
  values: string[]
  /** Em quantos produtos o conjunto aparece. */
  count: number
}

/** Um conjunto sugerido ao editor, com os valores que a opção ainda não tem (pela dobra). */
export interface SuggestedValueSet extends OptionValueSet {
  missing: string[]
}

/** Quantas sugestões o editor mostra de cada vez. */
export const OPTION_SUGGESTION_LIMIT = 8

/** Quantos conjuntos de valores o editor oferece de cada vez. */
export const OPTION_SET_LIMIT = 3

const fold = (texto: string): string => dobrarTexto(texto.trim())

const cleanValues = (values: unknown): string[] =>
  Array.isArray(values)
    ? values.filter((v): v is string => typeof v === 'string').map(v => v.trim()).filter(v => v !== '')
    : []

interface Grupo {
  primeiraVez: number
  produtos: number
  grafias: Map<string, { vezes: number; ordem: number }>
  /** Os valores do produto mais representativo (o 1º com mais valores daquele nome). */
  sequencia: string[]
  /** Valor dobrado → em quantos produtos aparece, a grafia e a ordem da 1ª aparição. */
  valores: Map<string, { produtos: number; grafia: string; ordem: number }>
  /** O conjunto (valores dobrados, ordenados) → em quantos produtos, a grafia e a 1ª aparição. */
  conjuntos: Map<string, { produtos: number; values: string[]; ordem: number }>
}

/**
 * Agrupa os nomes pela dobra de busca do painel (A3) e ordena pelo uso (A2).
 *
 * - **Nome**: mais usado primeiro (nº de produtos), empate em ordem alfabética pt-BR; a grafia
 *   exibida é a mais frequente, e no empate a que apareceu primeiro.
 * - **Valores**: começam pela sequência do produto mais representativo — o primeiro, na ordem de
 *   leitura, com o maior número de valores daquele nome —, porque "3,5 cm, 4,5 cm, 5,5 cm" precisa
 *   sair na ordem de tamanho, não na alfabética. Os demais vêm depois, por uso, e no empate pela
 *   ordem em que apareceram.
 */
export const buildOptionLibrary = (
  rows: readonly { options: readonly OpcaoDoCatalogo[] | null }[],
): OptionLibraryEntry[] => {
  const grupos = new Map<string, Grupo>()
  let ordem = 0

  rows.forEach(row => {
    const vistosNoProduto = new Set<string>()
    for (const option of Array.isArray(row?.options) ? row.options : []) {
      const nome = typeof option?.name === 'string' ? option.name.trim() : ''
      const chave = fold(nome)
      if (chave === '') continue

      let grupo = grupos.get(chave)
      if (!grupo) {
        grupo = {
          primeiraVez: ordem,
          produtos: 0,
          grafias: new Map(),
          sequencia: [],
          valores: new Map(),
          conjuntos: new Map(),
        }
        grupos.set(chave, grupo)
      }

      const grafia = grupo.grafias.get(nome)
      if (grafia) grafia.vezes += 1
      else grupo.grafias.set(nome, { vezes: 1, ordem: ordem })
      ordem += 1

      const valores = cleanValues(option?.values)
      const unicos: string[] = []
      const dobrados = new Set<string>()
      for (const valor of valores) {
        const d = fold(valor)
        if (dobrados.has(d)) continue
        dobrados.add(d)
        unicos.push(valor)
      }
      if (unicos.length > grupo.sequencia.length) grupo.sequencia = unicos

      const primeiraNoProduto = !vistosNoProduto.has(chave)
      vistosNoProduto.add(chave)
      if (primeiraNoProduto) grupo.produtos += 1

      // O conjunto não depende da ordem nem da grafia: "8MM, 6mm" é o mesmo que "6mm, 8mm".
      if (unicos.length > 0) {
        const chaveDoConjunto = unicos.map(fold).sort().join('\u0000')
        const conjunto = grupo.conjuntos.get(chaveDoConjunto)
        if (conjunto) conjunto.produtos += 1
        else grupo.conjuntos.set(chaveDoConjunto, { produtos: 1, values: unicos, ordem: ordem })
      }

      for (const valor of unicos) {
        const d = fold(valor)
        const visto = grupo.valores.get(d)
        if (visto) visto.produtos += 1
        else grupo.valores.set(d, { produtos: 1, grafia: valor, ordem: ordem++ })
      }
    }
  })

  const entradas: OptionLibraryEntry[] = [...grupos.values()].map(grupo => {
    const [name] = [...grupo.grafias.entries()].sort(
      ([, a], [, b]) => b.vezes - a.vezes || a.ordem - b.ordem,
    )[0]

    const naSequencia = new Set(grupo.sequencia.map(fold))
    const resto = [...grupo.valores.entries()]
      .filter(([d]) => !naSequencia.has(d))
      .sort(([, a], [, b]) => b.produtos - a.produtos || a.ordem - b.ordem)
      .map(([, v]) => v.grafia)

    const sets = [...grupo.conjuntos.values()]
      .sort((a, b) => b.produtos - a.produtos || a.ordem - b.ordem)
      .map(c => ({ values: c.values, count: c.produtos }))

    return { name, count: grupo.produtos, values: [...grupo.sequencia, ...resto], sets }
  })

  return entradas.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'))
}

/** A entrada do nome digitado, pela dobra — ou `null` (nome novo, ou vazio). */
export const findLibraryEntry = (
  library: readonly OptionLibraryEntry[],
  name: string,
): OptionLibraryEntry | null => {
  const chave = fold(name)
  if (chave === '') return null
  return library.find(entry => fold(entry.name) === chave) ?? null
}

/**
 * OPV-18: os nomes que casam com o que foi digitado (pela dobra), na ordem da biblioteca. Campo
 * vazio mostra os mais usados — é o estado em que o campo recebe foco.
 */
export const suggestOptionNames = (
  library: readonly OptionLibraryEntry[],
  typed: string,
  limit = OPTION_SUGGESTION_LIMIT,
): OptionLibraryEntry[] => {
  const termo = fold(typed)
  return library.filter(entry => fold(entry.name).includes(termo)).slice(0, limit)
}

/**
 * OPV-20: os valores conhecidos daquele nome que casam com o que foi digitado e que a opção ainda
 * não tem. A comparação com os já presentes também é pela dobra: "3,5 CM" já é "3,5 cm".
 */
export const suggestOptionValues = (
  entry: OptionLibraryEntry | null,
  typed: string,
  existing: readonly string[],
  limit = OPTION_SUGGESTION_LIMIT,
): string[] => {
  if (!entry) return []
  const termo = fold(typed)
  const presentes = new Set(existing.map(fold))
  return entry.values.filter(v => !presentes.has(fold(v)) && fold(v).includes(termo)).slice(0, limit)
}

/**
 * Os chips de valor que a opção ainda não usou (pela dobra), na ordem do catálogo. Eles continuam na
 * tela enquanto sobrar algum — tocar em "16" não pode esconder "17" e "18"
 * (BUG-20261026-sugestao-de-valores-some-no-primeiro-clique).
 */
export const remainingValues = (
  entry: OptionLibraryEntry | null,
  existing: readonly string[],
): string[] => {
  if (!entry) return []
  const presentes = new Set(existing.map(fold))
  return entry.values.filter(v => !presentes.has(fold(v)))
}

/**
 * OPV-19 (A1): os conjuntos mais usados daquele nome, até `limit`, cada um com o que ainda falta na
 * opção. O conjunto que a opção já tem inteiro sai e dá lugar ao seguinte.
 */
export const suggestValueSets = (
  entry: OptionLibraryEntry | null,
  existing: readonly string[],
  limit = OPTION_SET_LIMIT,
): SuggestedValueSet[] => {
  if (!entry) return []
  const presentes = new Set(existing.map(fold))
  return entry.sets
    .map(set => ({ ...set, missing: set.values.filter(v => !presentes.has(fold(v))) }))
    .filter(set => set.missing.length > 0)
    .slice(0, limit)
}
